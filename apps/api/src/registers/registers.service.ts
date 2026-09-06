import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import type { SetLocationStatusDto } from '../branches/dto/branch.dto';
import { DatabaseService } from '../database/database.service';
import { isUniqueConstraintError } from '../database/prisma-errors';
import type {
  CreateRegisterDto,
  RegisterListQueryDto,
  UpdateRegisterDto,
} from './dto/register.dto';

const registerSelect = {
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
export class RegistersService {
  constructor(private readonly database: DatabaseService) {}

  async list(principal: AuthPrincipal, query: RegisterListQueryDto) {
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
      this.database.register.findMany({
        where,
        select: registerSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.register.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async get(principal: AuthPrincipal, registerId: string) {
    const register = await this.database.register.findFirst({
      where: { id: registerId, companyId: principal.companyId },
      select: registerSelect,
    });
    if (!register) throw new NotFoundException('Register not found');
    return register;
  }

  private async requireActiveBranch(companyId: string, branchId: string): Promise<void> {
    if (
      !(await this.database.branch.findFirst({
        where: { id: branchId, companyId, isActive: true },
      }))
    )
      throw new BadRequestException('An active company branch is required');
  }

  async create(principal: AuthPrincipal, dto: CreateRegisterDto) {
    await this.requireActiveBranch(principal.companyId, dto.branchId);
    if (
      await this.database.register.findFirst({
        where: { companyId: principal.companyId, code: dto.code },
      })
    )
      throw new ConflictException('Register code is already in use');
    let created;
    try {
      created = await this.database.$transaction(async (tx) => {
        const register = await tx.register.create({
          data: { companyId: principal.companyId, ...dto },
        });
        await tx.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            branchId: dto.branchId,
            action: 'register.created',
            entityType: 'Register',
            entityId: register.id,
            newValue: { branchId: dto.branchId, code: dto.code, name: dto.name },
          },
        });
        return register;
      });
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException('Register code is already in use');
      throw error;
    }
    return this.get(principal, created.id);
  }

  async update(principal: AuthPrincipal, registerId: string, dto: UpdateRegisterDto) {
    const existing = await this.get(principal, registerId);
    await this.database.$transaction([
      this.database.register.update({ where: { id: registerId }, data: dto }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          branchId: existing.branchId,
          action: 'register.updated',
          entityType: 'Register',
          entityId: registerId,
          previousValue: { name: existing.name },
          newValue: { name: dto.name },
        },
      }),
    ]);
    return this.get(principal, registerId);
  }

  async setStatus(principal: AuthPrincipal, registerId: string, dto: SetLocationStatusDto) {
    const existing = await this.get(principal, registerId);
    if (dto.isActive) await this.requireActiveBranch(principal.companyId, existing.branchId);
    await this.database.$transaction([
      this.database.register.update({ where: { id: registerId }, data: dto }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          branchId: existing.branchId,
          action: 'register.status.changed',
          entityType: 'Register',
          entityId: registerId,
          previousValue: { isActive: existing.isActive },
          newValue: { isActive: dto.isActive },
        },
      }),
    ]);
    return this.get(principal, registerId);
  }
}
