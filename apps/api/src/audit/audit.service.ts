import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import { DatabaseService } from '../database/database.service';
import type { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}

  async list(principal: AuthPrincipal, query: AuditQueryDto) {
    if (query.branchId) {
      const branch = await this.database.branch.findFirst({
        where: { id: query.branchId, companyId: principal.companyId },
        select: { id: true },
      });
      if (!branch) throw new BadRequestException('Branch is unavailable');
    }
    const createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
    const where = {
      companyId: principal.companyId,
      action: query.action ? { contains: query.action, mode: 'insensitive' as const } : undefined,
      entityType: query.entityType,
      actorId: query.actorId,
      branchId: query.branchId,
      createdAt: Object.keys(createdAt).length ? createdAt : undefined,
    };
    const [total, items] = await this.database.$transaction([
      this.database.auditLog.count({ where }),
      this.database.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          branchId: true,
          actorId: true,
          action: true,
          entityType: true,
          entityId: true,
          reason: true,
          previousValue: true,
          newValue: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
          branch: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);
    return { items, page: query.page, limit: query.limit, total };
  }
}
