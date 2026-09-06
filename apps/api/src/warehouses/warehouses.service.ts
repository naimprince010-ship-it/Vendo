import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { DatabaseService } from '../database/database.service';
import { isUniqueConstraintError } from '../database/prisma-errors';
import type { SetLocationStatusDto } from '../branches/dto/branch.dto';
import type {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  WarehouseListQueryDto,
} from './dto/warehouse.dto';

const warehouseSelect = {
  id: true,
  companyId: true,
  branchId: true,
  code: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, code: true, name: true, isActive: true } },
} as const;

@Injectable()
export class WarehousesService {
  constructor(private readonly database: DatabaseService) {}

  async list(principal: AuthPrincipal, query: WarehouseListQueryDto) {
    const where = {
      companyId: principal.companyId,
      branchId: query.branchId,
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
    const [items, total] = await this.database.$transaction([
      this.database.warehouse.findMany({
        where,
        select: warehouseSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.warehouse.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async get(principal: AuthPrincipal, warehouseId: string) {
    const warehouse = await this.database.warehouse.findFirst({
      where: { id: warehouseId, companyId: principal.companyId },
      select: warehouseSelect,
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  private async requireActiveBranch(companyId: string, branchId: string): Promise<void> {
    if (
      !(await this.database.branch.findFirst({
        where: { id: branchId, companyId, isActive: true },
      }))
    )
      throw new BadRequestException('An active company branch is required');
  }

  async create(principal: AuthPrincipal, dto: CreateWarehouseDto) {
    await this.requireActiveBranch(principal.companyId, dto.branchId);
    if (
      await this.database.warehouse.findFirst({
        where: { companyId: principal.companyId, code: dto.code },
      })
    )
      throw new ConflictException('Warehouse code is already in use');
    let created;
    try {
      created = await this.database.$transaction(async (tx) => {
        const warehouse = await tx.warehouse.create({
          data: { companyId: principal.companyId, ...dto },
        });
        await tx.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            branchId: dto.branchId,
            action: 'warehouse.created',
            entityType: 'Warehouse',
            entityId: warehouse.id,
            newValue: { branchId: dto.branchId, code: dto.code, name: dto.name },
          },
        });
        return warehouse;
      });
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException('Warehouse code is already in use');
      throw error;
    }
    return this.get(principal, created.id);
  }

  async update(principal: AuthPrincipal, warehouseId: string, dto: UpdateWarehouseDto) {
    const existing = await this.get(principal, warehouseId);
    await this.database.$transaction([
      this.database.warehouse.update({ where: { id: warehouseId }, data: dto }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          branchId: existing.branchId,
          action: 'warehouse.updated',
          entityType: 'Warehouse',
          entityId: warehouseId,
          previousValue: { name: existing.name },
          newValue: { name: dto.name },
        },
      }),
    ]);
    return this.get(principal, warehouseId);
  }

  async setStatus(principal: AuthPrincipal, warehouseId: string, dto: SetLocationStatusDto) {
    const existing = await this.get(principal, warehouseId);
    if (dto.isActive) await this.requireActiveBranch(principal.companyId, existing.branchId);
    await this.database.$transaction([
      this.database.warehouse.update({ where: { id: warehouseId }, data: dto }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          branchId: existing.branchId,
          action: 'warehouse.status.changed',
          entityType: 'Warehouse',
          entityId: warehouseId,
          previousValue: { isActive: existing.isActive },
          newValue: { isActive: dto.isActive },
        },
      }),
    ]);
    return this.get(principal, warehouseId);
  }
}
