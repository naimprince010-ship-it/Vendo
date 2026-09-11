'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  SearchInput,
  Select,
} from '@vendo/ui';
import { useState } from 'react';
import { useBranchContext } from '../../contexts/branch-context';
import { useVendoApi } from '../../hooks/use-vendo-api';
import { SaleListCard } from './components';
import type { Page, SaleListItem } from './types';

export function SalesWorkspace() {
  const { activeBranch, activeBranchId } = useBranchContext();
  const api = useVendoApi();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('COMPLETED');
  const [page, setPage] = useState(1);
  const sales = useQuery({
    queryKey: ['sales', 'workspace-list', activeBranchId, search, status, page],
    queryFn: () =>
      api<Page<SaleListItem>>(
        `/sales?page=${page}&limit=20${status ? `&status=${status}` : ''}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`,
      ),
    enabled: Boolean(activeBranchId),
  });

  if (!activeBranchId) {
    return (
      <EmptyState
        title="Select an active branch"
        description="Sales history is branch-authorized and loads only after branch selection."
      />
    );
  }
  const totalPages = Math.max(1, Math.ceil((sales.data?.total ?? 0) / 20));
  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Sales</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            Transaction history
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review immutable invoices and open deliberate collection, return, refund, exchange, or
            void workflows.
          </p>
        </div>
        <p className="text-sm text-text-muted">Branch · {activeBranch?.name}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Find a sale</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <SearchInput
            accessibleLabel="Search sales"
            placeholder="Invoice, customer, product, or SKU"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Sale status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="COMPLETED">Completed invoices</option>
            <option value="HELD">Held sales</option>
            <option value="DRAFT">Draft sales</option>
            <option value="">All statuses</option>
          </Select>
        </CardContent>
      </Card>
      {sales.isLoading ? (
        <LoadingState title="Loading sales…" />
      ) : sales.isError ? (
        <ErrorState description={sales.error.message} onRetry={() => void sales.refetch()} />
      ) : sales.data?.items.length ? (
        <div className="space-y-3">
          {sales.data.items.map((sale) => (
            <SaleListCard key={sale.id} sale={sale} />
          ))}
          <Pagination
            currentPage={page}
            pageCount={totalPages}
            totalItems={sales.data.total}
            onPrevious={page > 1 ? () => setPage((current) => current - 1) : undefined}
            onNext={page < totalPages ? () => setPage((current) => current + 1) : undefined}
          />
        </div>
      ) : (
        <EmptyState title="No sales found" description="Try another search or status filter." />
      )}
    </div>
  );
}
