'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vendo/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { InventoryProvider, useInventory } from './inventory-context';
import { BatchCreateDialog, CountWorkspace, StockOperationWorkspace } from './operations';
import { movementLabel, movementTone, normalizeDecimal, signedQuantity } from './presentation';
import type { Balance, Batch, Movement, Page, ProductDetail } from './types';

const ROOT = '/app/inventory';
const PAGE_SIZE = 20;

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(
      /(^|_)([a-z])/g,
      (_, space, letter: string) => `${space ? ' ' : ''}${letter.toUpperCase()}`,
    );
}

function Heading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function InventoryNav() {
  const path = usePathname();
  const links = [
    [ROOT, 'Overview'],
    [`${ROOT}/stock`, 'Stock'],
    [`${ROOT}/low-stock`, 'Low stock'],
    [`${ROOT}/batches`, 'Batches'],
    [`${ROOT}/counts`, 'Counts'],
    [`${ROOT}/transfers`, 'Transfers'],
    [`${ROOT}/movements`, 'Movements'],
  ] as const;
  return (
    <nav
      aria-label="Inventory sections"
      className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
    >
      {links.map(([href, label]) => {
        const active =
          href === ROOT
            ? path === ROOT
            : href === `${ROOT}/stock`
              ? path === href || path.startsWith(`${href}/`)
              : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
              active
                ? 'bg-primary-soft text-primary'
                : 'text-text-secondary hover:bg-neutral-hover hover:text-text-primary'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function InventoryWorkspace() {
  return (
    <InventoryProvider>
      <InventoryRouter />
    </InventoryProvider>
  );
}

function InventoryRouter() {
  const path = usePathname();
  const { branchId, branchName } = useInventory();
  const parts = path.slice(ROOT.length).split('/').filter(Boolean);
  let content: ReactNode;
  if (!parts.length) content = <Overview />;
  else if (parts[0] === 'stock' && parts[1]) content = <ProductStockDetail productId={parts[1]} />;
  else if (parts[0] === 'stock') content = <StockList />;
  else if (parts[0] === 'low-stock') content = <LowStock />;
  else if (parts[0] === 'batches') content = <Batches />;
  else if (parts[0] === 'opening') content = <StockOperationWorkspace kind="opening" />;
  else if (parts[0] === 'adjustments') content = <StockOperationWorkspace kind="adjustments" />;
  else if (parts[0] === 'damage-loss') content = <StockOperationWorkspace kind="damage-loss" />;
  else if (parts[0] === 'counts') content = <CountWorkspace countId={parts[1]} />;
  else if (parts[0] === 'transfers') content = <StockOperationWorkspace kind="transfers" />;
  else if (parts[0] === 'movements') content = <Movements />;
  else content = <EmptyState title="Inventory route not found" />;
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <InventoryNav />
      {!branchId ? (
        <Alert tone="warning">Select an accessible branch before working with inventory.</Alert>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <span className="text-text-muted">Inventory scope</span>
          <strong className="text-text-primary">{branchName}</strong>
        </div>
      )}
      {branchId ? content : null}
    </div>
  );
}

function Overview() {
  const { api, branchId, warehouses, can } = useInventory();
  const balances = useQuery({
    queryKey: ['inventory', 'overview', 'balances', branchId],
    queryFn: () => api<Page<Balance>>('/inventory/balances?page=1&limit=5'),
  });
  const low = useQuery({
    queryKey: ['inventory', 'overview', 'low', branchId],
    queryFn: () => api<Page<Balance>>('/inventory/low-stock?page=1&limit=100'),
  });
  const batches = useQuery({
    queryKey: ['inventory', 'overview', 'batches'],
    queryFn: () => api<Page<Batch>>('/inventory/batches?page=1&limit=1&isActive=true'),
  });
  const movements = useQuery({
    queryKey: ['inventory', 'overview', 'movements', branchId],
    queryFn: () => api<Page<Movement>>('/inventory/movements?page=1&limit=6'),
    enabled: can('inventory.view_history'),
  });
  const cards = [
    ['Stock positions', balances.data?.total ?? '—', 'Warehouse/product/batch positions'],
    ['Low-stock positions', low.data?.total ?? '—', 'At or below configured reorder level'],
    ['Active batches', batches.data?.total ?? '—', 'Company-wide batch and shade records'],
    ['Warehouses', warehouses.length, 'Active warehouses in this branch'],
  ] as const;
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Inventory"
        title="Operational overview"
        description="Monitor real stock positions and route high-impact changes through reviewed, auditable workflows."
        actions={
          <>
            {can('inventory.opening_stock') ? (
              <Link href={`${ROOT}/opening`}>
                <Button variant="outline">Opening stock</Button>
              </Link>
            ) : null}
            {can('inventory.adjust') ? (
              <Link href={`${ROOT}/adjustments`}>
                <Button>Stock adjustment</Button>
              </Link>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, description]) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-sm text-text-secondary">{label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">{value}</p>
              <p className="mt-1 text-xs text-text-muted">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent inventory activity</CardTitle>
              <CardDescription>Immutable movement records for the active branch.</CardDescription>
            </div>
            <Link
              href={`${ROOT}/movements`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {!can('inventory.view_history') ? (
              <EmptyState title="Movement history permission required" />
            ) : movements.isLoading ? (
              <LoadingState />
            ) : movements.isError ? (
              <ErrorState description={movements.error.message} />
            ) : !movements.data?.items.length ? (
              <EmptyState title="No inventory activity yet" />
            ) : (
              <div className="space-y-2">
                {movements.data.items.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-text-primary">{movement.product.name}</p>
                      <p className="text-xs text-text-muted">
                        {movement.warehouse.name} · {new Date(movement.occurredAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge tone={movementTone(movement.type)}>
                        {movementLabel(movement.type)}
                      </StatusBadge>
                      <p className="mt-1 font-mono text-sm">
                        {signedQuantity(movement.baseQuantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Operational actions</CardTitle>
            <CardDescription>Use the correct workflow for each stock event.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              ['Opening stock', `${ROOT}/opening`, 'inventory.opening_stock'],
              ['Adjust stock', `${ROOT}/adjustments`, 'inventory.adjust'],
              ['Record damage or loss', `${ROOT}/damage-loss`, 'inventory.damage'],
              ['Physical count', `${ROOT}/counts`, 'inventory.count'],
              ['Warehouse transfer', `${ROOT}/transfers`, 'inventory.transfer'],
            ].map(([label, href, permission]) =>
              can(permission) ? (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-primary hover:border-primary hover:bg-primary-soft"
                >
                  {label}
                </Link>
              ) : null,
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Equivalents({ balance }: { balance: Balance }) {
  const derived = balance.equivalents.filter(
    (item) => item.unit.id !== balance.product.baseUnit.id,
  );
  return derived.length ? (
    <div className="flex flex-wrap gap-1.5">
      {derived.map((item) => (
        <span
          key={item.unit.id}
          className="rounded-md bg-neutral-subtle px-2 py-1 font-mono text-xs text-text-secondary"
        >
          {item.quantity} {item.unit.code} equivalent
        </span>
      ))}
    </div>
  ) : (
    <span className="text-xs text-text-muted">No configured equivalents</span>
  );
}

function BatchText({ batch }: { batch: Balance['batch'] }) {
  if (!batch) return <span className="text-text-muted">Not batch tracked</span>;
  return (
    <div>
      <span className="font-mono font-semibold">{batch.batchNumber}</span>
      {batch.shade ? (
        <StatusBadge className="ml-2" tone="info">
          Shade {batch.shade}
        </StatusBadge>
      ) : null}
      {batch.lotNumber ? (
        <p className="mt-1 text-xs text-text-muted">Lot {batch.lotNumber}</p>
      ) : null}
    </div>
  );
}

function StockList() {
  const { api, branchId, warehouses } = useInventory();
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search.trim()) params.set('search', search.trim());
  if (warehouseId) params.set('warehouseId', warehouseId);
  const query = useQuery({
    queryKey: ['inventory', 'balances', branchId, params.toString()],
    queryFn: () => api<Page<Balance>>(`/inventory/balances?${params}`),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Inventory · Stock"
        title="Warehouse stock"
        description="Base stock is authoritative. BOX, square-foot and other values are backend-derived equivalents."
      />
      <Alert tone="info">
        <strong>One stock balance per position.</strong> Equivalent quantities are representations
        of the same base stock, never independent counters.
      </Alert>
      <Card>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-[minmax(0,1fr)_280px_auto]">
          <SearchInput
            placeholder="Search product name or SKU"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Warehouse filter"
            value={warehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setWarehouseId('');
              setPage(1);
            }}
          >
            Clear
          </Button>
        </CardContent>
      </Card>
      {query.isLoading ? (
        <LoadingState title="Loading stock positions…" />
      ) : query.isError ? (
        <ErrorState description={query.error.message} onRetry={() => void query.refetch()} />
      ) : !query.data?.items.length ? (
        <EmptyState
          title="No stock positions found"
          description="Adjust filters or post a valid inventory event."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Batch / shade</TableHead>
                  <TableHead numeric>Base stock</TableHead>
                  <TableHead>Derived equivalents</TableHead>
                  <TableHead>Reorder state</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((balance) => (
                  <TableRow key={balance.id}>
                    <TableCell>
                      <Link
                        href={`${ROOT}/stock/${balance.product.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {balance.product.name}
                      </Link>
                      <p className="font-mono text-xs text-text-muted">{balance.product.sku}</p>
                    </TableCell>
                    <TableCell>
                      {balance.warehouse.name}
                      <p className="font-mono text-xs text-text-muted">{balance.warehouse.code}</p>
                    </TableCell>
                    <TableCell>
                      <BatchText batch={balance.batch} />
                    </TableCell>
                    <TableCell numeric>
                      <span className="font-mono text-base font-bold text-text-primary">
                        {balance.baseQuantity} {balance.product.baseUnit.code}
                      </span>
                      <p className="text-xs text-text-muted">Authoritative</p>
                    </TableCell>
                    <TableCell>
                      <Equivalents balance={balance} />
                    </TableCell>
                    <TableCell>
                      {balance.product.reorderLevel === null ? (
                        <StatusBadge tone="neutral">Not configured</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">
                          Reorder at {balance.product.reorderLevel}
                        </StatusBadge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={page}
            pageCount={pages}
            totalItems={query.data.total}
            onPrevious={page > 1 ? () => setPage((value) => value - 1) : undefined}
            onNext={page < pages ? () => setPage((value) => value + 1) : undefined}
          />
        </>
      )}
    </div>
  );
}

function ProductStockDetail({ productId }: { productId: string }) {
  const { api, branchId, can } = useInventory();
  const product = useQuery({
    queryKey: ['inventory', 'product', productId],
    queryFn: () => api<ProductDetail>(`/products/${productId}`, {}, ''),
  });
  const balances = useQuery({
    queryKey: ['inventory', 'balances', branchId, productId],
    queryFn: () => api<Page<Balance>>(`/inventory/balances?limit=100&productId=${productId}`),
  });
  const movements = useQuery({
    queryKey: ['inventory', 'movements', branchId, productId],
    queryFn: () => api<Page<Movement>>(`/inventory/movements?limit=10&productId=${productId}`),
    enabled: can('inventory.view_history'),
  });
  if (product.isLoading || balances.isLoading)
    return <LoadingState title="Loading product stock…" />;
  if (product.isError) return <ErrorState description={product.error.message} />;
  if (balances.isError) return <ErrorState description={balances.error.message} />;
  if (!product.data) return <EmptyState title="Product not found" />;
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Inventory · Product stock"
        title={product.data.name}
        description={`${product.data.sku} · ${titleCase(product.data.type)} · Base unit ${product.data.baseUnit.code}`}
        actions={
          <Link href={`${ROOT}/stock`}>
            <Button variant="outline">Back to stock</Button>
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Stock position breakdown</CardTitle>
          <CardDescription>Where this stock is held and in which batch or shade.</CardDescription>
        </CardHeader>
        <CardContent>
          {!balances.data?.items.length ? (
            <EmptyState title="No stock positions for this product" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {balances.data.items.map((balance) => (
                <div key={balance.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{balance.warehouse.name}</p>
                      <p className="font-mono text-xs text-text-muted">{balance.warehouse.code}</p>
                    </div>
                    <BatchText batch={balance.batch} />
                  </div>
                  <div className="mt-4 rounded-md bg-primary-soft p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Base stock · authoritative
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold text-text-primary">
                      {balance.baseQuantity} {balance.product.baseUnit.code}
                    </p>
                  </div>
                  <div className="mt-3">
                    <Equivalents balance={balance} />
                  </div>
                  <p className="mt-3 text-xs text-text-muted">
                    Balance version {balance.version} · updated{' '}
                    {new Date(balance.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {can('inventory.view_history') ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent movements</CardTitle>
            <CardDescription>
              Historical conversion and signed base changes remain immutable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movements.isLoading ? (
              <LoadingState />
            ) : movements.isError ? (
              <ErrorState description={movements.error.message} />
            ) : (
              <MovementTable items={movements.data?.items ?? []} />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function LowStock() {
  const { api, branchId, warehouses } = useInventory();
  const [warehouseId, setWarehouseId] = useState('');
  const query = useQuery({
    queryKey: ['inventory', 'low-stock', branchId, warehouseId],
    queryFn: () =>
      api<Page<Balance>>(
        `/inventory/low-stock?limit=100${warehouseId ? `&warehouseId=${warehouseId}` : ''}`,
      ),
  });
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Inventory · Attention"
        title="Low stock"
        description="Positions at or below the product reorder level. Purchasing automation is intentionally outside this stage."
      />
      <Card>
        <CardContent className="pt-5">
          <Select
            aria-label="Warehouse filter"
            className="max-w-sm"
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
          >
            <option value="">All warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState description={query.error.message} />
      ) : !query.data?.items.length ? (
        <EmptyState
          title="No low-stock positions"
          description="All configured positions are above their reorder threshold."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead numeric>Base stock</TableHead>
                <TableHead numeric>Reorder level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`${ROOT}/stock/${row.product.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {row.product.name}
                    </Link>
                    <p className="font-mono text-xs text-text-muted">{row.product.sku}</p>
                  </TableCell>
                  <TableCell>{row.warehouse.name}</TableCell>
                  <TableCell numeric className="font-mono font-bold">
                    {row.baseQuantity} {row.product.baseUnit.code}
                  </TableCell>
                  <TableCell numeric className="font-mono">
                    {row.product.reorderLevel ?? '—'} {row.product.baseUnit.code}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={normalizeDecimal(row.baseQuantity) === '0' ? 'danger' : 'warning'}
                    >
                      {normalizeDecimal(row.baseQuantity) === '0' ? 'Out of stock' : 'Low stock'}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Batches() {
  const { api, can, products, refresh } = useInventory();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [active, setActive] = useState('true');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search.trim()) params.set('search', search.trim());
  if (productId) params.set('productId', productId);
  if (active) params.set('isActive', active);
  const query = useQuery({
    queryKey: ['inventory', 'batches', params.toString()],
    queryFn: () => api<Page<Batch>>(`/inventory/batches?${params}`),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  const toggle = async (batch: Batch) => {
    try {
      await api(`/inventory/batches/${batch.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: !batch.isActive }),
      });
      setNotice(`Batch ${batch.isActive ? 'deactivated' : 'activated'}.`);
      await client.invalidateQueries({ queryKey: ['inventory', 'batches'] });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Batch update failed.');
    }
  };
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Inventory · Traceability"
        title="Batches, lots and shades"
        description="Exact tile shade and manufacturer batch remain explicit; the system never assigns a batch silently."
        actions={
          can('inventory.batch_manage') ? (
            <Button onClick={() => setCreateOpen(true)}>Create batch</Button>
          ) : undefined
        }
      />
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      <Card>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-3">
          <SearchInput
            placeholder="Search batch, lot, shade or product"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Product filter"
            value={productId}
            onChange={(event) => {
              setProductId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All batch-tracked products</option>
            {products
              .filter((product) => product.batchTracking)
              .map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
          </Select>
          <Select
            aria-label="Status filter"
            value={active}
            onChange={(event) => {
              setActive(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </CardContent>
      </Card>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState description={query.error.message} />
      ) : !query.data?.items.length ? (
        <EmptyState title="No batches found" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Shade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-semibold">
                      {batch.product.name}
                      <p className="font-mono text-xs text-text-muted">{batch.product.sku}</p>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{batch.batchNumber}</TableCell>
                    <TableCell>{batch.lotNumber ?? '—'}</TableCell>
                    <TableCell>
                      {batch.shade ? (
                        <StatusBadge tone="info">Shade {batch.shade}</StatusBadge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={batch.isActive ? 'success' : 'neutral'}>
                        {batch.isActive ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {can('inventory.batch_manage') ? (
                        <Button size="sm" variant="ghost" onClick={() => void toggle(batch)}>
                          {batch.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={page}
            pageCount={pages}
            totalItems={query.data.total}
            onPrevious={page > 1 ? () => setPage((value) => value - 1) : undefined}
            onNext={page < pages ? () => setPage((value) => value + 1) : undefined}
          />
        </>
      )}
      <BatchCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async () => {
          setNotice('Batch created.');
          await client.invalidateQueries({ queryKey: ['inventory', 'batches'] });
        }}
      />
    </div>
  );
}

function MovementTable({ items }: { items: Movement[] }) {
  if (!items.length) return <EmptyState title="No movement records found" />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date / actor</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Batch / shade</TableHead>
            <TableHead>Movement</TableHead>
            <TableHead numeric>Transaction</TableHead>
            <TableHead numeric>Base delta</TableHead>
            <TableHead>Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {new Date(item.occurredAt).toLocaleString()}
                <p className="text-xs text-text-muted">
                  {item.createdBy.firstName} {item.createdBy.lastName}
                </p>
              </TableCell>
              <TableCell className="font-semibold">
                {item.product.name}
                <p className="font-mono text-xs text-text-muted">{item.product.sku}</p>
              </TableCell>
              <TableCell>{item.warehouse.name}</TableCell>
              <TableCell>
                <BatchText batch={item.batch} />
              </TableCell>
              <TableCell>
                <StatusBadge tone={movementTone(item.type)}>{movementLabel(item.type)}</StatusBadge>
                {item.reason ? (
                  <p className="mt-1 max-w-56 text-xs text-text-muted">{item.reason}</p>
                ) : null}
              </TableCell>
              <TableCell numeric className="font-mono">
                {item.transactionQuantity} {item.unit.code}
                <p className="text-xs text-text-muted">× {item.conversionFactor}</p>
              </TableCell>
              <TableCell numeric className="font-mono font-bold">
                {signedQuantity(item.baseQuantity)}
              </TableCell>
              <TableCell>
                <span className="text-xs text-text-secondary">{item.referenceType}</span>
                <p
                  className="max-w-32 truncate font-mono text-xs text-text-muted"
                  title={item.referenceId}
                >
                  {item.referenceId}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Movements() {
  const { api, branchId, warehouses, products } = useInventory();
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search.trim()) params.set('search', search.trim());
  if (warehouseId) params.set('warehouseId', warehouseId);
  if (productId) params.set('productId', productId);
  if (type) params.set('type', type);
  const query = useQuery({
    queryKey: ['inventory', 'movements', branchId, params.toString()],
    queryFn: () => api<Page<Movement>>(`/inventory/movements?${params}`),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  const types = [
    'OPENING',
    'PURCHASE_RECEIPT',
    'SALE',
    'SALE_RETURN',
    'PURCHASE_RETURN',
    'ADJUSTMENT',
    'DAMAGE',
    'LOSS',
    'TRANSFER_OUT',
    'TRANSFER_IN',
    'COUNT_RECONCILIATION',
  ];
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Inventory · Audit"
        title="Movement history"
        description="Immutable transaction quantities, conversion snapshots and signed base deltas. Records cannot be edited or deleted."
      />
      <Card>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-4">
          <SearchInput
            placeholder="Search product, SKU or reason"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Warehouse filter"
            value={warehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Product filter"
            value={productId}
            onChange={(event) => {
              setProductId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Movement type filter"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All movement types</option>
            {types.map((value) => (
              <option key={value} value={value}>
                {movementLabel(value)}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState description={query.error.message} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <Card>
            <CardContent className="pt-5">
              <MovementTable items={query.data?.items ?? []} />
            </CardContent>
          </Card>
          {query.data ? (
            <Pagination
              currentPage={page}
              pageCount={pages}
              totalItems={query.data.total}
              onPrevious={page > 1 ? () => setPage((value) => value - 1) : undefined}
              onNext={page < pages ? () => setPage((value) => value + 1) : undefined}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

export { Heading };
