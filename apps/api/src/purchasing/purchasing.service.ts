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
  InvoiceStatus,
  InventoryMovementType,
  OrderStatus,
  PaymentDirection,
  PaymentStatus,
  Prisma,
  PurchaseDocumentType,
  PurchaseOperationType,
  PurchaseReturnStatus,
  ReceiptStatus,
  SupplierLedgerEntryType,
} from '../generated/prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import type {
  CreatePurchaseInvoiceDto,
  CreatePurchaseOrderDto,
  PostGoodsReceiptDto,
  PostPurchaseReturnDto,
  PostSupplierPaymentDto,
  PurchaseLineDto,
  PurchaseListQueryDto,
  UpdatePurchaseOrderDto,
} from './dto/purchasing.dto';

type Tx = Prisma.TransactionClient;
const money = (value: string | number | Prisma.Decimal) =>
  new Prisma.Decimal(value).toDecimalPlaces(4);
const quantity = (value: string | number | Prisma.Decimal) =>
  new Prisma.Decimal(value).toDecimalPlaces(6);
const factor = (value: string | number | Prisma.Decimal) =>
  new Prisma.Decimal(value).toDecimalPlaces(10);

@Injectable()
export class PurchasingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly inventory: InventoryService,
  ) {}

  async createOrder(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    dto: CreatePurchaseOrderDto,
  ) {
    return this.db.$transaction(async (tx) => {
      const [supplier] = await Promise.all([
        this.requireSupplier(tx, principal.companyId, dto.supplierId),
        this.requireWarehouse(tx, principal.companyId, branch.id, dto.warehouseId),
      ]);
      if (!supplier.isActive) throw new BadRequestException('Supplier is inactive');
      const lines = await this.resolveLines(tx, principal.companyId, dto.items);
      const totals = this.documentTotals(lines, dto);
      const orderNumber = await this.nextNumber(
        tx,
        principal.companyId,
        PurchaseDocumentType.PURCHASE_ORDER,
      );
      const order = await tx.purchaseOrder.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId,
          createdById: principal.userId,
          orderNumber,
          orderDate: new Date(dto.orderDate),
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : undefined,
          notes: dto.notes,
          ...totals,
          items: { create: lines },
        },
        include: { items: true, supplier: { select: { id: true, code: true, name: true } } },
      });
      await this.audit(
        tx,
        principal,
        branch.id,
        'purchase.order.created',
        'PurchaseOrder',
        order.id,
        {
          orderNumber,
          total: order.total.toFixed(4),
        },
      );
      return order;
    });
  }

  async updateOrder(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ) {
    return this.db.$transaction(async (tx) => {
      const order = await this.requireOrder(tx, principal.companyId, branch.id, id);
      if (order.status !== OrderStatus.DRAFT)
        throw new ConflictException('Only a draft purchase order can be edited');
      const [supplier] = await Promise.all([
        this.requireSupplier(tx, principal.companyId, dto.supplierId),
        this.requireWarehouse(tx, principal.companyId, branch.id, dto.warehouseId),
      ]);
      if (!supplier.isActive) throw new BadRequestException('Supplier is inactive');
      const lines = await this.resolveLines(tx, principal.companyId, dto.items);
      const totals = this.documentTotals(lines, dto);
      await tx.purchaseOrderItem.deleteMany({
        where: { companyId: principal.companyId, orderId: id },
      });
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          warehouseId: dto.warehouseId,
          orderDate: new Date(dto.orderDate),
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
          notes: dto.notes,
          ...totals,
          items: { create: lines },
        },
        include: { items: true },
      });
      await this.audit(tx, principal, branch.id, 'purchase.order.updated', 'PurchaseOrder', id);
      return updated;
    });
  }

  transitionOrder(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    id: string,
    action: 'submit' | 'confirm' | 'cancel' | 'close',
  ) {
    const rules: Record<typeof action, [OrderStatus[], OrderStatus]> = {
      submit: [[OrderStatus.DRAFT], OrderStatus.SUBMITTED],
      confirm: [[OrderStatus.SUBMITTED], OrderStatus.APPROVED],
      cancel: [[OrderStatus.DRAFT, OrderStatus.SUBMITTED], OrderStatus.CANCELLED],
      close: [[OrderStatus.RECEIVED], OrderStatus.CLOSED],
    };
    const auditActions: Record<typeof action, string> = {
      submit: 'purchase.order.submitted',
      confirm: 'purchase.order.confirmed',
      cancel: 'purchase.order.cancelled',
      close: 'purchase.order.closed',
    };
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, `${principal.companyId}:po:${id}`);
      const order = await this.requireOrder(tx, principal.companyId, branch.id, id);
      const [allowed, status] = rules[action];
      if (!allowed.includes(order.status))
        throw new ConflictException(`Purchase order cannot be ${action}ed from ${order.status}`);
      const updated = await tx.purchaseOrder.update({ where: { id }, data: { status } });
      await this.audit(tx, principal, branch.id, auditActions[action], 'PurchaseOrder', id, {
        status,
      });
      return updated;
    });
  }

  async postReceipt(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: PostGoodsReceiptDto,
  ) {
    return this.idempotent(principal, key, PurchaseOperationType.GOODS_RECEIPT, dto, async (tx) => {
      await this.lock(tx, `${principal.companyId}:po:${dto.orderId}`);
      const order = await tx.purchaseOrder.findFirst({
        where: { id: dto.orderId, companyId: principal.companyId, branchId: branch.id },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Purchase order not found');
      if (order.status !== OrderStatus.APPROVED && order.status !== OrderStatus.PARTIALLY_RECEIVED)
        throw new ConflictException('Purchase order is not open for receiving');
      if (order.warehouseId !== dto.warehouseId)
        throw new BadRequestException('Receipt warehouse must match the purchase order');
      await this.requireWarehouse(tx, principal.companyId, branch.id, dto.warehouseId);
      this.distinct(
        dto.items.map((item) => item.orderItemId),
        'purchase order line',
      );
      const received = await tx.goodsReceiptItem.groupBy({
        by: ['orderItemId'],
        where: {
          companyId: principal.companyId,
          orderItemId: { in: dto.items.map((x) => x.orderItemId) },
          receipt: { status: ReceiptStatus.POSTED },
        },
        _sum: { baseQuantity: true },
      });
      const receivedByLine = new Map(
        received.map((row) => [row.orderItemId, quantity(row._sum.baseQuantity ?? 0)]),
      );
      const receiptNumber = await this.nextNumber(
        tx,
        principal.companyId,
        PurchaseDocumentType.GOODS_RECEIPT,
      );
      const receipt = await tx.goodsReceipt.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          warehouseId: dto.warehouseId,
          orderId: order.id,
          supplierId: order.supplierId,
          receivedById: principal.userId,
          receiptNumber,
          status: ReceiptStatus.POSTED,
          receivedAt: new Date(dto.receivedAt),
          notes: dto.notes,
        },
      });
      const results = [];
      for (const input of dto.items) {
        const orderItem = order.items.find((item) => item.id === input.orderItemId);
        if (!orderItem)
          throw new BadRequestException('Receipt line does not belong to the purchase order');
        const conversion = await this.resolveConversion(
          tx,
          principal.companyId,
          orderItem.productId,
          input.unitId,
          input.quantity,
        );
        const already = receivedByLine.get(orderItem.id) ?? quantity(0);
        if (already.plus(conversion.baseQuantity).greaterThan(orderItem.baseQuantity))
          throw new ConflictException(
            'Receipt quantity exceeds the remaining purchase order quantity',
          );
        const batchId = await this.resolveReceiptBatch(
          tx,
          principal.companyId,
          order.supplierId,
          orderItem.productId,
          input,
          new Date(dto.receivedAt),
        );
        const item = await tx.goodsReceiptItem.create({
          data: {
            companyId: principal.companyId,
            receiptId: receipt.id,
            orderItemId: orderItem.id,
            productId: orderItem.productId,
            unitId: input.unitId,
            batchId,
            quantity: conversion.transactionQuantity,
            baseQuantity: conversion.baseQuantity,
            conversionFactor: conversion.conversionFactor,
            unitCost: orderItem.unitCost,
          },
        });
        const stock = await this.inventory.postPurchasingMovement(
          tx,
          principal,
          branch.id,
          dto.warehouseId,
          {
            productId: orderItem.productId,
            unitId: input.unitId,
            batchId,
            quantity: input.quantity,
          },
          'IN',
          {
            type: InventoryMovementType.PURCHASE_RECEIPT,
            referenceType: 'GOODS_RECEIPT',
            referenceId: receipt.id,
            reason: `Goods receipt ${receiptNumber}`,
            unitCost: orderItem.unitCost,
          },
        );
        results.push({ item, movementId: stock.movement.id });
      }
      const totals = await tx.purchaseOrderItem.findMany({
        where: { companyId: principal.companyId, orderId: order.id },
        select: {
          id: true,
          baseQuantity: true,
          receiptItems: {
            where: { receipt: { status: ReceiptStatus.POSTED } },
            select: { baseQuantity: true },
          },
        },
      });
      const complete = totals.every((line) =>
        line.receiptItems
          .reduce((sum, item) => sum.plus(item.baseQuantity), quantity(0))
          .greaterThanOrEqualTo(line.baseQuantity),
      );
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: complete ? OrderStatus.RECEIVED : OrderStatus.PARTIALLY_RECEIVED },
      });
      await this.audit(
        tx,
        principal,
        branch.id,
        'purchase.receipt.posted',
        'GoodsReceipt',
        receipt.id,
        {
          receiptNumber,
          orderId: order.id,
          lines: results.length,
        },
      );
      return { ...receipt, items: results };
    });
  }

  async createInvoice(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    dto: CreatePurchaseInvoiceDto,
  ) {
    return this.db.$transaction(async (tx) => {
      const supplier = await this.requireSupplier(tx, principal.companyId, dto.supplierId);
      if (!supplier.isActive) throw new BadRequestException('Supplier is inactive');
      if (dto.orderId) {
        const order = await this.requireOrder(tx, principal.companyId, branch.id, dto.orderId);
        if (order.supplierId !== dto.supplierId)
          throw new BadRequestException('Invoice supplier does not match order');
      }
      if (dto.receiptId) {
        const receipt = await tx.goodsReceipt.findFirst({
          where: {
            id: dto.receiptId,
            companyId: principal.companyId,
            branchId: branch.id,
            status: ReceiptStatus.POSTED,
          },
        });
        if (!receipt || receipt.supplierId !== dto.supplierId)
          throw new BadRequestException('Invoice receipt is unavailable for this supplier');
      }
      const lines = await this.resolveInvoiceLines(tx, principal.companyId, dto);
      const totals = this.documentTotals(lines, dto, dto.additionalCost);
      const invoiceNumber = await this.nextNumber(
        tx,
        principal.companyId,
        PurchaseDocumentType.SUPPLIER_INVOICE,
      );
      const invoice = await tx.purchaseInvoice.create({
        data: {
          companyId: principal.companyId,
          branchId: branch.id,
          supplierId: dto.supplierId,
          orderId: dto.orderId,
          receiptId: dto.receiptId,
          createdById: principal.userId,
          invoiceNumber,
          supplierInvoiceNumber: dto.supplierInvoiceNumber,
          invoiceDate: new Date(dto.invoiceDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          currencyCode: dto.currencyCode.toUpperCase(),
          notes: dto.notes,
          additionalCost: money(dto.additionalCost),
          ...totals,
          items: { create: lines },
        },
        include: { items: true },
      });
      await this.audit(
        tx,
        principal,
        branch.id,
        'purchase.invoice.draft_created',
        'PurchaseInvoice',
        invoice.id,
        { invoiceNumber, total: invoice.total.toFixed(4) },
      );
      return invoice;
    });
  }

  postInvoice(principal: AuthPrincipal, branch: ActiveBranchContext, id: string, key: string) {
    return this.idempotent(
      principal,
      key,
      PurchaseOperationType.SUPPLIER_INVOICE,
      { id },
      async (tx) => {
        await this.lock(tx, `${principal.companyId}:invoice:${id}`);
        const invoice = await tx.purchaseInvoice.findFirst({
          where: { id, companyId: principal.companyId, branchId: branch.id },
          include: { items: true },
        });
        if (!invoice) throw new NotFoundException('Supplier invoice not found');
        if (invoice.status !== InvoiceStatus.DRAFT)
          throw new ConflictException('Only a draft invoice can be posted');
        await this.validateInvoiceCapacity(tx, principal.companyId, invoice);
        const updated = await tx.purchaseInvoice.update({
          where: { id },
          data: { status: InvoiceStatus.POSTED },
        });
        await tx.supplierLedgerEntry.create({
          data: {
            companyId: principal.companyId,
            branchId: branch.id,
            supplierId: invoice.supplierId,
            createdById: principal.userId,
            type: SupplierLedgerEntryType.PURCHASE_INVOICE,
            amount: invoice.total,
            effectiveAt: invoice.invoiceDate,
            referenceType: 'PURCHASE_INVOICE',
            referenceId: invoice.id,
            description: `Supplier invoice ${invoice.invoiceNumber}`,
            idempotencyKey: `invoice:${key}`,
            requestHash: this.hash({ id, total: invoice.total.toFixed(4) }),
          },
        });
        await this.audit(
          tx,
          principal,
          branch.id,
          'purchase.invoice.posted',
          'PurchaseInvoice',
          id,
          { total: invoice.total.toFixed(4) },
        );
        return updated;
      },
    );
  }

  postPayment(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: PostSupplierPaymentDto,
  ) {
    return this.idempotent(
      principal,
      key,
      PurchaseOperationType.SUPPLIER_PAYMENT,
      dto,
      async (tx) => {
        const supplier = await this.requireSupplier(tx, principal.companyId, dto.supplierId);
        if (!supplier.isActive) throw new BadRequestException('Supplier is inactive');
        const method = await tx.paymentMethod.findFirst({
          where: { id: dto.methodId, companyId: principal.companyId, isActive: true },
        });
        if (!method) throw new BadRequestException('Payment method is unavailable');
        const amount = money(dto.amount);
        const allocationTotal = dto.allocations.reduce(
          (sum, row) => sum.plus(money(row.amount)),
          money(0),
        );
        if (allocationTotal.greaterThan(amount))
          throw new BadRequestException('Allocations exceed payment amount');
        this.distinct(
          dto.allocations.map((row) => row.invoiceId),
          'invoice allocation',
        );
        for (const allocation of [...dto.allocations].sort((a, b) =>
          a.invoiceId.localeCompare(b.invoiceId),
        )) {
          await this.lock(tx, `${principal.companyId}:invoice:${allocation.invoiceId}`);
          const invoice = await tx.purchaseInvoice.findFirst({
            where: {
              id: allocation.invoiceId,
              companyId: principal.companyId,
              supplierId: dto.supplierId,
              status: { in: [InvoiceStatus.POSTED, InvoiceStatus.PARTIALLY_PAID] },
            },
          });
          if (!invoice)
            throw new BadRequestException('Payment invoice is unavailable for this supplier');
          const outstanding = await this.invoiceOutstanding(
            tx,
            principal.companyId,
            invoice.id,
            invoice.total,
          );
          if (money(allocation.amount).greaterThan(outstanding))
            throw new ConflictException('Allocation exceeds invoice outstanding amount');
        }
        const paymentNumber = await this.nextNumber(
          tx,
          principal.companyId,
          PurchaseDocumentType.SUPPLIER_PAYMENT,
        );
        const payment = await tx.payment.create({
          data: {
            companyId: principal.companyId,
            branchId: branch.id,
            methodId: dto.methodId,
            supplierId: dto.supplierId,
            recordedById: principal.userId,
            paymentNumber,
            direction: PaymentDirection.OUTBOUND,
            status: PaymentStatus.COMPLETED,
            amount,
            reference: dto.reference ?? dto.notes,
            paidAt: new Date(dto.paidAt),
            purchaseAllocations: {
              create: dto.allocations.map((row) => ({
                invoiceId: row.invoiceId,
                amount: money(row.amount),
              })),
            },
          },
        });
        for (const allocation of dto.allocations)
          await this.refreshInvoiceStatus(tx, principal.companyId, allocation.invoiceId);
        await tx.supplierLedgerEntry.create({
          data: {
            companyId: principal.companyId,
            branchId: branch.id,
            supplierId: dto.supplierId,
            createdById: principal.userId,
            type: SupplierLedgerEntryType.PAYMENT,
            amount: amount.negated(),
            effectiveAt: new Date(dto.paidAt),
            referenceType: 'SUPPLIER_PAYMENT',
            referenceId: payment.id,
            description: dto.notes ?? `Supplier payment ${paymentNumber}`,
            idempotencyKey: `payment:${key}`,
            requestHash: this.hash({
              supplierId: dto.supplierId,
              amount: amount.toFixed(4),
              allocations: dto.allocations,
            }),
          },
        });
        await this.audit(
          tx,
          principal,
          branch.id,
          'supplier.payment.posted',
          'Payment',
          payment.id,
          {
            paymentNumber,
            amount: amount.toFixed(4),
            unapplied: amount.minus(allocationTotal).toFixed(4),
          },
        );
        return {
          ...payment,
          allocated: allocationTotal.toFixed(4),
          unapplied: amount.minus(allocationTotal).toFixed(4),
        };
      },
    );
  }

  postReturn(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    key: string,
    dto: PostPurchaseReturnDto,
  ) {
    return this.idempotent(
      principal,
      key,
      PurchaseOperationType.PURCHASE_RETURN,
      dto,
      async (tx) => {
        const receipt = await tx.goodsReceipt.findFirst({
          where: {
            id: dto.receiptId,
            companyId: principal.companyId,
            branchId: branch.id,
            status: ReceiptStatus.POSTED,
          },
          include: { items: true },
        });
        if (!receipt) throw new NotFoundException('Goods receipt not found');
        if (dto.invoiceId) {
          const invoice = await tx.purchaseInvoice.findFirst({
            where: {
              id: dto.invoiceId,
              companyId: principal.companyId,
              supplierId: receipt.supplierId,
              status: {
                in: [InvoiceStatus.POSTED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID],
              },
            },
          });
          if (!invoice) throw new BadRequestException('Posted supplier invoice is unavailable');
        }
        this.distinct(
          dto.items.map((row) => row.receiptItemId),
          'receipt return line',
        );
        const returnNumber = await this.nextNumber(
          tx,
          principal.companyId,
          PurchaseDocumentType.PURCHASE_RETURN,
        );
        const purchaseReturn = await tx.purchaseReturn.create({
          data: {
            companyId: principal.companyId,
            branchId: branch.id,
            warehouseId: receipt.warehouseId,
            supplierId: receipt.supplierId,
            orderId: receipt.orderId,
            receiptId: receipt.id,
            invoiceId: dto.invoiceId,
            createdById: principal.userId,
            returnNumber,
            status: PurchaseReturnStatus.DRAFT,
            returnedAt: new Date(dto.returnedAt),
            reason: dto.reason,
            notes: dto.notes,
          },
        });
        let financialTotal = money(0);
        const postedItems = [];
        for (const input of dto.items) {
          await this.lock(tx, `${principal.companyId}:receipt-item:${input.receiptItemId}`);
          const receiptItem = receipt.items.find((row) => row.id === input.receiptItemId);
          if (!receiptItem)
            throw new BadRequestException('Return line does not belong to the goods receipt');
          const conversion = await this.resolveConversion(
            tx,
            principal.companyId,
            receiptItem.productId,
            input.unitId,
            input.quantity,
          );
          const prior = await tx.purchaseReturnItem.aggregate({
            where: {
              companyId: principal.companyId,
              receiptItemId: receiptItem.id,
              purchaseReturn: { status: PurchaseReturnStatus.POSTED },
            },
            _sum: { baseQuantity: true },
          });
          if (
            quantity(prior._sum.baseQuantity ?? 0)
              .plus(conversion.baseQuantity)
              .greaterThan(receiptItem.baseQuantity)
          )
            throw new ConflictException('Return quantity exceeds the received quantity');
          let invoiceItem: {
            id: string;
            baseQuantity: Prisma.Decimal;
            lineTotal: Prisma.Decimal;
          } | null = null;
          let financialAmount = money(0);
          if (input.invoiceItemId) {
            if (!dto.invoiceId)
              throw new BadRequestException('Invoice reference is required for a financial return');
            invoiceItem = await tx.purchaseInvoiceItem.findFirst({
              where: {
                id: input.invoiceItemId,
                companyId: principal.companyId,
                invoiceId: dto.invoiceId,
                productId: receiptItem.productId,
                receiptItemId: receiptItem.id,
              },
              select: { id: true, baseQuantity: true, lineTotal: true },
            });
            if (!invoiceItem)
              throw new BadRequestException('Invoice line does not match the received goods');
            const credited = await tx.purchaseReturnItem.aggregate({
              where: {
                companyId: principal.companyId,
                invoiceItemId: invoiceItem.id,
                purchaseReturn: { status: PurchaseReturnStatus.POSTED },
              },
              _sum: { baseQuantity: true },
            });
            if (
              quantity(credited._sum.baseQuantity ?? 0)
                .plus(conversion.baseQuantity)
                .greaterThan(invoiceItem.baseQuantity)
            )
              throw new ConflictException('Return quantity exceeds the invoiced quantity');
            financialAmount = money(
              invoiceItem.lineTotal.mul(conversion.baseQuantity).div(invoiceItem.baseQuantity),
            );
            financialTotal = financialTotal.plus(financialAmount);
          } else if (dto.invoiceId) {
            throw new BadRequestException('Each financial return line requires its invoice item');
          }
          const item = await tx.purchaseReturnItem.create({
            data: {
              companyId: principal.companyId,
              returnId: purchaseReturn.id,
              receiptItemId: receiptItem.id,
              invoiceItemId: invoiceItem?.id,
              productId: receiptItem.productId,
              unitId: input.unitId,
              batchId: receiptItem.batchId,
              quantity: conversion.transactionQuantity,
              baseQuantity: conversion.baseQuantity,
              conversionFactor: conversion.conversionFactor,
              unitCost: receiptItem.unitCost,
              financialAmount,
            },
          });
          const stock = await this.inventory.postPurchasingMovement(
            tx,
            principal,
            branch.id,
            receipt.warehouseId,
            {
              productId: receiptItem.productId,
              unitId: input.unitId,
              batchId: receiptItem.batchId ?? undefined,
              quantity: input.quantity,
            },
            'OUT',
            {
              type: InventoryMovementType.PURCHASE_RETURN,
              referenceType: 'PURCHASE_RETURN',
              referenceId: purchaseReturn.id,
              reason: dto.reason,
              unitCost: receiptItem.unitCost,
            },
          );
          postedItems.push({ item, movementId: stock.movement.id });
        }
        await tx.purchaseReturn.update({
          where: { id: purchaseReturn.id },
          data: { financialTotal, status: PurchaseReturnStatus.POSTED },
        });
        if (financialTotal.greaterThan(0)) {
          await tx.supplierLedgerEntry.create({
            data: {
              companyId: principal.companyId,
              branchId: branch.id,
              supplierId: receipt.supplierId,
              createdById: principal.userId,
              type: SupplierLedgerEntryType.PURCHASE_RETURN,
              amount: financialTotal.negated(),
              effectiveAt: new Date(dto.returnedAt),
              referenceType: 'PURCHASE_RETURN',
              referenceId: purchaseReturn.id,
              description: `Purchase return ${returnNumber}: ${dto.reason}`,
              idempotencyKey: `return:${key}`,
              requestHash: this.hash({
                receiptId: dto.receiptId,
                financialTotal: financialTotal.toFixed(4),
              }),
            },
          });
          if (dto.invoiceId)
            await this.refreshInvoiceStatus(tx, principal.companyId, dto.invoiceId);
        }
        await this.audit(
          tx,
          principal,
          branch.id,
          'purchase.return.posted',
          'PurchaseReturn',
          purchaseReturn.id,
          { returnNumber, financialTotal: financialTotal.toFixed(4), lines: postedItems.length },
        );
        return { ...purchaseReturn, financialTotal: financialTotal.toFixed(4), items: postedItems };
      },
    );
  }

  listOrders(principal: AuthPrincipal, branch: ActiveBranchContext, query: PurchaseListQueryDto) {
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      supplierId: query.supplierId,
      warehouseId: query.warehouseId,
      status: query.orderStatus,
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.page(
      this.db.purchaseOrder,
      where,
      query,
      { orderDate: 'desc' },
      {
        supplier: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true, receipts: true } },
      },
    );
  }

  getOrder(principal: AuthPrincipal, branch: ActiveBranchContext, id: string) {
    return this.db.purchaseOrder
      .findFirst({
        where: { id, companyId: principal.companyId, branchId: branch.id },
        include: {
          supplier: true,
          warehouse: true,
          items: {
            include: {
              product: { select: { id: true, sku: true, name: true, batchTracking: true } },
              unit: true,
              receiptItems: {
                where: { receipt: { status: ReceiptStatus.POSTED } },
                select: { baseQuantity: true, quantity: true },
              },
            },
          },
          receipts: { orderBy: { receivedAt: 'desc' } },
        },
      })
      .then((order) => {
        if (!order) throw new NotFoundException('Purchase order not found');
        return {
          ...order,
          items: order.items.map((item) => ({
            ...item,
            receivedBaseQuantity: item.receiptItems
              .reduce((sum, row) => sum.plus(row.baseQuantity), quantity(0))
              .toFixed(6),
            remainingBaseQuantity: quantity(item.baseQuantity)
              .minus(
                item.receiptItems.reduce((sum, row) => sum.plus(row.baseQuantity), quantity(0)),
              )
              .toFixed(6),
          })),
        };
      });
  }

  listReceipts(principal: AuthPrincipal, branch: ActiveBranchContext, query: PurchaseListQueryDto) {
    const where: Prisma.GoodsReceiptWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      supplierId: query.supplierId,
      warehouseId: query.warehouseId,
      ...(query.search
        ? {
            OR: [
              { receiptNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.page(
      this.db.goodsReceipt,
      where,
      query,
      { receivedAt: 'desc' },
      {
        supplier: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
    );
  }

  getReceipt(principal: AuthPrincipal, branch: ActiveBranchContext, id: string) {
    return this.db.goodsReceipt
      .findFirst({
        where: { id, companyId: principal.companyId, branchId: branch.id },
        include: {
          supplier: true,
          warehouse: true,
          items: {
            include: {
              product: { select: { id: true, sku: true, name: true, batchTracking: true } },
              unit: true,
              batch: true,
            },
          },
        },
      })
      .then((receipt) => {
        if (!receipt) throw new NotFoundException('Goods receipt not found');
        return receipt;
      });
  }

  listInvoices(principal: AuthPrincipal, branch: ActiveBranchContext, query: PurchaseListQueryDto) {
    const where: Prisma.PurchaseInvoiceWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      supplierId: query.supplierId,
      status: query.invoiceStatus,
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
    return this.page(
      this.db.purchaseInvoice,
      where,
      query,
      { invoiceDate: 'desc' },
      {
        supplier: { select: { id: true, code: true, name: true } },
        paymentAllocations: {
          where: { payment: { status: PaymentStatus.COMPLETED } },
          select: { amount: true },
        },
        returns: {
          where: { status: PurchaseReturnStatus.POSTED },
          select: { financialTotal: true },
        },
      },
    );
  }

  getInvoice(principal: AuthPrincipal, branch: ActiveBranchContext, id: string) {
    return this.db.purchaseInvoice
      .findFirst({
        where: { id, companyId: principal.companyId, branchId: branch.id },
        include: {
          supplier: true,
          items: {
            include: { product: { select: { id: true, sku: true, name: true } }, unit: true },
          },
          paymentAllocations: {
            where: { payment: { status: PaymentStatus.COMPLETED } },
            include: { payment: true },
          },
          returns: { where: { status: PurchaseReturnStatus.POSTED } },
        },
      })
      .then((invoice) => {
        if (!invoice) throw new NotFoundException('Supplier invoice not found');
        return invoice;
      });
  }

  paymentMethods(principal: AuthPrincipal) {
    return this.db.paymentMethod.findMany({
      where: { companyId: principal.companyId, isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  listPayments(principal: AuthPrincipal, branch: ActiveBranchContext, query: PurchaseListQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      supplierId: query.supplierId,
      direction: PaymentDirection.OUTBOUND,
      ...(query.search
        ? {
            OR: [
              { paymentNumber: { contains: query.search, mode: 'insensitive' } },
              { reference: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.page(
      this.db.payment,
      where,
      query,
      { paidAt: 'desc' },
      {
        supplier: { select: { id: true, code: true, name: true } },
        method: true,
        purchaseAllocations: true,
      },
    );
  }

  listReturns(principal: AuthPrincipal, branch: ActiveBranchContext, query: PurchaseListQueryDto) {
    const where: Prisma.PurchaseReturnWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      supplierId: query.supplierId,
      warehouseId: query.warehouseId,
      ...(query.search
        ? {
            OR: [
              { returnNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.page(
      this.db.purchaseReturn,
      where,
      query,
      { returnedAt: 'desc' },
      {
        supplier: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
    );
  }

  async supplierDue(principal: AuthPrincipal, supplierId: string) {
    await this.requireSupplier(this.db, principal.companyId, supplierId);
    const aggregate = await this.db.supplierLedgerEntry.aggregate({
      where: { companyId: principal.companyId, supplierId },
      _sum: { amount: true },
    });
    const invoices = await this.db.purchaseInvoice.findMany({
      where: {
        companyId: principal.companyId,
        supplierId,
        status: { in: [InvoiceStatus.POSTED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID] },
      },
      include: {
        paymentAllocations: {
          where: { payment: { status: PaymentStatus.COMPLETED } },
          select: { amount: true },
        },
        returns: {
          where: { status: PurchaseReturnStatus.POSTED },
          select: { financialTotal: true },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });
    return {
      balance: money(aggregate._sum.amount ?? 0).toFixed(4),
      position: money(aggregate._sum.amount ?? 0).isNegative() ? 'ADVANCE' : 'PAYABLE',
      invoices: invoices.map((invoice) => {
        const paid = invoice.paymentAllocations.reduce(
          (sum, row) => sum.plus(row.amount),
          money(0),
        );
        const credited = invoice.returns.reduce(
          (sum, row) => sum.plus(row.financialTotal),
          money(0),
        );
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total.toFixed(4),
          paid: paid.toFixed(4),
          credited: credited.toFixed(4),
          outstanding: money(invoice.total).minus(paid).minus(credited).toFixed(4),
          dueDate: invoice.dueDate,
          overdue: Boolean(
            invoice.dueDate &&
            invoice.dueDate < new Date() &&
            money(invoice.total).minus(paid).minus(credited).isPositive(),
          ),
        };
      }),
    };
  }

  private async resolveLines(tx: Tx, companyId: string, items: PurchaseLineDto[]) {
    const lines = [];
    for (const item of items) {
      const converted = await this.resolveConversion(
        tx,
        companyId,
        item.productId,
        item.unitId,
        item.quantity,
      );
      const subtotal = money(converted.transactionQuantity.mul(money(item.unitCost)));
      const discount = money(item.discount);
      const tax = money(item.tax);
      if (discount.greaterThan(subtotal))
        throw new BadRequestException('Line discount cannot exceed subtotal');
      lines.push({
        productId: item.productId,
        unitId: item.unitId,
        quantity: converted.transactionQuantity,
        baseQuantity: converted.baseQuantity,
        conversionFactor: converted.conversionFactor,
        unitCost: money(item.unitCost),
        discount,
        tax,
        lineTotal: money(subtotal.minus(discount).plus(tax)),
      });
    }
    return lines;
  }

  private async resolveInvoiceLines(tx: Tx, companyId: string, dto: CreatePurchaseInvoiceDto) {
    const lines = await this.resolveLines(tx, companyId, dto.items);
    return Promise.all(
      lines.map(async (line, index) => {
        const receiptItemId = dto.items[index].receiptItemId;
        if (receiptItemId) {
          const item = await tx.goodsReceiptItem.findFirst({
            where: {
              id: receiptItemId,
              companyId,
              productId: line.productId,
              receipt: {
                supplierId: dto.supplierId,
                status: ReceiptStatus.POSTED,
                ...(dto.receiptId ? { id: dto.receiptId } : {}),
              },
            },
          });
          if (!item) throw new BadRequestException('Invoice receipt line is unavailable');
        }
        return { ...line, receiptItemId };
      }),
    );
  }

  private documentTotals(
    lines: Array<{ lineTotal: Prisma.Decimal }>,
    dto: { discount: string; tax: string; freight: string },
    additional = '0',
  ) {
    const subtotal = lines.reduce((sum, row) => sum.plus(row.lineTotal), money(0));
    const discount = money(dto.discount);
    const tax = money(dto.tax);
    const freight = money(dto.freight);
    const additionalCost = money(additional);
    if (discount.greaterThan(subtotal))
      throw new BadRequestException('Document discount cannot exceed line total');
    return {
      subtotal,
      discount,
      tax,
      freight,
      total: money(subtotal.minus(discount).plus(tax).plus(freight).plus(additionalCost)),
    };
  }

  private async resolveConversion(
    tx: Tx,
    companyId: string,
    productId: string,
    unitId: string,
    value: string,
  ) {
    const product = await tx.product.findFirst({
      where: { id: productId, companyId, isActive: true },
      select: {
        id: true,
        baseUnitId: true,
        baseUnit: { select: { isActive: true } },
        conversions: {
          where: { fromUnitId: unitId, isActive: true },
          select: { factorToBase: true },
        },
      },
    });
    if (!product || !product.baseUnit.isActive)
      throw new BadRequestException('Product or base unit is unavailable');
    const conversionFactor =
      product.baseUnitId === unitId ? factor(1) : product.conversions[0]?.factorToBase;
    if (!conversionFactor) throw new BadRequestException('Unit is not configured for this product');
    const transactionQuantity = quantity(value);
    const baseQuantity = quantity(transactionQuantity.mul(conversionFactor));
    if (!transactionQuantity.isPositive() || !baseQuantity.isPositive())
      throw new BadRequestException('Quantity must resolve to a positive base quantity');
    return { transactionQuantity, baseQuantity, conversionFactor: factor(conversionFactor) };
  }

  private async resolveReceiptBatch(
    tx: Tx,
    companyId: string,
    supplierId: string,
    productId: string,
    input: { batchNumber?: string; lotNumber?: string; shade?: string },
    receivedAt: Date,
  ) {
    const product = await tx.product.findFirst({
      where: { id: productId, companyId },
      select: { batchTracking: true },
    });
    if (!product) throw new BadRequestException('Product is unavailable');
    if (!product.batchTracking) {
      if (input.batchNumber || input.lotNumber || input.shade)
        throw new BadRequestException('Batch data cannot be used for this product');
      return undefined;
    }
    if (!input.batchNumber)
      throw new BadRequestException('Batch number is required for this product');
    await this.lock(
      tx,
      `${companyId}:batch:${productId}:${input.batchNumber}:${input.lotNumber ?? '-'}:${input.shade ?? '-'}`,
    );
    const identity = {
      companyId,
      productId,
      batchNumber: input.batchNumber,
      lotNumber: input.lotNumber ?? null,
      shade: input.shade ?? null,
    };
    const existing = await tx.productBatch.findFirst({ where: identity });
    if (existing) {
      if (!existing.isActive || (existing.supplierId && existing.supplierId !== supplierId))
        throw new ConflictException('Matching batch is inactive or belongs to another supplier');
      return existing.id;
    }
    return (await tx.productBatch.create({ data: { ...identity, supplierId, receivedAt } })).id;
  }

  private async validateInvoiceCapacity(
    tx: Tx,
    companyId: string,
    invoice: {
      id: string;
      items: Array<{ id: string; receiptItemId: string | null; baseQuantity: Prisma.Decimal }>;
    },
  ) {
    for (const item of invoice.items) {
      if (!item.receiptItemId) continue;
      await this.lock(tx, `${companyId}:receipt-item-invoice:${item.receiptItemId}`);
      const receiptItem = await tx.goodsReceiptItem.findFirst({
        where: { id: item.receiptItemId, companyId },
        select: { baseQuantity: true },
      });
      if (!receiptItem) throw new BadRequestException('Receipt item is unavailable');
      const prior = await tx.purchaseInvoiceItem.aggregate({
        where: {
          companyId,
          receiptItemId: item.receiptItemId,
          invoiceId: { not: invoice.id },
          invoice: {
            status: {
              in: [InvoiceStatus.POSTED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID],
            },
          },
        },
        _sum: { baseQuantity: true },
      });
      if (
        quantity(prior._sum.baseQuantity ?? 0)
          .plus(item.baseQuantity)
          .greaterThan(receiptItem.baseQuantity)
      )
        throw new ConflictException('Posted invoice quantity exceeds received quantity');
    }
  }

  private async invoiceOutstanding(
    tx: Tx,
    companyId: string,
    invoiceId: string,
    total: Prisma.Decimal,
  ) {
    const [paid, credited] = await Promise.all([
      tx.purchasePayment.aggregate({
        where: { companyId, invoiceId, payment: { status: PaymentStatus.COMPLETED } },
        _sum: { amount: true },
      }),
      tx.purchaseReturn.aggregate({
        where: { companyId, invoiceId, status: PurchaseReturnStatus.POSTED },
        _sum: { financialTotal: true },
      }),
    ]);
    return money(total)
      .minus(paid._sum.amount ?? 0)
      .minus(credited._sum.financialTotal ?? 0)
      .toDecimalPlaces(4);
  }

  private async refreshInvoiceStatus(tx: Tx, companyId: string, invoiceId: string) {
    const invoice = await tx.purchaseInvoice.findFirst({
      where: { id: invoiceId, companyId },
      select: { total: true, status: true },
    });
    if (
      !invoice ||
      invoice.status === InvoiceStatus.DRAFT ||
      invoice.status === InvoiceStatus.VOIDED
    )
      return;
    const outstanding = await this.invoiceOutstanding(tx, companyId, invoiceId, invoice.total);
    await tx.purchaseInvoice.update({
      where: { id: invoiceId },
      data: {
        status: outstanding.lessThanOrEqualTo(0)
          ? InvoiceStatus.PAID
          : outstanding.lessThan(invoice.total)
            ? InvoiceStatus.PARTIALLY_PAID
            : InvoiceStatus.POSTED,
      },
    });
  }

  private requireOrder(
    client: Tx | DatabaseService,
    companyId: string,
    branchId: string,
    id: string,
    items = false,
  ) {
    return client.purchaseOrder
      .findFirst({
        where: { id, companyId, branchId },
        ...(items ? { include: { items: true } } : {}),
      })
      .then((order) => {
        if (!order) throw new NotFoundException('Purchase order not found');
        return order;
      });
  }

  private requireSupplier(client: Tx | DatabaseService, companyId: string, id: string) {
    return client.supplier.findFirst({ where: { id, companyId } }).then((supplier) => {
      if (!supplier) throw new NotFoundException('Supplier not found');
      return supplier;
    });
  }

  private requireWarehouse(
    client: Tx | DatabaseService,
    companyId: string,
    branchId: string,
    id: string,
  ) {
    return client.warehouse
      .findFirst({ where: { id, companyId, branchId, isActive: true } })
      .then((warehouse) => {
        if (!warehouse)
          throw new BadRequestException('Warehouse is unavailable in the active branch');
        return warehouse;
      });
  }

  private async nextNumber(tx: Tx, companyId: string, type: PurchaseDocumentType) {
    const row = await tx.purchaseDocumentSequence.upsert({
      where: { companyId_type: { companyId, type } },
      create: { companyId, type, nextNumber: 2n },
      update: { nextNumber: { increment: 1 } },
      select: { nextNumber: true },
    });
    const prefix: Record<PurchaseDocumentType, string> = {
      PURCHASE_ORDER: 'PO',
      GOODS_RECEIPT: 'GR',
      SUPPLIER_INVOICE: 'PI',
      SUPPLIER_PAYMENT: 'SP',
      PURCHASE_RETURN: 'PR',
    };
    return `${prefix[type]}-${(row.nextNumber - 1n).toString().padStart(6, '0')}`;
  }

  private async idempotent<T>(
    principal: AuthPrincipal,
    key: string,
    type: PurchaseOperationType,
    request: unknown,
    work: (tx: Tx) => Promise<T>,
  ): Promise<T | Prisma.JsonValue> {
    this.assertKey(key);
    const requestHash = this.hash(request);
    try {
      return await this.db.$transaction(
        async (tx) => {
          const operation = await tx.purchaseOperation.create({
            data: {
              companyId: principal.companyId,
              createdById: principal.userId,
              type,
              idempotencyKey: key,
              requestHash,
            },
          });
          const result = await work(tx);
          await tx.purchaseOperation.update({
            where: { id: operation.id },
            data: { result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue },
          });
          return result;
        },
        { timeout: 30000 },
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const existing = await this.db.purchaseOperation.findUnique({
        where: {
          companyId_idempotencyKey: { companyId: principal.companyId, idempotencyKey: key },
        },
      });
      if (!existing || existing.type !== type || existing.requestHash !== requestHash)
        throw new ConflictException('Idempotency key was already used for a different request');
      if (existing.result === null)
        throw new ConflictException('Operation is still in progress; retry shortly');
      return existing.result;
    }
  }

  private page(
    model: {
      findMany: (args: never) => Promise<unknown[]>;
      count: (args: never) => Promise<number>;
    },
    where: unknown,
    query: PurchaseListQueryDto,
    orderBy: unknown,
    include: unknown,
  ) {
    const args = {
      where,
      orderBy,
      include,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    } as never;
    return Promise.all([model.findMany(args), model.count({ where } as never)]).then(
      ([items, total]) => ({ items, total, page: query.page, limit: query.limit }),
    );
  }

  private distinct(values: string[], label: string) {
    if (new Set(values).size !== values.length) throw new BadRequestException(`Duplicate ${label}`);
  }
  private lock(tx: Tx, key: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
  private assertKey(key: string) {
    if (!key || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/.test(key))
      throw new BadRequestException('A valid Idempotency-Key header is required');
  }
  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
  private audit(
    tx: Tx,
    principal: AuthPrincipal,
    branchId: string,
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
