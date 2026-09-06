import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../authorization/auth-principal';
import type { ActiveBranchContext } from '../authorization/authenticated-request';
import { PERMISSIONS } from '../authorization/permission-catalog';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ActiveBranchService {
  constructor(private readonly database: DatabaseService) {}

  async resolve(principal: AuthPrincipal, branchId: string): Promise<ActiveBranchContext> {
    const mayAccess =
      principal.permissions.has(PERMISSIONS.BRANCH_ACCESS_ALL) ||
      principal.branchIds.includes(branchId);
    if (!mayAccess) throw new ForbiddenException('Branch is not available to this user');

    const branch = await this.database.branch.findFirst({
      where: { id: branchId, companyId: principal.companyId, isActive: true },
      select: { id: true, companyId: true, code: true, name: true },
    });
    if (!branch) throw new ForbiddenException('Branch is not available for active operations');
    return branch;
  }
}
