'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';
import { useBranchContext } from '../../contexts/branch-context';
import { useVendoApi } from '../../hooks/use-vendo-api';
import type {
  Api,
  Page,
  PaymentMethod,
  Product,
  Register,
  Supplier,
  Unit,
  Warehouse,
} from './types';

type PurchasingContextValue = {
  api: Api;
  branchId: string;
  branchName: string;
  warehouses: Warehouse[];
  suppliers: Supplier[];
  products: Product[];
  units: Unit[];
  paymentMethods: PaymentMethod[];
  registers: Register[];
  can(permission: string): boolean;
  refresh(): Promise<void>;
  referencesLoading: boolean;
};

const PurchasingContext = createContext<PurchasingContextValue | null>(null);

export function PurchasingProvider({ children }: { children: ReactNode }) {
  const api = useVendoApi();
  const client = useQueryClient();
  const { user } = useAuth();
  const { activeBranch, activeBranchId } = useBranchContext();
  const warehouses = useQuery({
    queryKey: ['purchasing', 'references', 'warehouses'],
    queryFn: () => api<Page<Warehouse>>('/warehouses?limit=100', {}, ''),
    enabled: Boolean(activeBranchId && user?.permissions.includes('warehouse.view')),
  });
  const suppliers = useQuery({
    queryKey: ['purchasing', 'references', 'suppliers'],
    queryFn: () => api<Page<Supplier>>('/suppliers?limit=100', {}, ''),
    enabled: Boolean(activeBranchId && user?.permissions.includes('supplier.view')),
  });
  const products = useQuery({
    queryKey: ['purchasing', 'references', 'products'],
    queryFn: () => api<Page<Product>>('/products?limit=100&isActive=true', {}, ''),
    enabled: Boolean(activeBranchId && user?.permissions.includes('product.view')),
  });
  const units = useQuery({
    queryKey: ['purchasing', 'references', 'units'],
    queryFn: () => api<Page<Unit>>('/units?limit=100&isActive=true', {}, ''),
    enabled: Boolean(activeBranchId && user?.permissions.includes('unit.view')),
  });
  const methods = useQuery({
    queryKey: ['purchasing', 'references', 'payment-methods', activeBranchId],
    queryFn: () => api<PaymentMethod[]>('/purchases/payment-methods'),
    enabled: Boolean(activeBranchId && user?.permissions.includes('supplier.payment.view')),
  });
  const registers = useQuery({
    queryKey: ['purchasing', 'references', 'registers', activeBranchId],
    queryFn: () => api<Page<Register>>(`/registers?branchId=${activeBranchId}&limit=100`, {}, ''),
    enabled: Boolean(activeBranchId && user?.permissions.includes('register.view')),
  });

  const value = useMemo<PurchasingContextValue>(
    () => ({
      api,
      branchId: activeBranchId,
      branchName: activeBranch?.name ?? 'No active branch',
      warehouses: (warehouses.data?.items ?? []).filter(
        (warehouse) => warehouse.branchId === activeBranchId && warehouse.isActive,
      ),
      suppliers: (suppliers.data?.items ?? []).filter((supplier) => supplier.isActive),
      products: products.data?.items ?? [],
      units: units.data?.items ?? [],
      paymentMethods: methods.data ?? [],
      registers: (registers.data?.items ?? []).filter((register) => register.isActive),
      can: (permission) => Boolean(user?.permissions.includes(permission)),
      refresh: async () => {
        await client.invalidateQueries({ queryKey: ['purchasing'] });
      },
      referencesLoading:
        warehouses.isLoading || suppliers.isLoading || products.isLoading || units.isLoading,
    }),
    [
      activeBranch?.name,
      activeBranchId,
      api,
      client,
      methods.data,
      products.data?.items,
      products.isLoading,
      registers.data?.items,
      suppliers.data?.items,
      suppliers.isLoading,
      units.data?.items,
      units.isLoading,
      user?.permissions,
      warehouses.data?.items,
      warehouses.isLoading,
    ],
  );
  return <PurchasingContext.Provider value={value}>{children}</PurchasingContext.Provider>;
}

export function usePurchasing() {
  const context = useContext(PurchasingContext);
  if (!context) throw new Error('usePurchasing must be used inside PurchasingProvider');
  return context;
}
