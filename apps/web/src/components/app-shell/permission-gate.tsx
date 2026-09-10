'use client';

import { EmptyState } from '@vendo/ui';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';
import { hasAnyPermission } from '../../lib/permissions';

export function PermissionGate({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: readonly string[];
}) {
  const { user } = useAuth();
  if (!user || !hasAnyPermission(user.permissions, permissions)) {
    return (
      <EmptyState
        title="Access unavailable"
        description="Your role does not currently include permission to view this module."
      />
    );
  }
  return <>{children}</>;
}
