'use client';

import { useCallback } from 'react';
import { useAuth } from '../auth/auth-context';
import { useBranchContext } from '../contexts/branch-context';

export function useVendoApi() {
  const { authenticatedFetch } = useAuth();
  const { activeBranchId } = useBranchContext();

  return useCallback(
    async <T>(path: string, init: RequestInit = {}, branchId = activeBranchId): Promise<T> => {
      const headers = new Headers(init.headers);
      if (branchId) headers.set('x-branch-id', branchId);
      const response = await authenticatedFetch(path, { ...init, headers });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
        const detail = Array.isArray(body.message) ? body.message.join(', ') : body.message;
        throw new Error(detail ?? `Request failed (${response.status})`);
      }
      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    },
    [activeBranchId, authenticatedFetch],
  );
}
