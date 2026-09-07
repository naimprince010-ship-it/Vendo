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
import { isUniqueConstraintError } from '../database/prisma-errors';
import {
  CustomerLedgerEntryType,
  PaymentDirection,
  PaymentStatus,
  PriceType,
  PricingMode,
  Prisma,
  SaleStatus,
  SalesDocumentType,
  SalesOperationType,
  UserStatus,
} from '../generated/prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import type {
  CompleteSaleDto,
  PosCustomerQueryDto,
  PosSearchQueryDto,
  SaleLineDto,
  SaleListQueryDto,
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
        select: { id: true, code: true, name: true },
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
          const paid = money(dto.payment?.amount ?? 0);
          if (paid.greaterThan(prepared.total))
            throw new BadRequestException('Payment cannot exceed the invoice total');
          const due = money(prepared.total.minus(paid));
          let change = money(0);
          let paymentMethod: { id: string; isCash: boolean } | null = null;
          if (dto.payment) {
            paymentMethod = await tx.paymentMethod.findFirst({
              where: { id: dto.payment.methodId, companyId: principal.companyId, isActive: true },
              select: { id: true, isCash: true },
            });
            if (!paymentMethod) throw new BadRequestException('Payment method is unavailable');
            if (paymentMethod.isCash) {
              const tendered = money(dto.payment.tendered ?? dto.payment.amount);
              if (tendered.lessThan(paid))
                throw new BadRequestException('Cash tendered cannot be less than cash applied');
              change = money(tendered.minus(paid));
            } else if (dto.payment.tendered)
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
          if (dto.payment && paid.greaterThan(0) && paymentMethod) {
            const paymentNumber = await this.nextNumber(
              tx,
              principal.companyId,
              SalesDocumentType.SALE_PAYMENT,
            );
            const payment = await tx.payment.create({
              data: {
                companyId: principal.companyId,
                branchId: branch.id,
                methodId: paymentMethod.id,
                customerId: customer.id,
                recordedById: principal.userId,
                paymentNumber,
                direction: PaymentDirection.INBOUND,
                status: PaymentStatus.COMPLETED,
                amount: paid,
                reference: dto.payment.reference,
                paidAt: new Date(),
              },
            });
            await tx.salePayment.create({
              data: { companyId: principal.companyId, saleId, paymentId: payment.id, amount: paid },
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

  private async prepare(tx: Tx, principal: AuthPrincipal, dto: SaveSaleDto): Promise<PreparedSale> {
    this.assertDistinctLines(dto.items);
    const products = await tx.product.findMany({
      where: { companyId: principal.companyId, id: { in: dto.items.map((row) => row.productId) } },
      include: {
        baseUnit: true,
        conversions: { where: { isActive: true } },
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
      let batchId: string | undefined;
      if (product.batchTracking) {
        const batch = product.batches.find((row) => row.id === input.batchId && row.isActive);
        if (!batch)
          throw new BadRequestException(`An active batch is required for ${product.name}`);
        batchId = batch.id;
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
        },
      })
      .then((sale) => {
        if (!sale) throw new NotFoundException('Sale not found');
        return sale;
      });
  }

  private lineData(principal: AuthPrincipal, line: PreparedLine) {
    void principal;
    return {
      productId: line.productId,
      unitId: line.unitId,
      batchId: line.batchId,
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
