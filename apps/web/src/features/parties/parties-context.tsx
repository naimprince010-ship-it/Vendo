'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';
import { useBranchContext } from '../../contexts/branch-context';
import { useVendoApi } from '../../hooks/use-vendo-api';
import type { Api, CustomerGroup, Page } from './types';

type ContextValue = {
  api: Api;
  can(permission: string): boolean;
  activeBranchId: string;
  activeBranchName: string;
  groups: CustomerGroup[];
  refresh(): Promise<void>;
};

const Context = createContext<ContextValue | null>(null);

export function PartiesProvider({ children }: { children: ReactNode }) {
  const api = useVendoApi();
  const client = useQueryClient();
  const { user } = useAuth();
  const { activeBranchId, activeBranch } = useBranchContext();
  const groups = useQuery({
    queryKey: ['parties', 'groups', 'references'],
    queryFn: () => api<Page<CustomerGroup>>('/customer-groups?limit=100'),
    enabled: Boolean(user?.permissions.includes('customer_group.view')),
  });
  const value = useMemo<ContextValue>(
    () => ({
      api,
      can: (permission) => Boolean(user?.permissions.includes(permission)),
      activeBranchId,
      activeBranchName: activeBranch?.name ?? 'No active branch',
      groups: groups.data?.items ?? [],
      refresh: async () => {
        await client.invalidateQueries({ queryKey: ['parties'] });
      },
    }),
    [activeBranch?.name, activeBranchId, api, client, groups.data?.items, user?.permissions],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useParties() {
  const value = useContext(Context);
  if (!value) throw new Error('useParties must be used within PartiesProvider');
  return value;
}
