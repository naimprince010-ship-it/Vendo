'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';
import { useBranchContext } from '../../contexts/branch-context';
import { useVendoApi } from '../../hooks/use-vendo-api';
import type { Api, CashShift, Page, PaymentMethod, Register } from './types';

type CashContextValue = {
  api: Api;
  branchId: string;
  branchName: string;
  registers: Register[];
  registerId: string;
  setRegisterId(value: string): void;
  currentShift: CashShift | null | undefined;
  currentLoading: boolean;
  paymentMethods: PaymentMethod[];
  can(permission: string): boolean;
  refresh(): Promise<void>;
};

const CashContext = createContext<CashContextValue | null>(null);

export function CashProvider({ children }: { children: ReactNode }) {
  const api = useVendoApi();
  const client = useQueryClient();
  const { user } = useAuth();
  const { activeBranchId, activeBranch } = useBranchContext();
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const registers = useQuery({
    queryKey: ['cash-ui', 'registers', activeBranchId],
    queryFn: () => api<Page<Register>>(`/registers?branchId=${activeBranchId}&limit=100`),
    enabled: Boolean(activeBranchId && user?.permissions.includes('register.view')),
  });
  const posContext = useQuery({
    queryKey: ['cash-ui', 'pos-context', activeBranchId],
    queryFn: () =>
      api<{
        registers: Array<Omit<Register, 'branchId' | 'isActive'>>;
        paymentMethods: PaymentMethod[];
      }>('/sales/pos/context'),
    enabled: Boolean(activeBranchId && user?.permissions.includes('sale.create')),
  });
  const activeRegisters = (registers.data?.items ?? []).filter((row) => row.isActive);
  const contextualRegisters: Register[] =
    posContext.data?.registers.map((row) => ({
      ...row,
      branchId: activeBranchId,
      isActive: true,
    })) ?? [];
  const availableRegisters = activeRegisters.length ? activeRegisters : contextualRegisters;
  const registerId = availableRegisters.some((row) => row.id === selectedRegisterId)
    ? selectedRegisterId
    : (availableRegisters[0]?.id ?? '');
  const current = useQuery({
    queryKey: ['cash-ui', 'current', activeBranchId, registerId],
    queryFn: () => api<CashShift | null>(`/cash/shifts/current?registerId=${registerId}`),
    enabled: Boolean(activeBranchId && registerId && user?.permissions.includes('cash.view_shift')),
  });
  const value = useMemo<CashContextValue>(
    () => ({
      api,
      branchId: activeBranchId,
      branchName: activeBranch?.name ?? 'No active branch',
      registers: availableRegisters,
      registerId,
      setRegisterId: setSelectedRegisterId,
      currentShift: current.data,
      currentLoading: current.isLoading,
      paymentMethods: posContext.data?.paymentMethods ?? [],
      can: (permission) => Boolean(user?.permissions.includes(permission)),
      refresh: async () => {
        await client.invalidateQueries({ queryKey: ['cash-ui'] });
        await client.invalidateQueries({ queryKey: ['sales'] });
        await client.invalidateQueries({ queryKey: ['purchasing'] });
        await client.invalidateQueries({ queryKey: ['parties'] });
      },
    }),
    [
      activeBranch?.name,
      activeBranchId,
      availableRegisters,
      api,
      client,
      current.data,
      current.isLoading,
      posContext.data?.paymentMethods,
      registerId,
      user?.permissions,
    ],
  );
  return <CashContext.Provider value={value}>{children}</CashContext.Provider>;
}

export function useCash() {
  const value = useContext(CashContext);
  if (!value) throw new Error('useCash must be used within CashProvider');
  return value;
}
