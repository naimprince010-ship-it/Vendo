import type { Request } from 'express';
import type { AuthPrincipal } from './auth-principal';

export interface ActiveBranchContext {
  id: string;
  companyId: string;
  code: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  principal: AuthPrincipal;
  activeBranch?: ActiveBranchContext;
}
