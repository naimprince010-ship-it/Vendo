import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { DatabaseService } from '../database/database.service';
import { isUniqueConstraintError } from '../database/prisma-errors';
import {
  CustomerLedgerEntryType,
  Prisma,
  SupplierLedgerEntryType,
} from '../generated/prisma/client';
import type {
  CorrectOpeningBalanceDto,
  CreateCustomerDto,
  CreateCustomerGroupDto,
  CreateSupplierDto,
  CreditLimitDto,
  CustomerLedgerQueryDto,
  PartyListQueryDto,
  PostLedgerAmountDto,
  StatusDto,
  SupplierLedgerQueryDto,
  UpdateCustomerDto,
  UpdateCustomerGroupDto,
  UpdateSupplierDto,
} from './dto/parties.dto';

type Tx = Prisma.TransactionClient;
type PartyKind = 'customer' | 'supplier';
const money = (value: string | number | Prisma.Decimal) =>
  new Prisma.Decimal(value).toDecimalPlaces(4);

@Injectable()
export class PartiesService {
  constructor(private readonly db: DatabaseService) {}

  async listGroups(principal: AuthPrincipal, query: PartyListQueryDto) {
    const where = {
      companyId: principal.companyId,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.customerGroup.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { _count: { select: { customers: true } } },
      }),
      this.db.customerGroup.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getGroup(principal: AuthPrincipal, id: string) {
    const group = await this.db.customerGroup.findFirst({
      where: { id, companyId: principal.companyId },
      include: { _count: { select: { customers: true } } },
    });
    if (!group) throw new NotFoundException('Customer group not found');
    return group;
  }

  async createGroup(principal: AuthPrincipal, dto: CreateCustomerGroupDto) {
    try {
      return await this.db.$transaction(async (tx) => {
        const group = await tx.customerGroup.create({
          data: { companyId: principal.companyId, ...dto },
        });
        await this.audit(tx, principal, 'customer_group.created', 'CustomerGroup', group.id, {
          code: group.code,
          name: group.name,
        });
        return group;
      });
    } catch (error) {
      this.unique(error, 'Customer group code is already in use');
    }
  }

  async updateGroup(principal: AuthPrincipal, id: string, dto: UpdateCustomerGroupDto) {
    const before = await this.getGroup(principal, id);
    return this.db.$transaction(async (tx) => {
      const group = await tx.customerGroup.update({ where: { id }, data: dto });
      await this.audit(
        tx,
        principal,
        'customer_group.updated',
        'CustomerGroup',
        id,
        { ...dto },
        { name: before.name, description: before.description },
      );
      return group;
    });
  }

  async groupStatus(principal: AuthPrincipal, id: string, dto: StatusDto) {
    const before = await this.getGroup(principal, id);
    return this.db.$transaction(async (tx) => {
      const group = await tx.customerGroup.update({ where: { id }, data: dto });
      await this.audit(
        tx,
        principal,
        'customer_group.status.changed',
        'CustomerGroup',
        id,
        { isActive: dto.isActive },
        { isActive: before.isActive },
      );
      return group;
    });
  }

  async listCustomers(principal: AuthPrincipal, query: PartyListQueryDto) {
    const where = {
      companyId: principal.companyId,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.customer.findMany({
        where,
        orderBy: [{ isWalkIn: 'desc' }, { name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { group: true },
      }),
      this.db.customer.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getCustomer(principal: AuthPrincipal, id: string) {
    const customer = await this.db.customer.findFirst({
      where: { id, companyId: principal.companyId },
      include: { group: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const balance = await this.db.customerLedgerEntry.aggregate({
      where: { companyId: principal.companyId, customerId: id },
      _sum: { amount: true },
    });
    return { ...customer, balance: money(balance._sum.amount ?? 0).toFixed(4) };
  }

  async createCustomer(principal: AuthPrincipal, dto: CreateCustomerDto) {
    if (dto.code === 'WALK-IN')
      throw new BadRequestException('WALK-IN is a reserved customer code');
    if (dto.groupId) await this.requireActiveGroup(principal.companyId, dto.groupId);
    try {
      return await this.db.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: { companyId: principal.companyId, ...dto, creditLimit: money(dto.creditLimit) },
          include: { group: true },
        });
        await this.audit(tx, principal, 'customer.created', 'Customer', customer.id, {
          code: customer.code,
          name: customer.name,
          groupId: customer.groupId,
          creditLimit: customer.creditLimit.toFixed(4),
        });
        return customer;
      });
    } catch (error) {
      this.unique(error, 'Customer code is already in use');
    }
  }

  async updateCustomer(principal: AuthPrincipal, id: string, dto: UpdateCustomerDto) {
    const before = await this.getCustomer(principal, id);
    if (before.isWalkIn && (dto.name !== undefined || dto.groupId !== undefined))
      throw new BadRequestException('Walk-in customer identity cannot be changed');
    if (dto.groupId) await this.requireActiveGroup(principal.companyId, dto.groupId);
    const customer = await this.db.$transaction(async (tx) => {
      const updated = await tx.customer.update({ where: { id }, data: dto });
      await this.audit(tx, principal, 'customer.updated', 'Customer', id, {
        name: dto.name,
        groupId: dto.groupId,
      });
      return updated;
    });
    return { ...customer, balance: before.balance };
  }

  async customerStatus(principal: AuthPrincipal, id: string, dto: StatusDto) {
    const before = await this.getCustomer(principal, id);
    if (before.isWalkIn && !dto.isActive)
      throw new BadRequestException('Walk-in customer cannot be deactivated');
    await this.db.$transaction(async (tx) => {
      await tx.customer.update({ where: { id }, data: dto });
      await this.audit(
        tx,
        principal,
        'customer.status.changed',
        'Customer',
        id,
        { isActive: dto.isActive },
        { isActive: before.isActive },
      );
    });
    return this.getCustomer(principal, id);
  }

  async setCreditLimit(principal: AuthPrincipal, id: string, dto: CreditLimitDto) {
    const before = await this.getCustomer(principal, id);
    const value = money(dto.creditLimit);
    await this.db.$transaction(async (tx) => {
      await tx.customer.update({ where: { id }, data: { creditLimit: value } });
      await this.audit(
        tx,
        principal,
        'customer.credit_limit.changed',
        'Customer',
        id,
        { creditLimit: value.toFixed(4) },
        { creditLimit: before.creditLimit.toFixed(4) },
        dto.reason,
      );
    });
    return this.getCustomer(principal, id);
  }

  async listSuppliers(principal: AuthPrincipal, query: PartyListQueryDto) {
    const where = {
      companyId: principal.companyId,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { contactName: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.supplier.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.supplier.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getSupplier(principal: AuthPrincipal, id: string) {
    const supplier = await this.db.supplier.findFirst({
      where: { id, companyId: principal.companyId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    const balance = await this.db.supplierLedgerEntry.aggregate({
      where: { companyId: principal.companyId, supplierId: id },
      _sum: { amount: true },
    });
    return { ...supplier, balance: money(balance._sum.amount ?? 0).toFixed(4) };
  }

  async createSupplier(principal: AuthPrincipal, dto: CreateSupplierDto) {
    try {
      return await this.db.$transaction(async (tx) => {
        const supplier = await tx.supplier.create({
          data: { companyId: principal.companyId, ...dto },
        });
        await this.audit(tx, principal, 'supplier.created', 'Supplier', supplier.id, {
          code: supplier.code,
          name: supplier.name,
        });
        return supplier;
      });
    } catch (error) {
      this.unique(error, 'Supplier code is already in use');
    }
  }

  async updateSupplier(principal: AuthPrincipal, id: string, dto: UpdateSupplierDto) {
    const before = await this.getSupplier(principal, id);
    await this.db.$transaction(async (tx) => {
      await tx.supplier.update({ where: { id }, data: dto });
      await this.audit(
        tx,
        principal,
        'supplier.updated',
        'Supplier',
        id,
        { name: dto.name },
        { name: before.name },
      );
    });
    return this.getSupplier(principal, id);
  }

  async supplierStatus(principal: AuthPrincipal, id: string, dto: StatusDto) {
    const before = await this.getSupplier(principal, id);
    await this.db.$transaction(async (tx) => {
      await tx.supplier.update({ where: { id }, data: dto });
      await this.audit(
        tx,
        principal,
        'supplier.status.changed',
        'Supplier',
        id,
        { isActive: dto.isActive },
        { isActive: before.isActive },
      );
    });
    return this.getSupplier(principal, id);
  }

  postCustomerOpening(principal: AuthPrincipal, id: string, key: string, dto: PostLedgerAmountDto) {
    return this.postLedger(principal, 'customer', id, key, 'opening', dto);
  }

  postCustomerAdjustment(
    principal: AuthPrincipal,
    id: string,
    key: string,
    dto: PostLedgerAmountDto,
  ) {
    return this.postLedger(principal, 'customer', id, key, 'adjustment', dto);
  }

  correctCustomerOpening(
    principal: AuthPrincipal,
    id: string,
    key: string,
    dto: CorrectOpeningBalanceDto,
  ) {
    return this.correctOpening(principal, 'customer', id, key, dto);
  }

  postSupplierOpening(principal: AuthPrincipal, id: string, key: string, dto: PostLedgerAmountDto) {
    return this.postLedger(principal, 'supplier', id, key, 'opening', dto);
  }

  postSupplierAdjustment(
    principal: AuthPrincipal,
    id: string,
    key: string,
    dto: PostLedgerAmountDto,
  ) {
    return this.postLedger(principal, 'supplier', id, key, 'adjustment', dto);
  }

  correctSupplierOpening(
    principal: AuthPrincipal,
    id: string,
    key: string,
    dto: CorrectOpeningBalanceDto,
  ) {
    return this.correctOpening(principal, 'supplier', id, key, dto);
  }

  customerLedger(principal: AuthPrincipal, id: string, query: CustomerLedgerQueryDto) {
    return this.listLedger(principal, 'customer', id, query);
  }

  supplierLedger(principal: AuthPrincipal, id: string, query: SupplierLedgerQueryDto) {
    return this.listLedger(principal, 'supplier', id, query);
  }

  private async postLedger(
    principal: AuthPrincipal,
    kind: PartyKind,
    partyId: string,
    key: string,
    operation: 'opening' | 'adjustment',
    dto: PostLedgerAmountDto,
  ) {
    this.assertKey(key);
    const amount = money(dto.amount);
    if (amount.isZero()) throw new BadRequestException('Ledger amount must not be zero');
    await this.requireParty(principal, kind, partyId);
    const hash = this.hash({ kind, partyId, operation, ...dto, amount: amount.toFixed(4) });
    const existing = await this.findIdempotent(principal.companyId, kind, key);
    if (existing) return this.replay(existing, hash);
    try {
      return await this.db.$transaction(async (tx) => {
        await this.lockParty(tx, principal.companyId, kind, partyId);
        const replay = await this.findIdempotentTx(tx, principal.companyId, kind, key);
        if (replay) return this.replay(replay, hash);
        if (operation === 'opening') {
          const exists =
            kind === 'customer'
              ? await tx.customerLedgerEntry.findFirst({
                  where: {
                    companyId: principal.companyId,
                    customerId: partyId,
                    type: CustomerLedgerEntryType.OPENING_BALANCE,
                  },
                })
              : await tx.supplierLedgerEntry.findFirst({
                  where: {
                    companyId: principal.companyId,
                    supplierId: partyId,
                    type: SupplierLedgerEntryType.OPENING_BALANCE,
                  },
                });
          if (exists) throw new ConflictException('Opening balance has already been posted');
        }
        const entry = await this.createEntry(tx, principal, kind, partyId, {
          key,
          hash,
          amount,
          type:
            operation === 'opening'
              ? kind === 'customer'
                ? CustomerLedgerEntryType.OPENING_BALANCE
                : SupplierLedgerEntryType.OPENING_BALANCE
              : kind === 'customer'
                ? CustomerLedgerEntryType.ADJUSTMENT
                : SupplierLedgerEntryType.ADJUSTMENT,
          effectiveAt: new Date(dto.effectiveAt),
          description: dto.description,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
        });
        await this.audit(
          tx,
          principal,
          `${kind}.ledger.${operation}.posted`,
          kind === 'customer' ? 'CustomerLedgerEntry' : 'SupplierLedgerEntry',
          entry.id,
          { partyId, amount: amount.toFixed(4), effectiveAt: dto.effectiveAt },
          undefined,
          dto.description,
        );
        return entry;
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const replay = await this.findIdempotent(principal.companyId, kind, key);
      if (replay) return this.replay(replay, hash);
      throw new ConflictException('Opening balance has already been posted');
    }
  }

  private async correctOpening(
    principal: AuthPrincipal,
    kind: PartyKind,
    partyId: string,
    key: string,
    dto: CorrectOpeningBalanceDto,
  ) {
    this.assertKey(key);
    await this.requireParty(principal, kind, partyId);
    const corrected = money(dto.correctedAmount);
    const hash = this.hash({
      kind,
      partyId,
      operation: 'opening-correction',
      ...dto,
      corrected: corrected.toFixed(4),
    });
    const existing = await this.findIdempotent(principal.companyId, kind, key);
    if (existing) return this.replay(existing, hash);
    try {
      return await this.db.$transaction(async (tx) => {
        await this.lockParty(tx, principal.companyId, kind, partyId);
        const replay = await this.findIdempotentTx(tx, principal.companyId, kind, key);
        if (replay) return this.replay(replay, hash);
        const types =
          kind === 'customer'
            ? [CustomerLedgerEntryType.OPENING_BALANCE, CustomerLedgerEntryType.OPENING_CORRECTION]
            : [SupplierLedgerEntryType.OPENING_BALANCE, SupplierLedgerEntryType.OPENING_CORRECTION];
        const opening =
          kind === 'customer'
            ? await tx.customerLedgerEntry.findFirst({
                where: {
                  companyId: principal.companyId,
                  customerId: partyId,
                  type: CustomerLedgerEntryType.OPENING_BALANCE,
                },
                select: { id: true },
              })
            : await tx.supplierLedgerEntry.findFirst({
                where: {
                  companyId: principal.companyId,
                  supplierId: partyId,
                  type: SupplierLedgerEntryType.OPENING_BALANCE,
                },
                select: { id: true },
              });
        if (!opening) throw new ConflictException('Opening balance has not been posted');
        const aggregate =
          kind === 'customer'
            ? await tx.customerLedgerEntry.aggregate({
                where: {
                  companyId: principal.companyId,
                  customerId: partyId,
                  type: { in: types },
                },
                _sum: { amount: true },
              })
            : await tx.supplierLedgerEntry.aggregate({
                where: {
                  companyId: principal.companyId,
                  supplierId: partyId,
                  type: { in: types },
                },
                _sum: { amount: true },
              });
        const current = money(aggregate._sum.amount ?? 0);
        const delta = corrected.minus(current).toDecimalPlaces(4);
        if (delta.isZero()) throw new BadRequestException('Opening balance already has this value');
        const entry = await this.createEntry(tx, principal, kind, partyId, {
          key,
          hash,
          amount: delta,
          type:
            kind === 'customer'
              ? CustomerLedgerEntryType.OPENING_CORRECTION
              : SupplierLedgerEntryType.OPENING_CORRECTION,
          effectiveAt: new Date(dto.effectiveAt),
          description: dto.reason,
          referenceType: 'OPENING_BALANCE_CORRECTION',
        });
        await this.audit(
          tx,
          principal,
          `${kind}.ledger.opening.corrected`,
          kind === 'customer' ? 'CustomerLedgerEntry' : 'SupplierLedgerEntry',
          entry.id,
          { partyId, correctedAmount: corrected.toFixed(4), delta: delta.toFixed(4) },
          { openingAmount: current.toFixed(4) },
          dto.reason,
        );
        return entry;
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const replay = await this.findIdempotent(principal.companyId, kind, key);
      if (replay) return this.replay(replay, hash);
      throw error;
    }
  }

  private async listLedger(
    principal: AuthPrincipal,
    kind: PartyKind,
    partyId: string,
    query: CustomerLedgerQueryDto | SupplierLedgerQueryDto,
  ) {
    await this.requireParty(principal, kind, partyId);
    const date = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
    const where = {
      companyId: principal.companyId,
      ...(kind === 'customer' ? { customerId: partyId } : { supplierId: partyId }),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to ? { effectiveAt: date } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total, aggregate] =
      kind === 'customer'
        ? await this.db.$transaction([
            this.db.customerLedgerEntry.findMany({
              where: where as Prisma.CustomerLedgerEntryWhereInput,
              orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
              skip,
              take: query.limit,
              include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.db.customerLedgerEntry.count({
              where: where as Prisma.CustomerLedgerEntryWhereInput,
            }),
            this.db.customerLedgerEntry.aggregate({
              where: { companyId: principal.companyId, customerId: partyId },
              _sum: { amount: true },
            }),
          ])
        : await this.db.$transaction([
            this.db.supplierLedgerEntry.findMany({
              where: where as Prisma.SupplierLedgerEntryWhereInput,
              orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
              skip,
              take: query.limit,
              include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.db.supplierLedgerEntry.count({
              where: where as Prisma.SupplierLedgerEntryWhereInput,
            }),
            this.db.supplierLedgerEntry.aggregate({
              where: { companyId: principal.companyId, supplierId: partyId },
              _sum: { amount: true },
            }),
          ]);
    const balance = money(aggregate._sum.amount ?? 0).toFixed(4);
    const canCalculateRunning = !query.type && !query.from && !query.to && query.page === 1;
    let running = money(balance);
    return {
      items: items.map((entry) => {
        const amount = money(entry.amount);
        const result = {
          ...entry,
          amount: amount.toFixed(4),
          debit:
            kind === 'customer'
              ? amount.isPositive()
                ? amount.toFixed(4)
                : '0.0000'
              : amount.isNegative()
                ? amount.abs().toFixed(4)
                : '0.0000',
          credit:
            kind === 'customer'
              ? amount.isNegative()
                ? amount.abs().toFixed(4)
                : '0.0000'
              : amount.isPositive()
                ? amount.toFixed(4)
                : '0.0000',
          runningBalance: canCalculateRunning ? running.toFixed(4) : null,
        };
        running = running.minus(amount);
        return result;
      }),
      total,
      page: query.page,
      limit: query.limit,
      balance,
      runningBalanceScope: canCalculateRunning ? 'FULL_LEDGER_FIRST_PAGE' : null,
    };
  }

  private async requireActiveGroup(companyId: string, id: string) {
    const group = await this.db.customerGroup.findFirst({
      where: { id, companyId, isActive: true },
      select: { id: true },
    });
    if (!group) throw new BadRequestException('Customer group is invalid or inactive');
  }

  private async requireParty(principal: AuthPrincipal, kind: PartyKind, id: string) {
    const party =
      kind === 'customer'
        ? await this.db.customer.findFirst({ where: { id, companyId: principal.companyId } })
        : await this.db.supplier.findFirst({ where: { id, companyId: principal.companyId } });
    if (!party)
      throw new NotFoundException(`${kind === 'customer' ? 'Customer' : 'Supplier'} not found`);
    return party;
  }

  private async createEntry(
    tx: Tx,
    principal: AuthPrincipal,
    kind: PartyKind,
    partyId: string,
    data: {
      key: string;
      hash: string;
      amount: Prisma.Decimal;
      type: CustomerLedgerEntryType | SupplierLedgerEntryType;
      effectiveAt: Date;
      description: string;
      referenceType?: string;
      referenceId?: string;
    },
  ) {
    const common = {
      companyId: principal.companyId,
      createdById: principal.userId,
      amount: data.amount,
      effectiveAt: data.effectiveAt,
      description: data.description,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      idempotencyKey: data.key,
      requestHash: data.hash,
    };
    return kind === 'customer'
      ? tx.customerLedgerEntry.create({
          data: { ...common, customerId: partyId, type: data.type as CustomerLedgerEntryType },
        })
      : tx.supplierLedgerEntry.create({
          data: { ...common, supplierId: partyId, type: data.type as SupplierLedgerEntryType },
        });
  }

  private findIdempotent(companyId: string, kind: PartyKind, key: string) {
    return kind === 'customer'
      ? this.db.customerLedgerEntry.findUnique({
          where: { companyId_idempotencyKey: { companyId, idempotencyKey: key } },
        })
      : this.db.supplierLedgerEntry.findUnique({
          where: { companyId_idempotencyKey: { companyId, idempotencyKey: key } },
        });
  }

  private findIdempotentTx(tx: Tx, companyId: string, kind: PartyKind, key: string) {
    return kind === 'customer'
      ? tx.customerLedgerEntry.findUnique({
          where: { companyId_idempotencyKey: { companyId, idempotencyKey: key } },
        })
      : tx.supplierLedgerEntry.findUnique({
          where: { companyId_idempotencyKey: { companyId, idempotencyKey: key } },
        });
  }

  private replay<T extends { requestHash: string }>(entry: T, hash: string): T {
    if (entry.requestHash !== hash)
      throw new ConflictException('Idempotency key was already used for another request');
    return entry;
  }

  private lockParty(tx: Tx, companyId: string, kind: PartyKind, partyId: string) {
    const key = `${companyId}:${kind}:${partyId}:ledger`;
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }

  private assertKey(key: string) {
    if (!key || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,99}$/.test(key))
      throw new BadRequestException('A valid Idempotency-Key header is required');
  }

  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private async audit(
    tx: Tx,
    principal: AuthPrincipal,
    action: string,
    entityType: string,
    entityId: string,
    newValue?: Prisma.InputJsonValue,
    previousValue?: Prisma.InputJsonValue,
    reason?: string,
  ) {
    await tx.auditLog.create({
      data: {
        companyId: principal.companyId,
        actorId: principal.userId,
        action,
        entityType,
        entityId,
        newValue,
        previousValue,
        reason,
      },
    });
  }

  private unique(error: unknown, message: string): never {
    if (isUniqueConstraintError(error)) throw new ConflictException(message);
    throw error;
  }
}
