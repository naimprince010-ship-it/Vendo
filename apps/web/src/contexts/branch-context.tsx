'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';
import { queryKeys } from '../lib/query-keys';

export interface ShellBranch {
  code: string;
  id: string;
  isActive: boolean;
  name: string;
}

interface BranchContextValue {
  activeBranch: ShellBranch | null;
  activeBranchId: string;
  branches: ShellBranch[];
  isLoading: boolean;
  setActiveBranchId(branchId: string): void;
}

interface Page<T> {
  items: T[];
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { authenticatedFetch, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const branchQuery = useQuery({
    queryKey: queryKeys.branches(user?.companyId ?? ''),
    enabled: Boolean(user),
    queryFn: async () => {
      const response = await authenticatedFetch('/branches?limit=100');
      if (!response.ok) throw new Error('Unable to load assigned branches.');
      return ((await response.json()) as Page<ShellBranch>).items.filter(
        (branch) => branch.isActive,
      );
    },
  });

  const branches = useMemo(() => branchQuery.data ?? [], [branchQuery.data]);
  const activeBranchId = branches.some((branch) => branch.id === selectedBranchId)
    ? selectedBranchId
    : (branches[0]?.id ?? '');

  const setActiveBranchId = useCallback(
    (branchId: string) => {
      if (!branches.some((branch) => branch.id === branchId)) return;
      setSelectedBranchId(branchId);
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== 'shell',
      });
    },
    [branches, queryClient],
  );

  const activeBranch = branches.find((branch) => branch.id === activeBranchId) ?? null;
  const value = useMemo(
    () => ({
      activeBranch,
      activeBranchId,
      branches,
      isLoading: branchQuery.isLoading,
      setActiveBranchId,
    }),
    [activeBranch, activeBranchId, branches, branchQuery.isLoading, setActiveBranchId],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranchContext() {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranchContext must be used within BranchProvider');
  return context;
}
