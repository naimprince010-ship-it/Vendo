import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { DatabaseService } from '../database/database.service';
import type { CreateRoleDto, SetRolePermissionsDto, UpdateRoleDto } from './dto/role.dto';

const roleSelect = {
  id: true,
  companyId: true,
  key: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  permissions: { select: { permission: { select: { id: true, key: true, description: true } } } },
} as const;

@Injectable()
export class RolesService {
  constructor(private readonly database: DatabaseService) {}

  list(principal: AuthPrincipal) {
    return this.database.role.findMany({
      where: { companyId: principal.companyId },
      select: roleSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async get(principal: AuthPrincipal, roleId: string) {
    const role = await this.database.role.findFirst({
      where: { id: roleId, companyId: principal.companyId },
      select: roleSelect,
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(principal: AuthPrincipal, dto: CreateRoleDto) {
    if (
      await this.database.role.findFirst({
        where: { companyId: principal.companyId, key: dto.key },
      })
    ) {
      throw new ConflictException('Role key is already in use');
    }
    const role = await this.database.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          companyId: principal.companyId,
          key: dto.key,
          name: dto.name,
          description: dto.description,
        },
      });
      await tx.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'role.created',
          entityType: 'Role',
          entityId: created.id,
          newValue: { key: created.key, name: created.name },
        },
      });
      return created;
    });
    return this.get(principal, role.id);
  }

  async update(principal: AuthPrincipal, roleId: string, dto: UpdateRoleDto) {
    const existing = await this.get(principal, roleId);
    if (existing.isSystem && dto.name === '')
      throw new BadRequestException('System role is protected');
    await this.database.$transaction([
      this.database.role.update({
        where: { id: roleId },
        data: { name: dto.name, description: dto.description },
      }),
      this.database.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'role.updated',
          entityType: 'Role',
          entityId: roleId,
          previousValue: { name: existing.name, description: existing.description },
          newValue: { name: dto.name, description: dto.description },
        },
      }),
    ]);
    return this.get(principal, roleId);
  }

  async setPermissions(principal: AuthPrincipal, roleId: string, dto: SetRolePermissionsDto) {
    await this.get(principal, roleId);
    const permissionIds = [...new Set(dto.permissionIds)];
    const count = await this.database.permission.count({ where: { id: { in: permissionIds } } });
    if (count !== permissionIds.length)
      throw new BadRequestException('One or more permissions are invalid');

    await this.database.$transaction(async (tx) => {
      const previous = await tx.rolePermission.findMany({
        where: { roleId, companyId: principal.companyId },
        select: { permissionId: true },
      });
      await tx.rolePermission.deleteMany({ where: { roleId, companyId: principal.companyId } });
      if (permissionIds.length) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            companyId: principal.companyId,
            roleId,
            permissionId,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          companyId: principal.companyId,
          actorId: principal.userId,
          action: 'role.permissions.changed',
          entityType: 'Role',
          entityId: roleId,
          previousValue: { permissionIds: previous.map(({ permissionId }) => permissionId) },
          newValue: { permissionIds },
        },
      });
    });
    return this.get(principal, roleId);
  }

  listPermissions() {
    return this.database.permission.findMany({ orderBy: { key: 'asc' } });
  }
}
