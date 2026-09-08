import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import type { ActiveBranchContext } from '../authorization/authenticated-request';
import { DatabaseService } from '../database/database.service';
import { isUniqueConstraintError } from '../database/prisma-errors';
import {
  CashDocumentType,
  CashMovementType,
  CashOperationType,
  CashShiftStatus,
  ExpenseStatus,
  Prisma,
} from '../generated/prisma/client';
import type {
  CashMovementQueryDto,
  CashShiftQueryDto,
  CloseCashShiftDto,
  CreateExpenseCategoryDto,
  ExpenseCategoryStatusDto,
  ExpenseQueryDto,
  ManualCashMovementDto,
  OpenCashShiftDto,
  PostExpenseDto,
  ReverseExpenseDto,
  UpdateExpenseCategoryDto,
} from './dto/cash.dto';

type Tx = Prisma.TransactionClient;
type DecimalValue = string | number | Prisma.Decimal;
const money = (value: DecimalValue) => new Prisma.Decimal(value).toDecimalPlaces(4);
const inbound = new Set<CashMovementType>([
  CashMovementType.OPENING,
  CashMovementType.CASH_SALE,
  CashMovementType.CUSTOMER_COLLECTION,
  CashMovementType.CASH_IN,
]);

@Injectable()
export class CashService {
  constructor(private readonly db: DatabaseService) {}

  async postPaymentMovementTx(
    tx: Tx,
    principal: AuthPrincipal,
    input: {
      branchId: string;
      registerId: string | undefined;
      paymentId: string;
      type:
        | typeof CashMovementType.CASH_SALE
        | typeof CashMovementType.CUSTOMER_COLLECTION
        | typeof CashMovementType.SUPPLIER_PAYMENT
        | typeof CashMovementType.CASH_REFUND;
      amount: DecimalValue;
      occurredAt: Date;
      referenceType: string;
      referenceId: string;
    },
  ) {
    if (!input.registerId)
      throw new BadRequestException('An active register cash shift is required for cash');
    const shift = await this.requireOpenShiftTx(
      tx,
      principal.companyId,
      input.branchId,
      input.registerId,
    );
    return tx.cashMovement.create({
      data: {
        companyId: principal.companyId,
        branchId: input.branchId,
        shiftId: shift.id,
        registerId: input.registerId,
        paymentId: input.paymentId,
        recordedById: principal.userId,
        type: input.type,
        amount: money(input.amount),
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        occurredAt: input.occurredAt,
      },
    });
  }

  async requireOpenShiftTx(tx: Tx, companyId: string, branchId: string, registerId: string) {
    await this.lockRegister(tx, companyId, registerId);
    const shift = await tx.cashShift.findFirst({
      where: { companyId, branchId, registerId, status: CashShiftStatus.OPEN },
    });
    if (!shift) throw new ConflictException('No open cash shift exists for this register');
    return shift;
  }

  openShift(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: OpenCashShiftDto,
  ) {
    return this.idempotent(principal, key, CashOperationType.OPEN_SHIFT, dto, async (tx, op) => {
      await this.lockRegister(tx, principal.companyId, dto.registerId);
      const register = await tx.register.findFirst({
        where: {
          id: dto.registerId,
          companyId: principal.companyId,
          branchId: branch.id,
          isActive: true,
          branch: { isActive: true },
        },
      });
      if (!register) throw new BadRequestException('Active register is unavailable in this branch');
      if (
        await tx.cashShift.findFirst({
          where: { companyId: principal.companyId, registerId: dto.registerId, status: 'OPEN' },
        })
      )
        throw new ConflictException('This register already has an open cash shift');
      const openingCash = money(dto.openingCash);
      const shift = await tx.cashShift.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          registerId: dto.registerId,
          cashierId: principal.userId,
          openingCash,
        },
      });
      await tx.cashMovement.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          shiftId: shift.id,
          registerId: dto.registerId,
          recordedById: principal.userId,
          type: CashMovementType.OPENING,
          amount: openingCash,
          referenceType: 'CASH_SHIFT',
          referenceId: shift.id,
          reason: 'Opening drawer float',
        },
      });
      await tx.cashOperation.update({ where: { id: op.id }, data: { shiftId: shift.id } });
      await this.audit(tx, principal, branch.id, 'cash.shift.opened', 'CashShift', shift.id, {
        registerId: dto.registerId,
        openingCash: openingCash.toFixed(4),
      });
      return this.summaryTx(tx, principal.companyId, branch.id, shift.id);
    });
  }

  async current(principal: AuthPrincipal, branch: ActiveBranchContext, registerId: string) {
    const shift = await this.db.cashShift.findFirst({
      where: { companyId: principal.companyId, branchId: branch.id, registerId, status: 'OPEN' },
      select: { id: true },
    });
    return shift ? this.summary(principal, branch, shift.id) : null;
  }

  async summary(principal: AuthPrincipal, branch: ActiveBranchContext, shiftId: string) {
    return this.summaryTx(this.db, principal.companyId, branch.id, shiftId);
  }

  private async summaryTx(
    tx: Tx | DatabaseService,
    companyId: string,
    branchId: string,
    id: string,
  ) {
    const shift = await tx.cashShift.findFirst({
      where: { id, companyId, branchId },
      include: {
        register: { select: { id: true, code: true, name: true } },
        cashier: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!shift) throw new NotFoundException('Cash shift not found');
    const groups = await tx.cashMovement.groupBy({
      by: ['type'],
      where: { companyId, shiftId: id },
      _sum: { amount: true },
    });
    const totals = Object.fromEntries(
      Object.values(CashMovementType).map((type) => [type, money(0).toFixed(4)]),
    ) as Record<CashMovementType, string>;
    let expected = money(0);
    for (const group of groups) {
      const amount = money(group._sum.amount ?? 0);
      totals[group.type] = amount.toFixed(4);
      expected = inbound.has(group.type) ? expected.plus(amount) : expected.minus(amount);
    }
    return {
      ...shift,
      openingCash: shift.openingCash.toFixed(4),
      expectedCash: expected.toDecimalPlaces(4).toFixed(4),
      actualCash: shift.actualCash?.toFixed(4) ?? null,
      variance: shift.variance?.toFixed(4) ?? null,
      totals,
    };
  }

  cashIn(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: ManualCashMovementDto,
  ) {
    return this.manual(
      principal,
      branch,
      key,
      dto,
      CashOperationType.CASH_IN,
      CashMovementType.CASH_IN,
    );
  }

  cashOut(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: ManualCashMovementDto,
  ) {
    return this.manual(
      principal,
      branch,
      key,
      dto,
      CashOperationType.CASH_OUT,
      CashMovementType.CASH_OUT,
    );
  }

  private manual(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: ManualCashMovementDto,
    operationType: CashOperationType,
    movementType: CashMovementType,
  ) {
    return this.idempotent(principal, key, operationType, dto, async (tx, op) => {
      const shift = await this.requireOpenShiftTx(
        tx,
        principal.companyId,
        branch.id,
        dto.registerId,
      );
      const movement = await tx.cashMovement.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          shiftId: shift.id,
          registerId: dto.registerId,
          recordedById: principal.userId,
          type: movementType,
          amount: money(dto.amount),
          referenceType: 'CASH_OPERATION',
          referenceId: op.id,
          reason: dto.reason,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        },
      });
      await tx.cashOperation.update({ where: { id: op.id }, data: { shiftId: shift.id } });
      await this.audit(
        tx,
        principal,
        branch.id,
        `cash.${movementType.toLowerCase()}`,
        'CashMovement',
        movement.id,
        {
          shiftId: shift.id,
          amount: movement.amount.toFixed(4),
          reason: dto.reason,
        },
      );
      return movement;
    });
  }

  closeShift(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    shiftId: string,
    key: string,
    dto: CloseCashShiftDto,
  ) {
    return this.idempotent(
      principal,
      key,
      CashOperationType.CLOSE_SHIFT,
      { shiftId, ...dto },
      async (tx, op) => {
        const target = await tx.cashShift.findFirst({
          where: { id: shiftId, companyId: principal.companyId, branchId: branch.id },
        });
        if (!target) throw new NotFoundException('Cash shift not found');
        await this.lockRegister(tx, principal.companyId, target.registerId);
        const open = await tx.cashShift.findFirst({
          where: {
            id: shiftId,
            companyId: principal.companyId,
            branchId: branch.id,
            status: 'OPEN',
          },
        });
        if (!open) throw new ConflictException('Cash shift is already closed');
        const summary = await this.summaryTx(tx, principal.companyId, branch.id, shiftId);
        const expected = money(summary.expectedCash);
        const actual = money(dto.actualCash);
        const closed = await tx.cashShift.update({
          where: { id: shiftId },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
            expectedCash: expected,
            actualCash: actual,
            variance: money(actual.minus(expected)),
          },
        });
        await tx.cashOperation.update({ where: { id: op.id }, data: { shiftId } });
        await this.audit(tx, principal, branch.id, 'cash.shift.closed', 'CashShift', shiftId, {
          expectedCash: expected.toFixed(4),
          actualCash: actual.toFixed(4),
          variance: actual.minus(expected).toFixed(4),
          note: dto.note,
        });
        return {
          ...closed,
          expectedCash: expected.toFixed(4),
          actualCash: actual.toFixed(4),
          variance: actual.minus(expected).toFixed(4),
        };
      },
    );
  }

  async listShifts(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: CashShiftQueryDto,
  ) {
    const where: Prisma.CashShiftWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      registerId: query.registerId,
      cashierId: query.cashierId,
      status: query.status,
      openedAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };
    const [items, total] = await this.db.$transaction([
      this.db.cashShift.findMany({
        where,
        include: {
          register: { select: { code: true, name: true } },
          cashier: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { openedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.cashShift.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async listMovements(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: CashMovementQueryDto,
  ) {
    const where: Prisma.CashMovementWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      shiftId: query.shiftId,
      registerId: query.registerId,
      type: query.type,
      occurredAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
      ...(query.reference
        ? {
            OR: [
              { referenceType: { contains: query.reference, mode: 'insensitive' } },
              { reason: { contains: query.reference, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.cashMovement.findMany({
        where,
        include: { recordedBy: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { occurredAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.cashMovement.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async listCategories(principal: AuthPrincipal, active?: boolean) {
    return this.db.expenseCategory.findMany({
      where: { companyId: principal.companyId, isActive: active },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async createCategory(principal: AuthPrincipal, dto: CreateExpenseCategoryDto) {
    const code = dto.code.toUpperCase();
    try {
      return await this.db.$transaction(async (tx) => {
        const row = await tx.expenseCategory.create({
          data: {
            companyId: principal.companyId,
            code,
            name: dto.name,
            description: dto.description,
          },
        });
        await this.audit(
          tx,
          principal,
          undefined,
          'expense.category.created',
          'ExpenseCategory',
          row.id,
          { code, name: row.name },
        );
        return row;
      });
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException('Expense category code or name is already in use');
      throw error;
    }
  }

  async updateCategory(principal: AuthPrincipal, id: string, dto: UpdateExpenseCategoryDto) {
    const existing = await this.db.expenseCategory.findFirst({
      where: { id, companyId: principal.companyId },
    });
    if (!existing) throw new NotFoundException('Expense category not found');
    try {
      return await this.db.$transaction(async (tx) => {
        const row = await tx.expenseCategory.update({ where: { id }, data: dto });
        await this.audit(
          tx,
          principal,
          undefined,
          'expense.category.updated',
          'ExpenseCategory',
          id,
          { name: row.name, description: row.description },
        );
        return row;
      });
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException('Expense category name is already in use');
      throw error;
    }
  }

  async setCategoryStatus(principal: AuthPrincipal, id: string, dto: ExpenseCategoryStatusDto) {
    const existing = await this.db.expenseCategory.findFirst({
      where: { id, companyId: principal.companyId },
    });
    if (!existing) throw new NotFoundException('Expense category not found');
    return this.db.$transaction(async (tx) => {
      const row = await tx.expenseCategory.update({
        where: { id },
        data: { isActive: dto.isActive },
      });
      await this.audit(
        tx,
        principal,
        undefined,
        'expense.category.status.changed',
        'ExpenseCategory',
        id,
        { isActive: dto.isActive },
      );
      return row;
    });
  }

  postExpense(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: PostExpenseDto,
  ) {
    return this.idempotent(principal, key, CashOperationType.POST_EXPENSE, dto, async (tx, op) => {
      const [category, method] = await Promise.all([
        tx.expenseCategory.findFirst({
          where: { id: dto.categoryId, companyId: principal.companyId, isActive: true },
        }),
        tx.paymentMethod.findFirst({
          where: { id: dto.paymentMethodId, companyId: principal.companyId, isActive: true },
        }),
      ]);
      if (!category) throw new BadRequestException('Active expense category is unavailable');
      if (!method) throw new BadRequestException('Payment method is unavailable');
      if (method.isCash && !dto.registerId)
        throw new BadRequestException('Register is required for a cash expense');
      const expenseNumber = await this.nextExpenseNumber(tx, principal.companyId);
      const occurredAt = dto.expenseDate ? new Date(dto.expenseDate) : new Date();
      const expense = await tx.expense.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          categoryId: category.id,
          paymentMethodId: method.id,
          createdById: principal.userId,
          expenseNumber,
          amount: money(dto.amount),
          expenseDate: occurredAt,
          description: dto.description,
          reference: dto.reference,
        },
      });
      if (method.isCash) {
        const shift = await this.requireOpenShiftTx(
          tx,
          principal.companyId,
          branch.id,
          dto.registerId!,
        );
        await tx.cashMovement.create({
          data: {
            companyId: principal.companyId,
            branchId: branch.id,
            shiftId: shift.id,
            registerId: dto.registerId!,
            recordedById: principal.userId,
            type: CashMovementType.EXPENSE,
            amount: money(dto.amount),
            referenceType: 'EXPENSE',
            referenceId: expense.id,
            reason: dto.description,
            occurredAt,
          },
        });
        await tx.cashOperation.update({ where: { id: op.id }, data: { shiftId: shift.id } });
      }
      await this.audit(tx, principal, branch.id, 'expense.posted', 'Expense', expense.id, {
        expenseNumber,
        amount: money(dto.amount).toFixed(4),
        cash: method.isCash,
      });
      return expense;
    });
  }

  reverseExpense(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    id: string,
    key: string,
    dto: ReverseExpenseDto,
  ) {
    return this.idempotent(
      principal,
      key,
      CashOperationType.REVERSE_EXPENSE,
      { id, ...dto },
      async (tx, op) => {
        await this.lock(tx, `${principal.companyId}:expense:${id}`);
        const expense = await tx.expense.findFirst({
          where: { id, companyId: principal.companyId, branchId: branch.id },
          include: { paymentMethod: true },
        });
        if (!expense) throw new NotFoundException('Expense not found');
        if (expense.status !== ExpenseStatus.POSTED)
          throw new ConflictException('Expense is already reversed');
        if (expense.paymentMethod.isCash && !dto.registerId)
          throw new BadRequestException('Register is required to reverse a cash expense');
        const reversedAt = new Date();
        const updated = await tx.expense.update({
          where: { id },
          data: {
            status: ExpenseStatus.REVERSED,
            reversedAt,
            reversedById: principal.userId,
            reversalReason: dto.reason,
          },
        });
        if (expense.paymentMethod.isCash) {
          const shift = await this.requireOpenShiftTx(
            tx,
            principal.companyId,
            branch.id,
            dto.registerId!,
          );
          await tx.cashMovement.create({
            data: {
              companyId: principal.companyId,
              branchId: branch.id,
              shiftId: shift.id,
              registerId: dto.registerId!,
              recordedById: principal.userId,
              type: CashMovementType.CASH_IN,
              amount: expense.amount,
              referenceType: 'EXPENSE',
              referenceId: expense.id,
              reason: `Expense reversal: ${dto.reason}`,
              occurredAt: reversedAt,
            },
          });
          await tx.cashOperation.update({ where: { id: op.id }, data: { shiftId: shift.id } });
        }
        await this.audit(tx, principal, branch.id, 'expense.reversed', 'Expense', id, {
          reason: dto.reason,
          amount: expense.amount.toFixed(4),
        });
        return updated;
      },
    );
  }

  async listExpenses(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: ExpenseQueryDto,
  ) {
    const where: Prisma.ExpenseWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      categoryId: query.categoryId,
      paymentMethodId: query.paymentMethodId,
      createdById: query.createdById,
      status: query.status,
      expenseDate:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };
    const [items, total] = await this.db.$transaction([
      this.db.expense.findMany({
        where,
        include: {
          category: true,
          paymentMethod: true,
          createdBy: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.expense.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  private async nextExpenseNumber(tx: Tx, companyId: string) {
    const row = await tx.cashDocumentSequence.upsert({
      where: { companyId_type: { companyId, type: CashDocumentType.EXPENSE } },
      create: { companyId, type: CashDocumentType.EXPENSE, nextValue: 2n },
      update: { nextValue: { increment: 1 } },
      select: { nextValue: true },
    });
    return `EXP-${(row.nextValue - 1n).toString().padStart(6, '0')}`;
  }

  private idempotent<T>(
    principal: AuthPrincipal,
    key: string,
    type: CashOperationType,
    payload: unknown,
    work: (tx: Tx, operation: { id: string }) => Promise<T>,
  ) {
    this.assertKey(key);
    const requestHash = this.hash(payload);
    return this.db
      .$transaction(
        async (tx) => {
          const operation = await tx.cashOperation.create({
            data: {
              companyId: principal.companyId,
              createdById: principal.userId,
              type,
              idempotencyKey: key,
              requestHash,
            },
          });
          const result = await work(tx, operation);
          await tx.cashOperation.update({
            where: { id: operation.id },
            data: { result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue },
          });
          return result;
        },
        { timeout: 30000 },
      )
      .catch(async (error: unknown) => {
        if (!isUniqueConstraintError(error)) throw error;
        const existing = await this.db.cashOperation.findUnique({
          where: {
            companyId_idempotencyKey: { companyId: principal.companyId, idempotencyKey: key },
          },
        });
        if (!existing || existing.type !== type || existing.requestHash !== requestHash)
          throw new ConflictException('Idempotency key was already used for a different request');
        if (!existing.result)
          throw new ConflictException('Operation is still in progress; retry shortly');
        return existing.result as T;
      });
  }

  private assertKey(key: string) {
    if (!key || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/.test(key))
      throw new BadRequestException('A valid Idempotency-Key header is required');
  }
  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
  private lockRegister(tx: Tx, companyId: string, registerId: string) {
    return this.lock(tx, `${companyId}:cash-register:${registerId}`);
  }
  private lock(tx: Tx, key: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
  private audit(
    tx: Tx,
    principal: AuthPrincipal,
    branchId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    value?: Prisma.InputJsonValue,
  ) {
    return tx.auditLog.create({
      data: {
        companyId: principal.companyId,
        branchId,
        actorId: principal.userId,
        action,
        entityType,
        entityId,
        newValue: value,
      },
    });
  }
}
