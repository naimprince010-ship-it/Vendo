import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { PERMISSIONS } from '../authorization/permission-catalog';
import type { ActiveBranchContext } from '../authorization/authenticated-request';
import { DatabaseService } from '../database/database.service';
import {
  CashMovementType,
  ExpenseStatus,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  PurchaseReturnStatus,
  ReceiptStatus,
  SaleStatus,
} from '../generated/prisma/client';
import type { ReportQueryDto } from './dto/reports.dto';

export type ReportKind =
  | 'sales'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'cash';
type DecimalValue = string | number | Prisma.Decimal | null | undefined;
const d = (value: DecimalValue) => new Prisma.Decimal(value ?? 0);
const money = (value: DecimalValue) => d(value).toDecimalPlaces(4).toFixed(4);
const qty = (value: DecimalValue) => d(value).toDecimalPlaces(6).toFixed(6);
const inboundCash = new Set<CashMovementType>([
  CashMovementType.OPENING,
  CashMovementType.CASH_SALE,
  CashMovementType.CUSTOMER_COLLECTION,
  CashMovementType.CASH_IN,
]);

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async dashboard(principal: AuthPrincipal, branch: ActiveBranchContext) {
    const company = await this.company(principal.companyId);
    const query = new (class extends Object {})() as ReportQueryDto;
    query.page = 1;
    query.limit = 8;
    const today = this.localDate(new Date(), company.timezone);
    query.from = today;
    query.to = today;
    const canInventory = principal.permissions.has(PERMISSIONS.REPORT_VIEW_INVENTORY);
    const canPurchases = principal.permissions.has(PERMISSIONS.REPORT_VIEW_PURCHASES);
    const canCustomers = principal.permissions.has(PERMISSIONS.REPORT_VIEW_CUSTOMERS);
    const canSuppliers = principal.permissions.has(PERMISSIONS.REPORT_VIEW_SUPPLIERS);
    const canExpenses = principal.permissions.has(PERMISSIONS.REPORT_VIEW_EXPENSES);
    const canCash = principal.permissions.has(PERMISSIONS.REPORT_VIEW_CASH);
    const [sales, products, inventory, purchases, receivable, payable, expenses, shifts] =
      await Promise.all([
        this.sales(principal, branch, query),
        this.productSales(principal, branch, query),
        canInventory ? this.inventory(principal, branch, { ...query, limit: 8 }) : null,
        canPurchases ? this.purchases(principal, branch, query) : null,
        canCustomers ? this.ledgerTotal('customer', principal.companyId) : null,
        canSuppliers ? this.ledgerTotal('supplier', principal.companyId) : null,
        canExpenses ? this.expenses(principal, branch, query) : null,
        canCash ? this.cash(principal, branch, query) : null,
      ]);
    return {
      asOf: new Date().toISOString(),
      localDate: today,
      timezone: company.timezone,
      currencyCode: company.currencyCode,
      branch: { id: branch.id, name: branch.name },
      kpis: {
        grossSales: sales.summary.grossSales,
        returnCredits: sales.summary.returnCredits,
        netSales: sales.summary.netSales,
        invoiceCount: sales.summary.invoiceCount,
        grossProfit: sales.summary.grossProfit,
        receivables: receivable === null ? null : money(receivable),
        payables: payable === null ? null : money(payable),
        expenses: expenses?.summary.posted ?? null,
        lowStockPositions: inventory?.summary.lowStockPositions ?? null,
        purchaseInvoices: purchases?.summary.invoiceTotal ?? null,
      },
      topProducts: products.items.slice(0, 5),
      lowStock: inventory?.items.filter((row) => row.lowStock).slice(0, 8) ?? [],
      recentSales: sales.items.slice(0, 8),
      recentPurchases: purchases?.items.slice(0, 8) ?? [],
      openShifts: shifts?.items.filter((row) => row.status === 'OPEN') ?? [],
    };
  }

  async sales(principal: AuthPrincipal, branch: ActiveBranchContext, query: ReportQueryDto) {
    const { from, to, meta } = await this.range(principal.companyId, query);
    const where: Prisma.SaleWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      status: { in: [SaleStatus.COMPLETED, SaleStatus.VOIDED] },
      completedAt: { gte: from, lt: to },
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, rows, aggregate, returns, outboundCostRows, restockedCostRows] =
      await Promise.all([
        this.db.sale.count({ where }),
        this.db.sale.findMany({
          where,
          orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          include: {
            customer: { select: { id: true, code: true, name: true, isWalkIn: true } },
            register: { select: { id: true, code: true, name: true } },
            items: true,
            paymentAllocations: true,
            returns: { include: { items: true, refunds: true } },
          },
        }),
        this.db.sale.aggregate({
          where,
          _sum: { total: true, subtotal: true, discount: true, tax: true },
          _count: true,
        }),
        this.db.saleReturn.findMany({
          where: {
            companyId: principal.companyId,
            branchId: branch.id,
            returnedAt: { gte: from, lt: to },
          },
          include: { items: { include: { saleItem: true } } },
        }),
        this.db.$queryRaw<Array<{ cost: Prisma.Decimal }>>`
        SELECT COALESCE(SUM(si."unitCost" * si.quantity), 0)::numeric AS cost
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId" AND s."companyId" = si."companyId"
        WHERE s."companyId" = ${principal.companyId}::uuid
          AND s."branchId" = ${branch.id}::uuid
          AND s.status IN ('COMPLETED', 'VOIDED')
          AND s."completedAt" >= ${from}
          AND s."completedAt" < ${to}
      `,
        this.db.$queryRaw<Array<{ cost: Prisma.Decimal }>>`
        SELECT COALESCE(SUM(si."unitCost" * sri."baseQuantity" / si."conversionFactor"), 0)::numeric AS cost
        FROM "SaleReturnItem" sri
        JOIN "SaleReturn" sr ON sr.id = sri."returnId" AND sr."companyId" = sri."companyId"
        JOIN "SaleItem" si ON si.id = sri."saleItemId" AND si."companyId" = sri."companyId"
        WHERE sr."companyId" = ${principal.companyId}::uuid
          AND sr."branchId" = ${branch.id}::uuid
          AND sr."returnedAt" >= ${from}
          AND sr."returnedAt" < ${to}
          AND sri.disposition = 'RESTOCK'
      `,
      ]);
    const returnCredits = returns.reduce((sum, row) => sum.plus(row.totalCredit), d(0));
    const originalCost = d(outboundCostRows[0]?.cost);
    const restockedCost = d(restockedCostRows[0]?.cost);
    const grossSales = d(aggregate._sum.total);
    const netSales = grossSales.minus(returnCredits);
    const mayViewProfit = principal.permissions.has(PERMISSIONS.REPORT_VIEW_PROFIT);
    return {
      meta: { ...meta, page: query.page, limit: query.limit, total },
      definitions: {
        basis: 'transaction-event',
        netSales: 'completed sale totals in range less return and void credits posted in range',
        grossProfit:
          'net sales less historical outbound cost, adding back cost only for restocked returns',
        collectionsAreRevenue: false,
        refundsReduceRevenueAgain: false,
      },
      summary: {
        invoiceCount: aggregate._count,
        grossSales: money(grossSales),
        returnCredits: money(returnCredits),
        netSales: money(netSales),
        subtotal: money(aggregate._sum.subtotal),
        discount: money(aggregate._sum.discount),
        tax: money(aggregate._sum.tax),
        grossProfit: mayViewProfit
          ? money(netSales.minus(originalCost.minus(restockedCost)))
          : null,
      },
      items: rows.map((sale) => {
        const credited = sale.returns.reduce((sum, row) => sum.plus(row.totalCredit), d(0));
        const allocated = sale.paymentAllocations.reduce((sum, row) => sum.plus(row.amount), d(0));
        return {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          completedAt: sale.completedAt,
          customer: sale.customer,
          register: sale.register,
          pricingMode: sale.pricingMode,
          grossTotal: money(sale.total),
          returnCredits: money(credited),
          netTotal: money(sale.total.minus(credited)),
          paid: money(allocated),
          outstanding: money(Prisma.Decimal.max(d(0), sale.total.minus(allocated).minus(credited))),
          status: sale.status,
        };
      }),
    };
  }

  async productSales(principal: AuthPrincipal, branch: ActiveBranchContext, query: ReportQueryDto) {
    const { from, to, meta } = await this.range(principal.companyId, query);
    const [lines, returnedLines] = await Promise.all([
      this.db.saleItem.findMany({
        where: {
          companyId: principal.companyId,
          sale: {
            branchId: branch.id,
            status: { in: [SaleStatus.COMPLETED, SaleStatus.VOIDED] },
            completedAt: { gte: from, lt: to },
          },
          ...(query.search
            ? { productNameSnapshot: { contains: query.search, mode: 'insensitive' } }
            : {}),
        },
        include: {
          product: { include: { category: true, brand: true, tileProfile: true, baseUnit: true } },
        },
        take: 10_001,
      }),
      this.db.saleReturnItem.findMany({
        where: {
          companyId: principal.companyId,
          saleReturn: { branchId: branch.id, returnedAt: { gte: from, lt: to } },
          ...(query.search
            ? { saleItem: { productNameSnapshot: { contains: query.search, mode: 'insensitive' } } }
            : {}),
        },
        include: {
          saleItem: {
            include: {
              product: {
                include: { category: true, brand: true, tileProfile: true, baseUnit: true },
              },
            },
          },
        },
        take: 10_001,
      }),
    ]);
    if (lines.length > 10_000 || returnedLines.length > 10_000)
      throw new BadRequestException('Product report range is too large; narrow the date range');
    const grouped = new Map<
      string,
      {
        productId: string;
        sku: string;
        name: string;
        type: string;
        size: string | null;
        category: string | null;
        brand: string | null;
        baseUnit: string;
        sold: Prisma.Decimal;
        returned: Prisma.Decimal;
        revenue: Prisma.Decimal;
        credit: Prisma.Decimal;
      }
    >();
    for (const line of lines) {
      const row = grouped.get(line.productId) ?? {
        productId: line.productId,
        sku: line.skuSnapshot,
        name: line.productNameSnapshot,
        type: line.product.type,
        size: line.tileSizeSnapshot,
        category: line.product.category?.name ?? null,
        brand: line.product.brand?.name ?? null,
        baseUnit: line.product.baseUnit.code,
        sold: d(0),
        returned: d(0),
        revenue: d(0),
        credit: d(0),
      };
      row.sold = row.sold.plus(line.baseQuantity);
      row.revenue = row.revenue.plus(line.lineTotal);
      grouped.set(line.productId, row);
    }
    for (const returned of returnedLines) {
      const line = returned.saleItem;
      const row = grouped.get(returned.productId) ?? {
        productId: returned.productId,
        sku: line.skuSnapshot,
        name: line.productNameSnapshot,
        type: line.product.type,
        size: line.tileSizeSnapshot,
        category: line.product.category?.name ?? null,
        brand: line.product.brand?.name ?? null,
        baseUnit: line.product.baseUnit.code,
        sold: d(0),
        returned: d(0),
        revenue: d(0),
        credit: d(0),
      };
      row.returned = row.returned.plus(returned.baseQuantity);
      row.credit = row.credit.plus(returned.creditAmount);
      grouped.set(returned.productId, row);
    }
    const items = [...grouped.values()]
      .map((row) => ({
        ...row,
        soldBaseQuantity: qty(row.sold),
        returnedBaseQuantity: qty(row.returned),
        netBaseQuantity: qty(row.sold.minus(row.returned)),
        grossRevenue: money(row.revenue),
        returnCredit: money(row.credit),
        netRevenue: money(row.revenue.minus(row.credit)),
        sold: undefined,
        returned: undefined,
        revenue: undefined,
        credit: undefined,
      }))
      .sort((a, b) => d(b.netRevenue).comparedTo(d(a.netRevenue)));
    return {
      meta: { ...meta, total: items.length },
      items: items.slice((query.page - 1) * query.limit, query.page * query.limit),
    };
  }

  async inventory(principal: AuthPrincipal, branch: ActiveBranchContext, query: ReportQueryDto) {
    const where: Prisma.InventoryBalanceWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      ...(query.search
        ? {
            product: {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { sku: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const [total, balances, lowStockRows] = await Promise.all([
      this.db.inventoryBalance.count({ where }),
      this.db.inventoryBalance.findMany({
        where,
        orderBy: [{ product: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          warehouse: { select: { id: true, code: true, name: true } },
          batch: true,
          product: {
            include: {
              baseUnit: true,
              category: true,
              brand: true,
              tileProfile: true,
              conversions: { where: { isActive: true }, include: { fromUnit: true } },
            },
          },
        },
      }),
      this.db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "InventoryBalance" ib
        JOIN "Product" p ON p.id = ib."productId" AND p."companyId" = ib."companyId"
        WHERE ib."companyId" = ${principal.companyId}::uuid
          AND ib."branchId" = ${branch.id}::uuid
          AND p."reorderLevel" IS NOT NULL
          AND ib."baseQuantity" <= p."reorderLevel"
      `,
    ]);
    const items = balances.map((row) => {
      const equivalents = [
        { unit: row.product.baseUnit.code, quantity: qty(row.baseQuantity) },
        ...row.product.conversions.map((conversion) => ({
          unit: conversion.fromUnit.code,
          quantity: qty(row.baseQuantity.div(conversion.factorToBase)),
        })),
      ];
      return {
        id: row.id,
        product: {
          id: row.productId,
          sku: row.product.sku,
          name: row.product.name,
          type: row.product.type,
          size: row.product.tileProfile?.displaySize ?? null,
          category: row.product.category?.name ?? null,
          brand: row.product.brand?.name ?? null,
        },
        warehouse: row.warehouse,
        batch: row.batch
          ? {
              id: row.batch.id,
              batchNumber: row.batch.batchNumber,
              lotNumber: row.batch.lotNumber,
              shade: row.batch.shade,
            }
          : null,
        baseQuantity: qty(row.baseQuantity),
        baseUnit: row.product.baseUnit.code,
        equivalents,
        reorderLevel: row.product.reorderLevel?.toFixed(6) ?? null,
        lowStock: row.product.reorderLevel
          ? row.baseQuantity.lessThanOrEqualTo(row.product.reorderLevel)
          : false,
      };
    });
    return {
      meta: { page: query.page, limit: query.limit, total },
      summary: { positions: total, lowStockPositions: Number(lowStockRows[0]?.count ?? 0n) },
      items,
    };
  }

  async purchases(principal: AuthPrincipal, branch: ActiveBranchContext, query: ReportQueryDto) {
    const { from, to, meta } = await this.range(principal.companyId, query);
    const where: Prisma.PurchaseInvoiceWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      status: { in: [InvoiceStatus.POSTED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID] },
      invoiceDate: { gte: from, lt: to },
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { supplierInvoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, invoices, invoiceAgg, receiptAgg, returnAgg, paymentAgg] = await Promise.all([
      this.db.purchaseInvoice.count({ where }),
      this.db.purchaseInvoice.findMany({
        where,
        orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { supplier: true, paymentAllocations: true, returns: true },
      }),
      this.db.purchaseInvoice.aggregate({
        where,
        _sum: { total: true, tax: true, discount: true, freight: true, additionalCost: true },
      }),
      this.db.goodsReceipt.aggregate({
        where: {
          companyId: principal.companyId,
          branchId: branch.id,
          status: ReceiptStatus.POSTED,
          receivedAt: { gte: from, lt: to },
        },
        _count: true,
      }),
      this.db.purchaseReturn.aggregate({
        where: {
          companyId: principal.companyId,
          branchId: branch.id,
          status: PurchaseReturnStatus.POSTED,
          returnedAt: { gte: from, lt: to },
        },
        _sum: { financialTotal: true },
      }),
      this.db.payment.aggregate({
        where: {
          companyId: principal.companyId,
          branchId: branch.id,
          supplierId: { not: null },
          status: PaymentStatus.COMPLETED,
          paidAt: { gte: from, lt: to },
        },
        _sum: { amount: true },
      }),
    ]);
    return {
      meta: { ...meta, page: query.page, limit: query.limit, total },
      summary: {
        invoiceTotal: money(invoiceAgg._sum.total),
        returnCredits: money(returnAgg._sum.financialTotal),
        netPurchases: money(d(invoiceAgg._sum.total).minus(d(returnAgg._sum.financialTotal))),
        payments: money(paymentAgg._sum.amount),
        goodsReceipts: receiptAgg._count,
        tax: money(invoiceAgg._sum.tax),
        freightAndAdditional: money(
          d(invoiceAgg._sum.freight).plus(d(invoiceAgg._sum.additionalCost)),
        ),
      },
      items: invoices.map((row) => {
        const paid = row.paymentAllocations.reduce(
          (sum, allocation) => sum.plus(allocation.amount),
          d(0),
        );
        const credits = row.returns.reduce(
          (sum, purchaseReturn) => sum.plus(purchaseReturn.financialTotal),
          d(0),
        );
        return {
          id: row.id,
          invoiceNumber: row.invoiceNumber,
          supplierReference: row.supplierInvoiceNumber,
          invoiceDate: row.invoiceDate,
          dueDate: row.dueDate,
          supplier: { id: row.supplier.id, code: row.supplier.code, name: row.supplier.name },
          total: money(row.total),
          paid: money(paid),
          returnCredits: money(credits),
          outstanding: money(Prisma.Decimal.max(d(0), row.total.minus(paid).minus(credits))),
          status: row.status,
        };
      }),
    };
  }

  async customers(principal: AuthPrincipal, _branch: ActiveBranchContext, query: ReportQueryDto) {
    const where: Prisma.CustomerWhereInput = {
      companyId: principal.companyId,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, rows, ledger] = await Promise.all([
      this.db.customer.count({ where }),
      this.db.customer.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { group: true },
      }),
      this.db.customerLedgerEntry.groupBy({
        by: ['customerId'],
        where: { companyId: principal.companyId },
        _sum: { amount: true },
      }),
    ]);
    const balances = new Map(ledger.map((row) => [row.customerId, d(row._sum.amount)]));
    const items = rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      phone: row.phone,
      email: row.email,
      group: row.group?.name ?? null,
      isWalkIn: row.isWalkIn,
      isActive: row.isActive,
      creditLimit: money(row.creditLimit),
      balance: money(balances.get(row.id)),
      position: d(balances.get(row.id)).isNegative() ? 'ADVANCE' : 'RECEIVABLE',
    }));
    return {
      meta: { page: query.page, limit: query.limit, total },
      summary: {
        receivables: money(
          [...balances.values()]
            .filter((value) => value.isPositive())
            .reduce((sum, value) => sum.plus(value), d(0)),
        ),
        advances: money(
          [...balances.values()]
            .filter((value) => value.isNegative())
            .reduce((sum, value) => sum.plus(value.abs()), d(0)),
        ),
      },
      items,
    };
  }

  async suppliers(principal: AuthPrincipal, _branch: ActiveBranchContext, query: ReportQueryDto) {
    const where: Prisma.SupplierWhereInput = {
      companyId: principal.companyId,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { contactName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, rows, ledger] = await Promise.all([
      this.db.supplier.count({ where }),
      this.db.supplier.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.supplierLedgerEntry.groupBy({
        by: ['supplierId'],
        where: { companyId: principal.companyId },
        _sum: { amount: true },
      }),
    ]);
    const balances = new Map(ledger.map((row) => [row.supplierId, d(row._sum.amount)]));
    const items = rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      contactName: row.contactName,
      phone: row.phone,
      email: row.email,
      isActive: row.isActive,
      balance: money(balances.get(row.id)),
      position: d(balances.get(row.id)).isNegative() ? 'ADVANCE' : 'PAYABLE',
    }));
    return {
      meta: { page: query.page, limit: query.limit, total },
      summary: {
        payables: money(
          [...balances.values()]
            .filter((value) => value.isPositive())
            .reduce((sum, value) => sum.plus(value), d(0)),
        ),
        advances: money(
          [...balances.values()]
            .filter((value) => value.isNegative())
            .reduce((sum, value) => sum.plus(value.abs()), d(0)),
        ),
      },
      items,
    };
  }

  async expenses(principal: AuthPrincipal, branch: ActiveBranchContext, query: ReportQueryDto) {
    const { from, to, meta } = await this.range(principal.companyId, query);
    const where: Prisma.ExpenseWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      expenseDate: { gte: from, lt: to },
      ...(query.search
        ? {
            OR: [
              { expenseNumber: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { category: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, rows, posted, reversed] = await Promise.all([
      this.db.expense.count({ where }),
      this.db.expense.findMany({
        where,
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { category: true, paymentMethod: true },
      }),
      this.db.expense.aggregate({
        where: { ...where, status: ExpenseStatus.POSTED },
        _sum: { amount: true },
      }),
      this.db.expense.aggregate({
        where: { ...where, status: ExpenseStatus.REVERSED },
        _sum: { amount: true },
      }),
    ]);
    return {
      meta: { ...meta, page: query.page, limit: query.limit, total },
      summary: { posted: money(posted._sum.amount), reversed: money(reversed._sum.amount) },
      items: rows.map((row) => ({
        id: row.id,
        expenseNumber: row.expenseNumber,
        expenseDate: row.expenseDate,
        category: row.category.name,
        paymentMethod: row.paymentMethod.name,
        amount: money(row.amount),
        description: row.description,
        status: row.status,
      })),
    };
  }

  async cash(principal: AuthPrincipal, branch: ActiveBranchContext, query: ReportQueryDto) {
    const { from, to, meta } = await this.range(principal.companyId, query);
    const where: Prisma.CashShiftWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      openedAt: { gte: from, lt: to },
    };
    const [total, shifts] = await Promise.all([
      this.db.cashShift.count({ where }),
      this.db.cashShift.findMany({
        where,
        orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          register: true,
          cashier: { select: { firstName: true, lastName: true, email: true } },
          movements: true,
        },
      }),
    ]);
    const items = shifts.map((shift) => {
      const totals = new Map<CashMovementType, Prisma.Decimal>();
      let expected = d(0);
      for (const movement of shift.movements) {
        totals.set(movement.type, d(totals.get(movement.type)).plus(movement.amount));
        expected = inboundCash.has(movement.type)
          ? expected.plus(movement.amount)
          : expected.minus(movement.amount);
      }
      return {
        id: shift.id,
        status: shift.status,
        register: { id: shift.register.id, code: shift.register.code, name: shift.register.name },
        cashier: `${shift.cashier.firstName}${shift.cashier.lastName ? ` ${shift.cashier.lastName}` : ''}`,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        openingCash: money(shift.openingCash),
        cashSales: money(totals.get(CashMovementType.CASH_SALE)),
        collections: money(totals.get(CashMovementType.CUSTOMER_COLLECTION)),
        cashIn: money(totals.get(CashMovementType.CASH_IN)),
        supplierPayments: money(totals.get(CashMovementType.SUPPLIER_PAYMENT)),
        refunds: money(totals.get(CashMovementType.CASH_REFUND)),
        expenses: money(totals.get(CashMovementType.EXPENSE)),
        cashOut: money(totals.get(CashMovementType.CASH_OUT)),
        expectedCash: money(expected),
        actualCash: shift.actualCash?.toFixed(4) ?? null,
        variance: shift.variance?.toFixed(4) ?? null,
      };
    });
    return { meta: { ...meta, page: query.page, limit: query.limit, total }, items };
  }

  async financial(principal: AuthPrincipal, branch: ActiveBranchContext, query: ReportQueryDto) {
    const { from, to } = await this.range(principal.companyId, query);
    const [sales, expenses, receivable, payable, cashGroups] = await Promise.all([
      this.sales(principal, branch, query),
      this.expenses(principal, branch, query),
      this.ledgerTotal('customer', principal.companyId),
      this.ledgerTotal('supplier', principal.companyId),
      this.db.cashMovement.groupBy({
        by: ['type'],
        where: {
          companyId: principal.companyId,
          branchId: branch.id,
          occurredAt: { gte: from, lt: to },
        },
        _sum: { amount: true },
      }),
    ]);
    let cashInflow = d(0);
    let cashOutflow = d(0);
    for (const group of cashGroups) {
      const amount = d(group._sum.amount);
      if (group.type !== CashMovementType.OPENING)
        if (inboundCash.has(group.type)) cashInflow = cashInflow.plus(amount);
        else cashOutflow = cashOutflow.plus(amount);
    }
    return {
      meta: sales.meta,
      netSales: sales.summary.netSales,
      grossProfit: sales.summary.grossProfit,
      expenses: expenses.summary.posted,
      receivables: money(receivable),
      payables: money(payable),
      cashInflow: money(cashInflow),
      cashOutflow: money(cashOutflow),
      netCashMovement: money(cashInflow.minus(cashOutflow)),
      netProfit: null,
      note: 'Net profit is intentionally not reported; a general ledger and complete accounting treatment are outside the implemented scope.',
    };
  }

  async invoice(principal: AuthPrincipal, branch: ActiveBranchContext, id: string) {
    const sale = await this.db.sale.findFirst({
      where: { id, companyId: principal.companyId, branchId: branch.id },
      include: {
        branch: true,
        register: true,
        warehouse: true,
        customer: true,
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        items: true,
        paymentAllocations: { include: { payment: { include: { method: true } } } },
        returns: { include: { refunds: { include: { payment: { include: { method: true } } } } } },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    const company = await this.company(principal.companyId);
    const credited = sale.returns.reduce((sum, row) => sum.plus(row.totalCredit), d(0));
    const paid = sale.paymentAllocations.reduce((sum, row) => sum.plus(row.amount), d(0));
    const refunded = sale.returns.reduce(
      (sum, row) => sum.plus(row.refunds.reduce((r, refund) => r.plus(refund.amount), d(0))),
      d(0),
    );
    return {
      company: {
        name: company.name,
        legalName: company.legalName,
        phone: company.phone,
        email: company.email,
        address: company.address,
        currencyCode: company.currencyCode,
        timezone: company.timezone,
      },
      branch: { name: sale.branch.name, phone: sale.branch.phone, address: sale.branch.address },
      invoice: {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        completedAt: sale.completedAt,
        pricingMode: sale.pricingMode,
        status: sale.status,
        notes: sale.notes,
      },
      register: { code: sale.register.code, name: sale.register.name },
      customer: {
        code: sale.customer.code,
        name: sale.customer.name,
        phone: sale.customer.phone,
        address: sale.customer.address,
        isWalkIn: sale.customer.isWalkIn,
      },
      cashier: {
        name: `${sale.createdBy.firstName}${sale.createdBy.lastName ? ` ${sale.createdBy.lastName}` : ''}`,
        email: sale.createdBy.email,
      },
      items: sale.items.map((item) => ({
        id: item.id,
        productName: item.productNameSnapshot,
        sku: item.skuSnapshot,
        tileSize: item.tileSizeSnapshot,
        batchNumber: item.batchNumberSnapshot,
        lotNumber: item.lotNumberSnapshot,
        shade: item.shadeSnapshot,
        quantity: qty(item.quantity),
        unit: item.unitCodeSnapshot,
        baseQuantity: qty(item.baseQuantity),
        unitPrice: money(item.unitPrice),
        discount: money(item.discount),
        tax: money(item.tax),
        lineTotal: money(item.lineTotal),
      })),
      totals: {
        subtotal: money(sale.subtotal),
        discount: money(sale.discount),
        tax: money(sale.tax),
        total: money(sale.total),
        paid: money(paid),
        returnCredits: money(credited),
        refunded: money(refunded),
        outstanding: money(Prisma.Decimal.max(d(0), sale.total.minus(paid).minus(credited))),
        change: money(sale.change),
      },
      payments: sale.paymentAllocations.map((row) => ({
        number: row.payment.paymentNumber,
        method: row.payment.method.name,
        amount: money(row.amount),
        reference: row.payment.reference,
        paidAt: row.payment.paidAt,
      })),
      returns: sale.returns.map((row) => ({
        number: row.returnNumber,
        kind: row.kind,
        amount: money(row.totalCredit),
        returnedAt: row.returnedAt,
      })),
    };
  }

  async exportCsv(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    kind: ReportKind,
    query: ReportQueryDto,
  ) {
    const required: Record<ReportKind, string> = {
      sales: PERMISSIONS.REPORT_VIEW_SALES,
      products: PERMISSIONS.REPORT_VIEW_SALES,
      inventory: PERMISSIONS.REPORT_VIEW_INVENTORY,
      purchases: PERMISSIONS.REPORT_VIEW_PURCHASES,
      customers: PERMISSIONS.REPORT_VIEW_CUSTOMERS,
      suppliers: PERMISSIONS.REPORT_VIEW_SUPPLIERS,
      expenses: PERMISSIONS.REPORT_VIEW_EXPENSES,
      cash: PERMISSIONS.REPORT_VIEW_CASH,
    };
    if (!Object.hasOwn(required, kind)) throw new BadRequestException('Unsupported report export');
    if (!principal.permissions.has(required[kind]))
      throw new ForbiddenException('Insufficient permission');
    const full = { ...query, page: 1, limit: 100 };
    const result =
      kind === 'sales'
        ? await this.sales(principal, branch, full)
        : kind === 'products'
          ? await this.productSales(principal, branch, full)
          : kind === 'inventory'
            ? await this.inventory(principal, branch, full)
            : kind === 'purchases'
              ? await this.purchases(principal, branch, full)
              : kind === 'customers'
                ? await this.customers(principal, branch, full)
                : kind === 'suppliers'
                  ? await this.suppliers(principal, branch, full)
                  : kind === 'expenses'
                    ? await this.expenses(principal, branch, full)
                    : await this.cash(principal, branch, full);
    const rows = result.items as Record<string, unknown>[];
    if (!rows.length) return 'No data\r\n';
    const keys = Object.keys(rows[0]).filter((key) => typeof rows[0][key] !== 'object');
    const escape = (value: unknown) => {
      const printable =
        value === null || value === undefined
          ? ''
          : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value);
      return `"${printable.replaceAll('"', '""')}"`;
    };
    return [
      keys.map(escape).join(','),
      ...rows.map((row) => keys.map((key) => escape(row[key])).join(',')),
    ].join('\r\n');
  }

  private async ledgerTotal(kind: 'customer' | 'supplier', companyId: string) {
    const aggregate =
      kind === 'customer'
        ? await this.db.customerLedgerEntry.aggregate({
            where: { companyId },
            _sum: { amount: true },
          })
        : await this.db.supplierLedgerEntry.aggregate({
            where: { companyId },
            _sum: { amount: true },
          });
    return d(aggregate._sum.amount);
  }

  private company(companyId: string) {
    return this.db.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        name: true,
        legalName: true,
        phone: true,
        email: true,
        address: true,
        currencyCode: true,
        timezone: true,
      },
    });
  }

  private async range(companyId: string, query: ReportQueryDto) {
    const company = await this.company(companyId);
    const today = this.localDate(new Date(), company.timezone);
    const fromLabel = query.from ?? today;
    const toLabel = query.to ?? today;
    const from = this.zonedBoundary(fromLabel, company.timezone);
    const toDate = new Date(`${toLabel}T00:00:00Z`);
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    const toExclusiveLabel = toDate.toISOString().slice(0, 10);
    const to = this.zonedBoundary(toExclusiveLabel, company.timezone);
    if (to <= from) throw new BadRequestException('Report end date must not precede start date');
    if (to.getTime() - from.getTime() > 367 * 86_400_000)
      throw new BadRequestException('Report range cannot exceed 366 days');
    return {
      from,
      to,
      meta: {
        from: fromLabel,
        to: toLabel,
        timezone: company.timezone,
        currencyCode: company.currencyCode,
      },
    };
  }

  private localDate(date: Date, timezone: string) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private zonedBoundary(label: string, timezone: string) {
    const [year, month, day] = label.split('-').map(Number);
    if (!year || !month || !day) throw new BadRequestException('Invalid report date');
    let instant = Date.UTC(year, month - 1, day);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const parts = Object.fromEntries(
        formatter
          .formatToParts(new Date(instant))
          .filter((part) => part.type !== 'literal')
          .map((part) => [part.type, Number(part.value)]),
      );
      const represented = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
      );
      instant -= represented - Date.UTC(year, month - 1, day);
    }
    return new Date(instant);
  }
}
