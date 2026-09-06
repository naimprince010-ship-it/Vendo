import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import type { ActiveBranchContext } from '../authorization/authenticated-request';
import { ActiveBranchService } from '../branches/active-branch.service';
import { DatabaseService } from '../database/database.service';
import { isUniqueConstraintError } from '../database/prisma-errors';
import {
  InventoryMovementType,
  InventoryOperationType,
  PhysicalCountStatus,
  Prisma,
} from '../generated/prisma/client';
import type {
  AdjustmentDto,
  BatchListQueryDto,
  BatchStatusDto,
  CountListQueryDto,
  CreateBatchDto,
  CreatePhysicalCountDto,
  InventoryListQueryDto,
  ReplaceCountItemsDto,
  StockLineDto,
  StockOperationDto,
  TransferDto,
} from './dto/inventory.dto';
import { AdjustmentDirection } from './dto/inventory.dto';

type Tx = Prisma.TransactionClient;
type Position = {
  productId: string;
  batchId?: string;
  unitId: string;
  transactionQuantity: Prisma.Decimal;
  conversionFactor: Prisma.Decimal;
  baseQuantity: Prisma.Decimal;
  product: {
    id: string;
    name: string;
    sku: string;
    baseUnitId: string;
    batchTracking: boolean;
  };
};

type DecimalValue = string | number | Prisma.Decimal;
const q6 = (value: DecimalValue) => new Prisma.Decimal(value).toDecimalPlaces(6);
const factor10 = (value: DecimalValue) => new Prisma.Decimal(value).toDecimalPlaces(10);

@Injectable()
export class InventoryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly branches: ActiveBranchService,
  ) {}

  opening(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    idempotencyKey: string,
    dto: StockOperationDto,
  ) {
    return this.stockOperation(
      principal,
      branch,
      idempotencyKey,
      InventoryOperationType.OPENING,
      InventoryMovementType.OPENING,
      dto,
      1,
      true,
    );
  }

  adjustment(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    idempotencyKey: string,
    dto: AdjustmentDto,
  ) {
    return this.stockOperation(
      principal,
      branch,
      idempotencyKey,
      InventoryOperationType.ADJUSTMENT,
      InventoryMovementType.ADJUSTMENT,
      dto,
      dto.direction === AdjustmentDirection.IN ? 1 : -1,
    );
  }

  damage(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    idempotencyKey: string,
    dto: StockOperationDto,
  ) {
    return this.stockOperation(
      principal,
      branch,
      idempotencyKey,
      InventoryOperationType.DAMAGE,
      InventoryMovementType.DAMAGE,
      dto,
      -1,
    );
  }

  loss(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    idempotencyKey: string,
    dto: StockOperationDto,
  ) {
    return this.stockOperation(
      principal,
      branch,
      idempotencyKey,
      InventoryOperationType.LOSS,
      InventoryMovementType.LOSS,
      dto,
      -1,
    );
  }

  private async stockOperation(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    idempotencyKey: string,
    operationType: InventoryOperationType,
    movementType: InventoryMovementType,
    dto: StockOperationDto,
    sign: 1 | -1,
    openingOnly = false,
  ) {
    this.assertIdempotencyKey(idempotencyKey);
    this.assertDistinctLines(dto.lines);
    return this.idempotent(
      principal,
      idempotencyKey,
      operationType,
      dto,
      async (tx, operationId) => {
        const warehouse = await this.requireWarehouse(
          tx,
          principal.companyId,
          branch.id,
          dto.warehouseId,
        );
        const positions = await Promise.all(
          dto.lines.map((line) => this.resolvePosition(tx, principal.companyId, line)),
        );
        const results = [];
        for (const position of this.sorted(positions, warehouse.id)) {
          await this.lock(
            tx,
            principal.companyId,
            warehouse.id,
            position.productId,
            position.batchId,
          );
          if (openingOnly) {
            const exists = await tx.inventoryMovement.findFirst({
              where: {
                companyId: principal.companyId,
                warehouseId: warehouse.id,
                productId: position.productId,
                batchId: position.batchId ?? null,
              },
              select: { id: true },
            });
            if (exists)
              throw new ConflictException('Opening stock already exists for this position');
          }
          results.push(
            await this.applyMovement(tx, principal, branch.id, warehouse.id, position, sign, {
              type: movementType,
              referenceType: 'INVENTORY_OPERATION',
              referenceId: operationId,
              reason: dto.reason,
            }),
          );
        }
        await this.audit(
          tx,
          principal,
          branch.id,
          `inventory.${operationType.toLowerCase()}.posted`,
          operationId,
          {
            warehouseId: warehouse.id,
            reason: dto.reason,
            lines: results,
          },
        );
        return { operationId, type: operationType, warehouse, lines: results };
      },
    );
  }

  async transfer(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    idempotencyKey: string,
    dto: TransferDto,
  ) {
    this.assertIdempotencyKey(idempotencyKey);
    if (dto.sourceWarehouseId === dto.destinationWarehouseId)
      throw new BadRequestException('Source and destination warehouses must differ');
    this.assertDistinctLines(dto.lines);
    return this.idempotent(
      principal,
      idempotencyKey,
      InventoryOperationType.TRANSFER,
      dto,
      async (tx, operationId) => {
        const source = await this.requireWarehouse(
          tx,
          principal.companyId,
          branch.id,
          dto.sourceWarehouseId,
        );
        const destination = await tx.warehouse.findFirst({
          where: { id: dto.destinationWarehouseId, companyId: principal.companyId, isActive: true },
          select: { id: true, branchId: true, code: true, name: true },
        });
        if (!destination) throw new BadRequestException('Destination warehouse is unavailable');
        await this.branches.resolve(principal, destination.branchId);
        const positions = await Promise.all(
          dto.lines.map((line) => this.resolvePosition(tx, principal.companyId, line)),
        );
        const lockKeys = positions
          .flatMap((p) => [
            this.positionKey(principal.companyId, source.id, p.productId, p.batchId),
            this.positionKey(principal.companyId, destination.id, p.productId, p.batchId),
          ])
          .sort();
        for (const key of lockKeys)
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
        const correlationId = randomUUID();
        const lines = [];
        for (const position of positions) {
          const outbound = await this.applyMovement(
            tx,
            principal,
            source.branchId,
            source.id,
            position,
            -1,
            {
              type: InventoryMovementType.TRANSFER_OUT,
              referenceType: 'INVENTORY_OPERATION',
              referenceId: operationId,
              correlationId,
              reason: dto.reason,
              alreadyLocked: true,
            },
          );
          const inbound = await this.applyMovement(
            tx,
            principal,
            destination.branchId,
            destination.id,
            position,
            1,
            {
              type: InventoryMovementType.TRANSFER_IN,
              referenceType: 'INVENTORY_OPERATION',
              referenceId: operationId,
              correlationId,
              reason: dto.reason,
              alreadyLocked: true,
            },
          );
          lines.push({ productId: position.productId, outbound, inbound });
        }
        await this.audit(tx, principal, branch.id, 'inventory.transfer.posted', operationId, {
          sourceWarehouseId: source.id,
          destinationWarehouseId: destination.id,
          correlationId,
          reason: dto.reason,
        });
        return { operationId, correlationId, source, destination, lines };
      },
    );
  }

  async createBatch(principal: AuthPrincipal, dto: CreateBatchDto) {
    const product = await this.database.product.findFirst({
      where: { id: dto.productId, companyId: principal.companyId, isActive: true },
    });
    if (!product) throw new BadRequestException('Product is unavailable');
    if (!product.batchTracking)
      throw new BadRequestException('Batch tracking is not enabled for this product');
    if (dto.supplierId) {
      const supplier = await this.database.supplier.findFirst({
        where: { id: dto.supplierId, companyId: principal.companyId },
      });
      if (!supplier) throw new BadRequestException('Supplier is unavailable');
    }
    try {
      const batch = await this.database.productBatch.create({
        data: { companyId: principal.companyId, ...dto },
      });
      await this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'inventory.batch.created',
          entityType: 'ProductBatch',
          entityId: batch.id,
          newValue: batch,
        },
      });
      return batch;
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException('Batch identity already exists');
      throw error;
    }
  }

  async setBatchStatus(principal: AuthPrincipal, id: string, dto: BatchStatusDto) {
    const before = await this.database.productBatch.findFirst({
      where: { id, companyId: principal.companyId },
    });
    if (!before) throw new NotFoundException('Batch not found');
    if (!dto.isActive) {
      const stocked = await this.database.inventoryBalance.findFirst({
        where: { companyId: principal.companyId, batchId: id, baseQuantity: { not: 0 } },
        select: { id: true },
      });
      if (stocked) throw new ConflictException('A batch with stock cannot be deactivated');
    }
    const batch = await this.database.productBatch.update({ where: { id }, data: dto });
    await this.database.auditLog.create({
      data: {
        companyId: principal.companyId,
        actorId: principal.userId,
        action: 'inventory.batch.status.changed',
        entityType: 'ProductBatch',
        entityId: id,
        previousValue: before,
        newValue: batch,
      },
    });
    return batch;
  }

  async listBatches(principal: AuthPrincipal, query: BatchListQueryDto) {
    const where: Prisma.ProductBatchWhereInput = {
      companyId: principal.companyId,
      ...(query.productId && { productId: query.productId }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { batchNumber: { contains: query.search, mode: 'insensitive' } },
          { lotNumber: { contains: query.search, mode: 'insensitive' } },
          { shade: { contains: query.search, mode: 'insensitive' } },
          { product: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };
    const [items, total] = await this.database.$transaction([
      this.database.productBatch.findMany({
        where,
        include: { product: { select: { id: true, sku: true, name: true } } },
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.productBatch.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async balances(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: InventoryListQueryDto,
  ) {
    const where: Prisma.InventoryBalanceWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      ...(query.warehouseId && { warehouseId: query.warehouseId }),
      ...(query.productId && { productId: query.productId }),
      ...(query.batchId && { batchId: query.batchId }),
      ...(query.search && {
        product: {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      }),
    };
    if (query.warehouseId)
      await this.requireWarehouse(this.database, principal.companyId, branch.id, query.warehouseId);
    const [rows, total] = await this.database.$transaction([
      this.database.inventoryBalance.findMany({
        where,
        include: {
          warehouse: { select: { id: true, code: true, name: true } },
          batch: { select: { id: true, batchNumber: true, lotNumber: true, shade: true } },
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              reorderLevel: true,
              baseUnit: true,
              conversions: { where: { isActive: true }, include: { fromUnit: true } },
            },
          },
        },
        orderBy: [{ product: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.inventoryBalance.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        ...row,
        equivalents: this.equivalents(row.baseQuantity, row.product),
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async lowStock(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: InventoryListQueryDto,
  ) {
    const balances = await this.database.inventoryBalance.findMany({
      where: {
        companyId: principal.companyId,
        branchId: branch.id,
        ...(query.warehouseId && { warehouseId: query.warehouseId }),
      },
      include: { product: { include: { baseUnit: true } }, warehouse: true },
    });
    const items = balances.filter(
      (row) => row.product.reorderLevel !== null && row.baseQuantity.lte(row.product.reorderLevel),
    );
    return { items, total: items.length };
  }

  async history(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: InventoryListQueryDto,
  ) {
    const where: Prisma.InventoryMovementWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      ...(query.warehouseId && { warehouseId: query.warehouseId }),
      ...(query.productId && { productId: query.productId }),
      ...(query.batchId && { batchId: query.batchId }),
      ...(query.type && { type: query.type }),
      ...(query.search && {
        OR: [
          { product: { name: { contains: query.search, mode: 'insensitive' } } },
          { product: { sku: { contains: query.search, mode: 'insensitive' } } },
          { reason: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await this.database.$transaction([
      this.database.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          batch: { select: { id: true, batchNumber: true, lotNumber: true, shade: true } },
          unit: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { occurredAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.inventoryMovement.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async createCount(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    dto: CreatePhysicalCountDto,
  ) {
    this.assertDistinctLines(dto.items);
    try {
      return await this.database.$transaction(async (tx) => {
        await this.requireWarehouse(tx, principal.companyId, branch.id, dto.warehouseId);
        const count = await tx.physicalCount.create({
          data: {
            companyId: principal.companyId,
            branchId: branch.id,
            warehouseId: dto.warehouseId,
            countNumber: dto.countNumber,
            notes: dto.notes,
            createdById: principal.userId,
          },
        });
        await this.replaceCountItemsTx(
          tx,
          principal.companyId,
          count.id,
          dto.warehouseId,
          dto.items,
        );
        await this.audit(tx, principal, branch.id, 'inventory.count.created', count.id, {
          warehouseId: dto.warehouseId,
          countNumber: dto.countNumber,
        });
        return this.countDetail(tx, principal.companyId, count.id);
      });
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException('Count number or position already exists');
      throw error;
    }
  }

  async replaceCountItems(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    id: string,
    dto: ReplaceCountItemsDto,
  ) {
    this.assertDistinctLines(dto.items);
    return this.database.$transaction(async (tx) => {
      const count = await this.requireCount(tx, principal.companyId, branch.id, id);
      if (count.status !== PhysicalCountStatus.DRAFT)
        throw new ConflictException('Only a draft count can be edited');
      await tx.physicalCountItem.deleteMany({ where: { countId: id } });
      await this.replaceCountItemsTx(tx, principal.companyId, id, count.warehouseId, dto.items);
      return this.countDetail(tx, principal.companyId, id);
    });
  }

  async reviewCount(principal: AuthPrincipal, branch: ActiveBranchContext, id: string) {
    return this.database.$transaction(async (tx) => {
      const count = await this.requireCount(tx, principal.companyId, branch.id, id);
      if (count.status !== PhysicalCountStatus.DRAFT)
        throw new ConflictException('Only a draft count can enter review');
      await tx.physicalCount.update({
        where: { id },
        data: {
          status: PhysicalCountStatus.IN_REVIEW,
          reviewedById: principal.userId,
          reviewedAt: new Date(),
        },
      });
      await this.audit(tx, principal, branch.id, 'inventory.count.reviewed', id);
      return this.countDetail(tx, principal.companyId, id);
    });
  }

  async reopenCount(principal: AuthPrincipal, branch: ActiveBranchContext, id: string) {
    return this.database.$transaction(async (tx) => {
      const count = await this.requireCount(tx, principal.companyId, branch.id, id);
      if (count.status !== PhysicalCountStatus.IN_REVIEW)
        throw new ConflictException('Only a count in review can return to draft');
      await tx.physicalCount.update({
        where: { id },
        data: { status: PhysicalCountStatus.DRAFT, reviewedById: null, reviewedAt: null },
      });
      await this.audit(tx, principal, branch.id, 'inventory.count.reopened', id);
      return this.countDetail(tx, principal.companyId, id);
    });
  }

  async postCount(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    id: string,
    idempotencyKey: string,
  ) {
    this.assertIdempotencyKey(idempotencyKey);
    return this.idempotent(
      principal,
      idempotencyKey,
      InventoryOperationType.COUNT_RECONCILIATION,
      { countId: id },
      async (tx, operationId) => {
        const count = await this.requireCount(tx, principal.companyId, branch.id, id);
        if (count.status !== PhysicalCountStatus.IN_REVIEW)
          throw new ConflictException('Count must be in review before posting');
        const sorted = [...count.items].sort((a, b) =>
          this.positionKey(
            principal.companyId,
            count.warehouseId,
            a.productId,
            a.batchId ?? undefined,
          ).localeCompare(
            this.positionKey(
              principal.companyId,
              count.warehouseId,
              b.productId,
              b.batchId ?? undefined,
            ),
          ),
        );
        const movements = [];
        for (const item of sorted) {
          await this.lock(
            tx,
            principal.companyId,
            count.warehouseId,
            item.productId,
            item.batchId ?? undefined,
          );
          const balance = await this.currentBalance(
            tx,
            principal.companyId,
            count.warehouseId,
            item.productId,
            item.batchId ?? undefined,
          );
          if (
            balance.version !== item.snapshotVersion ||
            !balance.baseQuantity.equals(item.snapshotQuantity)
          )
            throw new ConflictException('Count snapshot is stale; return it to draft and recount');
          const variance = q6(item.countedQuantity.minus(item.snapshotQuantity));
          if (!variance.isZero()) {
            const position = await this.resolvePosition(tx, principal.companyId, {
              productId: item.productId,
              batchId: item.batchId ?? undefined,
              unitId: item.unitId,
              quantity: variance.abs().div(item.conversionFactor).toFixed(),
            });
            movements.push(
              await this.applyMovement(
                tx,
                principal,
                branch.id,
                count.warehouseId,
                position,
                variance.isPositive() ? 1 : -1,
                {
                  type: InventoryMovementType.COUNT_RECONCILIATION,
                  referenceType: 'PHYSICAL_COUNT',
                  referenceId: id,
                  correlationId: operationId,
                  reason: `Physical count ${count.countNumber}`,
                  alreadyLocked: true,
                },
              ),
            );
          }
        }
        await tx.physicalCount.update({
          where: { id },
          data: {
            status: PhysicalCountStatus.POSTED,
            postedById: principal.userId,
            postedAt: new Date(),
          },
        });
        await this.audit(tx, principal, branch.id, 'inventory.count.posted', id, {
          operationId,
          movements,
        });
        return { operationId, countId: id, status: PhysicalCountStatus.POSTED, movements };
      },
    );
  }

  async getCount(principal: AuthPrincipal, branch: ActiveBranchContext, id: string) {
    await this.requireCount(this.database, principal.companyId, branch.id, id);
    return this.countDetail(this.database, principal.companyId, id);
  }

  async listCounts(
    principal: AuthPrincipal,
    branch: ActiveBranchContext,
    query: CountListQueryDto,
  ) {
    const where: Prisma.PhysicalCountWhereInput = {
      companyId: principal.companyId,
      branchId: branch.id,
      ...(query.warehouseId && { warehouseId: query.warehouseId }),
      ...(query.status && { status: query.status }),
    };
    const [items, total] = await this.database.$transaction([
      this.database.physicalCount.findMany({
        where,
        include: { warehouse: true, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.physicalCount.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  private async replaceCountItemsTx(
    tx: Tx,
    companyId: string,
    countId: string,
    warehouseId: string,
    items: StockLineDto[],
  ) {
    for (const input of items) {
      const position = await this.resolvePosition(tx, companyId, input);
      await this.lock(tx, companyId, warehouseId, position.productId, position.batchId);
      const balance = await this.currentBalance(
        tx,
        companyId,
        warehouseId,
        position.productId,
        position.batchId,
      );
      await tx.physicalCountItem.create({
        data: {
          companyId,
          countId,
          productId: position.productId,
          batchId: position.batchId,
          countedQuantity: position.baseQuantity,
          snapshotQuantity: balance.baseQuantity,
          snapshotVersion: balance.version,
          conversionFactor: position.conversionFactor,
          transactionQuantity: position.transactionQuantity,
          unitId: position.unitId,
        },
      });
    }
  }

  private countDetail(client: Tx | DatabaseService, companyId: string, id: string) {
    return client.physicalCount.findFirst({
      where: { id, companyId },
      include: {
        warehouse: true,
        items: {
          include: { product: { include: { baseUnit: true } }, batch: true, unit: true },
          orderBy: { product: { name: 'asc' } },
        },
      },
    });
  }

  private async requireCount(
    client: Tx | DatabaseService,
    companyId: string,
    branchId: string,
    id: string,
  ) {
    const count = await client.physicalCount.findFirst({
      where: { id, companyId, branchId },
      include: { items: true },
    });
    if (!count) throw new NotFoundException('Physical count not found');
    return count;
  }

  private async resolvePosition(tx: Tx, companyId: string, line: StockLineDto): Promise<Position> {
    const product = await tx.product.findFirst({
      where: { id: line.productId, companyId, isActive: true, trackInventory: true },
      select: {
        id: true,
        name: true,
        sku: true,
        baseUnitId: true,
        batchTracking: true,
        baseUnit: { select: { isActive: true } },
        conversions: {
          where: { fromUnitId: line.unitId, isActive: true },
          select: { factorToBase: true },
        },
      },
    });
    if (!product || !product.baseUnit.isActive)
      throw new BadRequestException('Stock-tracked product or base unit is unavailable');
    const conversionFactor =
      product.baseUnitId === line.unitId
        ? new Prisma.Decimal(1)
        : product.conversions[0]?.factorToBase;
    if (!conversionFactor) throw new BadRequestException('Unit is not configured for this product');
    let batchId: string | undefined;
    if (product.batchTracking) {
      if (!line.batchId) throw new BadRequestException('Batch is required for this product');
      const batch = await tx.productBatch.findFirst({
        where: { id: line.batchId, productId: product.id, companyId, isActive: true },
        select: { id: true },
      });
      if (!batch) throw new BadRequestException('Batch is unavailable for this product');
      batchId = batch.id;
    } else if (line.batchId) {
      throw new BadRequestException('Batch cannot be used for a non-batch product');
    }
    const transactionQuantity = q6(line.quantity);
    const baseQuantity = q6(transactionQuantity.mul(conversionFactor));
    if (!transactionQuantity.isPositive() || !baseQuantity.isPositive())
      throw new BadRequestException('Quantity must resolve to a positive base quantity');
    return {
      productId: product.id,
      batchId,
      unitId: line.unitId,
      transactionQuantity,
      conversionFactor: factor10(conversionFactor),
      baseQuantity,
      product,
    };
  }

  private async applyMovement(
    tx: Tx,
    principal: AuthPrincipal,
    branchId: string,
    warehouseId: string,
    position: Position,
    sign: 1 | -1,
    meta: {
      type: InventoryMovementType;
      referenceType: string;
      referenceId: string;
      reason: string;
      correlationId?: string;
      alreadyLocked?: boolean;
    },
  ) {
    if (!meta.alreadyLocked)
      await this.lock(tx, principal.companyId, warehouseId, position.productId, position.batchId);
    const company = await tx.company.findUniqueOrThrow({
      where: { id: principal.companyId },
      select: { negativeStockAllowed: true },
    });
    const balance = await this.currentBalance(
      tx,
      principal.companyId,
      warehouseId,
      position.productId,
      position.batchId,
    );
    const signed = q6(sign === 1 ? position.baseQuantity : position.baseQuantity.negated());
    const next = q6(balance.baseQuantity.plus(signed));
    if (!company.negativeStockAllowed && next.isNegative())
      throw new ConflictException(`Insufficient stock for ${position.product.name}`);
    const updated = await tx.inventoryBalance.updateMany({
      where: { id: balance.id, version: balance.version },
      data: { baseQuantity: next, version: { increment: 1 } },
    });
    if (updated.count !== 1)
      throw new ConflictException('Inventory position changed; retry operation');
    const movement = await tx.inventoryMovement.create({
      data: {
        companyId: principal.companyId,
        branchId,
        warehouseId,
        productId: position.productId,
        batchId: position.batchId,
        unitId: position.unitId,
        createdById: principal.userId,
        type: meta.type,
        baseQuantity: signed,
        transactionQuantity: position.transactionQuantity,
        conversionFactor: position.conversionFactor,
        referenceType: meta.referenceType,
        referenceId: meta.referenceId,
        correlationId: meta.correlationId,
        reason: meta.reason,
      },
      select: {
        id: true,
        type: true,
        baseQuantity: true,
        transactionQuantity: true,
        conversionFactor: true,
      },
    });
    return {
      movement,
      balance: { previous: balance.baseQuantity, current: next, version: balance.version + 1 },
    };
  }

  private async currentBalance(
    tx: Tx,
    companyId: string,
    warehouseId: string,
    productId: string,
    batchId?: string,
  ) {
    const existing = await tx.inventoryBalance.findFirst({
      where: { companyId, warehouseId, productId, batchId: batchId ?? null },
    });
    if (existing) return existing;
    return tx.inventoryBalance.create({
      data: {
        companyId,
        branchId: (
          await tx.warehouse.findFirstOrThrow({
            where: { id: warehouseId, companyId },
            select: { branchId: true },
          })
        ).branchId,
        warehouseId,
        productId,
        batchId,
      },
    });
  }

  private requireWarehouse(
    client: Tx | DatabaseService,
    companyId: string,
    branchId: string,
    warehouseId: string,
  ) {
    return client.warehouse
      .findFirst({
        where: { id: warehouseId, companyId, branchId, isActive: true },
        select: { id: true, branchId: true, code: true, name: true },
      })
      .then((warehouse) => {
        if (!warehouse)
          throw new BadRequestException('Warehouse is unavailable in the active branch');
        return warehouse;
      });
  }

  private lock(
    tx: Tx,
    companyId: string,
    warehouseId: string,
    productId: string,
    batchId?: string,
  ) {
    const key = this.positionKey(companyId, warehouseId, productId, batchId);
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }

  private positionKey(companyId: string, warehouseId: string, productId: string, batchId?: string) {
    return `${companyId}:${warehouseId}:${productId}:${batchId ?? '-'}`;
  }

  private sorted(positions: Position[], warehouseId: string) {
    return [...positions].sort((a, b) =>
      this.positionKey('', warehouseId, a.productId, a.batchId).localeCompare(
        this.positionKey('', warehouseId, b.productId, b.batchId),
      ),
    );
  }

  private assertDistinctLines(lines: StockLineDto[]) {
    const keys = lines.map((line) => `${line.productId}:${line.batchId ?? '-'}`);
    if (new Set(keys).size !== keys.length)
      throw new BadRequestException('A product/batch position may appear only once per operation');
  }

  private assertIdempotencyKey(key: string) {
    if (!key || key.length < 8 || key.length > 120 || !/^[A-Za-z0-9._:-]+$/.test(key))
      throw new BadRequestException('A valid Idempotency-Key header is required');
  }

  private async idempotent<T>(
    principal: AuthPrincipal,
    key: string,
    type: InventoryOperationType,
    request: unknown,
    work: (tx: Tx, operationId: string) => Promise<T>,
  ): Promise<T | Prisma.JsonValue> {
    const requestHash = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    try {
      return await this.database.$transaction(async (tx) => {
        const operation = await tx.inventoryOperation.create({
          data: {
            companyId: principal.companyId,
            createdById: principal.userId,
            type,
            idempotencyKey: key,
            requestHash,
          },
        });
        const result = await work(tx, operation.id);
        await tx.inventoryOperation.update({
          where: { id: operation.id },
          data: { result: result as unknown as Prisma.InputJsonValue },
        });
        return result;
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const existing = await this.database.inventoryOperation.findUnique({
        where: {
          companyId_idempotencyKey: { companyId: principal.companyId, idempotencyKey: key },
        },
      });
      if (!existing || existing.requestHash !== requestHash || existing.type !== type)
        throw new ConflictException('Idempotency key was already used for a different request');
      if (existing.result === null)
        throw new ConflictException('Operation is still in progress; retry shortly');
      return existing.result;
    }
  }

  private equivalents(
    baseQuantity: Prisma.Decimal,
    product: {
      baseUnit: { id: string; code: string; name: string; decimalScale: number };
      conversions: {
        factorToBase: Prisma.Decimal;
        fromUnit: { id: string; code: string; name: string; decimalScale: number };
      }[];
    },
  ) {
    return [
      {
        unit: product.baseUnit,
        quantity: baseQuantity.toDecimalPlaces(product.baseUnit.decimalScale).toFixed(),
      },
      ...product.conversions.map((conversion) => ({
        unit: conversion.fromUnit,
        quantity: baseQuantity
          .div(conversion.factorToBase)
          .toDecimalPlaces(conversion.fromUnit.decimalScale)
          .toFixed(),
      })),
    ];
  }

  private audit(
    tx: Tx,
    principal: AuthPrincipal,
    branchId: string,
    action: string,
    entityId: string,
    value?: unknown,
  ) {
    return tx.auditLog.create({
      data: {
        companyId: principal.companyId,
        branchId,
        actorId: principal.userId,
        action,
        entityType: 'Inventory',
        entityId,
        newValue: value ? (value as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}
