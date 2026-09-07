'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';

type Page<T> = { items: T[]; total: number };
type Named = { id: string; code: string; name: string };
type Branch = Named & { isActive: boolean };
type Customer = Named & { isWalkIn: boolean };
type Method = Named & { isCash: boolean };
type SaleSummary = {
  id: string;
  invoiceNumber: string;
  total: string;
  paid: string;
  due: string;
  customer: Customer;
};
type SaleLine = {
  id: string;
  quantity: string;
  baseQuantity: string;
  returnedBaseQuantity: string;
  returnableBaseQuantity: string;
  unitPrice: string;
  lineTotal: string;
  unit: Named;
  batch: { batchNumber: string; shade: string | null } | null;
  product: { id: string; sku: string; name: string; baseUnit: Named };
};
type SaleDetail = SaleSummary & {
  branchId: string;
  warehouseId: string;
  registerId: string;
  customerId: string;
  pricingMode: 'RETAIL' | 'WHOLESALE';
  currentOutstanding: string;
  lifecycleStatus: string;
  items: SaleLine[];
  returns: SaleReturn[];
};
type SaleReturn = {
  id: string;
  returnNumber: string;
  totalCredit: string;
  receivableApplied: string;
  reason: string;
  sale: { invoiceNumber: string };
  customer: Named;
  refunds: { amount: string; payment: { method: Named } }[];
};
type Collection = {
  id: string;
  paymentNumber: string;
  amount: string;
  allocated?: string;
  unapplied?: string;
  customer: Named;
  method: Named;
};
type PosProduct = {
  id: string;
  sku: string;
  name: string;
  baseUnit: Named;
  scannedUnitId: string;
  units: { unit: Named; factorToBase: string }[];
  prices: { unitId: string; type: 'RETAIL' | 'WHOLESALE' | 'MINIMUM'; amount: string }[];
  availability:
    { id: string; batchNumber: string; shade: string | null }[] | { baseQuantity: string };
};
type PosContext = { paymentMethods: Method[] };
type Tab = 'collection' | 'return' | 'refund' | 'exchange';

const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400';
const primary =
  'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50';

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const key = (type: string) => `${type}-ui-${crypto.randomUUID()}`;

export function Phase10Console() {
  const { user, authenticatedFetch } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('collection');
  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [saleId, setSaleId] = useState('');
  const [saleItemId, setSaleItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('Customer requested return');
  const [disposition, setDisposition] = useState<'RESTOCK' | 'NON_RESELLABLE'>('RESTOCK');
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [returnId, setReturnId] = useState('');
  const [replacementSearch, setReplacementSearch] = useState('');
  const [replacement, setReplacement] = useState<PosProduct | null>(null);
  const [replacementUnitId, setReplacementUnitId] = useState('');
  const [replacementBatchId, setReplacementBatchId] = useState('');
  const [replacementQuantity, setReplacementQuantity] = useState('1');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const can = (permission: string) => Boolean(user?.permissions.includes(permission));
  const api = async <T,>(path: string, init: RequestInit = {}, branch = '') => {
    const headers = new Headers(init.headers);
    if (branch) headers.set('x-branch-id', branch);
    if (init.body) headers.set('content-type', 'application/json');
    const response = await authenticatedFetch(path, { ...init, headers });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      throw new Error(
        Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? `Request failed (${response.status})`),
      );
    }
    return response.json() as Promise<T>;
  };
  const run = async (work: () => Promise<unknown>, success: string) => {
    setMessage('');
    setError('');
    try {
      await work();
      await queryClient.invalidateQueries({ queryKey: ['phase10'] });
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    }
  };

  const branches = useQuery({
    queryKey: ['phase10', 'branches'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100', {}, ''),
  });
  const activeBranchId = branchId || branches.data?.items.find((row) => row.isActive)?.id || '';
  const context = useQuery({
    queryKey: ['phase10', 'context', activeBranchId],
    queryFn: () => api<PosContext>('/sales/pos/context', {}, activeBranchId),
    enabled: Boolean(activeBranchId),
  });
  const customers = useQuery({
    queryKey: ['phase10', 'customers', activeBranchId],
    queryFn: () => api<Customer[]>('/sales/pos/customers?limit=50', {}, activeBranchId),
    enabled: Boolean(activeBranchId),
  });
  const sales = useQuery({
    queryKey: ['phase10', 'sales', activeBranchId, customerId],
    queryFn: () =>
      api<Page<SaleSummary>>(
        `/sales?status=COMPLETED&limit=50${customerId ? `&customerId=${customerId}` : ''}`,
        {},
        activeBranchId,
      ),
    enabled: Boolean(activeBranchId),
  });
  const detail = useQuery({
    queryKey: ['phase10', 'sale', saleId],
    queryFn: () => api<SaleDetail>(`/sales/${saleId}`, {}, activeBranchId),
    enabled: Boolean(saleId && activeBranchId),
  });
  const returns = useQuery({
    queryKey: ['phase10', 'returns', activeBranchId],
    queryFn: () => api<Page<SaleReturn>>('/sales/returns?limit=50', {}, activeBranchId),
    enabled: Boolean(activeBranchId),
  });
  const collections = useQuery({
    queryKey: ['phase10', 'collections', activeBranchId],
    queryFn: () => api<Page<Collection>>('/sales/collections?limit=20', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('customer.view_payments')),
  });
  const replacementProducts = useQuery({
    queryKey: ['phase10', 'replacement', detail.data?.warehouseId, replacementSearch],
    queryFn: () =>
      api<{ items: PosProduct[] }>(
        `/sales/pos/products?warehouseId=${detail.data?.warehouseId}&search=${encodeURIComponent(replacementSearch)}`,
        {},
        activeBranchId,
      ),
    enabled: Boolean(detail.data?.warehouseId && replacementSearch.trim().length >= 2),
  });

  const activeMethodId = methodId || context.data?.paymentMethods[0]?.id || '';
  const selectedLine = detail.data?.items.find((row) => row.id === saleItemId);
  const chosenUnitId =
    replacementUnitId || replacement?.scannedUnitId || replacement?.baseUnit.id || '';
  const chosenPrice =
    replacement?.prices.find(
      (row) => row.unitId === chosenUnitId && row.type === (detail.data?.pricingMode ?? 'RETAIL'),
    )?.amount ?? '';

  const postCollection = () =>
    run(
      () =>
        api(
          '/sales/collections',
          {
            method: 'POST',
            headers: { 'Idempotency-Key': key('collection') },
            body: JSON.stringify({
              customerId,
              methodId: activeMethodId,
              amount,
              allocations: saleId ? [{ saleId, amount }] : [],
              notes: saleId
                ? 'Invoice collection from customer workspace'
                : 'Unapplied customer advance',
            }),
          },
          activeBranchId,
        ),
      saleId ? 'Collection posted and invoice outstanding updated' : 'Customer advance posted',
    );

  const postReturn = () =>
    run(
      () =>
        api(
          '/sales/returns',
          {
            method: 'POST',
            headers: { 'Idempotency-Key': key('return') },
            body: JSON.stringify({
              saleId,
              reason,
              items: [{ saleItemId, quantity, disposition }],
            }),
          },
          activeBranchId,
        ),
      'Return posted; inventory and receivable effects committed atomically',
    );

  const postRefund = () =>
    run(
      () =>
        api(
          '/sales/refunds',
          {
            method: 'POST',
            headers: { 'Idempotency-Key': key('refund') },
            body: JSON.stringify({
              returnId,
              methodId: activeMethodId,
              amount,
              reason: reason || 'Approved customer refund',
            }),
          },
          activeBranchId,
        ),
      'Refund recorded against the selected return',
    );

  const postExchange = () => {
    if (!detail.data || !replacement) return;
    void run(
      () =>
        api(
          '/sales/exchanges',
          {
            method: 'POST',
            headers: { 'Idempotency-Key': key('exchange') },
            body: JSON.stringify({
              saleReturn: {
                saleId,
                reason,
                items: [{ saleItemId, quantity, disposition: 'RESTOCK' }],
              },
              replacementSale: {
                warehouseId: detail.data.warehouseId,
                registerId: detail.data.registerId,
                customerId: detail.data.customerId,
                pricingMode: detail.data.pricingMode,
                items: [
                  {
                    productId: replacement.id,
                    unitId: chosenUnitId,
                    batchId: replacementBatchId || undefined,
                    quantity: replacementQuantity,
                    requestedUnitPrice: chosenPrice,
                    discount: '0',
                    tax: '0',
                  },
                ],
                payments: Number(amount) > 0 ? [{ methodId: activeMethodId, amount }] : undefined,
              },
              reason,
            }),
          },
          activeBranchId,
        ),
      'Exchange posted as a linked return and replacement sale',
    );
  };

  return (
    <div className="space-y-4 border-t border-slate-800 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
            Phase 10
          </p>
          <h2 className="text-xl font-semibold">Payments, returns, refunds and exchanges</h2>
        </div>
        <select
          className={`${field} max-w-xs`}
          value={activeBranchId}
          aria-label="Financial workflow branch"
          onChange={(event) => {
            setBranchId(event.target.value);
            setSaleId('');
          }}
        >
          {(branches.data?.items ?? [])
            .filter((row) => row.isActive)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.code} · {row.name}
              </option>
            ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['collection', 'return', 'refund', 'exchange'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${tab === item ? 'bg-amber-400 text-slate-950' : 'border border-slate-700'}`}
          >
            {item}
          </button>
        ))}
      </div>
      {message && (
        <p className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-300">{message}</p>
      )}
      {error && <p className="rounded-lg bg-rose-950 p-3 text-sm text-rose-300">{error}</p>}

      {tab === 'collection' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Customer due collection / advance">
            <div className="space-y-3">
              <select
                className={field}
                aria-label="Collection customer"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setSaleId('');
                }}
              >
                <option value="">Select named customer</option>
                {(customers.data ?? [])
                  .filter((row) => !row.isWalkIn)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.code} · {row.name}
                    </option>
                  ))}
              </select>
              <select
                className={field}
                aria-label="Outstanding invoice allocation"
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
              >
                <option value="">Unapplied advance (no invoice allocation)</option>
                {(sales.data?.items ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.invoiceNumber} · original due {row.due}
                  </option>
                ))}
              </select>
              {detail.data && (
                <p className="rounded-lg bg-slate-950 p-3 text-sm">
                  Current invoice outstanding: <b>{detail.data.currentOutstanding} BDT</b>
                </p>
              )}
              <select
                className={field}
                aria-label="Collection method"
                value={activeMethodId}
                onChange={(e) => setMethodId(e.target.value)}
              >
                {(context.data?.paymentMethods ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </option>
                ))}
              </select>
              <input
                className={field}
                aria-label="Collection amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Collection amount"
              />
              <button
                className={primary}
                disabled={
                  !can('customer.collect_payment') || !customerId || !amount || !activeMethodId
                }
                type="button"
                onClick={() => void postCollection()}
              >
                Post collection
              </button>
              <p className="text-xs text-slate-400">
                No invoice selected means an explicit customer advance. Positive ledger balance is
                receivable; negative is customer credit.
              </p>
            </div>
          </Panel>
          <Panel title="Recent customer payments">
            <div className="space-y-2">
              {(collections.data?.items ?? []).map((row) => (
                <div key={row.id} className="rounded-lg border border-slate-700 p-3 text-sm">
                  <b>{row.paymentNumber}</b> · {row.customer.name}
                  <br />
                  {row.amount} via {row.method.name}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {(tab === 'return' || tab === 'exchange') && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title={tab === 'return' ? 'Full / partial sale return' : 'Original item to exchange'}
          >
            <div className="space-y-3">
              <select
                className={field}
                aria-label="Original completed sale"
                value={saleId}
                onChange={(e) => {
                  setSaleId(e.target.value);
                  setSaleItemId('');
                }}
              >
                <option value="">Select completed sale</option>
                {(sales.data?.items ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.invoiceNumber} · {row.customer.name}
                  </option>
                ))}
              </select>
              {detail.data && (
                <p className="rounded-lg bg-slate-950 p-3 text-sm">
                  Status <b>{detail.data.lifecycleStatus}</b> · outstanding{' '}
                  {detail.data.currentOutstanding}
                </p>
              )}
              <select
                className={field}
                aria-label="Return sale item"
                value={saleItemId}
                onChange={(e) => setSaleItemId(e.target.value)}
              >
                <option value="">Select original line</option>
                {(detail.data?.items ?? [])
                  .filter((row) => Number(row.returnableBaseQuantity) > 0)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.product.sku} · {row.product.name} · sold {row.quantity} {row.unit.code} ·
                      returnable {row.returnableBaseQuantity} {row.product.baseUnit.code}
                      {row.batch ? ` · ${row.batch.batchNumber}/${row.batch.shade ?? '—'}` : ''}
                    </option>
                  ))}
              </select>
              {selectedLine && (
                <p className="text-xs text-slate-400">
                  Original snapshot: {selectedLine.unitPrice} × {selectedLine.quantity}; credit is
                  calculated by the backend from original discounts and tax.
                </p>
              )}
              <input
                className={field}
                aria-label="Return quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantity in original transaction unit"
              />
              {tab === 'return' && (
                <select
                  className={field}
                  aria-label="Return disposition"
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value as typeof disposition)}
                >
                  <option value="RESTOCK">Restock exact original batch/shade</option>
                  <option value="NON_RESELLABLE">
                    Non-resellable (no sellable stock increase)
                  </option>
                </select>
              )}
              <textarea
                className={field}
                aria-label="Return reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {tab === 'return' && (
                <button
                  className={primary}
                  disabled={!can('sale.return') || !saleItemId || !quantity}
                  type="button"
                  onClick={() => void postReturn()}
                >
                  Post return
                </button>
              )}
            </div>
          </Panel>
          {tab === 'exchange' ? (
            <Panel title="Replacement sale and difference settlement">
              <div className="space-y-3">
                <input
                  className={field}
                  aria-label="Replacement product search"
                  value={replacementSearch}
                  onChange={(e) => setReplacementSearch(e.target.value)}
                  placeholder="Search replacement SKU, name or barcode"
                />
                <div className="max-h-40 space-y-2 overflow-auto">
                  {(replacementProducts.data?.items ?? []).map((row) => (
                    <button
                      type="button"
                      key={row.id}
                      onClick={() => {
                        setReplacement(row);
                        setReplacementUnitId(row.scannedUnitId || row.baseUnit.id);
                        setReplacementBatchId(
                          Array.isArray(row.availability) ? (row.availability[0]?.id ?? '') : '',
                        );
                      }}
                      className="block w-full rounded-lg border border-slate-700 p-2 text-left text-sm"
                    >
                      {row.sku} · {row.name}
                    </button>
                  ))}
                </div>
                {replacement && (
                  <>
                    <select
                      className={field}
                      aria-label="Replacement sale unit"
                      value={chosenUnitId}
                      onChange={(e) => setReplacementUnitId(e.target.value)}
                    >
                      {replacement.units.map((row) => (
                        <option key={row.unit.id} value={row.unit.id}>
                          {row.unit.code}
                        </option>
                      ))}
                    </select>
                    {Array.isArray(replacement.availability) && (
                      <select
                        className={field}
                        aria-label="Replacement batch shade"
                        value={replacementBatchId}
                        onChange={(e) => setReplacementBatchId(e.target.value)}
                      >
                        {replacement.availability.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.batchNumber} · Shade {row.shade ?? '—'}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      className={field}
                      aria-label="Replacement quantity"
                      value={replacementQuantity}
                      onChange={(e) => setReplacementQuantity(e.target.value)}
                    />
                    <p className="text-sm">
                      Configured unit price: <b>{chosenPrice || 'Unavailable'}</b>
                    </p>
                  </>
                )}
                <select
                  className={field}
                  aria-label="Exchange difference payment method"
                  value={activeMethodId}
                  onChange={(e) => setMethodId(e.target.value)}
                >
                  {(context.data?.paymentMethods ?? []).map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.code} · {row.name}
                    </option>
                  ))}
                </select>
                <input
                  className={field}
                  aria-label="Exchange customer payment"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Additional customer payment (0 if credit covers sale)"
                />
                <button
                  className={primary}
                  disabled={!can('sale.exchange') || !saleItemId || !replacement || !chosenPrice}
                  type="button"
                  onClick={postExchange}
                >
                  Post atomic exchange
                </button>
              </div>
            </Panel>
          ) : (
            <Panel title="Return consequences">
              <p className="text-sm text-slate-300">
                Receivable is reduced first. Only the remaining legitimate credit can be refunded.
                RESTOCK restores the immutable original base quantity to the exact batch/shade.
              </p>
            </Panel>
          )}
        </div>
      )}

      {tab === 'refund' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Refund approved return credit">
            <div className="space-y-3">
              <select
                className={field}
                aria-label="Return to refund"
                value={returnId}
                onChange={(e) => setReturnId(e.target.value)}
              >
                <option value="">Select return</option>
                {(returns.data?.items ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.returnNumber} · {row.customer.name} · credit {row.totalCredit} · due
                    applied {row.receivableApplied}
                  </option>
                ))}
              </select>
              <select
                className={field}
                aria-label="Refund method"
                value={activeMethodId}
                onChange={(e) => setMethodId(e.target.value)}
              >
                {(context.data?.paymentMethods ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </option>
                ))}
              </select>
              <input
                className={field}
                aria-label="Refund amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Refund amount"
              />
              <textarea
                className={field}
                aria-label="Refund reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                className={primary}
                disabled={!can('sale.refund') || !returnId || !amount}
                type="button"
                onClick={() => void postRefund()}
              >
                Post refund
              </button>
            </div>
          </Panel>
          <Panel title="Return and refund history">
            <div className="space-y-2">
              {(returns.data?.items ?? []).map((row) => (
                <div key={row.id} className="rounded-lg border border-slate-700 p-3 text-sm">
                  <b>{row.returnNumber}</b> · {row.sale.invoiceNumber}
                  <br />
                  Credit {row.totalCredit} · receivable applied {row.receivableApplied} · refunded{' '}
                  {row.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0).toFixed(4)}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
