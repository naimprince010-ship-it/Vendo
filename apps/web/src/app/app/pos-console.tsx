'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/auth-context';

type Page<T> = { items: T[]; total: number };
type Branch = { id: string; code: string; name: string; isActive: boolean };
type Named = { id: string; code: string; name: string };
type Register = Named & { cashShifts: { id: string; cashierId: string; openedAt: string }[] };
type Customer = Named & { phone?: string | null; isWalkIn: boolean; creditLimit: string };
type PaymentMethod = Named & { isCash: boolean };
type Unit = Named & { decimalScale?: number };
type Price = { unitId: string; type: 'RETAIL' | 'WHOLESALE' | 'MINIMUM'; amount: string };
type Batch = {
  id: string;
  batchNumber: string;
  lotNumber: string | null;
  shade: string | null;
  baseQuantity: string;
};
type PosProduct = {
  id: string;
  sku: string;
  name: string;
  type: string;
  model: string | null;
  primaryBarcode: string | null;
  scannedUnitId: string;
  baseUnit: Unit;
  units: { unit: Unit; factorToBase: string }[];
  prices: Price[];
  batchTracking: boolean;
  trackInventory: boolean;
  availability: Batch[] | { baseQuantity: string | null };
  tile: { displaySize: string | null; color: string | null } | null;
};
type CartLine = {
  product: PosProduct;
  unitId: string;
  batchId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  tax: string;
  overrideReason: string;
};
type SaleLine = {
  id: string;
  productId: string;
  unitId: string;
  batchId: string | null;
  quantity: string;
  baseQuantity: string;
  configuredPrice: string;
  unitPrice: string;
  discount: string;
  tax: string;
  lineTotal: string;
  priceOverrideReason: string | null;
  product: PosProduct;
  unit: Unit;
  batch: Batch | null;
};
type Sale = {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'HELD' | 'COMPLETED';
  pricingMode: 'RETAIL' | 'WHOLESALE';
  warehouseId: string;
  registerId: string;
  customerId: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paid: string;
  due: string;
  change: string;
  saleDate: string;
  customer: Customer;
  register: Named;
  items?: SaleLine[];
  currentOutstanding?: string;
  lifecycleStatus?: string;
  paymentAllocations?: {
    amount: string;
    payment: {
      paymentNumber: string;
      direction: 'INBOUND' | 'OUTBOUND';
      method: Named;
    };
  }[];
  returns?: {
    id: string;
    returnNumber: string;
    kind: 'RETURN' | 'VOID';
    totalCredit: string;
    receivableApplied: string;
    refunds: { amount: string; payment: { paymentNumber: string; method: Named } }[];
    exchange: { exchangeNumber: string; creditApplied: string; difference: string } | null;
  }[];
};
type PosContext = {
  warehouses: Named[];
  registers: Register[];
  paymentMethods: PaymentMethod[];
  walkIn: Customer;
};
type Api = <T>(path: string, init?: RequestInit, branchId?: string) => Promise<T>;

const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400';
const primary =
  'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50';
const secondary = 'rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50';
const operationKey = () => `sale-ui-${crypto.randomUUID()}`;

function configuredPrice(product: PosProduct, unitId: string, mode: 'RETAIL' | 'WHOLESALE') {
  return product.prices.find((row) => row.unitId === unitId && row.type === mode)?.amount ?? '';
}

export function PosConsole() {
  const { authenticatedFetch } = useAuth();
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [mode, setMode] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [paid, setPaid] = useState('0');
  const [tendered, setTendered] = useState('');
  const [secondMethodId, setSecondMethodId] = useState('');
  const [secondPaid, setSecondPaid] = useState('0');
  const [secondTendered, setSecondTendered] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [invoiceTax, setInvoiceTax] = useState('0');
  const [draftId, setDraftId] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const api: Api = async (path, init = {}, activeBranch = branchId) => {
    const headers = new Headers(init.headers);
    if (activeBranch) headers.set('x-branch-id', activeBranch);
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
    return response.json() as Promise<never>;
  };
  const run = async <T,>(work: () => Promise<T>, success: string) => {
    setError('');
    setMessage('');
    try {
      const value = await work();
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      setMessage(success);
      return value;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    }
  };

  const branches = useQuery({
    queryKey: ['sales', 'branches'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100', {}, ''),
  });
  const activeBranchId = branchId || branches.data?.items.find((row) => row.isActive)?.id || '';
  const context = useQuery({
    queryKey: ['sales', 'context', activeBranchId],
    queryFn: () => api<PosContext>('/sales/pos/context', {}, activeBranchId),
    enabled: Boolean(activeBranchId),
  });
  const activeWarehouseId = warehouseId || context.data?.warehouses[0]?.id || '';
  const activeRegisterId = registerId || context.data?.registers[0]?.id || '';
  const activeRegister = context.data?.registers.find((row) => row.id === activeRegisterId);
  const activeCustomerId = customerId || context.data?.walkIn.id || '';
  const activeMethodId = methodId || context.data?.paymentMethods[0]?.id || '';
  const activeSecondMethodId =
    secondMethodId ||
    context.data?.paymentMethods.find((row) => row.id !== activeMethodId)?.id ||
    '';
  const customers = useQuery({
    queryKey: ['sales', 'customers', activeBranchId],
    queryFn: () => api<Customer[]>('/sales/pos/customers?limit=50', {}, activeBranchId),
    enabled: Boolean(activeBranchId),
  });
  const products = useQuery({
    queryKey: ['sales', 'products', activeBranchId, activeWarehouseId, debounced],
    queryFn: () =>
      api<{ items: PosProduct[] }>(
        `/sales/pos/products?warehouseId=${activeWarehouseId}&search=${encodeURIComponent(debounced)}`,
        {},
        activeBranchId,
      ),
    enabled: Boolean(activeBranchId && activeWarehouseId && debounced.length >= 2),
  });
  const held = useQuery({
    queryKey: ['sales', 'held', activeBranchId],
    queryFn: () => api<Page<Sale>>('/sales?status=HELD&limit=20', {}, activeBranchId),
    enabled: Boolean(activeBranchId),
  });
  const history = useQuery({
    queryKey: ['sales', 'history', activeBranchId],
    queryFn: () => api<Page<Sale>>('/sales?status=COMPLETED&limit=25', {}, activeBranchId),
    enabled: Boolean(activeBranchId),
  });
  const selectedSale = useQuery({
    queryKey: ['sales', 'detail', selectedSaleId],
    queryFn: () => api<Sale>(`/sales/${selectedSaleId}`, {}, activeBranchId),
    enabled: Boolean(selectedSaleId),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.altKey && event.key.toLowerCase() === 's') || event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);

  const estimate = useMemo(() => {
    const lines = cart.reduce(
      (sum, row) =>
        sum +
        Number(row.quantity || 0) * Number(row.unitPrice || 0) -
        Number(row.discount || 0) +
        Number(row.tax || 0),
      0,
    );
    return Math.max(0, lines - Number(invoiceDiscount || 0) + Number(invoiceTax || 0));
  }, [cart, invoiceDiscount, invoiceTax]);

  const addProduct = (product: PosProduct) => {
    const unitId = product.scannedUnitId || product.baseUnit.id;
    const defaultBatch = Array.isArray(product.availability)
      ? product.availability[0]?.id || ''
      : '';
    setCart((rows) => {
      const index = rows.findIndex(
        (row) =>
          row.product.id === product.id && row.unitId === unitId && row.batchId === defaultBatch,
      );
      if (index >= 0) {
        return rows.map((row, current) =>
          current === index ? { ...row, quantity: String(Number(row.quantity) + 1) } : row,
        );
      }
      return [
        ...rows,
        {
          product,
          unitId,
          batchId: defaultBatch,
          quantity: '1',
          unitPrice: configuredPrice(product, unitId, mode),
          discount: '0',
          tax: '0',
          overrideReason: '',
        },
      ];
    });
    setSearch('');
    setDebounced('');
    searchRef.current?.focus();
  };
  const scan = async (event: FormEvent) => {
    event.preventDefault();
    if (!search.trim() || !activeWarehouseId) return;
    await run(async () => {
      const result = await api<{ items: PosProduct[] }>(
        `/sales/pos/products?warehouseId=${activeWarehouseId}&barcode=${encodeURIComponent(search.trim())}`,
        {},
        activeBranchId,
      );
      if (!result.items[0]) throw new Error('Barcode not found');
      addProduct(result.items[0]);
    }, 'Barcode added to cart');
  };
  const updateLine = (index: number, patch: Partial<CartLine>) =>
    setCart((rows) => rows.map((row, current) => (current === index ? { ...row, ...patch } : row)));
  const payload = () => ({
    warehouseId: activeWarehouseId,
    registerId: activeRegisterId,
    customerId: activeCustomerId,
    pricingMode: mode,
    invoiceDiscount,
    invoiceTax,
    items: cart.map((row) => ({
      productId: row.product.id,
      unitId: row.unitId,
      batchId: row.batchId || undefined,
      quantity: row.quantity,
      requestedUnitPrice: row.unitPrice || undefined,
      priceOverrideReason: row.overrideReason || undefined,
      discount: row.discount,
      tax: row.tax,
    })),
  });
  const holdSale = async () => {
    const result = await run(async () => {
      let id = draftId;
      if (id) {
        await api(
          `/sales/drafts/${id}`,
          { method: 'PUT', body: JSON.stringify(payload()) },
          activeBranchId,
        );
      } else {
        const draft = await api<Sale>(
          '/sales/drafts',
          { method: 'POST', body: JSON.stringify(payload()) },
          activeBranchId,
        );
        id = draft.id;
      }
      return api<Sale>(`/sales/drafts/${id}/hold`, { method: 'POST' }, activeBranchId);
    }, 'Sale held without stock or financial effects');
    if (result) {
      setDraftId('');
      setCart([]);
    }
  };
  const resumeSale = async (id: string) => {
    const restored = await run(async () => {
      const sale = await api<Sale>(
        `/sales/drafts/${id}/resume`,
        { method: 'POST' },
        activeBranchId,
      );
      const products = await Promise.all(
        (sale.items ?? []).map(async (line) => {
          const result = await api<{ items: PosProduct[] }>(
            `/sales/pos/products?warehouseId=${sale.warehouseId}&search=${encodeURIComponent(line.product.sku)}`,
            {},
            activeBranchId,
          );
          return result.items.find((product) => product.id === line.productId);
        }),
      );
      if (products.some((product) => !product))
        throw new Error('A held-sale product is no longer sellable');
      return { sale, products: products as PosProduct[] };
    }, 'Held sale resumed; prices and stock will be revalidated at completion');
    if (!restored) return;
    const saleItems = restored.sale.items;
    if (!saleItems) return;
    const { sale, products: restoredProducts } = restored;
    setDraftId(sale.id);
    setWarehouseId(sale.warehouseId);
    setRegisterId(sale.registerId);
    setCustomerId(sale.customerId);
    setMode(sale.pricingMode);
    setCart(
      saleItems.map((row, index) => ({
        product: restoredProducts[index],
        unitId: row.unitId,
        batchId: row.batchId ?? '',
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        discount: row.discount,
        tax: row.tax,
        overrideReason: row.priceOverrideReason ?? '',
      })),
    );
  };
  const complete = async () => {
    const result = await run(
      () =>
        api<Sale>(
          '/sales/complete',
          {
            method: 'POST',
            headers: { 'Idempotency-Key': operationKey() },
            body: JSON.stringify({
              ...payload(),
              draftSaleId: draftId || undefined,
              payments: [
                ...(Number(paid) > 0
                  ? [
                      {
                        methodId: activeMethodId,
                        amount: paid,
                        tendered: tendered || undefined,
                      },
                    ]
                  : []),
                ...(Number(secondPaid) > 0
                  ? [
                      {
                        methodId: activeSecondMethodId,
                        amount: secondPaid,
                        tendered: secondTendered || undefined,
                      },
                    ]
                  : []),
              ],
            }),
          },
          activeBranchId,
        ),
      'Sale completed atomically',
    );
    if (result) {
      setSelectedSaleId(result.id);
      setDraftId('');
      setCart([]);
      setPaid('0');
      setTendered('');
      setSecondPaid('0');
      setSecondTendered('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <select
          className={`${field} max-w-xs`}
          aria-label="POS branch"
          value={activeBranchId}
          onChange={(event) => {
            setBranchId(event.target.value);
            setWarehouseId('');
            setRegisterId('');
            setCart([]);
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
        <select
          className={`${field} max-w-xs`}
          value={activeWarehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          aria-label="POS warehouse"
        >
          {(context.data?.warehouses ?? []).map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </select>
        <select
          className={`${field} max-w-xs`}
          value={activeRegisterId}
          onChange={(e) => setRegisterId(e.target.value)}
          aria-label="POS register"
        >
          {(context.data?.registers ?? []).map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </select>
        <span
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
            activeRegister?.cashShifts.length
              ? 'bg-emerald-950 text-emerald-300'
              : 'bg-rose-950 text-rose-300'
          }`}
        >
          {activeRegister?.cashShifts.length ? 'Shift open' : 'No shift open'}
        </span>
      </div>
      {message && (
        <p className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-300">{message}</p>
      )}
      {error && <p className="rounded-lg bg-rose-950 p-3 text-sm text-rose-300">{error}</p>}
      <div className="grid gap-4 xl:grid-cols-[1.7fr_0.85fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <form className="flex gap-2" onSubmit={scan}>
              <input
                ref={searchRef}
                autoFocus
                className={field}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Scan barcode or search SKU, name, brand, model, tile size… (Alt+S)"
                aria-label="POS product search"
              />
              <button className={primary}>Scan exact</button>
            </form>
            {debounced.length >= 2 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(products.data?.items ?? []).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="rounded-lg border border-slate-700 p-3 text-left hover:border-amber-400"
                  >
                    <b>{product.name}</b>
                    <span className="block text-xs text-slate-400">
                      {product.sku}{' '}
                      {product.tile?.displaySize ? `· ${product.tile.displaySize}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Cart</h2>
              <span className="text-xs text-slate-400">{cart.length} line(s)</span>
            </div>
            <div className="space-y-3">
              {cart.map((row, index) => {
                const batches = Array.isArray(row.product.availability)
                  ? row.product.availability
                  : [];
                return (
                  <div
                    key={`${row.product.id}-${row.batchId}-${index}`}
                    className="rounded-xl border border-slate-700 p-3"
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <b>{row.product.name}</b>
                        <p className="text-xs text-slate-400">
                          {row.product.sku}{' '}
                          {row.product.tile?.displaySize ? `· ${row.product.tile.displaySize}` : ''}
                        </p>
                      </div>
                      <button
                        className="text-sm text-rose-300"
                        onClick={() =>
                          setCart((items) => items.filter((_, current) => current !== index))
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-4">
                      <select
                        className={field}
                        aria-label="Sale unit"
                        value={row.unitId}
                        onChange={(e) =>
                          updateLine(index, {
                            unitId: e.target.value,
                            unitPrice: configuredPrice(row.product, e.target.value, mode),
                          })
                        }
                      >
                        {row.product.units.map(({ unit }) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.code}
                          </option>
                        ))}
                      </select>
                      <input
                        className={field}
                        aria-label="Sale quantity"
                        value={row.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                        placeholder="Quantity"
                      />
                      <input
                        className={field}
                        aria-label="Unit price"
                        value={row.unitPrice}
                        onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                        placeholder="Unit price"
                      />
                      <input
                        className={field}
                        aria-label="Line discount"
                        value={row.discount}
                        onChange={(e) => updateLine(index, { discount: e.target.value })}
                        placeholder="Discount"
                      />
                      {row.product.batchTracking && (
                        <select
                          className={`${field} md:col-span-2`}
                          aria-label="Sale batch and shade"
                          value={row.batchId}
                          onChange={(e) => updateLine(index, { batchId: e.target.value })}
                        >
                          <option value="">Select batch/shade</option>
                          {batches.map((batch) => (
                            <option key={batch.id} value={batch.id}>
                              {batch.batchNumber} · Shade {batch.shade ?? '—'} ·{' '}
                              {batch.baseQuantity} base available
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        className={field}
                        aria-label="Line tax"
                        value={row.tax}
                        onChange={(e) => updateLine(index, { tax: e.target.value })}
                        placeholder="Tax"
                      />
                      <input
                        className={`${field} md:col-span-2`}
                        aria-label="Price override reason"
                        value={row.overrideReason}
                        onChange={(e) => updateLine(index, { overrideReason: e.target.value })}
                        placeholder="Override reason when price differs"
                      />
                    </div>
                  </div>
                );
              })}
              {!cart.length && (
                <p className="py-8 text-center text-sm text-slate-400">
                  Scan or search to add products.
                </p>
              )}
            </div>
          </div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h2 className="font-semibold">Sale</h2>
            <select
              className={field}
              aria-label="Pricing mode"
              value={mode}
              onChange={(e) => {
                const next = e.target.value as 'RETAIL' | 'WHOLESALE';
                setMode(next);
                setCart((rows) =>
                  rows.map((row) => ({
                    ...row,
                    unitPrice: configuredPrice(row.product, row.unitId, next),
                  })),
                );
              }}
            >
              <option value="RETAIL">Retail pricing</option>
              <option value="WHOLESALE">Wholesale pricing</option>
            </select>
            <select
              className={field}
              aria-label="Customer"
              value={activeCustomerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              {(customers.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.code} · {row.name}
                  {row.isWalkIn ? ' (Walk-in)' : ''}
                </option>
              ))}
            </select>
            <input
              className={field}
              value={invoiceDiscount}
              onChange={(e) => setInvoiceDiscount(e.target.value)}
              placeholder="Invoice discount"
              aria-label="Invoice discount"
            />
            <input
              className={field}
              value={invoiceTax}
              onChange={(e) => setInvoiceTax(e.target.value)}
              placeholder="Invoice tax"
              aria-label="Invoice tax"
            />
            <div className="rounded-lg bg-slate-950 p-3">
              <p className="text-xs text-slate-400">Client estimate only — backend recalculates</p>
              <p className="text-2xl font-semibold">BDT {estimate.toFixed(2)}</p>
            </div>
            <select
              className={field}
              aria-label="Payment method"
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
              aria-label="Paid amount"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              placeholder="Applied payment"
            />
            <input
              className={field}
              aria-label="Cash tendered"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              placeholder="Cash tendered (cash only)"
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Optional second payment
            </p>
            <select
              className={field}
              aria-label="Second payment method"
              value={activeSecondMethodId}
              onChange={(e) => setSecondMethodId(e.target.value)}
            >
              {(context.data?.paymentMethods ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.code} · {row.name}
                </option>
              ))}
            </select>
            <input
              className={field}
              aria-label="Second paid amount"
              value={secondPaid}
              onChange={(e) => setSecondPaid(e.target.value)}
              placeholder="Second payment amount"
            />
            <input
              className={field}
              aria-label="Second cash tendered"
              value={secondTendered}
              onChange={(e) => setSecondTendered(e.target.value)}
              placeholder="Second cash tendered (cash only)"
            />
            <div className="flex flex-wrap gap-2">
              <button
                className={secondary}
                type="button"
                onClick={() => setPaid(estimate.toFixed(4))}
              >
                Pay estimate
              </button>
              <button
                className={secondary}
                disabled={!cart.length}
                type="button"
                onClick={() => void holdSale()}
              >
                Hold sale
              </button>
              <button
                className={primary}
                disabled={
                  !cart.length || !activeWarehouseId || !activeRegisterId || !activeCustomerId
                }
                type="button"
                onClick={() => void complete()}
              >
                Review & complete
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Register is required. Cash payments require an open register shift. Any unpaid
              remainder is customer receivable, never a fake payment method.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-2 font-semibold">Held sales</h2>
            {(held.data?.items ?? []).map((sale) => (
              <button
                className="mb-2 block w-full rounded-lg border border-slate-700 p-2 text-left"
                key={sale.id}
                onClick={() => void resumeSale(sale.id)}
              >
                {sale.invoiceNumber}
                <span className="block text-xs text-slate-400">
                  {sale.customer.name} · {sale.total}
                </span>
              </button>
            ))}
            {!held.data?.items.length && <p className="text-sm text-slate-400">No held sales.</p>}
          </div>
        </aside>
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">Sales history</h2>
          {(history.data?.items ?? []).map((sale) => (
            <button
              key={sale.id}
              onClick={() => setSelectedSaleId(sale.id)}
              className="mb-2 block w-full rounded-lg border border-slate-700 p-3 text-left"
            >
              <b>{sale.invoiceNumber}</b>
              <span className="block text-xs text-slate-400">
                {sale.customer.name} · Total {sale.total} · Paid {sale.paid} · Due {sale.due}
              </span>
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold">Receipt-ready sale detail</h2>
          {selectedSale.data ? (
            <div className="space-y-2">
              <p>
                <b>{selectedSale.data.invoiceNumber}</b> · {selectedSale.data.customer.name}
              </p>
              {selectedSale.data.items?.map((line) => (
                <div key={line.id} className="rounded-lg border border-slate-700 p-2">
                  <b>{line.product.name}</b>
                  <p className="text-xs text-slate-400">
                    {line.quantity} {line.unit.code} / {line.baseQuantity}{' '}
                    {line.product.baseUnit.code}
                    {line.batch
                      ? ` · Batch ${line.batch.batchNumber} / Shade ${line.batch.shade ?? '—'}`
                      : ''}
                  </p>
                  <p className="text-sm">
                    {line.unitPrice} × {line.quantity} · Discount {line.discount} · Tax {line.tax} ={' '}
                    {line.lineTotal}
                  </p>
                </div>
              ))}
              <p className="text-lg font-semibold">
                Total {selectedSale.data.total} · Paid {selectedSale.data.paid} · Due{' '}
                {selectedSale.data.due} · Change {selectedSale.data.change}
              </p>
              <p className="rounded-lg bg-slate-950 p-3 text-sm">
                Current status{' '}
                <b>{selectedSale.data.lifecycleStatus ?? selectedSale.data.status}</b> · Current
                outstanding{' '}
                <b>{selectedSale.data.currentOutstanding ?? selectedSale.data.due} BDT</b>
              </p>
              {!!selectedSale.data.paymentAllocations?.length && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Payment timeline</h3>
                  {selectedSale.data.paymentAllocations.map((allocation) => (
                    <p
                      key={`${allocation.payment.paymentNumber}-${allocation.amount}`}
                      className="mb-1 text-xs text-slate-300"
                    >
                      {allocation.payment.paymentNumber} · {allocation.amount} ·{' '}
                      {allocation.payment.method.name}
                    </p>
                  ))}
                </div>
              )}
              {!!selectedSale.data.returns?.length && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Returns, refunds and exchanges</h3>
                  {selectedSale.data.returns.map((saleReturn) => (
                    <div
                      key={saleReturn.id}
                      className="mb-2 rounded-lg border border-slate-700 p-2"
                    >
                      <p className="text-sm font-semibold">
                        {saleReturn.returnNumber} · {saleReturn.kind}
                      </p>
                      <p className="text-xs text-slate-300">
                        Credit {saleReturn.totalCredit} · Applied to due{' '}
                        {saleReturn.receivableApplied} · Refunded{' '}
                        {saleReturn.refunds
                          .reduce((sum, refund) => sum + Number(refund.amount), 0)
                          .toFixed(4)}
                      </p>
                      {saleReturn.exchange && (
                        <p className="text-xs text-amber-300">
                          {saleReturn.exchange.exchangeNumber} · Credit applied{' '}
                          {saleReturn.exchange.creditApplied} · Difference{' '}
                          {saleReturn.exchange.difference}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select a completed sale.</p>
          )}
        </div>
      </section>
    </div>
  );
}
