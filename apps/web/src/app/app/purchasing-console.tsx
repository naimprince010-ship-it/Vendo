'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';

type Page<T> = { items: T[]; total: number };
type Branch = { id: string; code: string; name: string; isActive: boolean };
type Warehouse = { id: string; branchId: string; code: string; name: string; isActive: boolean };
type Supplier = { id: string; code: string; name: string; isActive: boolean };
type Unit = { id: string; code: string; name: string };
type Product = { id: string; sku: string; name: string; batchTracking: boolean; baseUnit: Unit };
type OrderLine = {
  id: string;
  productId: string;
  unitId: string;
  quantity: string;
  baseQuantity: string;
  receivedBaseQuantity?: string;
  remainingBaseQuantity?: string;
  unitCost: string;
  product: Product;
  unit: Unit;
};
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  supplierId: string;
  warehouseId: string;
  orderDate?: string;
  notes?: string | null;
  supplier: Supplier;
  items?: OrderLine[];
};
type ReceiptLine = {
  id: string;
  productId: string;
  unitId: string;
  batchId: string | null;
  quantity: string;
  baseQuantity: string;
  unitCost: string;
  product: Product;
  unit: Unit;
};
type Receipt = {
  id: string;
  receiptNumber: string;
  supplierId: string;
  warehouseId: string;
  supplier: Supplier;
  items?: ReceiptLine[];
};
type InvoiceLine = {
  id: string;
  productId: string;
  unitId: string;
  receiptItemId: string | null;
  quantity: string;
  lineTotal: string;
  product: Product;
  unit: Unit;
};
type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  supplierId: string;
  supplier: Supplier;
  total: string;
  items?: InvoiceLine[];
};
type PaymentMethod = { id: string; code: string; name: string };
type SupplierPayment = {
  id: string;
  paymentNumber: string;
  amount: string;
  paidAt: string;
  reference: string | null;
  supplier: Supplier;
  method: PaymentMethod;
  purchaseAllocations: { invoiceId: string; amount: string }[];
};
type PurchaseReturn = {
  id: string;
  returnNumber: string;
  returnedAt: string;
  financialTotal: string;
  reason: string;
  supplier: Supplier;
};
type Tab = 'orders' | 'receipts' | 'invoices' | 'payments' | 'returns';
type Api = <T>(path: string, init?: RequestInit, branchId?: string) => Promise<T>;

const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400';
const primary =
  'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50';
const secondary = 'rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50';
const today = () => new Date().toISOString().slice(0, 10);
const key = () => `purchase-ui-${crypto.randomUUID()}`;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function PurchasingConsole() {
  const { user, authenticatedFetch } = useAuth();
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>('orders');
  const [branchId, setBranchId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const can = (permission: string) => Boolean(user?.permissions.includes(permission));
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
  const run = async (work: () => Promise<unknown>, success: string) => {
    setError('');
    setMessage('');
    try {
      await work();
      await client.invalidateQueries({ queryKey: ['purchase'] });
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    }
  };
  const branches = useQuery({
    queryKey: ['purchase', 'branches'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100', {}, ''),
  });
  const activeBranchId =
    branchId || branches.data?.items.find((branch) => branch.isActive)?.id || '';
  const warehouses = useQuery({
    queryKey: ['purchase', 'warehouses'],
    queryFn: () => api<Page<Warehouse>>('/warehouses?limit=100', {}, ''),
  });
  const suppliers = useQuery({
    queryKey: ['purchase', 'suppliers'],
    queryFn: () => api<Page<Supplier>>('/suppliers?limit=100', {}, ''),
    enabled: can('supplier.view'),
  });
  const products = useQuery({
    queryKey: ['purchase', 'products'],
    queryFn: () => api<Page<Product>>('/products?limit=100', {}, ''),
    enabled: can('product.view'),
  });
  const units = useQuery({
    queryKey: ['purchase', 'units'],
    queryFn: () => api<Page<Unit>>('/units?limit=100', {}, ''),
    enabled: can('unit.view'),
  });
  const orders = useQuery({
    queryKey: ['purchase', 'orders', activeBranchId],
    queryFn: () => api<Page<Order>>('/purchases/orders?limit=100', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('purchase.view')),
  });
  const receipts = useQuery({
    queryKey: ['purchase', 'receipts', activeBranchId],
    queryFn: () => api<Page<Receipt>>('/purchases/receipts?limit=100', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('purchase.view')),
  });
  const invoices = useQuery({
    queryKey: ['purchase', 'invoices', activeBranchId],
    queryFn: () => api<Page<Invoice>>('/purchases/invoices?limit=100', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('purchase.view')),
  });
  const payments = useQuery({
    queryKey: ['purchase', 'payments', activeBranchId],
    queryFn: () => api<Page<SupplierPayment>>('/purchases/payments?limit=100', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('supplier.payment.view')),
  });
  const returns = useQuery({
    queryKey: ['purchase', 'returns', activeBranchId],
    queryFn: () => api<Page<PurchaseReturn>>('/purchases/returns?limit=100', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('purchase.view')),
  });
  const order = useQuery({
    queryKey: ['purchase', 'order', selectedOrderId],
    queryFn: () => api<Order>(`/purchases/orders/${selectedOrderId}`, {}, activeBranchId),
    enabled: Boolean(selectedOrderId),
  });
  const receipt = useQuery({
    queryKey: ['purchase', 'receipt', selectedReceiptId],
    queryFn: () => api<Receipt>(`/purchases/receipts/${selectedReceiptId}`, {}, activeBranchId),
    enabled: Boolean(selectedReceiptId),
  });
  const invoice = useQuery({
    queryKey: ['purchase', 'invoice', selectedInvoiceId],
    queryFn: () => api<Invoice>(`/purchases/invoices/${selectedInvoiceId}`, {}, activeBranchId),
    enabled: Boolean(selectedInvoiceId),
  });
  const methods = useQuery({
    queryKey: ['purchase', 'methods'],
    queryFn: () => api<PaymentMethod[]>('/purchases/payment-methods', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('supplier.payment.view')),
  });
  const context = {
    api,
    run,
    branchId: activeBranchId,
    warehouses: (warehouses.data?.items ?? []).filter(
      (w) => w.branchId === activeBranchId && w.isActive,
    ),
    suppliers: (suppliers.data?.items ?? []).filter((s) => s.isActive),
    products: products.data?.items ?? [],
    units: units.data?.items ?? [],
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${field} max-w-xs`}
          aria-label="Purchasing branch"
          value={activeBranchId}
          onChange={(event) => {
            setBranchId(event.target.value);
            setSelectedOrderId('');
            setSelectedReceiptId('');
            setSelectedInvoiceId('');
          }}
        >
          {(branches.data?.items ?? [])
            .filter((b) => b.isActive)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} · {b.name}
              </option>
            ))}
        </select>
        {(['orders', 'receipts', 'invoices', 'payments', 'returns'] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={tab === item ? primary : secondary}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {message && (
        <p className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-300">{message}</p>
      )}
      {error && <p className="rounded-lg bg-rose-950 p-3 text-sm text-rose-300">{error}</p>}
      {!activeBranchId ? (
        <Card title="Purchasing">
          <p className="text-sm text-slate-400">Select an active branch.</p>
        </Card>
      ) : tab === 'orders' ? (
        <OrdersPanel
          {...context}
          orders={orders.data?.items ?? []}
          selected={order.data}
          select={setSelectedOrderId}
        />
      ) : tab === 'receipts' ? (
        <ReceiptsPanel
          {...context}
          orders={orders.data?.items ?? []}
          selectedOrder={order.data}
          receipts={receipts.data?.items ?? []}
          selectOrder={setSelectedOrderId}
          selectReceipt={setSelectedReceiptId}
        />
      ) : tab === 'invoices' ? (
        <InvoicesPanel
          {...context}
          receipts={receipts.data?.items ?? []}
          selectedReceipt={receipt.data}
          invoices={invoices.data?.items ?? []}
          selectReceipt={setSelectedReceiptId}
          selectInvoice={setSelectedInvoiceId}
        />
      ) : tab === 'payments' ? (
        <PaymentsPanel
          {...context}
          invoices={invoices.data?.items ?? []}
          methods={methods.data ?? []}
          payments={payments.data?.items ?? []}
        />
      ) : (
        <ReturnsPanel
          {...context}
          receipts={receipts.data?.items ?? []}
          invoices={invoices.data?.items ?? []}
          returns={returns.data?.items ?? []}
          selectedReceipt={receipt.data}
          selectedInvoice={invoice.data}
          selectReceipt={setSelectedReceiptId}
          selectInvoice={setSelectedInvoiceId}
        />
      )}
    </div>
  );
}

type Context = {
  api: Api;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  branchId: string;
  warehouses: Warehouse[];
  suppliers: Supplier[];
  products: Product[];
  units: Unit[];
};

function OrdersPanel({
  api,
  run,
  branchId,
  warehouses,
  suppliers,
  products,
  units,
  orders,
  selected,
  select,
}: Context & { orders: Order[]; selected?: Order; select: (id: string) => void }) {
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [cost, setCost] = useState('0');
  const [notes, setNotes] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () =>
        api(
          '/purchases/orders',
          {
            method: 'POST',
            body: JSON.stringify({
              supplierId,
              warehouseId,
              orderDate: today(),
              items: [{ productId, unitId, quantity, unitCost: cost }],
              notes: notes || undefined,
            }),
          },
          branchId,
        ),
      'Purchase order created',
    );
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <Card title="Create purchase order">
        <form className="space-y-3" onSubmit={submit}>
          <Select label="Supplier" value={supplierId} set={setSupplierId} options={suppliers} />
          <Select label="Warehouse" value={warehouseId} set={setWarehouseId} options={warehouses} />
          <Select
            label="Product"
            value={productId}
            set={(id) => {
              setProductId(id);
              const product = products.find((p) => p.id === id);
              if (product) setUnitId(product.baseUnit.id);
            }}
            options={products}
          />
          <Select label="Purchase unit" value={unitId} set={setUnitId} options={units} />
          <input
            className={field}
            aria-label="Order quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
          />
          <input
            className={field}
            aria-label="Unit cost"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Unit cost"
          />
          <input
            className={field}
            aria-label="Order notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
          />
          <button
            className={primary}
            disabled={!supplierId || !warehouseId || !productId || !unitId}
          >
            Create draft PO
          </button>
        </form>
        <div className="mt-5 space-y-2">
          {orders.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => select(row.id)}
              className="block w-full rounded-lg border border-slate-800 p-3 text-left hover:border-amber-400"
            >
              <b>{row.orderNumber}</b>
              <span className="block text-xs text-slate-400">
                {row.supplier.name} · {row.status} · {row.total}
              </span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Purchase order detail">
        {!selected ? (
          <p className="text-sm text-slate-400">Select a purchase order.</p>
        ) : (
          <div className="space-y-3">
            <p>
              <b>{selected.orderNumber}</b> · {selected.status} · Total {selected.total}
            </p>
            {selected.items?.map((line) => (
              <div key={line.id} className="rounded-lg border border-slate-800 p-3">
                <b>{line.product.name}</b>
                <p className="text-sm text-slate-400">
                  Ordered {line.quantity} {line.unit.code} · received base{' '}
                  {line.receivedBaseQuantity} · remaining base {line.remainingBaseQuantity}
                </p>
              </div>
            ))}
            <div className="flex gap-2">
              {selected.status === 'DRAFT' && selected.items?.[0] && (
                <button
                  className={secondary}
                  onClick={() =>
                    void run(
                      () =>
                        api(
                          `/purchases/orders/${selected.id}`,
                          {
                            method: 'PUT',
                            body: JSON.stringify({
                              supplierId: selected.supplierId,
                              warehouseId: selected.warehouseId,
                              orderDate: selected.orderDate ?? today(),
                              notes: notes || selected.notes || undefined,
                              items: selected.items!.map((line) => ({
                                productId: line.productId,
                                unitId: line.unitId,
                                quantity: line.quantity,
                                unitCost: line.unitCost,
                              })),
                            }),
                          },
                          branchId,
                        ),
                      'Draft PO updated',
                    )
                  }
                >
                  Update draft notes
                </button>
              )}
              {selected.status === 'DRAFT' && (
                <button
                  className={primary}
                  onClick={() =>
                    void run(
                      () =>
                        api(
                          `/purchases/orders/${selected.id}/submit`,
                          { method: 'POST' },
                          branchId,
                        ),
                      'PO submitted',
                    )
                  }
                >
                  Submit
                </button>
              )}
              {selected.status === 'SUBMITTED' && (
                <button
                  className={primary}
                  onClick={() =>
                    void run(
                      () =>
                        api(
                          `/purchases/orders/${selected.id}/confirm`,
                          { method: 'POST' },
                          branchId,
                        ),
                      'PO confirmed',
                    )
                  }
                >
                  Confirm
                </button>
              )}
              {['DRAFT', 'SUBMITTED'].includes(selected.status) && (
                <button
                  className={secondary}
                  onClick={() =>
                    void run(
                      () =>
                        api(
                          `/purchases/orders/${selected.id}/cancel`,
                          { method: 'POST' },
                          branchId,
                        ),
                      'PO cancelled',
                    )
                  }
                >
                  Cancel
                </button>
              )}
              {selected.status === 'RECEIVED' && (
                <button
                  className={secondary}
                  onClick={() =>
                    void run(
                      () =>
                        api(`/purchases/orders/${selected.id}/close`, { method: 'POST' }, branchId),
                      'PO closed',
                    )
                  }
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ReceiptsPanel({
  api,
  run,
  branchId,
  orders,
  selectedOrder,
  receipts,
  selectOrder,
  selectReceipt,
}: Context & {
  orders: Order[];
  selectedOrder?: Order;
  receipts: Receipt[];
  selectOrder: (id: string) => void;
  selectReceipt: (id: string) => void;
}) {
  const [lineId, setLineId] = useState('');
  const [qty, setQty] = useState('1');
  const [batch, setBatch] = useState('');
  const [lot, setLot] = useState('');
  const [shade, setShade] = useState('');
  const open = orders.filter((o) => ['APPROVED', 'PARTIALLY_RECEIVED'].includes(o.status));
  const line = selectedOrder?.items?.find((x) => x.id === lineId);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Receive goods">
        <Select
          label="Confirmed PO"
          value={selectedOrder?.id ?? ''}
          set={selectOrder}
          options={open.map((o) => ({ id: o.id, name: `${o.orderNumber} · ${o.supplier.name}` }))}
        />
        <Select
          label="PO line"
          value={lineId}
          set={setLineId}
          options={(selectedOrder?.items ?? []).map((x) => ({
            id: x.id,
            name: `${x.product.name} · remaining base ${x.remainingBaseQuantity}`,
          }))}
        />
        <input
          className={`${field} mt-3`}
          aria-label="Receiving quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Receiving quantity"
        />
        {line?.product.batchTracking && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              className={field}
              aria-label="Batch number"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="Batch"
            />
            <input
              className={field}
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              placeholder="Lot"
            />
            <input
              className={field}
              value={shade}
              onChange={(e) => setShade(e.target.value)}
              placeholder="Shade"
            />
          </div>
        )}
        <button
          className={`${primary} mt-3`}
          disabled={!selectedOrder || !line}
          onClick={() =>
            line &&
            void run(
              () =>
                api(
                  '/purchases/receipts',
                  {
                    method: 'POST',
                    headers: { 'Idempotency-Key': key() },
                    body: JSON.stringify({
                      orderId: selectedOrder!.id,
                      warehouseId: selectedOrder!.warehouseId,
                      receivedAt: new Date().toISOString(),
                      items: [
                        {
                          orderItemId: line.id,
                          unitId: line.unitId,
                          quantity: qty,
                          batchNumber: batch || undefined,
                          lotNumber: lot || undefined,
                          shade: shade || undefined,
                        },
                      ],
                    }),
                  },
                  branchId,
                ),
              'Goods receipt posted atomically',
            )
          }
        >
          Post goods receipt
        </button>
      </Card>
      <Card title="Goods receipt history">
        <div className="space-y-2">
          {receipts.map((r) => (
            <button
              key={r.id}
              onClick={() => selectReceipt(r.id)}
              className="block w-full rounded-lg border border-slate-800 p-3 text-left"
            >
              <b>{r.receiptNumber}</b>
              <span className="block text-xs text-slate-400">{r.supplier.name}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function InvoicesPanel({
  api,
  run,
  branchId,
  receipts,
  selectedReceipt,
  invoices,
  selectReceipt,
  selectInvoice,
}: Context & {
  receipts: Receipt[];
  selectedReceipt?: Receipt;
  invoices: Invoice[];
  selectReceipt: (id: string) => void;
  selectInvoice: (id: string) => void;
}) {
  const [lineId, setLineId] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('0');
  const [reference, setReference] = useState('');
  const line = selectedReceipt?.items?.find((x) => x.id === lineId);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Create supplier invoice">
        <Select
          label="Goods receipt"
          value={selectedReceipt?.id ?? ''}
          set={selectReceipt}
          options={receipts.map((r) => ({
            id: r.id,
            name: `${r.receiptNumber} · ${r.supplier.name}`,
          }))}
        />
        <Select
          label="Receipt line"
          value={lineId}
          set={(id) => {
            setLineId(id);
            const item = selectedReceipt?.items?.find((x) => x.id === id);
            if (item) {
              setQty(item.quantity);
              setCost(item.unitCost);
            }
          }}
          options={(selectedReceipt?.items ?? []).map((x) => ({
            id: x.id,
            name: `${x.product.name} · received ${x.quantity} ${x.unit.code}`,
          }))}
        />
        <input
          className={`${field} mt-3`}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Supplier invoice reference"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            className={field}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Invoice quantity"
          />
          <input
            className={field}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Unit cost"
          />
        </div>
        <button
          className={`${primary} mt-3`}
          disabled={!line}
          onClick={() =>
            line &&
            void run(
              () =>
                api(
                  '/purchases/invoices',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      supplierId: selectedReceipt!.supplierId,
                      receiptId: selectedReceipt!.id,
                      supplierInvoiceNumber: reference || undefined,
                      invoiceDate: today(),
                      items: [
                        {
                          receiptItemId: line.id,
                          productId: line.productId,
                          unitId: line.unitId,
                          quantity: qty,
                          unitCost: cost,
                        },
                      ],
                    }),
                  },
                  branchId,
                ),
              'Supplier invoice draft created',
            )
          }
        >
          Create invoice draft
        </button>
      </Card>
      <Card title="Supplier invoices">
        <div className="space-y-2">
          {invoices.map((i) => (
            <div key={i.id} className="rounded-lg border border-slate-800 p-3">
              <button onClick={() => selectInvoice(i.id)} className="text-left">
                <b>{i.invoiceNumber}</b>
                <span className="block text-xs text-slate-400">
                  {i.supplier.name} · {i.status} · {i.total}
                </span>
              </button>
              {i.status === 'DRAFT' && (
                <button
                  className={`${primary} mt-2`}
                  onClick={() =>
                    void run(
                      () =>
                        api(
                          `/purchases/invoices/${i.id}/post`,
                          { method: 'POST', headers: { 'Idempotency-Key': key() } },
                          branchId,
                        ),
                      'Supplier invoice posted to payable ledger',
                    )
                  }
                >
                  Post invoice
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PaymentsPanel({
  api,
  run,
  branchId,
  suppliers,
  invoices,
  methods,
  payments,
}: Context & { invoices: Invoice[]; methods: PaymentMethod[]; payments: SupplierPayment[] }) {
  const [supplierId, setSupplierId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('0');
  const [reference, setReference] = useState('');
  const eligible = invoices.filter(
    (i) => i.supplierId === supplierId && ['POSTED', 'PARTIALLY_PAID'].includes(i.status),
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Post supplier payment">
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Supplier" value={supplierId} set={setSupplierId} options={suppliers} />
          <Select label="Payment method" value={methodId} set={setMethodId} options={methods} />
          <Select
            label="Invoice (optional for advance)"
            value={invoiceId}
            set={setInvoiceId}
            options={eligible.map((i) => ({ id: i.id, name: `${i.invoiceNumber} · ${i.total}` }))}
            optional
          />
          <input
            className={field}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Payment amount"
          />
          <input
            className={field}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference"
          />
        </div>
        <button
          className={`${primary} mt-3`}
          disabled={!supplierId || !methodId}
          onClick={() =>
            void run(
              () =>
                api(
                  '/purchases/payments',
                  {
                    method: 'POST',
                    headers: { 'Idempotency-Key': key() },
                    body: JSON.stringify({
                      supplierId,
                      methodId,
                      amount,
                      paidAt: new Date().toISOString(),
                      reference: reference || undefined,
                      allocations: invoiceId ? [{ invoiceId, amount }] : [],
                    }),
                  },
                  branchId,
                ),
              invoiceId
                ? 'Partial/full supplier payment posted'
                : 'Unapplied supplier advance posted',
            )
          }
        >
          Post payment
        </button>
        <p className="mt-3 text-xs text-slate-400">
          Cash drawer effects are intentionally deferred to Phase 11.
        </p>
      </Card>
      <Card title="Supplier payment history">
        <div className="space-y-2">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-lg border border-slate-800 p-3">
              <b>{payment.paymentNumber}</b>
              <p className="text-sm text-slate-400">
                {payment.supplier.name} · {payment.amount} · {payment.method.code}
              </p>
              <p className="text-xs text-slate-500">
                {payment.purchaseAllocations.length
                  ? `${payment.purchaseAllocations.length} invoice allocation(s)`
                  : 'Unapplied supplier advance'}
              </p>
            </div>
          ))}
          {!payments.length && <p className="text-sm text-slate-400">No supplier payments yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function ReturnsPanel({
  api,
  run,
  branchId,
  receipts,
  invoices,
  returns,
  selectedReceipt,
  selectedInvoice,
  selectReceipt,
  selectInvoice,
}: Context & {
  receipts: Receipt[];
  invoices: Invoice[];
  returns: PurchaseReturn[];
  selectedReceipt?: Receipt;
  selectedInvoice?: Invoice;
  selectReceipt: (id: string) => void;
  selectInvoice: (id: string) => void;
}) {
  const [receiptLineId, setReceiptLineId] = useState('');
  const [invoiceLineId, setInvoiceLineId] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  const receiptLine = selectedReceipt?.items?.find((x) => x.id === receiptLineId);
  const matchingInvoices = invoices.filter(
    (i) => i.supplierId === selectedReceipt?.supplierId && i.status !== 'DRAFT',
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Post purchase return">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Goods receipt"
            value={selectedReceipt?.id ?? ''}
            set={selectReceipt}
            options={receipts.map((r) => ({
              id: r.id,
              name: `${r.receiptNumber} · ${r.supplier.name}`,
            }))}
          />
          <Select
            label="Receipt line"
            value={receiptLineId}
            set={setReceiptLineId}
            options={(selectedReceipt?.items ?? []).map((x) => ({
              id: x.id,
              name: `${x.product.name} · ${x.quantity} ${x.unit.code}`,
            }))}
          />
          <Select
            label="Posted invoice (optional)"
            value={selectedInvoice?.id ?? ''}
            set={selectInvoice}
            options={matchingInvoices.map((i) => ({ id: i.id, name: i.invoiceNumber }))}
            optional
          />
          <Select
            label="Invoice line for financial credit"
            value={invoiceLineId}
            set={setInvoiceLineId}
            options={(selectedInvoice?.items ?? [])
              .filter((x) => x.receiptItemId === receiptLineId)
              .map((x) => ({ id: x.id, name: `${x.product.name} · ${x.lineTotal}` }))}
            optional
          />
          <input
            className={field}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Return quantity"
          />
          <input
            className={field}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Return reason"
          />
        </div>
        <button
          className={`${primary} mt-3`}
          disabled={
            !receiptLine || reason.length < 3 || (Boolean(selectedInvoice) && !invoiceLineId)
          }
          onClick={() =>
            receiptLine &&
            void run(
              () =>
                api(
                  '/purchases/returns',
                  {
                    method: 'POST',
                    headers: { 'Idempotency-Key': key() },
                    body: JSON.stringify({
                      receiptId: selectedReceipt!.id,
                      invoiceId: selectedInvoice?.id || undefined,
                      returnedAt: new Date().toISOString(),
                      reason,
                      items: [
                        {
                          receiptItemId: receiptLine.id,
                          invoiceItemId: invoiceLineId || undefined,
                          unitId: receiptLine.unitId,
                          quantity: qty,
                        },
                      ],
                    }),
                  },
                  branchId,
                ),
              selectedInvoice
                ? 'Inventory and supplier credit returned atomically'
                : 'Received-only inventory return posted',
            )
          }
        >
          Post purchase return
        </button>
      </Card>
      <Card title="Purchase return history">
        <div className="space-y-2">
          {returns.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-800 p-3">
              <b>{row.returnNumber}</b>
              <p className="text-sm text-slate-400">
                {row.supplier.name} · supplier credit {row.financialTotal}
              </p>
              <p className="text-xs text-slate-500">{row.reason}</p>
            </div>
          ))}
          {!returns.length && <p className="text-sm text-slate-400">No purchase returns yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function Select({
  label,
  value,
  set,
  options,
  optional = false,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  options: Array<{ id: string; name: string; code?: string }>;
  optional?: boolean;
}) {
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <select
        className={`${field} mt-1`}
        value={value}
        onChange={(event) => set(event.target.value)}
      >
        <option value="">{optional ? 'None' : `Select ${label.toLowerCase()}`}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.code ? `${option.code} · ` : ''}
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
