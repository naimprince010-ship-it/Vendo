import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { PERMISSIONS } from '../authorization/permission-catalog';
import type { ActiveBranchContext } from '../authorization/authenticated-request';
import { DatabaseService } from '../database/database.service';
import { CashService } from '../cash/cash.service';
import { isUniqueConstraintError } from '../database/prisma-errors';
import {
  CustomerLedgerEntryType,
  CashMovementType,
  CashShiftStatus,
  PaymentDirection,
  PaymentStatus,
  PriceType,
  PricingMode,
  Prisma,
  ReturnDisposition,
  SaleReturnKind,
  SaleStatus,
  SalesDocumentType,
  SalesOperationType,
  UserStatus,
} from '../generated/prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import type {
  CompleteSaleDto,
  CollectCustomerPaymentDto,
  PostSaleExchangeDto,
  PostSaleRefundDto,
  PostSaleReturnDto,
  PosCustomerQueryDto,
  PosSearchQueryDto,
  SaleLineDto,
  SaleListQueryDto,
  SaleFinancialListQueryDto,
  SalePaymentInputDto,
  SaveSaleDto,
} from './dto/sales.dto';

type Tx = Prisma.TransactionClient;
type DecimalValue = string | number | Prisma.Decimal;
const money = (value: DecimalValue) => new Prisma.Decimal(value).toDecimalPlaces(4);
const q6 = (value: DecimalValue) => new Prisma.Decimal(value).toDecimalPlaces(6);
const factor10 = (value: DecimalValue) => new Prisma.Decimal(value).toDecimalPlaces(10);

type PreparedLine = {
  input: SaleLineDto;
  productId: string;
  unitId: string;
  batchId?: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitCodeSnapshot: string;
  tileSizeSnapshot?: string;
  batchNumberSnapshot?: string;
  lotNumberSnapshot?: string;
  shadeSnapshot?: string;
  trackInventory: boolean;
  quantity: Prisma.Decimal;
  baseQuantity: Prisma.Decimal;
  conversionFactor: Prisma.Decimal;
  configuredPrice: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  gross: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  override: boolean;
};

type PreparedSale = {
  lines: PreparedLine[];
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
};

@Injectable()
export class SalesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly inventory: InventoryService,
    private readonly cash: CashService,
  ) {}

  async posContext(principal: AuthPrincipal, branch: ActiveBranchContext) {
    const [warehouses, registers, paymentMethods, walkIn] = await Promise.all([
      this.db.warehouse.findMany({
        where: { companyId: principal.companyId, branchId: branch.id, isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.db.register.findMany({
        where: { companyId: principal.companyId, branchId: branch.id, isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          cashShifts: {
            where: { status: CashShiftStatus.OPEN },
            select: { id: true, cashierId: true, openedAt: true },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.db.paymentMethod.findMany({
        where: { companyId: principal.companyId, isActive: true },
        select: { id: true, code: true, name: true, isCash: true },
        orderBy: { name: 'asc' },
      }),
      this.db.customer.findFirst({
        where: { companyId: principal.companyId, isWalkIn: true, isActive: true },
        select: { id: true, code: true, name: true, isWalkIn: true, creditLimit: true },
      }),
    ]);
    if (!walkIn) throw new ConflictException('Company walk-in customer is unavailable');
    return { warehouses, registers, paymentMethods, walkIn };
  }

  async searchCustomers(principal: AuthPrincipal, query: PosCustomerQueryDto) {
    return this.db.customer.findMany({
      where: {
        companyId: principal.companyId,
        isActive: true,
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        isWalkIn: true,
        creditLimit: true,
      },
      orderBy: [{ isWalkIn: 'desc' }, { name: 'asc' }],
      take: query.limit,
    });
  }

  async searchProducts(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: PosSearchQueryDto,
  ) {
    await this.requireWarehouse(this.db, principal.companyId, branch.id, query.warehouseId);
    if (!query.search && !query.barcode)
      throw new BadRequestException('Search text or an exact barcode is required');
    const where: Prisma.ProductWhereInput = {
      companyId: principal.companyId,
      isActive: true,
      ...(query.barcode
        ? { barcodes: { some: { barcode: query.barcode } } }
        : {
            OR: [
              { sku: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { brand: { name: { contains: query.search, mode: 'insensitive' } } },
              { manufacturer: { name: { contains: query.search, mode: 'insensitive' } } },
              { tileProfile: { displaySize: { contains: query.search, mode: 'insensitive' } } },
              { barcodes: { some: { barcode: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }),
    };
    const products = await this.db.product.findMany({
      where,
      take: query.barcode ? 1 : query.limit,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      include: {
        brand: { select: { id: true, name: true } },
        manufacturer: { select: { id: true, name: true } },
        baseUnit: true,
        tileProfile: true,
        barcodes: { orderBy: [{ isPrimary: 'desc' }, { barcode: 'asc' }] },
        conversions: {
          where: { isActive: true },
          include: { fromUnit: true },
          orderBy: { fromUnit: { code: 'asc' } },
        },
        prices: { where: { isActive: true }, include: { unit: true } },
        inventoryBalances: { where: { warehouseId: query.warehouseId, batchId: null } },
        batches: {
          where: { isActive: true },
          orderBy: [{ batchNumber: 'asc' }, { shade: 'asc' }],
          include: { inventoryBalances: { where: { warehouseId: query.warehouseId } } },
        },
      },
    });
    return {
      items: products.map((product) => {
        const scanned = query.barcode
          ? product.barcodes.find((barcode) => barcode.barcode === query.barcode)
          : undefined;
        const units = [
          { unit: product.baseUnit, factorToBase: '1' },
          ...product.conversions.map((row) => ({
            unit: row.fromUnit,
            factorToBase: row.factorToBase.toFixed(),
          })),
        ];
        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          type: product.type,
          model: product.model,
          brand: product.brand,
          manufacturer: product.manufacturer,
          primaryBarcode: product.barcodes.find((row) => row.isPrimary)?.barcode ?? null,
          scannedUnitId: scanned?.unitId ?? product.baseUnitId,
          baseUnit: product.baseUnit,
          units,
          prices: product.prices.map((row) => ({
            unitId: row.unitId,
            type: row.type,
            amount: row.amount.toFixed(),
          })),
          trackInventory: product.trackInventory,
          batchTracking: product.batchTracking,
          availability: product.batchTracking
            ? product.batches.map((batch) => ({
                id: batch.id,
                batchNumber: batch.batchNumber,
                lotNumber: batch.lotNumber,
                shade: batch.shade,
                baseQuantity: (batch.inventoryBalances[0]?.baseQuantity ?? q6(0)).toFixed(),
              }))
            : {
                baseQuantity: product.trackInventory
                  ? (product.inventoryBalances[0]?.baseQuantity ?? q6(0)).toFixed()
                  : null,
              },
          tile: product.tileProfile
            ? { displaySize: product.tileProfile.displaySize, color: product.tileProfile.color }
            : null,
          standardCost: principal.permissions.has(PERMISSIONS.PRODUCT_VIEW_COST)
            ? (product.standardCost?.toFixed() ?? null)
            : undefined,
        };
      }),
    };
  }

  createDraft(principal: AuthPrincipal, branch: ActiveBranchContext, dto: SaveSaleDto) {
    return this.db.$transaction(async (tx) => {
      await this.validateContext(tx, principal, branch.id, dto);
      const prepared = await this.prepare(tx, principal, dto);
      const sale = await tx.sale.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          warehouseId: dto.warehouseId,
          registerId: dto.registerId,
          customerId: dto.customerId,
          createdById: principal.userId,
          salespersonId: dto.salespersonId,
          invoiceNumber: `DRAFT-${randomUUID()}`,
          status: SaleStatus.DRAFT,
          pricingMode: dto.pricingMode,
          ...this.header(prepared),
          paid: money(0),
          due: prepared.total,
          change: money(0),
          notes: dto.notes,
          items: { create: prepared.lines.map((line) => this.lineData(principal, line)) },
        },
      });
      await this.audit(tx, principal, branch.id, 'sale.draft.created', sale.id, {
        lines: prepared.lines.length,
      });
      return this.getInTx(tx, principal, branch.id, sale.id);
    });
  }

  updateDraft(principal: AuthPrincipal, branch: ActiveBranchContext, id: string, dto: SaveSaleDto) {
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, `${principal.companyId}:sale:${id}`);
      const sale = await this.requireDraft(tx, principal.companyId, branch.id, id);
      if (sale.status !== SaleStatus.DRAFT)
        throw new ConflictException('Resume a held sale before editing it');
      await this.validateContext(tx, principal, branch.id, dto);
      const prepared = await this.prepare(tx, principal, dto);
      await tx.saleItem.deleteMany({ where: { saleId: id, companyId: principal.companyId } });
      await tx.sale.update({
        where: { id },
        data: {
          warehouseId: dto.warehouseId,
          registerId: dto.registerId,
          customerId: dto.customerId,
          salespersonId: dto.salespersonId,
          pricingMode: dto.pricingMode,
          ...this.header(prepared),
          due: prepared.total,
          notes: dto.notes,
          items: { create: prepared.lines.map((line) => this.lineData(principal, line)) },
        },
      });
      await this.audit(tx, principal, branch.id, 'sale.draft.updated', id);
      return this.getInTx(tx, principal, branch.id, id);
    });
  }

  transitionDraft(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    id: string,
    action: 'hold' | 'resume',
  ) {
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, `${principal.companyId}:sale:${id}`);
      const sale = await this.requireDraft(tx, principal.companyId, branch.id, id);
      const expected = action === 'hold' ? SaleStatus.DRAFT : SaleStatus.HELD;
      const status = action === 'hold' ? SaleStatus.HELD : SaleStatus.DRAFT;
      if (sale.status !== expected)
        throw new ConflictException(`Sale cannot be ${action === 'hold' ? 'held' : 'resumed'}`);
      await tx.sale.update({ where: { id }, data: { status } });
      await this.audit(
        tx,
        principal,
        branch.id,
        `sale.${action === 'hold' ? 'held' : 'resumed'}`,
        id,
      );
      return this.getInTx(tx, principal, branch.id, id);
    });
  }

  async complete(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: CompleteSaleDto,
  ) {
    this.assertKey(key);
    const requestHash = this.hash(dto);
    try {
      return await this.db.$transaction(
        async (tx) => {
          const operation = await tx.salesOperation.create({
            data: {
              companyId: principal.companyId,
              createdById: principal.userId,
              type: SalesOperationType.COMPLETE_SALE,
              idempotencyKey: key,
              requestHash,
            },
          });
          if (dto.draftSaleId)
            await this.lock(tx, `${principal.companyId}:sale:${dto.draftSaleId}`);
          await this.validateContext(tx, principal, branch.id, dto);
          const customer = await this.requireCustomer(tx, principal.companyId, dto.customerId);
          const prepared = await this.prepare(tx, principal, dto);
          const paymentInputs = this.paymentInputs(dto);
          const paid = money(
            paymentInputs.reduce((sum, payment) => sum.plus(money(payment.amount)), money(0)),
          );
          if (paid.greaterThan(prepared.total))
            throw new BadRequestException('Payment cannot exceed the invoice total');
          const due = money(prepared.total.minus(paid));
          let change = money(0);
          const paymentMethods = await tx.paymentMethod.findMany({
            where: {
              id: { in: paymentInputs.map((payment) => payment.methodId) },
              companyId: principal.companyId,
              isActive: true,
            },
            select: { id: true, isCash: true },
          });
          if (paymentMethods.length !== paymentInputs.length)
            throw new BadRequestException('One or more payment methods are unavailable');
          for (const payment of paymentInputs) {
            const method = paymentMethods.find((row) => row.id === payment.methodId)!;
            if (method.isCash) {
              const applied = money(payment.amount);
              const tendered = money(payment.tendered ?? payment.amount);
              if (tendered.lessThan(applied))
                throw new BadRequestException('Cash tendered cannot be less than cash applied');
              change = money(change.plus(tendered.minus(applied)));
            } else if (payment.tendered)
              throw new BadRequestException('Tendered amount is valid only for cash');
          }
          if (due.greaterThan(0)) {
            if (customer.isWalkIn)
              throw new ConflictException('Walk-in sales must be fully settled');
            await this.lock(tx, `${principal.companyId}:customer:${customer.id}`);
            const balance = await tx.customerLedgerEntry.aggregate({
              where: { companyId: principal.companyId, customerId: customer.id },
              _sum: { amount: true },
            });
            const projected = money(balance._sum.amount ?? 0).plus(due);
            if (projected.greaterThan(customer.creditLimit))
              throw new ConflictException('Customer credit limit would be exceeded');
          }
          let saleId: string;
          if (dto.draftSaleId) {
            const draft = await this.requireDraft(
              tx,
              principal.companyId,
              branch.id,
              dto.draftSaleId,
            );
            if (draft.status !== SaleStatus.DRAFT && draft.status !== SaleStatus.HELD)
              throw new ConflictException('Only a draft or held sale can be completed');
            await tx.saleItem.deleteMany({
              where: { saleId: draft.id, companyId: principal.companyId },
            });
            saleId = draft.id;
          } else {
            saleId = randomUUID();
          }
          const invoiceNumber = await this.nextNumber(
            tx,
            principal.companyId,
            SalesDocumentType.SALE_INVOICE,
          );
          const saleData = {
            companyId: principal.companyId,
            branchId: branch.id,
            warehouseId: dto.warehouseId,
            registerId: dto.registerId,
            customerId: dto.customerId,
            createdById: principal.userId,
            salespersonId: dto.salespersonId,
            invoiceNumber,
            status: SaleStatus.COMPLETED,
            pricingMode: dto.pricingMode,
            ...this.header(prepared),
            paid,
            due,
            change,
            notes: dto.notes,
            completedAt: new Date(),
            items: { create: prepared.lines.map((line) => this.lineData(principal, line)) },
          } satisfies Prisma.SaleUncheckedCreateInput;
          if (dto.draftSaleId) {
            const { items, ...update } = saleData;
            await tx.sale.update({ where: { id: saleId }, data: { ...update, items } });
          } else {
            await tx.sale.create({ data: { id: saleId, ...saleData } });
          }
          for (const line of [...prepared.lines].sort((a, b) =>
            `${a.productId}:${a.batchId ?? '-'}`.localeCompare(
              `${b.productId}:${b.batchId ?? '-'}`,
            ),
          )) {
            if (line.trackInventory)
              await this.inventory.postSaleMovement(
                tx,
                principal,
                branch.id,
                dto.warehouseId,
                {
                  productId: line.productId,
                  unitId: line.unitId,
                  batchId: line.batchId,
                  quantity: line.quantity.toFixed(),
                },
                saleId,
                line.unitCost,
              );
          }
          for (const input of paymentInputs) {
            const paymentNumber = await this.nextNumber(
              tx,
              principal.companyId,
              SalesDocumentType.SALE_PAYMENT,
            );
            const payment = await tx.payment.create({
              data: {
                companyId: principal.companyId,
                branchId: branch.id,
                methodId: input.methodId,
                customerId: customer.id,
                recordedById: principal.userId,
                paymentNumber,
                direction: PaymentDirection.INBOUND,
                status: PaymentStatus.COMPLETED,
                amount: money(input.amount),
                reference: input.reference,
                paidAt: new Date(),
              },
            });
            await tx.salePayment.create({
              data: {
                companyId: principal.companyId,
                saleId,
                paymentId: payment.id,
                amount: money(input.amount),
              },
            });
            const method = paymentMethods.find((row) => row.id === input.methodId)!;
            if (method.isCash)
              await this.cash.postPaymentMovementTx(tx, principal, {
                branchId: branch.id,
                registerId: dto.registerId,
                paymentId: payment.id,
                type: CashMovementType.CASH_SALE,
                amount: input.amount,
                occurredAt: payment.paidAt,
                referenceType: 'SALE_PAYMENT',
                referenceId: payment.id,
              });
          }
          if (due.greaterThan(0)) {
            await tx.customerLedgerEntry.create({
              data: {
                companyId: principal.companyId,
                branchId: branch.id,
                customerId: customer.id,
                createdById: principal.userId,
                type: CustomerLedgerEntryType.SALE_INVOICE,
                amount: due,
                effectiveAt: new Date(),
                referenceType: 'SALE',
                referenceId: saleId,
                description: `Credit sale ${invoiceNumber}`,
                idempotencyKey: `sale:${key}`,
                requestHash,
              },
            });
          }
          await this.audit(tx, principal, branch.id, 'sale.completed', saleId, {
            invoiceNumber,
            total: prepared.total.toFixed(4),
            paid: paid.toFixed(4),
            due: due.toFixed(4),
          });
          for (const line of prepared.lines.filter((row) => row.override))
            await this.audit(tx, principal, branch.id, 'sale.price.overridden', saleId, {
              productId: line.productId,
              configuredPrice: line.configuredPrice.toFixed(4),
              unitPrice: line.unitPrice.toFixed(4),
              reason: line.input.priceOverrideReason,
            });
          const result = await this.getInTx(tx, principal, branch.id, saleId);
          await tx.salesOperation.update({
            where: { id: operation.id },
            data: { result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue },
          });
          return result;
        },
        { timeout: 30000 },
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const existing = await this.db.salesOperation.findUnique({
        where: {
          companyId_idempotencyKey: { companyId: principal.companyId, idempotencyKey: key },
        },
      });
      if (
        !existing ||
        existing.type !== SalesOperationType.COMPLETE_SALE ||
        existing.requestHash !== requestHash
      )
        throw new ConflictException('Idempotency key was already used for a different request');
      if (!existing.result)
        throw new ConflictException('Sale completion is still in progress; retry shortly');
      return existing.result;
    }
  }

  collectCustomerPayment(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: CollectCustomerPaymentDto,
  ) {
    return this.idempotent(
      principal,
      key,
      SalesOperationType.CUSTOMER_COLLECTION,
      dto,
      async (tx, operationId, requestHash) => {
        await this.lock(tx, `${principal.companyId}:customer:${dto.customerId}`);
        const customer = await this.requireCustomer(tx, principal.companyId, dto.customerId);
        if (customer.isWalkIn)
          throw new BadRequestException('Walk-in customer cannot hold receivable or advance');
        const method = await tx.paymentMethod.findFirst({
          where: { id: dto.methodId, companyId: principal.companyId, isActive: true },
        });
        if (!method) throw new BadRequestException('Payment method is unavailable');
        this.assertDistinct(
          dto.allocations.map((row) => row.saleId),
          'sale allocation',
        );
        const amount = money(dto.amount);
        const allocated = money(
          dto.allocations.reduce((sum, row) => sum.plus(money(row.amount)), money(0)),
        );
        if (allocated.greaterThan(amount))
          throw new BadRequestException('Allocations exceed collection amount');
        for (const allocation of [...dto.allocations].sort((a, b) =>
          a.saleId.localeCompare(b.saleId),
        )) {
          await this.lock(tx, `${principal.companyId}:sale:${allocation.saleId}`);
          const sale = await tx.sale.findFirst({
            where: {
              id: allocation.saleId,
              companyId: principal.companyId,
              branchId: branch.id,
              customerId: customer.id,
              status: SaleStatus.COMPLETED,
            },
          });
          if (!sale) throw new BadRequestException('Allocated sale is unavailable');
          const outstanding = await this.invoiceOutstanding(tx, principal.companyId, sale);
          if (money(allocation.amount).greaterThan(outstanding))
            throw new ConflictException('Allocation exceeds invoice outstanding amount');
        }
        const paymentNumber = await this.nextNumber(
          tx,
          principal.companyId,
          SalesDocumentType.CUSTOMER_COLLECTION,
        );
        const payment = await tx.payment.create({
          data: {
            companyId: principal.companyId,
            branchId: branch.id,
            methodId: method.id,
            customerId: customer.id,
            recordedById: principal.userId,
            paymentNumber,
            direction: PaymentDirection.INBOUND,
            status: PaymentStatus.COMPLETED,
            amount,
            reference: dto.reference ?? dto.notes,
            paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
            saleAllocations: {
              create: dto.allocations.map((row) => ({
                saleId: row.saleId,
                amount: money(row.amount),
              })),
            },
          },
        });
        if (method.isCash)
          await this.cash.postPaymentMovementTx(tx, principal, {
            branchId: branch.id,
            registerId: dto.registerId,
            paymentId: payment.id,
            type: CashMovementType.CUSTOMER_COLLECTION,
            amount,
            occurredAt: payment.paidAt,
            referenceType: 'CUSTOMER_COLLECTION',
            referenceId: payment.id,
          });
        await tx.customerLedgerEntry.create({
          data: {
            companyId: principal.companyId,
            branchId: branch.id,
            customerId: customer.id,
            createdById: principal.userId,
            type: CustomerLedgerEntryType.PAYMENT,
            amount: amount.negated(),
            effectiveAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
            referenceType: 'CUSTOMER_COLLECTION',
            referenceId: payment.id,
            description: dto.notes ?? `Customer collection ${paymentNumber}`,
            idempotencyKey: `collection:${operationId}`,
            requestHash,
          },
        });
        await this.audit(tx, principal, branch.id, 'customer.collection.posted', payment.id, {
          customerId: customer.id,
          amount: amount.toFixed(4),
          allocated: allocated.toFixed(4),
          unapplied: amount.minus(allocated).toFixed(4),
        });
        return {
          ...payment,
          allocated: allocated.toFixed(4),
          unapplied: amount.minus(allocated).toFixed(4),
        };
      },
    );
  }

  postReturn(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: PostSaleReturnDto,
  ) {
    return this.idempotent(
      principal,
      key,
      SalesOperationType.SALE_RETURN,
      dto,
      (tx, operationId, requestHash) =>
        this.postReturnTx(
          tx,
          principal,
          branch,
          dto,
          SaleReturnKind.RETURN,
          operationId,
          requestHash,
        ),
    );
  }

  postRefund(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: PostSaleRefundDto,
  ) {
    return this.idempotent(
      principal,
      key,
      SalesOperationType.SALE_REFUND,
      dto,
      (tx, operationId, requestHash) =>
        this.postRefundTx(tx, principal, branch, dto, operationId, requestHash),
    );
  }

  postExchange(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: PostSaleExchangeDto,
  ) {
    return this.idempotent(
      principal,
      key,
      SalesOperationType.EXCHANGE,
      dto,
      async (tx, operationId, requestHash) => {
        if (dto.saleReturn.refunds?.length)
          throw new BadRequestException('Exchange return cannot also issue an immediate refund');
        const returned = await this.postReturnTx(
          tx,
          principal,
          branch,
          dto.saleReturn,
          SaleReturnKind.RETURN,
          `${operationId}:return`,
          requestHash,
        );
        const availableCredit = money(returned.totalCredit).minus(returned.receivableApplied);
        const replacementResult = await this.createReplacementSaleTx(
          tx,
          principal,
          branch,
          dto.replacementSale,
          `${operationId}:sale`,
          requestHash,
          availableCredit,
        );
        const replacement = replacementResult.sale;
        if (replacement.customerId !== returned.customerId)
          throw new BadRequestException('Exchange replacement must use the original customer');
        const creditApplied = replacementResult.creditApplied;
        const exchangeNumber = await this.nextNumber(
          tx,
          principal.companyId,
          SalesDocumentType.EXCHANGE,
        );
        const exchange = await tx.saleExchange.create({
          data: {
            companyId: principal.companyId,
            branchId: branch.id,
            originalSaleId: returned.saleId,
            returnId: returned.id,
            replacementSaleId: replacement.id,
            createdById: principal.userId,
            exchangeNumber,
            creditApplied,
            difference: money(replacement.total).minus(returned.totalCredit),
            reason: dto.reason,
          },
        });
        if (!returned.customer.isWalkIn && creditApplied.greaterThan(0)) {
          await tx.customerLedgerEntry.create({
            data: {
              companyId: principal.companyId,
              branchId: branch.id,
              customerId: returned.customerId,
              createdById: principal.userId,
              type: CustomerLedgerEntryType.SALE_INVOICE,
              amount: creditApplied,
              effectiveAt: new Date(),
              referenceType: 'EXCHANGE_CREDIT_APPLICATION',
              referenceId: exchange.id,
              description: `Exchange credit applied to ${replacement.invoiceNumber}`,
              idempotencyKey: `exchange-credit:${operationId}`,
              requestHash,
            },
          });
        }
        await this.audit(tx, principal, branch.id, 'sale.exchange.posted', exchange.id, {
          originalSaleId: returned.saleId,
          replacementSaleId: replacement.id,
          creditApplied: creditApplied.toFixed(4),
          difference: exchange.difference.toFixed(4),
        });
        return { exchange, saleReturn: returned, replacementSale: replacement };
      },
    );
  }

  voidSale(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    saleId: string,
    key: string,
    reason: string,
    refunds: SalePaymentInputDto[] = [],
  ) {
    return this.idempotent(
      principal,
      key,
      SalesOperationType.VOID_SALE,
      { saleId, reason, refunds },
      async (tx, operationId, requestHash) => {
        const sale = await tx.sale.findFirst({
          where: { id: saleId, companyId: principal.companyId, branchId: branch.id },
          include: { items: true },
        });
        if (!sale || sale.status !== SaleStatus.COMPLETED)
          throw new NotFoundException('Completed sale not found');
        const prior = await tx.saleReturnItem.groupBy({
          by: ['saleItemId'],
          where: { companyId: principal.companyId, saleReturn: { saleId } },
          _sum: { quantity: true },
        });
        const items = sale.items
          .map((item) => ({
            saleItemId: item.id,
            quantity: q6(
              item.quantity.minus(
                prior.find((row) => row.saleItemId === item.id)?._sum.quantity ?? q6(0),
              ),
            ).toFixed(),
            disposition: ReturnDisposition.RESTOCK,
          }))
          .filter((item) => q6(item.quantity).greaterThan(0));
        if (!items.length) throw new ConflictException('Sale has already been fully returned');
        return this.postReturnTx(
          tx,
          principal,
          branch,
          { saleId, items, reason, refunds },
          SaleReturnKind.VOID,
          `${operationId}:void`,
          requestHash,
        );
      },
    );
  }

  async list(principal: AuthPrincipal, branch: ActiveBranchContext, query: SaleListQueryDto) {
    const where: Prisma.SaleWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      customerId: query.customerId,
      registerId: query.registerId,
      createdById: query.cashierId,
      status: query.status,
      ...(query.from || query.to
        ? {
            saleDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              {
                items: {
                  some: { product: { name: { contains: query.search, mode: 'insensitive' } } },
                },
              },
              {
                items: {
                  some: { product: { sku: { contains: query.search, mode: 'insensitive' } } },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.sale.findMany({
        where,
        orderBy: [{ saleDate: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          customer: { select: { id: true, code: true, name: true, isWalkIn: true } },
          register: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.db.sale.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  get(principal: AuthPrincipal, branch: ActiveBranchContext, id: string) {
    return this.getInTx(this.db, principal, branch.id, id);
  }

  async listCollections(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: SaleFinancialListQueryDto,
  ) {
    const where: Prisma.PaymentWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      customerId: query.customerId,
      direction: PaymentDirection.INBOUND,
      saleAllocations: query.saleId ? { some: { saleId: query.saleId } } : undefined,
      ...(query.from || query.to
        ? {
            paidAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { paymentNumber: { contains: query.search, mode: 'insensitive' } },
              { reference: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.payment.findMany({
        where,
        include: { method: true, customer: true, saleAllocations: true },
        orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.payment.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async listReturns(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: SaleFinancialListQueryDto,
  ) {
    const where: Prisma.SaleReturnWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      customerId: query.customerId,
      saleId: query.saleId,
      ...(query.from || query.to
        ? {
            returnedAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { returnNumber: { contains: query.search, mode: 'insensitive' } },
              { sale: { invoiceNumber: { contains: query.search, mode: 'insensitive' } } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.saleReturn.findMany({
        where,
        include: {
          sale: { select: { id: true, invoiceNumber: true } },
          customer: { select: { id: true, code: true, name: true } },
          items: { include: { product: true, unit: true, batch: true } },
          refunds: { include: { payment: { include: { method: true } } } },
          exchange: true,
        },
        orderBy: [{ returnedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.saleReturn.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async listRefunds(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: SaleFinancialListQueryDto,
  ) {
    const where: Prisma.SaleRefundWhereInput = {
      companyId: principal.companyId,
      saleReturn: {
        branchId: branch.id,
        customerId: query.customerId,
        saleId: query.saleId,
      },
      ...(query.from || query.to
        ? {
            payment: {
              paidAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            },
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.saleRefund.findMany({
        where,
        include: {
          saleReturn: { include: { sale: true, customer: true } },
          payment: { include: { method: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.saleRefund.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  private async postReturnTx(
    tx: Tx,
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    dto: PostSaleReturnDto,
    kind: SaleReturnKind,
    operationId: string,
    requestHash: string,
  ) {
    await this.lock(tx, `${principal.companyId}:sale:${dto.saleId}`);
    this.assertDistinct(
      dto.items.map((row) => row.saleItemId),
      'return line',
    );
    const sale = await tx.sale.findFirst({
      where: {
        id: dto.saleId,
        companyId: principal.companyId,
        branchId: branch.id,
        status: SaleStatus.COMPLETED,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { id: true, trackInventory: true } },
            returnItems: { select: { baseQuantity: true, creditAmount: true } },
          },
        },
      },
    });
    if (!sale) throw new NotFoundException('Completed sale not found');
    const selected = dto.items.map((input) => {
      const item = sale.items.find((row) => row.id === input.saleItemId);
      if (!item) throw new BadRequestException('Return item is not part of the original sale');
      const quantity = q6(input.quantity);
      const baseQuantity = q6(quantity.mul(item.conversionFactor));
      const priorBase = q6(
        item.returnItems.reduce((sum, row) => sum.plus(row.baseQuantity), q6(0)),
      );
      if (priorBase.plus(baseQuantity).greaterThan(item.baseQuantity))
        throw new ConflictException('Return quantity exceeds the remaining sold quantity');
      return { input, item, quantity, baseQuantity, priorBase };
    });
    const allocations = this.allocatedLineTotals(sale);
    const prepared = selected.map((row) => {
      const allocated = allocations.get(row.item.id)!;
      const priorCredit = money(
        row.item.returnItems.reduce((sum, item) => sum.plus(item.creditAmount), money(0)),
      );
      const cumulative = money(
        allocated.mul(row.priorBase.plus(row.baseQuantity)).div(row.item.baseQuantity),
      );
      return { ...row, creditAmount: money(cumulative.minus(priorCredit)) };
    });
    const totalCredit = money(prepared.reduce((sum, row) => sum.plus(row.creditAmount), money(0)));
    const outstanding = await this.invoiceOutstanding(tx, principal.companyId, sale);
    const receivableApplied = outstanding.lessThan(totalCredit) ? outstanding : totalCredit;
    const immediateRefunds = dto.refunds ?? [];
    const immediateRefundTotal = money(
      immediateRefunds.reduce((sum, row) => sum.plus(money(row.amount)), money(0)),
    );
    const refundable = money(totalCredit.minus(receivableApplied));
    if (immediateRefundTotal.greaterThan(refundable))
      throw new BadRequestException('Refunds exceed the return refundable amount');
    if (sale.customer.isWalkIn && !immediateRefundTotal.equals(totalCredit))
      throw new BadRequestException('Walk-in returns require an immediate full refund');
    const returnNumber = await this.nextNumber(
      tx,
      principal.companyId,
      SalesDocumentType.SALE_RETURN,
    );
    const saleReturn = await tx.saleReturn.create({
      data: {
        companyId: principal.companyId,
        branchId: branch.id,
        warehouseId: sale.warehouseId,
        saleId: sale.id,
        customerId: sale.customerId,
        createdById: principal.userId,
        returnNumber,
        kind,
        totalCredit,
        receivableApplied,
        reason: dto.reason,
        returnedAt: dto.returnedAt ? new Date(dto.returnedAt) : new Date(),
        items: {
          create: prepared.map((row) => ({
            saleItemId: row.item.id,
            productId: row.item.productId,
            unitId: row.item.unitId,
            batchId: row.item.batchId,
            quantity: row.quantity,
            baseQuantity: row.baseQuantity,
            conversionFactor: row.item.conversionFactor,
            creditAmount: row.creditAmount,
            disposition: row.input.disposition,
          })),
        },
      },
      include: { customer: true, items: true },
    });
    for (const row of [...prepared].sort((a, b) =>
      `${a.item.productId}:${a.item.batchId ?? '-'}`.localeCompare(
        `${b.item.productId}:${b.item.batchId ?? '-'}`,
      ),
    )) {
      if (row.input.disposition === ReturnDisposition.RESTOCK && row.item.product.trackInventory)
        await this.inventory.postSaleReturnMovement(
          tx,
          principal,
          branch.id,
          sale.warehouseId,
          {
            productId: row.item.productId,
            unitId: row.item.unitId,
            batchId: row.item.batchId ?? undefined,
            quantity: row.quantity,
            baseQuantity: row.baseQuantity,
            conversionFactor: row.item.conversionFactor,
          },
          saleReturn.id,
          row.item.unitCost,
        );
    }
    if (!sale.customer.isWalkIn && totalCredit.greaterThan(0)) {
      await tx.customerLedgerEntry.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          customerId: sale.customerId,
          createdById: principal.userId,
          type: CustomerLedgerEntryType.SALE_RETURN,
          amount: totalCredit.negated(),
          effectiveAt: saleReturn.returnedAt,
          referenceType: 'SALE_RETURN',
          referenceId: saleReturn.id,
          description: `${kind === SaleReturnKind.VOID ? 'Sale reversal' : 'Sale return'} ${returnNumber}`,
          idempotencyKey: `return:${operationId}`,
          requestHash,
        },
      });
    }
    for (let index = 0; index < immediateRefunds.length; index += 1) {
      const refund = immediateRefunds[index];
      await this.createRefundPayment(
        tx,
        principal,
        branch.id,
        saleReturn,
        refund,
        `${operationId}:refund:${index}`,
        requestHash,
        undefined,
        sale.registerId,
      );
    }
    await this.audit(
      tx,
      principal,
      branch.id,
      kind === SaleReturnKind.VOID ? 'sale.voided' : 'sale.return.posted',
      saleReturn.id,
      {
        saleId: sale.id,
        returnNumber,
        totalCredit: totalCredit.toFixed(4),
        receivableApplied: receivableApplied.toFixed(4),
        immediateRefund: immediateRefundTotal.toFixed(4),
      },
    );
    return saleReturn;
  }

  private async postRefundTx(
    tx: Tx,
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    dto: PostSaleRefundDto,
    operationId: string,
    requestHash: string,
  ) {
    await this.lock(tx, `${principal.companyId}:return:${dto.returnId}`);
    const saleReturn = await tx.saleReturn.findFirst({
      where: { id: dto.returnId, companyId: principal.companyId, branchId: branch.id },
      include: { customer: true, refunds: true, exchange: true },
    });
    if (!saleReturn) throw new NotFoundException('Sale return not found');
    const refunded = money(saleReturn.refunds.reduce((sum, row) => sum.plus(row.amount), money(0)));
    const capacity = money(saleReturn.totalCredit)
      .minus(saleReturn.receivableApplied)
      .minus(saleReturn.exchange?.creditApplied ?? 0)
      .minus(refunded);
    if (money(dto.amount).greaterThan(capacity))
      throw new ConflictException('Refund exceeds remaining refundable credit');
    const result = await this.createRefundPayment(
      tx,
      principal,
      branch.id,
      saleReturn,
      {
        methodId: dto.methodId,
        amount: dto.amount,
        reference: dto.reference ?? dto.reason,
      },
      operationId,
      requestHash,
      dto.refundedAt ? new Date(dto.refundedAt) : new Date(),
      dto.registerId,
    );
    await this.audit(tx, principal, branch.id, 'sale.refund.posted', result.payment.id, {
      returnId: saleReturn.id,
      amount: money(dto.amount).toFixed(4),
      reason: dto.reason,
    });
    return result;
  }

  private async createRefundPayment(
    tx: Tx,
    principal: AuthPrincipal,
    branchId: string,
    saleReturn: { id: string; customerId: string; customer: { isWalkIn: boolean } },
    input: SalePaymentInputDto,
    operationId: string,
    requestHash: string,
    paidAt = new Date(),
    registerId?: string,
  ) {
    const method = await tx.paymentMethod.findFirst({
      where: { id: input.methodId, companyId: principal.companyId, isActive: true },
    });
    if (!method) throw new BadRequestException('Refund method is unavailable');
    if (input.tendered) throw new BadRequestException('Refunds do not accept tendered cash');
    const amount = money(input.amount);
    const paymentNumber = await this.nextNumber(
      tx,
      principal.companyId,
      SalesDocumentType.SALE_REFUND,
    );
    const payment = await tx.payment.create({
      data: {
        companyId: principal.companyId,
        branchId,
        methodId: method.id,
        customerId: saleReturn.customerId,
        recordedById: principal.userId,
        paymentNumber,
        direction: PaymentDirection.OUTBOUND,
        status: PaymentStatus.COMPLETED,
        amount,
        reference: input.reference,
        paidAt,
      },
    });
    const refund = await tx.saleRefund.create({
      data: {
        companyId: principal.companyId,
        returnId: saleReturn.id,
        paymentId: payment.id,
        amount,
      },
    });
    if (method.isCash)
      await this.cash.postPaymentMovementTx(tx, principal, {
        branchId,
        registerId,
        paymentId: payment.id,
        type: CashMovementType.CASH_REFUND,
        amount,
        occurredAt: paidAt,
        referenceType: 'SALE_REFUND',
        referenceId: payment.id,
      });
    if (!saleReturn.customer.isWalkIn) {
      await tx.customerLedgerEntry.create({
        data: {
          companyId: principal.companyId,
          branchId,
          customerId: saleReturn.customerId,
          createdById: principal.userId,
          type: CustomerLedgerEntryType.PAYMENT,
          amount,
          effectiveAt: paidAt,
          referenceType: 'SALE_REFUND',
          referenceId: payment.id,
          description: `Customer refund ${paymentNumber}`,
          idempotencyKey: `refund:${operationId}`,
          requestHash,
        },
      });
    }
    return { payment, refund };
  }

  private async createReplacementSaleTx(
    tx: Tx,
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    dto: CompleteSaleDto,
    operationId: string,
    requestHash: string,
    availableCredit: Prisma.Decimal,
  ) {
    if (dto.draftSaleId) throw new BadRequestException('Exchange replacement cannot use a draft');
    await this.validateContext(tx, principal, branch.id, dto);
    const customer = await this.requireCustomer(tx, principal.companyId, dto.customerId);
    const prepared = await this.prepare(tx, principal, dto);
    const inputs = this.paymentInputs(dto);
    const cashPaid = money(inputs.reduce((sum, input) => sum.plus(money(input.amount)), money(0)));
    if (cashPaid.greaterThan(prepared.total))
      throw new BadRequestException('Payments exceed the replacement sale total');
    const remainingAfterMoney = money(prepared.total.minus(cashPaid));
    const creditApplied = availableCredit.lessThan(remainingAfterMoney)
      ? availableCredit
      : remainingAfterMoney;
    const due = money(remainingAfterMoney.minus(creditApplied));
    const paid = money(cashPaid.plus(creditApplied));
    const methods = await tx.paymentMethod.findMany({
      where: {
        id: { in: inputs.map((row) => row.methodId) },
        companyId: principal.companyId,
        isActive: true,
      },
    });
    if (methods.length !== inputs.length)
      throw new BadRequestException('One or more payment methods are unavailable');
    let change = money(0);
    for (const input of inputs) {
      const method = methods.find((row) => row.id === input.methodId)!;
      if (method.isCash) {
        const tendered = money(input.tendered ?? input.amount);
        if (tendered.lessThan(input.amount))
          throw new BadRequestException('Cash tendered cannot be less than cash applied');
        change = money(change.plus(tendered.minus(input.amount)));
      } else if (input.tendered) {
        throw new BadRequestException('Tendered amount is valid only for cash');
      }
    }
    if (customer.isWalkIn && due.greaterThan(0))
      throw new ConflictException('Walk-in exchange difference must be fully settled');
    if (!customer.isWalkIn && due.greaterThan(0)) {
      await this.lock(tx, `${principal.companyId}:customer:${customer.id}`);
      const balance = await tx.customerLedgerEntry.aggregate({
        where: { companyId: principal.companyId, customerId: customer.id },
        _sum: { amount: true },
      });
      if (
        money(balance._sum.amount ?? 0)
          .plus(due)
          .plus(creditApplied)
          .greaterThan(customer.creditLimit)
      )
        throw new ConflictException('Customer credit limit would be exceeded');
    }
    const saleId = randomUUID();
    const invoiceNumber = await this.nextNumber(
      tx,
      principal.companyId,
      SalesDocumentType.SALE_INVOICE,
    );
    const sale = await tx.sale.create({
      data: {
        id: saleId,
        companyId: principal.companyId,
        branchId: branch.id,
        warehouseId: dto.warehouseId,
        registerId: dto.registerId,
        customerId: dto.customerId,
        createdById: principal.userId,
        salespersonId: dto.salespersonId,
        invoiceNumber,
        status: SaleStatus.COMPLETED,
        pricingMode: dto.pricingMode,
        ...this.header(prepared),
        paid,
        due,
        change,
        notes: dto.notes,
        completedAt: new Date(),
        items: { create: prepared.lines.map((line) => this.lineData(principal, line)) },
      },
    });
    for (const line of [...prepared.lines].sort((a, b) =>
      `${a.productId}:${a.batchId ?? '-'}`.localeCompare(`${b.productId}:${b.batchId ?? '-'}`),
    )) {
      if (line.trackInventory)
        await this.inventory.postSaleMovement(
          tx,
          principal,
          branch.id,
          dto.warehouseId,
          {
            productId: line.productId,
            unitId: line.unitId,
            batchId: line.batchId,
            quantity: line.quantity.toFixed(),
          },
          saleId,
          line.unitCost,
        );
    }
    for (const input of inputs) {
      const payment = await tx.payment.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          methodId: input.methodId,
          customerId: customer.id,
          recordedById: principal.userId,
          paymentNumber: await this.nextNumber(
            tx,
            principal.companyId,
            SalesDocumentType.SALE_PAYMENT,
          ),
          direction: PaymentDirection.INBOUND,
          status: PaymentStatus.COMPLETED,
          amount: money(input.amount),
          reference: input.reference,
          paidAt: new Date(),
        },
      });
      await tx.salePayment.create({
        data: {
          companyId: principal.companyId,
          saleId,
          paymentId: payment.id,
          amount: money(input.amount),
        },
      });
      const method = methods.find((row) => row.id === input.methodId)!;
      if (method.isCash)
        await this.cash.postPaymentMovementTx(tx, principal, {
          branchId: branch.id,
          registerId: dto.registerId,
          paymentId: payment.id,
          type: CashMovementType.CASH_SALE,
          amount: input.amount,
          occurredAt: payment.paidAt,
          referenceType: 'SALE_PAYMENT',
          referenceId: payment.id,
        });
    }
    if (!customer.isWalkIn && due.greaterThan(0)) {
      await tx.customerLedgerEntry.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          customerId: customer.id,
          createdById: principal.userId,
          type: CustomerLedgerEntryType.SALE_INVOICE,
          amount: due,
          effectiveAt: new Date(),
          referenceType: 'SALE',
          referenceId: saleId,
          description: `Exchange sale ${invoiceNumber}`,
          idempotencyKey: `exchange-sale:${operationId}`,
          requestHash,
        },
      });
    }
    await this.audit(tx, principal, branch.id, 'sale.completed', saleId, {
      invoiceNumber,
      exchange: true,
      total: prepared.total.toFixed(4),
      paid: paid.toFixed(4),
      due: due.toFixed(4),
      creditApplied: creditApplied.toFixed(4),
    });
    return { sale, creditApplied };
  }

  private allocatedLineTotals(sale: {
    total: Prisma.Decimal;
    items: Array<{ id: string; lineTotal: Prisma.Decimal }>;
  }) {
    const ordered = [...sale.items].sort((a, b) => a.id.localeCompare(b.id));
    const sum = money(ordered.reduce((total, item) => total.plus(item.lineTotal), money(0)));
    const result = new Map<string, Prisma.Decimal>();
    let allocated = money(0);
    for (let index = 0; index < ordered.length; index += 1) {
      const item = ordered[index];
      const value =
        index === ordered.length - 1
          ? money(sale.total.minus(allocated))
          : sum.isZero()
            ? money(0)
            : money(sale.total.mul(item.lineTotal).div(sum));
      result.set(item.id, value);
      allocated = money(allocated.plus(value));
    }
    return result;
  }

  private async invoiceOutstanding(
    tx: Tx | DatabaseService,
    companyId: string,
    sale: { id: string; total: Prisma.Decimal },
  ) {
    const [payments, returns, exchangeCredits] = await Promise.all([
      tx.salePayment.aggregate({
        where: {
          companyId,
          saleId: sale.id,
          payment: { status: PaymentStatus.COMPLETED, direction: PaymentDirection.INBOUND },
        },
        _sum: { amount: true },
      }),
      tx.saleReturn.aggregate({
        where: { companyId, saleId: sale.id },
        _sum: { totalCredit: true },
      }),
      tx.saleExchange.aggregate({
        where: { companyId, replacementSaleId: sale.id },
        _sum: { creditApplied: true },
      }),
    ]);
    const value = money(sale.total)
      .minus(payments._sum.amount ?? 0)
      .minus(returns._sum.totalCredit ?? 0)
      .minus(exchangeCredits._sum.creditApplied ?? 0);
    return value.isNegative() ? money(0) : money(value);
  }

  private paymentInputs(dto: CompleteSaleDto) {
    if (dto.payment && dto.payments?.length)
      throw new BadRequestException('Use payment or payments, not both');
    const inputs = dto.payments ?? (dto.payment ? [dto.payment] : []);
    this.assertDistinct(
      inputs.map((row) => row.methodId),
      'payment method',
    );
    return inputs;
  }

  private assertDistinct(values: string[], label: string) {
    if (new Set(values).size !== values.length)
      throw new BadRequestException(`Duplicate ${label} is not allowed`);
  }

  private idempotent<T>(
    principal: AuthPrincipal,
    key: string,
    type: SalesOperationType,
    payload: unknown,
    work: (tx: Tx, operationId: string, requestHash: string) => Promise<T>,
  ) {
    this.assertKey(key);
    const requestHash = this.hash(payload);
    return this.db
      .$transaction(
        async (tx) => {
          const operation = await tx.salesOperation.create({
            data: {
              companyId: principal.companyId,
              createdById: principal.userId,
              type,
              idempotencyKey: key,
              requestHash,
            },
          });
          const result = await work(tx, operation.id, requestHash);
          await tx.salesOperation.update({
            where: { id: operation.id },
            data: { result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue },
          });
          return result;
        },
        { timeout: 30000 },
      )
      .catch(async (error: unknown) => {
        if (!isUniqueConstraintError(error)) throw error;
        const existing = await this.db.salesOperation.findUnique({
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

  private async prepare(tx: Tx, principal: AuthPrincipal, dto: SaveSaleDto): Promise<PreparedSale> {
    this.assertDistinctLines(dto.items);
    const products = await tx.product.findMany({
      where: { companyId: principal.companyId, id: { in: dto.items.map((row) => row.productId) } },
      include: {
        baseUnit: true,
        tileProfile: true,
        conversions: { where: { isActive: true }, include: { fromUnit: true } },
        prices: { where: { isActive: true } },
        batches: { where: { id: { in: dto.items.flatMap((row) => row.batchId ?? []) } } },
      },
    });
    if (products.length !== new Set(dto.items.map((row) => row.productId)).size)
      throw new BadRequestException('One or more products are unavailable');
    const lines: PreparedLine[] = [];
    for (const input of dto.items) {
      const product = products.find((row) => row.id === input.productId)!;
      if (!product.isActive || !product.baseUnit.isActive)
        throw new BadRequestException(`${product.name} is inactive`);
      const factor =
        input.unitId === product.baseUnitId
          ? new Prisma.Decimal(1)
          : product.conversions.find((row) => row.fromUnitId === input.unitId)?.factorToBase;
      if (!factor) throw new BadRequestException(`Sale unit is unavailable for ${product.name}`);
      const selectedUnit =
        input.unitId === product.baseUnitId
          ? product.baseUnit
          : product.conversions.find((row) => row.fromUnitId === input.unitId)?.fromUnit;
      if (!selectedUnit)
        throw new BadRequestException(`Sale unit is unavailable for ${product.name}`);
      let batchId: string | undefined;
      let batchSnapshot:
        { batchNumber: string; lotNumber: string | null; shade: string | null } | undefined;
      if (product.batchTracking) {
        const batch = product.batches.find((row) => row.id === input.batchId && row.isActive);
        if (!batch)
          throw new BadRequestException(`An active batch is required for ${product.name}`);
        batchId = batch.id;
        batchSnapshot = batch;
      } else if (input.batchId) {
        throw new BadRequestException(`Batch is not valid for ${product.name}`);
      }
      const priceType =
        dto.pricingMode === PricingMode.RETAIL ? PriceType.RETAIL : PriceType.WHOLESALE;
      const configured = product.prices.find(
        (row) => row.unitId === input.unitId && row.type === priceType,
      );
      if (!configured)
        throw new BadRequestException(
          `${priceType.toLowerCase()} price is not configured for ${product.name}`,
        );
      const configuredPrice = money(configured.amount);
      const unitPrice = money(input.requestedUnitPrice ?? configuredPrice);
      const override = !unitPrice.equals(configuredPrice);
      if (override && !principal.permissions.has(PERMISSIONS.SALE_OVERRIDE_PRICE))
        throw new ForbiddenException('Price override permission is required');
      if (override && !input.priceOverrideReason)
        throw new BadRequestException('Price override reason is required');
      const minimum = product.prices.find(
        (row) => row.unitId === input.unitId && row.type === PriceType.MINIMUM,
      );
      if (minimum && unitPrice.lessThan(minimum.amount))
        throw new ConflictException(`Price is below the minimum for ${product.name}`);
      const quantity = q6(input.quantity);
      const baseQuantity = q6(quantity.mul(factor));
      if (!quantity.greaterThan(0) || !baseQuantity.greaterThan(0))
        throw new BadRequestException('Sale quantity must resolve to a positive base quantity');
      const discount = money(input.discount);
      const tax = money(input.tax);
      if (discount.greaterThan(0) && !principal.permissions.has(PERMISSIONS.SALE_DISCOUNT))
        throw new ForbiddenException('Sale discount permission is required');
      const gross = money(quantity.mul(unitPrice));
      if (discount.greaterThan(gross))
        throw new BadRequestException('Line discount cannot exceed the gross line amount');
      const lineTotal = money(gross.minus(discount).plus(tax));
      lines.push({
        input,
        productId: product.id,
        unitId: input.unitId,
        batchId,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        unitCodeSnapshot: selectedUnit.code,
        tileSizeSnapshot: product.tileProfile?.displaySize ?? undefined,
        batchNumberSnapshot: batchSnapshot?.batchNumber,
        lotNumberSnapshot: batchSnapshot?.lotNumber ?? undefined,
        shadeSnapshot: batchSnapshot?.shade ?? undefined,
        trackInventory: product.trackInventory,
        quantity,
        baseQuantity,
        conversionFactor: factor10(factor),
        configuredPrice,
        unitPrice,
        unitCost: money((product.standardCost ?? money(0)).mul(factor)),
        discount,
        tax,
        gross,
        lineTotal,
        override,
      });
    }
    const invoiceDiscount = money(dto.invoiceDiscount);
    if (invoiceDiscount.greaterThan(0) && !principal.permissions.has(PERMISSIONS.SALE_DISCOUNT))
      throw new ForbiddenException('Sale discount permission is required');
    const subtotal = money(lines.reduce((sum, row) => sum.plus(row.gross), money(0)));
    const lineDiscount = money(lines.reduce((sum, row) => sum.plus(row.discount), money(0)));
    const tax = money(lines.reduce((sum, row) => sum.plus(row.tax), money(0)).plus(dto.invoiceTax));
    const discount = money(lineDiscount.plus(invoiceDiscount));
    const total = money(subtotal.minus(discount).plus(tax));
    if (invoiceDiscount.greaterThan(subtotal.minus(lineDiscount).plus(tax)) || total.isNegative())
      throw new BadRequestException('Invoice discount creates a negative total');
    return { lines, subtotal, discount, tax, total };
  }

  private async validateContext(
    tx: Tx,
    principal: AuthPrincipal,
    branchId: string,
    dto: SaveSaleDto,
  ) {
    await Promise.all([
      this.requireWarehouse(tx, principal.companyId, branchId, dto.warehouseId),
      tx.register
        .findFirst({
          where: { id: dto.registerId, companyId: principal.companyId, branchId, isActive: true },
        })
        .then((row) => {
          if (!row) throw new BadRequestException('Register is unavailable in the active branch');
        }),
      this.requireCustomer(tx, principal.companyId, dto.customerId),
      dto.salespersonId
        ? tx.user
            .findFirst({
              where: {
                id: dto.salespersonId,
                companyId: principal.companyId,
                status: UserStatus.ACTIVE,
              },
            })
            .then((row) => {
              if (!row) throw new BadRequestException('Salesperson is unavailable');
            })
        : Promise.resolve(),
    ]);
  }

  private requireWarehouse(
    tx: Tx | DatabaseService,
    companyId: string,
    branchId: string,
    warehouseId: string,
  ) {
    return tx.warehouse
      .findFirst({ where: { id: warehouseId, companyId, branchId, isActive: true } })
      .then((row) => {
        if (!row) throw new BadRequestException('Warehouse is unavailable in the active branch');
        return row;
      });
  }

  private requireCustomer(tx: Tx, companyId: string, customerId: string) {
    return tx.customer
      .findFirst({
        where: { id: customerId, companyId, isActive: true },
        select: { id: true, isWalkIn: true, creditLimit: true },
      })
      .then((row) => {
        if (!row) throw new BadRequestException('Customer is unavailable');
        return row;
      });
  }

  private requireDraft(tx: Tx, companyId: string, branchId: string, id: string) {
    return tx.sale.findFirst({ where: { id, companyId, branchId } }).then((row) => {
      if (!row) throw new NotFoundException('Draft sale not found');
      return row;
    });
  }

  private getInTx(
    tx: Tx | DatabaseService,
    principal: AuthPrincipal,
    branchId: string,
    id: string,
  ) {
    return tx.sale
      .findFirst({
        where: { id, companyId: principal.companyId, branchId },
        include: {
          branch: true,
          warehouse: true,
          register: true,
          customer: true,
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          salesperson: { select: { id: true, firstName: true, lastName: true } },
          items: {
            include: {
              product: { include: { tileProfile: true, baseUnit: true } },
              unit: true,
              batch: true,
            },
          },
          paymentAllocations: { include: { payment: { include: { method: true } } } },
          returns: {
            include: {
              items: { include: { product: true, unit: true, batch: true } },
              refunds: { include: { payment: { include: { method: true } } } },
              exchange: true,
            },
          },
          originalExchanges: true,
          replacementExchanges: true,
        },
      })
      .then(async (sale) => {
        if (!sale) throw new NotFoundException('Sale not found');
        const outstanding = await this.invoiceOutstanding(tx, principal.companyId, sale);
        const returnedBase = new Map<string, Prisma.Decimal>();
        for (const saleReturn of sale.returns)
          for (const item of saleReturn.items)
            returnedBase.set(
              item.saleItemId,
              q6((returnedBase.get(item.saleItemId) ?? q6(0)).plus(item.baseQuantity)),
            );
        const totalReturned = money(
          sale.returns.reduce((sum, row) => sum.plus(row.totalCredit), money(0)),
        );
        const lifecycleStatus = sale.originalExchanges.length
          ? 'EXCHANGED'
          : sale.returns.some((row) => row.kind === SaleReturnKind.VOID)
            ? 'VOIDED'
            : totalReturned.equals(sale.total)
              ? 'RETURNED'
              : totalReturned.greaterThan(0)
                ? 'PARTIALLY_RETURNED'
                : sale.status;
        return {
          ...sale,
          currentOutstanding: outstanding.toFixed(4),
          lifecycleStatus,
          items: sale.items.map((item) => ({
            ...item,
            returnedBaseQuantity: (returnedBase.get(item.id) ?? q6(0)).toFixed(6),
            returnableBaseQuantity: q6(
              item.baseQuantity.minus(returnedBase.get(item.id) ?? q6(0)),
            ).toFixed(6),
          })),
        };
      });
  }

  private lineData(principal: AuthPrincipal, line: PreparedLine) {
    void principal;
    return {
      productId: line.productId,
      unitId: line.unitId,
      batchId: line.batchId,
      productNameSnapshot: line.productNameSnapshot,
      skuSnapshot: line.skuSnapshot,
      unitCodeSnapshot: line.unitCodeSnapshot,
      tileSizeSnapshot: line.tileSizeSnapshot,
      batchNumberSnapshot: line.batchNumberSnapshot,
      lotNumberSnapshot: line.lotNumberSnapshot,
      shadeSnapshot: line.shadeSnapshot,
      quantity: line.quantity,
      baseQuantity: line.baseQuantity,
      conversionFactor: line.conversionFactor,
      configuredPrice: line.configuredPrice,
      unitPrice: line.unitPrice,
      unitCost: line.unitCost,
      discount: line.discount,
      tax: line.tax,
      lineTotal: line.lineTotal,
      priceOverrideReason: line.input.priceOverrideReason,
    };
  }

  private header(prepared: PreparedSale) {
    return {
      subtotal: prepared.subtotal,
      discount: prepared.discount,
      tax: prepared.tax,
      total: prepared.total,
    };
  }

  private async nextNumber(tx: Tx, companyId: string, type: SalesDocumentType) {
    const row = await tx.salesDocumentSequence.upsert({
      where: { companyId_type: { companyId, type } },
      create: { companyId, type, nextNumber: 2n },
      update: { nextNumber: { increment: 1 } },
      select: { nextNumber: true },
    });
    const prefix: Record<SalesDocumentType, string> = {
      SALE_INVOICE: 'INV',
      SALE_PAYMENT: 'PAY',
      CUSTOMER_COLLECTION: 'COL',
      SALE_RETURN: 'SR',
      SALE_REFUND: 'RF',
      EXCHANGE: 'EX',
    };
    return `${prefix[type]}-${(row.nextNumber - 1n).toString().padStart(6, '0')}`;
  }

  private assertDistinctLines(lines: SaleLineDto[]) {
    const keys = lines.map((row) => `${row.productId}:${row.batchId ?? '-'}`);
    if (new Set(keys).size !== keys.length)
      throw new BadRequestException('Use one cart line per product and batch position');
  }

  private assertKey(key: string) {
    if (!key || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/.test(key))
      throw new BadRequestException('A valid Idempotency-Key header is required');
  }

  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private lock(tx: Tx, key: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }

  private audit(
    tx: Tx,
    principal: AuthPrincipal,
    branchId: string,
    action: string,
    entityId: string,
    value?: Prisma.InputJsonValue,
  ) {
    return tx.auditLog.create({
      data: {
        companyId: principal.companyId,
        branchId,
        actorId: principal.userId,
        action,
        entityType: 'Sale',
        entityId,
        newValue: value,
      },
    });
  }
}
