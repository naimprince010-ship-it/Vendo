import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';
import { isUniqueConstraintError } from '../database/prisma-errors';
import type {
  BranchListQueryDto,
  CreateBranchDto,
  SetLocationStatusDto,
  UpdateBranchDto,
} from './dto/branch.dto';

const branchSelect = {
  id: true,
  companyId: true,
  code: true,
  name: true,
  phone: true,
  address: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class BranchesService {
  constructor(private readonly database: DatabaseService) {}

  async list(principal: AuthPrincipal, query: BranchListQueryDto) {
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
    const [items, total] = await this.database.$transaction([
      this.database.branch.findMany({
        where,
        select: branchSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.branch.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async get(principal: AuthPrincipal, branchId: string) {
    const branch = await this.database.branch.findFirst({
      where: { id: branchId, companyId: principal.companyId },
      select: branchSelect,
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(principal: AuthPrincipal, dto: CreateBranchDto) {
    if (
      await this.database.branch.findFirst({
        where: { companyId: principal.companyId, code: dto.code },
      })
    )
      throw new ConflictException('Branch code is already in use');

    let branch;
    try {
      branch = await this.database.$transaction(async (tx) => {
        const created = await tx.branch.create({
          data: { companyId: principal.companyId, ...dto },
        });
        await tx.auditLog.create({
          data: {
            companyId: principal.companyId,
            actorId: principal.userId,
            branchId: created.id,
            action: 'branch.created',
            entityType: 'Branch',
            entityId: created.id,
            newValue: { code: created.code, name: created.name },
          },
        });
        return created;
      });
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException('Branch code is already in use');
      throw error;
    }
    return this.get(principal, branch.id);
  }

  async update(principal: AuthPrincipal, branchId: string, dto: UpdateBranchDto) {
    const existing = await this.get(principal, branchId);
    await this.database.$transaction([
      this.database.branch.update({ where: { id: branchId }, data: dto }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          branchId,
          action: 'branch.updated',
          entityType: 'Branch',
          entityId: branchId,
          previousValue: { name: existing.name, phone: existing.phone, address: existing.address },
          newValue: { name: dto.name, phone: dto.phone, address: dto.address },
        },
      }),
    ]);
    return this.get(principal, branchId);
  }

  async setStatus(principal: AuthPrincipal, branchId: string, dto: SetLocationStatusDto) {
    const existing = await this.get(principal, branchId);
    await this.database.$transaction([
      this.database.branch.update({ where: { id: branchId }, data: dto }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          branchId,
          action: 'branch.status.changed',
          entityType: 'Branch',
          entityId: branchId,
          previousValue: { isActive: existing.isActive },
          newValue: { isActive: dto.isActive },
        },
      }),
    ]);
    return this.get(principal, branchId);
  }

  async listUserAccess(principal: AuthPrincipal, userId: string) {
    const user = await this.database.user.findFirst({
      where: { id: userId, companyId: principal.companyId },
      select: {
        id: true,
        email: true,
        userBranches: {
          select: { branch: { select: branchSelect } },
          orderBy: { branch: { name: 'asc' } },
        },
        userRoles: {
          select: {
            role: {
              select: { permissions: { select: { permission: { select: { key: true } } } } },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const hasAllAccess = user.userRoles.some(({ role }) =>
      role.permissions.some(({ permission }) => permission.key === PERMISSIONS.BRANCH_ACCESS_ALL),
    );
    return {
      userId: user.id,
      email: user.email,
      accessMode: hasAllAccess ? 'ALL_ACTIVE_BRANCHES' : 'EXPLICIT',
      branches: user.userBranches.map(({ branch }) => branch),
    };
  }

  async grantAccess(principal: AuthPrincipal, userId: string, branchId: string) {
    const [user, branch] = await Promise.all([
      this.database.user.findFirst({ where: { id: userId, companyId: principal.companyId } }),
      this.database.branch.findFirst({ where: { id: branchId, companyId: principal.companyId } }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!branch) throw new BadRequestException('Branch is invalid');
    await this.database.$transaction([
      this.database.userBranch.upsert({
        where: { userId_branchId: { userId, branchId } },
        create: { companyId: principal.companyId, userId, branchId },
        update: {},
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          branchId,
          action: 'user.branch.granted',
          entityType: 'User',
          entityId: userId,
          newValue: { branchId },
        },
      }),
    ]);
    return this.listUserAccess(principal, userId);
  }

  async revokeAccess(principal: AuthPrincipal, userId: string, branchId: string): Promise<void> {
    await this.listUserAccess(principal, userId);
    const access = await this.database.userBranch.findFirst({
      where: { userId, branchId, companyId: principal.companyId },
    });
    if (!access) throw new NotFoundException('Branch access not found');
    if (userId === principal.userId && !principal.permissions.has(PERMISSIONS.BRANCH_ACCESS_ALL)) {
      const count = await this.database.userBranch.count({
        where: { userId, companyId: principal.companyId },
      });
      if (count <= 1) throw new BadRequestException('You cannot remove your last branch access');
    }
    await this.database.$transaction([
      this.database.userBranch.delete({ where: { userId_branchId: { userId, branchId } } }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          branchId,
          action: 'user.branch.revoked',
          entityType: 'User',
          entityId: userId,
          previousValue: { branchId },
        },
      }),
    ]);
  }
}
