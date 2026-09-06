'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';

type Page<T> = { items: T[]; total: number };
type Branch = { id: string; code: string; name: string };
type Warehouse = { id: string; branchId: string; code: string; name: string; isActive: boolean };
type Unit = { id: string; code: string; name: string };
type Product = {
  id: string;
  sku: string;
  name: string;
  batchTracking: boolean;
  baseUnit: Unit;
  tileProfile?: { displaySize: string | null } | null;
};
type Batch = {
  id: string;
  productId: string;
  batchNumber: string;
  lotNumber: string | null;
  shade: string | null;
  isActive: boolean;
  product: Pick<Product, 'id' | 'sku' | 'name'>;
};
type Balance = {
  id: string;
  productId: string;
  baseQuantity: string;
  version: number;
  warehouse: Pick<Warehouse, 'id' | 'code' | 'name'>;
  product: Product;
  batch: Pick<Batch, 'id' | 'batchNumber' | 'lotNumber' | 'shade'> | null;
  equivalents: Array<{ unit: Unit; quantity: string }>;
};
type Movement = {
  id: string;
  type: string;
  baseQuantity: string;
  transactionQuantity: string;
  conversionFactor: string;
  occurredAt: string;
  reason: string | null;
  product: Pick<Product, 'id' | 'sku' | 'name'>;
  warehouse: Pick<Warehouse, 'id' | 'code' | 'name'>;
  unit: Unit;
  batch: Pick<Batch, 'id' | 'batchNumber' | 'lotNumber' | 'shade'> | null;
};
type Count = {
  id: string;
  countNumber: string;
  status: string;
  warehouse: Warehouse;
  createdAt: string;
  _count: { items: number };
};
type Tab = 'stock' | 'operations' | 'batches' | 'counts' | 'history';
type Api = <T>(path: string, init?: RequestInit, branchId?: string) => Promise<T>;

const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400';
const primary =
  'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function InventoryConsole() {
  const { user, authenticatedFetch } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('stock');
  const [branchId, setBranchId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const can = (permission: string) => Boolean(user?.permissions.includes(permission));
  const api: Api = async (path, init = {}, activeBranch = branchId) => {
    const headers = new Headers(init.headers);
    if (activeBranch) headers.set('x-branch-id', activeBranch);
    const response = await authenticatedFetch(path, { ...init, headers });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      throw new Error(
        Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? `Request failed (${response.status})`),
      );
    }
    return response.json() as Promise<never>;
  };
  const run = async (work: () => Promise<unknown>, keys: string[], success: string) => {
    setError('');
    setMessage('');
    try {
      await work();
      await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    }
  };
  const branches = useQuery({
    queryKey: ['inventory-branches'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100', {}, ''),
    enabled: can('branch.view'),
  });
  const activeBranchId = branchId || branches.data?.items[0]?.id || '';
  const warehouses = useQuery({
    queryKey: ['inventory-warehouses'],
    queryFn: () => api<Page<Warehouse>>('/warehouses?limit=100', {}, ''),
    enabled: can('warehouse.view'),
  });
  const products = useQuery({
    queryKey: ['inventory-products'],
    queryFn: () => api<Page<Product>>('/products?limit=100&isActive=true', {}, ''),
    enabled: can('product.view'),
  });
  const tabs: Array<[Tab, string, string]> = [
    ['stock', 'Current stock', 'inventory.view'],
    ['operations', 'Stock operations', 'inventory.adjust'],
    ['batches', 'Batches / shades', 'inventory.view'],
    ['counts', 'Physical counts', 'inventory.count'],
    ['history', 'Movement history', 'inventory.view_history'],
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs
            .filter(([, , permission]) => can(permission))
            .map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-2 text-sm ${tab === id ? 'bg-slate-100 text-slate-950' : 'border border-slate-700'}`}
              >
                {label}
              </button>
            ))}
        </div>
        <label className="min-w-60 text-sm text-slate-300">
          Active branch
          <select
            className={`${field} mt-1`}
            value={activeBranchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">Select branch</option>
            {branches.data?.items.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} ({branch.code})
              </option>
            ))}
          </select>
        </label>
      </div>
      {(message || error) && (
        <p role="status" className={error ? 'text-red-300' : 'text-emerald-300'}>
          {error || message}
        </p>
      )}
      {!activeBranchId ? (
        <Card title="Inventory">
          <p className="text-sm text-slate-400">Select an accessible active branch.</p>
        </Card>
      ) : tab === 'stock' ? (
        <StockPanel api={api} branchId={activeBranchId} />
      ) : tab === 'operations' ? (
        <OperationsPanel
          api={api}
          run={run}
          branchId={activeBranchId}
          warehouses={warehouses.data?.items ?? []}
          products={products.data?.items ?? []}
          can={can}
        />
      ) : tab === 'batches' ? (
        <BatchPanel
          api={api}
          run={run}
          branchId={activeBranchId}
          products={products.data?.items ?? []}
          can={can}
        />
      ) : tab === 'counts' ? (
        <CountPanel
          api={api}
          run={run}
          branchId={activeBranchId}
          warehouses={warehouses.data?.items ?? []}
          products={products.data?.items ?? []}
          can={can}
        />
      ) : (
        <HistoryPanel api={api} branchId={activeBranchId} />
      )}
    </div>
  );
}

function StockPanel({ api, branchId }: { api: Api; branchId: string }) {
  const [search, setSearch] = useState('');
  const stock = useQuery({
    queryKey: ['inventory-stock', branchId, search],
    queryFn: () =>
      api<Page<Balance>>(
        `/inventory/balances?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        {},
        branchId,
      ),
  });
  const low = useQuery({
    queryKey: ['inventory-low', branchId],
    queryFn: () => api<Page<Balance>>('/inventory/low-stock?limit=100', {}, branchId),
  });
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <Card title="Warehouse stock">
        <input
          className={`${field} mb-4`}
          placeholder="Search SKU or product"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="space-y-3">
          {stock.data?.items.map((row) => (
            <article key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium">{row.product.name}</p>
                  <p className="text-xs text-slate-400">
                    {row.product.sku} · {row.warehouse.name}
                    {row.batch
                      ? ` · Batch ${row.batch.batchNumber}${row.batch.shade ? ` / Shade ${row.batch.shade}` : ''}`
                      : ''}
                  </p>
                </div>
                <p className="text-lg font-semibold text-amber-300">
                  {row.baseQuantity} {row.product.baseUnit.code}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Equivalent:{' '}
                {row.equivalents.map((item) => `${item.quantity} ${item.unit.code}`).join(' · ')}
              </p>
            </article>
          ))}
          {stock.data?.items.length === 0 && (
            <p className="text-sm text-slate-400">No stock positions yet.</p>
          )}
        </div>
      </Card>
      <Card title="Low stock">
        <div className="space-y-2 text-sm">
          {low.data?.items.map((row) => (
            <p key={row.id} className="rounded-lg bg-slate-950 p-3">
              {row.product.name}:{' '}
              <span className="text-amber-300">
                {row.baseQuantity} {row.product.baseUnit.code}
              </span>
            </p>
          ))}
          {low.data?.items.length === 0 && (
            <p className="text-slate-400">No low-stock positions.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function OperationsPanel({
  api,
  run,
  branchId,
  warehouses,
  products,
  can,
}: {
  api: Api;
  run: (work: () => Promise<unknown>, keys: string[], success: string) => Promise<void>;
  branchId: string;
  warehouses: Warehouse[];
  products: Product[];
  can: (key: string) => boolean;
}) {
  const branchWarehouses = warehouses.filter(
    (warehouse) => warehouse.branchId === branchId && warehouse.isActive,
  );
  const [kind, setKind] = useState<'opening' | 'adjustments' | 'damage' | 'loss' | 'transfers'>(
    'opening',
  );
  const [warehouseId, setWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const product = products.find((item) => item.id === productId);
  const batches = useQuery({
    queryKey: ['inventory-batches', productId],
    queryFn: () =>
      api<Page<Batch>>(
        `/inventory/batches?limit=100&productId=${productId}&isActive=true`,
        {},
        branchId,
      ),
    enabled: Boolean(product?.batchTracking),
  });
  const permittedKinds = [
    ...(can('inventory.opening_stock') ? [['opening', 'Opening']] : []),
    ...(can('inventory.adjust') ? [['adjustments', 'Adjustment']] : []),
    ...(can('inventory.damage') ? [['damage', 'Damage']] : []),
    ...(can('inventory.loss') ? [['loss', 'Loss']] : []),
    ...(can('inventory.transfer') ? [['transfers', 'Transfer']] : []),
  ] as Array<[typeof kind, string]>;
  const submit = () => {
    const transfer = kind === 'transfers';
    const body = transfer
      ? {
          sourceWarehouseId: warehouseId,
          destinationWarehouseId,
          reason,
          lines: [
            { productId, unitId: product?.baseUnit.id, ...(batchId && { batchId }), quantity },
          ],
        }
      : {
          warehouseId,
          ...(kind === 'adjustments' && { direction }),
          reason,
          lines: [
            { productId, unitId: product?.baseUnit.id, ...(batchId && { batchId }), quantity },
          ],
        };
    return run(
      () =>
        api(
          `/inventory/${kind}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
            body: JSON.stringify(body),
          },
          branchId,
        ),
      ['inventory-stock', 'inventory-low', 'inventory-history'],
      'Inventory operation posted atomically.',
    );
  };
  return (
    <Card title="Post stock operation">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm">
          Operation
          <select
            className={`${field} mt-1`}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            {permittedKinds.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Source warehouse
          <select
            className={`${field} mt-1`}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">Select</option>
            {branchWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        {kind === 'transfers' && (
          <label className="text-sm">
            Destination warehouse
            <select
              className={`${field} mt-1`}
              value={destinationWarehouseId}
              onChange={(e) => setDestinationWarehouseId(e.target.value)}
            >
              <option value="">Select</option>
              {warehouses
                .filter((w) => w.isActive && w.id !== warehouseId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="text-sm">
          Product
          <select
            className={`${field} mt-1`}
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setBatchId('');
            }}
          >
            <option value="">Select</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.name}
              </option>
            ))}
          </select>
        </label>
        {product?.batchTracking && (
          <label className="text-sm">
            Batch / shade
            <select
              className={`${field} mt-1`}
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
            >
              <option value="">Select</option>
              {batches.data?.items.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber}
                  {b.shade ? ` / ${b.shade}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm">
          Quantity ({product?.baseUnit.code ?? 'base unit'})
          <input
            className={`${field} mt-1`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="decimal"
          />
        </label>
        {kind === 'adjustments' && (
          <label className="text-sm">
            Direction
            <select
              className={`${field} mt-1`}
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'IN' | 'OUT')}
            >
              <option>IN</option>
              <option>OUT</option>
            </select>
          </label>
        )}
        <label className="text-sm md:col-span-2">
          Reason
          <input
            className={`${field} mt-1`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </div>
      <button
        className={`${primary} mt-4`}
        type="button"
        onClick={() => void submit()}
        disabled={
          !warehouseId ||
          !product ||
          !quantity ||
          reason.length < 3 ||
          (product.batchTracking && !batchId) ||
          (kind === 'transfers' && !destinationWarehouseId)
        }
      >
        Post operation
      </button>
    </Card>
  );
}

function BatchPanel({
  api,
  run,
  branchId,
  products,
  can,
}: {
  api: Api;
  run: (work: () => Promise<unknown>, keys: string[], success: string) => Promise<void>;
  branchId: string;
  products: Product[];
  can: (key: string) => boolean;
}) {
  const batches = useQuery({
    queryKey: ['inventory-batches'],
    queryFn: () => api<Page<Batch>>('/inventory/batches?limit=100', {}, branchId),
  });
  const [productId, setProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [shade, setShade] = useState('');
  const create = () =>
    run(
      () =>
        api(
          '/inventory/batches',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              productId,
              batchNumber,
              ...(lotNumber && { lotNumber }),
              ...(shade && { shade }),
            }),
          },
          branchId,
        ),
      ['inventory-batches'],
      'Batch created.',
    );
  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {can('inventory.batch_manage') && (
        <Card title="Create batch / shade">
          <div className="space-y-3">
            <select
              className={field}
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Batch-tracked product</option>
              {products
                .filter((p) => p.batchTracking)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <input
              className={field}
              placeholder="Batch number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
            />
            <input
              className={field}
              placeholder="Lot number (optional)"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
            />
            <input
              className={field}
              placeholder="Shade (optional)"
              value={shade}
              onChange={(e) => setShade(e.target.value)}
            />
            <button
              type="button"
              className={primary}
              disabled={!productId || !batchNumber}
              onClick={() => void create()}
            >
              Create batch
            </button>
          </div>
        </Card>
      )}
      <Card title="Product batches">
        <div className="space-y-2">
          {batches.data?.items.map((batch) => (
            <div
              key={batch.id}
              className="flex items-center justify-between rounded-xl bg-slate-950 p-3"
            >
              <div>
                <p>{batch.product.name}</p>
                <p className="text-xs text-slate-400">
                  {batch.batchNumber}
                  {batch.lotNumber ? ` · Lot ${batch.lotNumber}` : ''}
                  {batch.shade ? ` · Shade ${batch.shade}` : ''}
                </p>
              </div>
              {can('inventory.batch_manage') && (
                <button
                  type="button"
                  className={secondary}
                  onClick={() =>
                    void run(
                      () =>
                        api(
                          `/inventory/batches/${batch.id}/status`,
                          {
                            method: 'PATCH',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ isActive: !batch.isActive }),
                          },
                          branchId,
                        ),
                      ['inventory-batches'],
                      'Batch status updated.',
                    )
                  }
                >
                  {batch.isActive ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CountPanel({
  api,
  run,
  branchId,
  warehouses,
  products,
  can,
}: {
  api: Api;
  run: (work: () => Promise<unknown>, keys: string[], success: string) => Promise<void>;
  branchId: string;
  warehouses: Warehouse[];
  products: Product[];
  can: (key: string) => boolean;
}) {
  const counts = useQuery({
    queryKey: ['inventory-counts', branchId],
    queryFn: () => api<Page<Count>>('/inventory/counts?limit=100', {}, branchId),
  });
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const product = products.find((p) => p.id === productId);
  const [batchId, setBatchId] = useState('');
  const batches = useQuery({
    queryKey: ['inventory-batches', productId],
    queryFn: () =>
      api<Page<Batch>>(
        `/inventory/batches?limit=100&productId=${productId}&isActive=true`,
        {},
        branchId,
      ),
    enabled: Boolean(product?.batchTracking),
  });
  const create = () =>
    run(
      () =>
        api(
          '/inventory/counts',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              warehouseId,
              countNumber: `COUNT-${Date.now()}`,
              items: [
                { productId, unitId: product?.baseUnit.id, ...(batchId && { batchId }), quantity },
              ],
            }),
          },
          branchId,
        ),
      ['inventory-counts'],
      'Draft physical count created.',
    );
  const action = (count: Count, actionName: 'review' | 'post') =>
    run(
      () =>
        api(
          `/inventory/counts/${count.id}/${actionName}`,
          {
            method: 'POST',
            ...(actionName === 'post' && { headers: { 'idempotency-key': crypto.randomUUID() } }),
          },
          branchId,
        ),
      ['inventory-counts', 'inventory-stock', 'inventory-history'],
      actionName === 'post' ? 'Count reconciled and posted.' : 'Count moved to review.',
    );
  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Card title="New physical count">
        <div className="space-y-3">
          <select
            className={field}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">Warehouse</option>
            {warehouses
              .filter((w) => w.branchId === branchId && w.isActive)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </select>
          <select
            className={field}
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setBatchId('');
            }}
          >
            <option value="">Product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {product?.batchTracking && (
            <select className={field} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">Batch</option>
              {batches.data?.items.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} / {b.shade ?? 'No shade'}
                </option>
              ))}
            </select>
          )}
          <input
            className={field}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={`Counted ${product?.baseUnit.code ?? 'quantity'}`}
          />
          <button
            type="button"
            className={primary}
            disabled={!warehouseId || !product || !quantity || (product.batchTracking && !batchId)}
            onClick={() => void create()}
          >
            Create draft
          </button>
        </div>
      </Card>
      <Card title="Count workflow">
        <div className="space-y-2">
          {counts.data?.items.map((count) => (
            <div
              key={count.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950 p-3"
            >
              <div>
                <p>{count.countNumber}</p>
                <p className="text-xs text-slate-400">
                  {count.warehouse.name} · {count._count.items} position(s) · {count.status}
                </p>
              </div>
              <div className="flex gap-2">
                {count.status === 'DRAFT' && (
                  <button
                    className={secondary}
                    type="button"
                    onClick={() => void action(count, 'review')}
                  >
                    Review
                  </button>
                )}
                {count.status === 'IN_REVIEW' && can('inventory.reconcile') && (
                  <button
                    className={primary}
                    type="button"
                    onClick={() => void action(count, 'post')}
                  >
                    Post
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function HistoryPanel({ api, branchId }: { api: Api; branchId: string }) {
  const [type, setType] = useState('');
  const query = useMemo(
    () => `/inventory/movements?limit=100${type ? `&type=${type}` : ''}`,
    [type],
  );
  const history = useQuery({
    queryKey: ['inventory-history', branchId, type],
    queryFn: () => api<Page<Movement>>(query, {}, branchId),
  });
  return (
    <Card title="Immutable movement ledger">
      <select
        className={`${field} mb-4 max-w-xs`}
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="">All movement types</option>
        {[
          'OPENING',
          'ADJUSTMENT',
          'DAMAGE',
          'LOSS',
          'TRANSFER_OUT',
          'TRANSFER_IN',
          'COUNT_RECONCILIATION',
        ].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">Product</th>
              <th className="p-2">Warehouse</th>
              <th className="p-2">Type</th>
              <th className="p-2">Transaction</th>
              <th className="p-2">Base change</th>
            </tr>
          </thead>
          <tbody>
            {history.data?.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-800">
                <td className="p-2">{new Date(item.occurredAt).toLocaleString()}</td>
                <td className="p-2">
                  {item.product.name}
                  {item.batch
                    ? ` / ${item.batch.batchNumber}${item.batch.shade ? ` / ${item.batch.shade}` : ''}`
                    : ''}
                </td>
                <td className="p-2">{item.warehouse.name}</td>
                <td className="p-2">{item.type}</td>
                <td className="p-2">
                  {item.transactionQuantity} {item.unit.code}
                </td>
                <td className="p-2 font-medium">{item.baseQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
