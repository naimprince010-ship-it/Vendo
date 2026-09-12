'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';
import { useBranchContext } from '../../contexts/branch-context';
import { useVendoApi } from '../../hooks/use-vendo-api';
import type { Api, Page, Product, Warehouse } from './types';

type InventoryContextValue = {
  api: Api;
  branchId: string;
  branchName: string;
  warehouses: Warehouse[];
  products: Product[];
  can(permission: string): boolean;
  refresh(): Promise<void>;
  referencesLoading: boolean;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const api = useVendoApi();
  const client = useQueryClient();
  const { user } = useAuth();
  const { activeBranch, activeBranchId } = useBranchContext();
  const warehouseQuery = useQuery({
    queryKey: ['inventory', 'references', 'warehouses'],
    queryFn: () => api<Page<Warehouse>>('/warehouses?limit=100', {}, ''),
    enabled: Boolean(activeBranchId && user?.permissions.includes('warehouse.view')),
  });
  const productQuery = useQuery({
    queryKey: ['inventory', 'references', 'products'],
    queryFn: () => api<Page<Product>>('/products?limit=100&isActive=true', {}, ''),
    enabled: Boolean(activeBranchId && user?.permissions.includes('product.view')),
  });
  const value = useMemo<InventoryContextValue>(
    () => ({
      api,
      branchId: activeBranchId,
      branchName: activeBranch?.name ?? 'No active branch',
      warehouses: (warehouseQuery.data?.items ?? []).filter(
        (warehouse) => warehouse.branchId === activeBranchId && warehouse.isActive,
      ),
      products: (productQuery.data?.items ?? []).filter(
        (product) => product.trackInventory && product.isActive,
      ),
      can: (permission) => Boolean(user?.permissions.includes(permission)),
      refresh: async () => {
        await client.invalidateQueries({ queryKey: ['inventory'] });
      },
      referencesLoading: warehouseQuery.isLoading || productQuery.isLoading,
    }),
    [
      activeBranch?.name,
      activeBranchId,
      api,
      client,
      productQuery.data?.items,
      productQuery.isLoading,
      user?.permissions,
      warehouseQuery.data?.items,
      warehouseQuery.isLoading,
    ],
  );
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used inside InventoryProvider');
  return context;
}
