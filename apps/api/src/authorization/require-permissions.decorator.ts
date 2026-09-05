import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from './permission-catalog';

export const REQUIRED_PERMISSIONS_KEY = 'vendo:required-permissions';
export const RequirePermissions = (
  ...permissions: PermissionKey[]
): MethodDecorator & ClassDecorator => SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
