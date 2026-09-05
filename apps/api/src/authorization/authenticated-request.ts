import type { Request } from 'express';
import type { AuthPrincipal } from './auth-principal';

export interface AuthenticatedRequest extends Request {
  principal: AuthPrincipal;
}
