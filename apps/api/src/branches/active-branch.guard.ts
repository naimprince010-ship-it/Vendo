import {
  BadRequestException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../authorization/authenticated-request';
import { ActiveBranchService } from './active-branch.service';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ActiveBranchGuard implements CanActivate {
  constructor(private readonly activeBranches: ActiveBranchService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const value = request.headers['x-branch-id'];
    const branchId = Array.isArray(value) ? value[0] : value;
    if (!branchId || !UUID_V4.test(branchId)) {
      throw new BadRequestException('A valid x-branch-id header is required');
    }
    request.activeBranch = await this.activeBranches.resolve(request.principal, branchId);
    return true;
  }
}
