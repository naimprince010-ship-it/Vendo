import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { PasswordService } from '../auth/password.service';
import { DatabaseService } from '../database/database.service';
import type {
  AdminSetPasswordDto,
  CreateUserDto,
  SetUserStatusDto,
  UpdateUserDto,
  UserListQueryDto,
} from './dto/user.dto';

const publicSelect = {
  id: true,
  companyId: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  userRoles: { select: { role: { select: { id: true, key: true, name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
  ) {}

  private async ensureRoles(companyId: string, roleIds: string[]): Promise<void> {
    const unique = [...new Set(roleIds)];
    const count = await this.database.role.count({ where: { companyId, id: { in: unique } } });
    if (count !== unique.length) throw new BadRequestException('One or more roles are invalid');
  }

  async list(principal: AuthPrincipal, query: UserListQueryDto) {
    const where = {
      companyId: principal.companyId,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.database.$transaction([
      this.database.user.findMany({
        where,
        select: publicSelect,
        orderBy: [{ firstName: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.user.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }

  async get(principal: AuthPrincipal, userId: string) {
    const user = await this.database.user.findFirst({
      where: { id: userId, companyId: principal.companyId },
      select: publicSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(principal: AuthPrincipal, dto: CreateUserDto) {
    if (
      await this.database.user.findFirst({
        where: { companyId: principal.companyId, email: dto.email },
      })
    ) {
      throw new ConflictException('Email is already in use');
    }
    await this.ensureRoles(principal.companyId, dto.roleIds);
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.database.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          companyId: principal.companyId,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      });
      if (dto.roleIds.length) {
        await tx.userRole.createMany({
          data: [...new Set(dto.roleIds)].map((roleId) => ({
            companyId: principal.companyId,
            userId: created.id,
            roleId,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'user.created',
          entityType: 'User',
          entityId: created.id,
          newValue: { email: created.email, roleIds: dto.roleIds },
        },
      });
      return created;
    });
    return this.get(principal, user.id);
  }

  async update(principal: AuthPrincipal, userId: string, dto: UpdateUserDto) {
    const existing = await this.get(principal, userId);
    if (
      dto.email &&
      dto.email !== existing.email &&
      (await this.database.user.findFirst({
        where: { companyId: principal.companyId, email: dto.email, id: { not: userId } },
      }))
    ) {
      throw new ConflictException('Email is already in use');
    }
    await this.database.$transaction([
      this.database.user.update({
        where: { id: userId },
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'user.updated',
          entityType: 'User',
          entityId: userId,
          previousValue: {
            email: existing.email,
            firstName: existing.firstName,
            lastName: existing.lastName,
            phone: existing.phone,
          },
          newValue: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
          },
        },
      }),
    ]);
    return this.get(principal, userId);
  }

  async setStatus(principal: AuthPrincipal, userId: string, dto: SetUserStatusDto) {
    const existing = await this.get(principal, userId);
    if (userId === principal.userId && dto.status !== 'ACTIVE') {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    const now = new Date();
    await this.database.$transaction([
      this.database.user.update({ where: { id: userId }, data: { status: dto.status } }),
      this.database.authSession.updateMany({
        where: { userId, companyId: principal.companyId, revokedAt: null },
        data: { revokedAt: now, revokeReason: 'account_status_changed' },
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'user.status.changed',
          entityType: 'User',
          entityId: userId,
          previousValue: { status: existing.status },
          newValue: { status: dto.status },
        },
      }),
    ]);
    return this.get(principal, userId);
  }

  async assignRole(principal: AuthPrincipal, userId: string, roleId: string): Promise<void> {
    await this.get(principal, userId);
    await this.ensureRoles(principal.companyId, [roleId]);
    await this.database.$transaction([
      this.database.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        create: { companyId: principal.companyId, userId, roleId },
        update: {},
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'user.role.assigned',
          entityType: 'User',
          entityId: userId,
          newValue: { roleId },
        },
      }),
    ]);
  }

  async removeRole(principal: AuthPrincipal, userId: string, roleId: string): Promise<void> {
    await this.get(principal, userId);
    await this.database.$transaction([
      this.database.userRole.deleteMany({
        where: { userId, roleId, companyId: principal.companyId },
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'user.role.removed',
          entityType: 'User',
          entityId: userId,
          previousValue: { roleId },
        },
      }),
    ]);
  }

  async setPassword(
    principal: AuthPrincipal,
    userId: string,
    dto: AdminSetPasswordDto,
  ): Promise<void> {
    await this.get(principal, userId);
    const passwordHash = await this.passwords.hash(dto.newPassword);
    const now = new Date();
    await this.database.$transaction([
      this.database.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: now, credentialVersion: { increment: 1 } },
      }),
      this.database.authSession.updateMany({
        where: { userId, companyId: principal.companyId, revokedAt: null },
        data: { revokedAt: now, revokeReason: 'admin_password_changed' },
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'user.password.admin_changed',
          entityType: 'User',
          entityId: userId,
        },
      }),
    ]);
  }
}
