import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { DatabaseService } from '../database/database.service';
import { isUniqueConstraintError } from '../database/prisma-errors';
import type {
  CreateCategoryDto,
  CreateNamedDto,
  CreateUnitDto,
  ListQueryDto,
  StatusDto,
  UpdateCategoryDto,
  UpdateNamedDto,
  UpdateUnitDto,
} from './dto/catalog.dto';

type Master = 'category' | 'brand' | 'manufacturer' | 'unit';
type MasterRow = {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  slug?: string;
  code?: string;
  parentId?: string | null;
  decimalScale?: number;
};

@Injectable()
export class CatalogMastersService {
  constructor(private readonly db: DatabaseService) {}

  async list(principal: AuthPrincipal, kind: Master, query: ListQueryDto) {
    const { items, total } = await this.listRows(principal, kind, query);
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(principal: AuthPrincipal, kind: Master, id: string) {
    const scope = { id, companyId: principal.companyId };
    const item: MasterRow | null =
      kind === 'category'
        ? await this.db.category.findFirst({ where: scope })
        : kind === 'brand'
          ? await this.db.brand.findFirst({ where: scope })
          : kind === 'manufacturer'
            ? await this.db.manufacturer.findFirst({ where: scope })
            : await this.db.unit.findFirst({ where: scope });
    if (!item) throw new NotFoundException(`${this.label(kind)} not found`);
    return item;
  }

  async createNamed(principal: AuthPrincipal, kind: 'brand' | 'manufacturer', dto: CreateNamedDto) {
    try {
      const item = await this.db.$transaction(async (tx) => {
        const created =
          kind === 'brand'
            ? await tx.brand.create({ data: { companyId: principal.companyId, ...dto } })
            : await tx.manufacturer.create({ data: { companyId: principal.companyId, ...dto } });
        await tx.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            action: `${kind}.created`,
            entityType: this.label(kind),
            entityId: created.id,
            newValue: { name: created.name, slug: created.slug },
          },
        });
        return created;
      });
      return item;
    } catch (error) {
      this.unique(error, `${this.label(kind)} slug is already in use`);
    }
  }

  async createCategory(principal: AuthPrincipal, dto: CreateCategoryDto) {
    if (dto.parentId) await this.requireActive(principal, 'category', dto.parentId);
    try {
      return await this.db.$transaction(async (tx) => {
        const created = await tx.category.create({
          data: { companyId: principal.companyId, ...dto },
        });
        await tx.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            action: 'category.created',
            entityType: 'Category',
            entityId: created.id,
            newValue: { name: created.name, slug: created.slug, parentId: created.parentId },
          },
        });
        return created;
      });
    } catch (error) {
      this.unique(error, 'Category slug is already in use');
    }
  }

  async createUnit(principal: AuthPrincipal, dto: CreateUnitDto) {
    try {
      return await this.db.$transaction(async (tx) => {
        const created = await tx.unit.create({ data: { companyId: principal.companyId, ...dto } });
        await tx.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            action: 'unit.created',
            entityType: 'Unit',
            entityId: created.id,
            newValue: {
              code: created.code,
              name: created.name,
              decimalScale: created.decimalScale,
            },
          },
        });
        return created;
      });
    } catch (error) {
      this.unique(error, 'Unit code is already in use');
    }
  }

  async updateNamed(
    principal: AuthPrincipal,
    kind: 'brand' | 'manufacturer',
    id: string,
    dto: UpdateNamedDto,
  ) {
    const before = await this.get(principal, kind, id);
    try {
      await this.db.$transaction([
        kind === 'brand'
          ? this.db.brand.update({ where: { id }, data: dto })
          : this.db.manufacturer.update({ where: { id }, data: dto }),
        this.db.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            action: `${kind}.updated`,
            entityType: this.label(kind),
            entityId: id,
            previousValue: { name: before.name, slug: before.slug },
            newValue: { ...dto },
          },
        }),
      ]);
      return this.get(principal, kind, id);
    } catch (error) {
      this.unique(error, `${this.label(kind)} slug is already in use`);
    }
  }

  async updateCategory(principal: AuthPrincipal, id: string, dto: UpdateCategoryDto) {
    const before = await this.get(principal, 'category', id);
    if (dto.parentId) {
      if (dto.parentId === id) throw new BadRequestException('Category cannot be its own parent');
      await this.requireActive(principal, 'category', dto.parentId);
      let cursor: string | null = dto.parentId;
      while (cursor) {
        if (cursor === id)
          throw new BadRequestException('Category hierarchy cannot contain a cycle');
        const parent: { parentId: string | null } | null = await this.db.category.findFirst({
          where: { id: cursor, companyId: principal.companyId },
          select: { parentId: true },
        });
        cursor = parent?.parentId ?? null;
      }
    }
    try {
      await this.db.$transaction([
        this.db.category.update({ where: { id }, data: dto }),
        this.db.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            action: 'category.updated',
            entityType: 'Category',
            entityId: id,
            previousValue: { name: before.name, slug: before.slug, parentId: before.parentId },
            newValue: { ...dto },
          },
        }),
      ]);
      return this.get(principal, 'category', id);
    } catch (error) {
      this.unique(error, 'Category slug is already in use');
    }
  }

  async updateUnit(principal: AuthPrincipal, id: string, dto: UpdateUnitDto) {
    const before = await this.get(principal, 'unit', id);
    await this.db.$transaction([
      this.db.unit.update({ where: { id }, data: dto }),
      this.db.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'unit.updated',
          entityType: 'Unit',
          entityId: id,
          previousValue: { name: before.name, decimalScale: before.decimalScale },
          newValue: { ...dto },
        },
      }),
    ]);
    return this.get(principal, 'unit', id);
  }

  async status(principal: AuthPrincipal, kind: Master, id: string, dto: StatusDto) {
    const before = await this.get(principal, kind, id);
    const update =
      kind === 'category'
        ? this.db.category.update({ where: { id }, data: dto })
        : kind === 'brand'
          ? this.db.brand.update({ where: { id }, data: dto })
          : kind === 'manufacturer'
            ? this.db.manufacturer.update({ where: { id }, data: dto })
            : this.db.unit.update({ where: { id }, data: dto });
    await this.db.$transaction([
      update,
      this.db.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: `${kind}.status.changed`,
          entityType: this.label(kind),
          entityId: id,
          previousValue: { isActive: before.isActive },
          newValue: { ...dto },
        },
      }),
    ]);
    return this.get(principal, kind, id);
  }

  async requireActive(principal: AuthPrincipal, kind: Master, id: string) {
    const scope = { id, companyId: principal.companyId, isActive: true };
    const item =
      kind === 'category'
        ? await this.db.category.findFirst({ where: scope, select: { id: true } })
        : kind === 'brand'
          ? await this.db.brand.findFirst({ where: scope, select: { id: true } })
          : kind === 'manufacturer'
            ? await this.db.manufacturer.findFirst({ where: scope, select: { id: true } })
            : await this.db.unit.findFirst({ where: scope, select: { id: true } });
    if (!item) throw new BadRequestException(`${this.label(kind)} is invalid or inactive`);
    return item;
  }

  private async listRows(
    principal: AuthPrincipal,
    kind: Master,
    query: ListQueryDto,
  ): Promise<{ items: MasterRow[]; total: number }> {
    const pagination = {
      orderBy: [{ name: 'asc' as const }, { id: 'asc' as const }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    };
    const common = { companyId: principal.companyId, isActive: query.isActive };
    if (kind === 'unit') {
      const where = {
        ...common,
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
        this.db.unit.findMany({ where, ...pagination }),
        this.db.unit.count({ where }),
      ]);
      return { items, total };
    }
    const where = {
      ...common,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { slug: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    if (kind === 'category') {
      const [items, total] = await this.db.$transaction([
        this.db.category.findMany({ where, ...pagination }),
        this.db.category.count({ where }),
      ]);
      return { items, total };
    }
    if (kind === 'brand') {
      const [items, total] = await this.db.$transaction([
        this.db.brand.findMany({ where, ...pagination }),
        this.db.brand.count({ where }),
      ]);
      return { items, total };
    }
    const [items, total] = await this.db.$transaction([
      this.db.manufacturer.findMany({ where, ...pagination }),
      this.db.manufacturer.count({ where }),
    ]);
    return { items, total };
  }
  private label(kind: Master) {
    return kind[0].toUpperCase() + kind.slice(1);
  }
  private unique(error: unknown, message: string): never {
    if (isUniqueConstraintError(error)) throw new ConflictException(message);
    throw error;
  }
}
