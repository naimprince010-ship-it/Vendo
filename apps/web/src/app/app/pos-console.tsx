'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  BarcodeSearchInput,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Select,
  StatusBadge,
} from '@vendo/ui';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/auth-context';
import { useBranchContext } from '../../contexts/branch-context';
import {
  CartEmpty,
  CheckoutSummary,
  CustomerContext,
  HeldSaleItem,
  PaymentRow,
  PosCartRow,
  ProductResult,
  SaleHistoryDialog,
} from '../../features/pos/components';
import {
  checkoutPreview,
  configuredPrice,
  decimalAdd,
  decimalCompare,
  decimalMax,
  decimalSubtract,
  decimalSum,
} from '../../features/pos/decimal';
import type {
  CartLine,
  Customer,
  Page,
  PosContext,
  PosProduct,
  PricingMode,
  ProductFilter,
  Sale,
} from '../../features/pos/types';

type Api = <T>(path: string, init?: RequestInit) => Promise<T>;
type PendingAction = '' | 'hold' | 'resume' | 'complete';

const operationKey = () => `sale-ui-${crypto.randomUUID()}`;

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <Button variant={active ? 'secondary' : 'ghost'} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}

function PosSession({ branchId }: { branchId: string }) {
  const { authenticatedFetch, user } = useAuth();
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLSelectElement>(null);
  const paymentRef = useRef<HTMLInputElement>(null);
  const holdRef = useRef<HTMLButtonElement>(null);
  const completeRef = useRef<HTMLButtonElement>(null);
  const completionOperation = useRef<{ key: string; signature: string } | null>(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<PricingMode>('RETAIL');
  const [filter, setFilter] = useState<ProductFilter>('ALL');
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>('');

  const api: Api = async (path, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set('x-branch-id', branchId);
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
      setError(cause instanceof Error ? cause.message : 'The operation could not be completed.');
    }
  };

  const context = useQuery({
    queryKey: ['sales', 'context', branchId],
    queryFn: () => api<PosContext>('/sales/pos/context'),
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
    queryKey: ['sales', 'customers', branchId],
    queryFn: () => api<Customer[]>('/sales/pos/customers?limit=50'),
  });
  const products = useQuery({
    queryKey: ['sales', 'products', branchId, activeWarehouseId, search.trim()],
    queryFn: () =>
      api<{ items: PosProduct[] }>(
        `/sales/pos/products?warehouseId=${activeWarehouseId}&search=${encodeURIComponent(search.trim())}`,
      ),
    enabled: Boolean(activeWarehouseId && search.trim().length >= 2),
  });
  const held = useQuery({
    queryKey: ['sales', 'held', branchId],
    queryFn: () => api<Page<Sale>>('/sales?status=HELD&limit=20'),
  });
  const history = useQuery({
    queryKey: ['sales', 'history', branchId],
    queryFn: () => api<Page<Sale>>('/sales?status=COMPLETED&limit=25'),
  });
  const selectedSale = useQuery({
    queryKey: ['sales', 'detail', selectedSaleId],
    queryFn: () => api<Sale>(`/sales/${selectedSaleId}`),
    enabled: Boolean(selectedSaleId),
  });

  const activeCustomer = customers.data?.find((customer) => customer.id === activeCustomerId);
  const canDiscount = user?.permissions.includes('sale.discount') ?? false;
  const canOverridePrice = user?.permissions.includes('sale.override_price') ?? false;
  const filteredProducts = useMemo(
    () =>
      (products.data?.items ?? []).filter((product) => {
        if (filter === 'ALL') return true;
        if (filter === 'OTHER') return !['TILE', 'SANITARY'].includes(product.type);
        return product.type === filter;
      }),
    [filter, products.data?.items],
  );
  const preview = useMemo(
    () =>
      checkoutPreview(
        cart,
        invoiceDiscount,
        invoiceTax,
        [
          { methodId: activeMethodId, amount: paid, tendered },
          { methodId: activeSecondMethodId, amount: secondPaid, tendered: secondTendered },
        ],
        context.data?.paymentMethods ?? [],
      ),
    [
      activeMethodId,
      activeSecondMethodId,
      cart,
      context.data?.paymentMethods,
      invoiceDiscount,
      invoiceTax,
      paid,
      secondPaid,
      secondTendered,
      tendered,
    ],
  );
  const cashPaymentRequested = [
    { methodId: activeMethodId, amount: paid },
    { methodId: activeSecondMethodId, amount: secondPaid },
  ].some(
    (payment) =>
      decimalCompare(payment.amount || '0', '0') > 0 &&
      context.data?.paymentMethods.find((method) => method.id === payment.methodId)?.isCash,
  );
  const missingShift = cashPaymentRequested && !activeRegister?.cashShifts.length;
  const walkInDue = Boolean(activeCustomer?.isWalkIn && decimalCompare(preview.due, '0') > 0);
  const batchMissing = cart.some((line) => line.product.batchTracking && !line.batchId);

  const addProduct = (product: PosProduct) => {
    const unitId = product.scannedUnitId || product.baseUnit.id;
    const defaultBatch = Array.isArray(product.availability)
      ? product.availability.find((batch) => decimalCompare(batch.baseQuantity, '0') > 0)?.id || ''
      : '';
    setCart((rows) => {
      const index = rows.findIndex(
        (row) =>
          row.product.id === product.id && row.unitId === unitId && row.batchId === defaultBatch,
      );
      if (index >= 0) {
        return rows.map((row, current) =>
          current === index ? { ...row, quantity: decimalAdd(row.quantity, '1') } : row,
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
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const scan = async (event: FormEvent) => {
    event.preventDefault();
    if (!search.trim() || !activeWarehouseId) return;
    await run(async () => {
      const result = await api<{ items: PosProduct[] }>(
        `/sales/pos/products?warehouseId=${activeWarehouseId}&barcode=${encodeURIComponent(search.trim())}`,
      );
      if (!result.items[0]) throw new Error('No sellable product matches this barcode.');
      addProduct(result.items[0]);
    }, 'Barcode added to the current sale.');
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
    if (pendingAction) return;
    setPendingAction('hold');
    try {
      const result = await run(async () => {
        let id = draftId;
        if (id) {
          await api(`/sales/drafts/${id}`, { method: 'PUT', body: JSON.stringify(payload()) });
        } else {
          const draft = await api<Sale>('/sales/drafts', {
            method: 'POST',
            body: JSON.stringify(payload()),
          });
          id = draft.id;
        }
        return api<Sale>(`/sales/drafts/${id}/hold`, { method: 'POST' });
      }, 'Sale held without stock or financial effects.');
      if (result) {
        setDraftId('');
        setCart([]);
        setInvoiceDiscount('0');
        setInvoiceTax('0');
      }
    } finally {
      setPendingAction('');
    }
  };

  const resumeSale = async (id: string) => {
    if (pendingAction) return;
    setPendingAction('resume');
    try {
      const restored = await run(async () => {
        const sale = await api<Sale>(`/sales/drafts/${id}/resume`, { method: 'POST' });
        const restoredProducts = await Promise.all(
          (sale.items ?? []).map(async (line) => {
            const result = await api<{ items: PosProduct[] }>(
              `/sales/pos/products?warehouseId=${sale.warehouseId}&search=${encodeURIComponent(line.product.sku)}`,
            );
            return result.items.find((product) => product.id === line.productId);
          }),
        );
        if (restoredProducts.some((product) => !product)) {
          throw new Error('A held-sale product is no longer sellable.');
        }
        return { sale, products: restoredProducts as PosProduct[] };
      }, 'Held sale resumed. Prices and stock will be revalidated at completion.');
      if (!restored?.sale.items) return;
      setDraftId(restored.sale.id);
      setWarehouseId(restored.sale.warehouseId);
      setRegisterId(restored.sale.registerId);
      setCustomerId(restored.sale.customerId);
      setMode(restored.sale.pricingMode);
      setInvoiceDiscount(
        decimalMax(
          decimalSubtract(
            restored.sale.discount,
            decimalSum(restored.sale.items.map((line) => line.discount)),
          ),
        ),
      );
      setInvoiceTax(
        decimalMax(
          decimalSubtract(
            restored.sale.tax,
            decimalSum(restored.sale.items.map((line) => line.tax)),
          ),
        ),
      );
      setCart(
        restored.sale.items.map((line, index) => ({
          product: restored.products[index],
          unitId: line.unitId,
          batchId: line.batchId ?? '',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          tax: line.tax,
          overrideReason: line.priceOverrideReason ?? '',
        })),
      );
    } finally {
      setPendingAction('');
    }
  };

  const complete = async () => {
    if (pendingAction) return;
    const body = {
      ...payload(),
      draftSaleId: draftId || undefined,
      payments: [
        ...(decimalCompare(paid || '0', '0') > 0
          ? [{ methodId: activeMethodId, amount: paid, tendered: tendered || undefined }]
          : []),
        ...(decimalCompare(secondPaid || '0', '0') > 0
          ? [
              {
                methodId: activeSecondMethodId,
                amount: secondPaid,
                tendered: secondTendered || undefined,
              },
            ]
          : []),
      ],
    };
    const signature = JSON.stringify(body);
    const existing = completionOperation.current;
    const key = existing?.signature === signature ? existing.key : operationKey();
    completionOperation.current = { key, signature };
    setPendingAction('complete');
    try {
      const result = await run(
        () =>
          api<Sale>('/sales/complete', {
            method: 'POST',
            headers: { 'Idempotency-Key': key },
            body: signature,
          }),
        'Sale completed atomically.',
      );
      if (result) {
        completionOperation.current = null;
        setSelectedSaleId(result.id);
        setDraftId('');
        setCart([]);
        setPaid('0');
        setTendered('');
        setSecondPaid('0');
        setSecondTendered('');
        setInvoiceDiscount('0');
        setInvoiceTax('0');
      }
    } finally {
      setPendingAction('');
    }
  };

  const clearSale = () => {
    setCart([]);
    setDraftId('');
    setPaid('0');
    setTendered('');
    setSecondPaid('0');
    setSecondTendered('');
    setInvoiceDiscount('0');
    setInvoiceTax('0');
    setError('');
    setMessage('');
  };

  const handleKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'F2' || (event.altKey && event.key.toLowerCase() === 's')) {
      event.preventDefault();
      searchRef.current?.focus();
    } else if (event.key === 'F4') {
      event.preventDefault();
      customerRef.current?.focus();
    } else if (event.key === 'F6') {
      event.preventDefault();
      holdRef.current?.click();
    } else if (event.key === 'F8') {
      event.preventDefault();
      paymentRef.current?.focus();
    } else if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      completeRef.current?.click();
    }
  };

  return (
    <div
      className="-my-4 -mr-4 flex min-h-[calc(100vh-4rem)] flex-col bg-canvas p-3 sm:-my-6 sm:-mr-6 lg:-my-8 lg:-mr-8 xl:h-[calc(100vh-4rem)] xl:overflow-hidden"
      onKeyDown={handleKeyboard}
    >
      <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <strong className="text-sm">Point of Sale</strong>
          <span className="hidden text-text-muted sm:inline">·</span>
          <Select
            className="h-control-sm w-44"
            value={activeWarehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value);
              setCart([]);
            }}
            aria-label="POS warehouse"
          >
            {(context.data?.warehouses ?? []).map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} · {warehouse.name}
              </option>
            ))}
          </Select>
          <Select
            className="h-control-sm w-40"
            value={activeRegisterId}
            onChange={(event) => setRegisterId(event.target.value)}
            aria-label="POS register"
          >
            {(context.data?.registers ?? []).map((register) => (
              <option key={register.id} value={register.id}>
                {register.code} · {register.name}
              </option>
            ))}
          </Select>
          <StatusBadge tone={activeRegister?.cashShifts.length ? 'success' : 'danger'}>
            {activeRegister?.cashShifts.length ? 'Shift open' : 'No shift open'}
          </StatusBadge>
          {draftId ? <Badge tone="info">Resumed draft</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{held.data?.total ?? 0} held</Badge>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            Recent sales
          </Button>
        </div>
      </div>

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {context.isError ? (
        <Alert tone="danger">
          POS context could not be loaded. Your current sale was preserved.
        </Alert>
      ) : null}

      <div className="mt-3 grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(250px,0.82fr)_minmax(380px,1.18fr)_minmax(300px,0.9fr)]">
        <Card className="flex min-h-[480px] min-w-0 flex-col overflow-hidden xl:min-h-0">
          <div className="border-b border-divider p-3">
            <h2 className="mb-2 text-sm font-semibold">Find products</h2>
            <form className="flex gap-2" onSubmit={scan}>
              <BarcodeSearchInput
                ref={searchRef}
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Barcode, SKU, name, brand…"
                accessibleLabel="POS product search"
              />
              <Button type="submit" variant="outline" disabled={!search.trim()}>
                Exact
              </Button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1" aria-label="Product result filters">
              <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')}>
                All
              </FilterButton>
              <FilterButton active={filter === 'TILE'} onClick={() => setFilter('TILE')}>
                Tiles
              </FilterButton>
              <FilterButton active={filter === 'SANITARY'} onClick={() => setFilter('SANITARY')}>
                Sanitary
              </FilterButton>
              <FilterButton active={filter === 'OTHER'} onClick={() => setFilter('OTHER')}>
                Other
              </FilterButton>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {products.isFetching ? (
              <p className="py-8 text-center text-sm text-text-secondary" role="status">
                Searching products…
              </p>
            ) : products.isError ? (
              <Alert tone="danger">Search failed. The current sale was not changed.</Alert>
            ) : search.trim().length < 2 ? (
              <EmptyState
                className="min-h-48"
                title="Scanner ready"
                description="Scan an exact barcode or enter at least two characters to search. F2 focuses this field."
              />
            ) : filteredProducts.length ? (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <ProductResult
                    key={product.id}
                    product={product}
                    mode={mode}
                    onAdd={() => addProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No matching products"
                description="Try another SKU, name, brand, model, or barcode."
              />
            )}
          </div>
          <div className="border-t border-divider px-3 py-2 text-[11px] text-text-muted">
            F2 Search · Enter exact barcode · Scanner focus returns after add
          </div>
        </Card>

        <Card className="flex min-h-[560px] min-w-0 flex-col overflow-hidden xl:min-h-0">
          <div className="border-b border-divider p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Current sale</h2>
                <p className="text-xs text-text-muted">{cart.length} item lines</p>
              </div>
              <Button variant="ghost" size="sm" disabled={!cart.length} onClick={clearSale}>
                Clear
              </Button>
            </div>
            <FormField htmlFor="pos-customer" label="Customer">
              <Select
                ref={customerRef}
                id="pos-customer"
                aria-label="Customer"
                value={activeCustomerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                {(customers.data ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.code} · {customer.name}
                    {customer.isWalkIn ? ' (Walk-in)' : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="mt-2 flex items-center justify-between gap-3">
              <CustomerContext customer={activeCustomer} />
              <div className="flex shrink-0 rounded-md border border-border bg-surface p-1">
                {(['RETAIL', 'WHOLESALE'] as const).map((pricingMode) => (
                  <Button
                    key={pricingMode}
                    variant={mode === pricingMode ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setMode(pricingMode);
                      setCart((rows) =>
                        rows.map((line) => ({
                          ...line,
                          unitPrice: configuredPrice(line.product, line.unitId, pricingMode),
                        })),
                      );
                    }}
                  >
                    {pricingMode === 'RETAIL' ? 'Retail' : 'Wholesale'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-surface-secondary/60 p-3">
            {cart.length ? (
              <div className="space-y-2">
                {cart.map((line, index) => (
                  <PosCartRow
                    key={`${line.product.id}-${line.batchId}-${index}`}
                    index={index}
                    line={line}
                    mode={mode}
                    canDiscount={canDiscount}
                    canOverridePrice={canOverridePrice}
                    onChange={(patch) => updateLine(index, patch)}
                    onRemove={() =>
                      setCart((rows) => rows.filter((_, current) => current !== index))
                    }
                  />
                ))}
              </div>
            ) : (
              <CartEmpty />
            )}
          </div>
          <div className="border-t border-divider bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">Held sales</p>
                <p className="text-[11px] text-text-muted">Resume without stock reservation.</p>
              </div>
              <Button
                ref={holdRef}
                variant="outline"
                size="sm"
                loading={pendingAction === 'hold'}
                disabled={!cart.length || Boolean(pendingAction)}
                onClick={() => void holdSale()}
              >
                Hold sale · F6
              </Button>
            </div>
            {held.data?.items.length ? (
              <div className="mt-2 grid max-h-24 gap-2 overflow-y-auto sm:grid-cols-2">
                {held.data.items.map((sale) => (
                  <HeldSaleItem
                    key={sale.id}
                    sale={sale}
                    onResume={() => void resumeSale(sale.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="flex min-h-[620px] min-w-0 flex-col overflow-hidden xl:min-h-0">
          <div className="border-b border-divider px-4 py-3">
            <h2 className="text-sm font-semibold">Checkout</h2>
            <p className="text-xs text-text-muted">Preview only · API recalculates on completion</p>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <CheckoutSummary
              values={preview}
              invoiceDiscount={invoiceDiscount}
              invoiceTax={invoiceTax}
            />
            <div className="grid grid-cols-2 gap-2">
              {canDiscount ? (
                <FormField htmlFor="invoice-discount" label="Invoice discount">
                  <Input
                    id="invoice-discount"
                    inputMode="decimal"
                    value={invoiceDiscount}
                    onChange={(event) => setInvoiceDiscount(event.target.value)}
                  />
                </FormField>
              ) : null}
              <FormField htmlFor="invoice-tax" label="Invoice tax">
                <Input
                  id="invoice-tax"
                  inputMode="decimal"
                  value={invoiceTax}
                  onChange={(event) => setInvoiceTax(event.target.value)}
                />
              </FormField>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Payment methods
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPaid(preview.total);
                    setSecondPaid('0');
                    setSecondTendered('');
                  }}
                  disabled={!cart.length}
                >
                  Pay total
                </Button>
              </div>
              <div className="space-y-2">
                <PaymentRow
                  label="Payment 1"
                  methods={context.data?.paymentMethods ?? []}
                  methodId={activeMethodId}
                  amount={paid}
                  tendered={tendered}
                  amountRef={paymentRef}
                  onMethodChange={setMethodId}
                  onAmountChange={setPaid}
                  onTenderedChange={setTendered}
                />
                <PaymentRow
                  label="Payment 2 (optional)"
                  methods={context.data?.paymentMethods ?? []}
                  methodId={activeSecondMethodId}
                  amount={secondPaid}
                  tendered={secondTendered}
                  onMethodChange={setSecondMethodId}
                  onAmountChange={setSecondPaid}
                  onTenderedChange={setSecondTendered}
                />
              </div>
            </div>
            {missingShift ? (
              <Alert tone="warning">
                Open this register&apos;s cash shift before accepting cash.
              </Alert>
            ) : null}
            {walkInDue ? (
              <Alert tone="warning">Select a named customer before leaving an unpaid due.</Alert>
            ) : null}
            {batchMissing ? (
              <Alert tone="warning">Select the exact batch and shade for every tracked tile.</Alert>
            ) : null}
          </div>
          <div className="border-t border-divider bg-surface p-4">
            {selectedSale.data ? (
              <Alert tone="success" className="mb-3">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    Sale completed · <strong>{selectedSale.data.invoiceNumber}</strong>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                    View invoice
                  </Button>
                </div>
              </Alert>
            ) : null}
            <Button
              ref={completeRef}
              size="lg"
              className="w-full"
              loading={pendingAction === 'complete'}
              disabled={
                Boolean(pendingAction) ||
                !cart.length ||
                !activeWarehouseId ||
                !activeRegisterId ||
                !activeCustomerId ||
                missingShift ||
                walkInDue ||
                batchMissing
              }
              onClick={() => void complete()}
            >
              Complete sale · Ctrl+Enter
            </Button>
            <p className="mt-2 text-center text-[11px] text-text-muted">
              F2 Search · F4 Customer · F6 Hold · F8 Payment
            </p>
          </div>
        </Card>
      </div>

      <SaleHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        sales={history.data?.items ?? []}
        sale={selectedSale.data}
        onSelect={setSelectedSaleId}
      />
    </div>
  );
}

export function PosConsole() {
  const { activeBranchId } = useBranchContext();
  if (!activeBranchId) {
    return (
      <EmptyState
        title="Select an active branch"
        description="The POS needs a verified branch context before it can load warehouses and registers."
      />
    );
  }
  return <PosSession key={activeBranchId} branchId={activeBranchId} />;
}
