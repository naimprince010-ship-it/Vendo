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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  MoneyDisplay,
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
import {
  GoodsReceiptEditor,
  PurchaseOrderEditor,
  PurchaseReturnEditor,
  SupplierInvoiceEditor,
  SupplierPaymentEditor,
} from './operations';
import { PurchasingProvider, usePurchasing } from './purchasing-context';
import {
  documentStatusTone,
  invoiceFinancials,
  orderStatusLabel,
  paymentAllocationSummary,
  productBaseUnitCode,
} from './presentation';
import type {
  GoodsReceipt,
  Page,
  PurchaseInvoice,
  PurchaseOrder,
  PurchaseReturn,
  SupplierPayment,
} from './types';

const ROOT = '/app/purchases';
const PAGE_SIZE = 20;

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

function PurchasingNav() {
  const path = usePathname();
  const { can } = usePurchasing();
  const links = [
    [`${ROOT}/orders`, 'Purchase orders', 'purchase.view'],
    [`${ROOT}/receipts`, 'Goods receipts', 'purchase.view'],
    [`${ROOT}/invoices`, 'Supplier invoices', 'purchase.view'],
    [`${ROOT}/payments`, 'Payments', 'supplier.payment.view'],
    [`${ROOT}/returns`, 'Returns', 'purchase.view'],
  ] as const;
  return (
    <nav
      aria-label="Purchasing sections"
      className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
    >
      {links
        .filter(([, , permission]) => can(permission))
        .map(([href, label]) => {
          const active =
            path === href ||
            path.startsWith(`${href}/`) ||
            (href.endsWith('/orders') && path === ROOT);
          return (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${active ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:bg-neutral-hover hover:text-text-primary'}`}
            >
              {label}
            </Link>
          );
        })}
    </nav>
  );
}

export function PurchasingWorkspace() {
  return (
    <PurchasingProvider>
      <PurchasingRouter />
    </PurchasingProvider>
  );
}

function PurchasingRouter() {
  const path = usePathname();
  const { branchId, branchName, can } = usePurchasing();
  const parts = path.slice(ROOT.length).split('/').filter(Boolean);
  const denied = <EmptyState title="You do not have permission for this purchasing action" />;
  let content: ReactNode;
  if (!parts.length || (parts[0] === 'orders' && !parts[1])) content = <OrderList />;
  else if (parts[0] === 'orders' && parts[1] === 'new')
    content = can('purchase.create') ? <PurchaseOrderEditor /> : denied;
  else if (parts[0] === 'orders' && parts[2] === 'edit')
    content = can('purchase.edit') ? <OrderEditorLoader id={parts[1]!} /> : denied;
  else if (parts[0] === 'orders') content = <OrderDetail id={parts[1]!} />;
  else if (parts[0] === 'receipts' && !parts[1]) content = <ReceiptList />;
  else if (parts[0] === 'receipts' && parts[1] === 'new')
    content = can('purchase.receive') ? <GoodsReceiptEditor initialOrderId={parts[2]} /> : denied;
  else if (parts[0] === 'receipts') content = <ReceiptDetail id={parts[1]!} />;
  else if (parts[0] === 'invoices' && !parts[1]) content = <InvoiceList />;
  else if (parts[0] === 'invoices' && parts[1] === 'new')
    content = can('purchase.invoice') ? (
      <SupplierInvoiceEditor initialReceiptId={parts[2]} />
    ) : (
      denied
    );
  else if (parts[0] === 'invoices') content = <InvoiceDetail id={parts[1]!} />;
  else if (parts[0] === 'payments' && !parts[1])
    content = can('supplier.payment.view') ? <PaymentList /> : denied;
  else if (parts[0] === 'payments' && parts[1] === 'new')
    content = can('supplier.payment.create') ? (
      <SupplierPaymentEditor initialSupplierId={parts[2]} />
    ) : (
      denied
    );
  else if (parts[0] === 'payments')
    content = can('supplier.payment.view') ? (
      <PaymentDetail documentNumber={decodeURIComponent(parts[1]!)} />
    ) : (
      denied
    );
  else if (parts[0] === 'returns' && !parts[1]) content = <ReturnList />;
  else if (parts[0] === 'returns' && parts[1] === 'new')
    content = can('purchase.return') ? (
      <PurchaseReturnEditor initialReceiptId={parts[2]} />
    ) : (
      denied
    );
  else if (parts[0] === 'returns')
    content = <ReturnDetail documentNumber={decodeURIComponent(parts[1]!)} />;
  else content = <EmptyState title="Purchasing route not found" />;
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PurchasingNav />
      {!branchId ? (
        <Alert tone="warning">Select an accessible branch before working with purchasing.</Alert>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <span className="text-text-muted">Purchasing scope</span>
          <strong className="text-text-primary">{branchName}</strong>
        </div>
      )}
      {branchId ? content : null}
    </div>
  );
}

function useListFilters() {
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [page, setPage] = useState(1);
  return {
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    supplierId,
    setSupplierId: (value: string) => {
      setSupplierId(value);
      setPage(1);
    },
    page,
    setPage,
  };
}

function ListFilters({
  search,
  setSearch,
  supplierId,
  setSupplierId,
  status,
  setStatus,
  statuses,
}: {
  search: string;
  setSearch(value: string): void;
  supplierId: string;
  setSupplierId(value: string): void;
  status?: string;
  setStatus?(value: string): void;
  statuses?: Array<[string, string]>;
}) {
  const { suppliers } = usePurchasing();
  return (
    <Card>
      <CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-3">
        <SearchInput
          placeholder="Search document number or supplier"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          aria-label="Supplier filter"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">All suppliers</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.code} · {supplier.name}
            </option>
          ))}
        </Select>
        {statuses && setStatus ? (
          <Select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ListResult({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error?: Error | null;
  empty: boolean;
  children: ReactNode;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState description={error.message} />;
  if (empty) return <EmptyState title="No purchasing documents found" />;
  return children;
}

function OrderList() {
  const { api, branchId, can } = usePurchasing();
  const filters = useListFilters();
  const [status, setStatusState] = useState('');
  const setStatus = (value: string) => {
    setStatusState(value);
    filters.setPage(1);
  };
  const params = new URLSearchParams({ page: String(filters.page), limit: String(PAGE_SIZE) });
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.supplierId) params.set('supplierId', filters.supplierId);
  if (status) params.set('orderStatus', status);
  const query = useQuery({
    queryKey: ['purchasing', 'orders', branchId, params.toString()],
    queryFn: () => api<Page<PurchaseOrder>>(`/purchases/orders?${params}`),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Purchasing"
        title="Purchase orders"
        description="Plan supplier commitments without changing stock or payable balances."
        actions={
          can('purchase.create') ? (
            <Link href={`${ROOT}/orders/new`}>
              <Button>Create purchase order</Button>
            </Link>
          ) : undefined
        }
      />
      <Alert tone="info">
        A confirmed purchase order does not increase inventory. Stock changes only when a Goods
        Receipt is posted.
      </Alert>
      <ListFilters
        search={filters.search}
        setSearch={filters.setSearch}
        supplierId={filters.supplierId}
        setSupplierId={filters.setSupplierId}
        status={status}
        setStatus={setStatus}
        statuses={[
          'DRAFT',
          'SUBMITTED',
          'APPROVED',
          'PARTIALLY_RECEIVED',
          'RECEIVED',
          'CLOSED',
          'CANCELLED',
        ].map((value) => [value, orderStatusLabel(value)])}
      />
      <ListResult loading={query.isLoading} error={query.error} empty={!query.data?.items.length}>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO / supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order / expected</TableHead>
                <TableHead numeric>Total</TableHead>
                <TableHead>Receiving</TableHead>
                <TableHead>
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`${ROOT}/orders/${order.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-text-muted">
                      {order.supplier.code} · {order.supplier.name}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={documentStatusTone(order.status)}>
                      {orderStatusLabel(order.status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {new Date(order.orderDate).toLocaleDateString()}
                    <p className="text-xs text-text-muted">
                      Expected{' '}
                      {order.expectedAt
                        ? new Date(order.expectedAt).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </TableCell>
                  <TableCell numeric>
                    <MoneyDisplay value={order.total} currency="BDT" />
                  </TableCell>
                  <TableCell>
                    {order._count?.receipts ?? 0} receipt(s)
                    <p className="text-xs text-text-muted">{order._count?.items ?? 0} line(s)</p>
                  </TableCell>
                  <TableCell>
                    <Link href={`${ROOT}/orders/${order.id}`}>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListResult>
      {query.data ? (
        <Pagination
          currentPage={filters.page}
          pageCount={pages}
          totalItems={query.data.total}
          onPrevious={filters.page > 1 ? () => filters.setPage(filters.page - 1) : undefined}
          onNext={filters.page < pages ? () => filters.setPage(filters.page + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

function OrderEditorLoader({ id }: { id: string }) {
  const { api } = usePurchasing();
  const query = useQuery({
    queryKey: ['purchasing', 'order', id],
    queryFn: () => api<PurchaseOrder>(`/purchases/orders/${id}`),
  });
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState description={query.error.message} />;
  return query.data ? (
    <PurchaseOrderEditor order={query.data} />
  ) : (
    <EmptyState title="Purchase order not found" />
  );
}

function OrderDetail({ id }: { id: string }) {
  const { api, can, products, refresh } = usePurchasing();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['purchasing', 'order', id],
    queryFn: () => api<PurchaseOrder>(`/purchases/orders/${id}`),
  });
  const [action, setAction] = useState<'submit' | 'confirm' | 'cancel' | 'close' | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState description={query.error.message} />;
  const order = query.data;
  if (!order) return <EmptyState title="Purchase order not found" />;
  const transition = async () => {
    if (!action) return;
    setBusy(true);
    setError('');
    try {
      await api(`/purchases/orders/${order.id}/${action}`, { method: 'POST' });
      await client.invalidateQueries({ queryKey: ['purchasing'] });
      await refresh();
      setAction('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PO transition failed.');
    } finally {
      setBusy(false);
    }
  };
  const actionLabel = {
    submit: 'Submit for approval',
    confirm: 'Confirm purchase order',
    cancel: 'Cancel purchase order',
    close: 'Close purchase order',
    '': '',
  }[action];
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Heading
        eyebrow="Purchasing · Purchase order"
        title={order.orderNumber}
        description={`${order.supplier.name} · ${new Date(order.orderDate).toLocaleDateString()}`}
        actions={
          <>
            <Link href={`${ROOT}/orders`}>
              <Button variant="outline">Back</Button>
            </Link>
            {order.status === 'DRAFT' && can('purchase.edit') ? (
              <Link href={`${ROOT}/orders/${id}/edit`}>
                <Button variant="outline">Edit draft</Button>
              </Link>
            ) : null}
            {['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status) &&
            can('purchase.receive') ? (
              <Link href={`${ROOT}/receipts/new/${id}`}>
                <Button>Receive goods</Button>
              </Link>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Summary label="Status">
          <StatusBadge tone={documentStatusTone(order.status)}>
            {orderStatusLabel(order.status)}
          </StatusBadge>
        </Summary>
        <Summary label="Supplier">
          <p className="font-semibold">{order.supplier.name}</p>
          <p className="text-xs text-text-muted">{order.supplier.code}</p>
        </Summary>
        <Summary label="Intended warehouse">
          <p className="font-semibold">{order.warehouse?.name}</p>
          <p className="text-xs text-text-muted">{order.warehouse?.code}</p>
        </Summary>
        <Summary label="Total">
          <MoneyDisplay value={order.total} currency="BDT" className="text-xl font-bold" />
        </Summary>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ordered and received</CardTitle>
          <CardDescription>
            Progress uses backend base quantities; no frontend inventory assumption is made.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead numeric>Ordered</TableHead>
                  <TableHead numeric>Received base</TableHead>
                  <TableHead numeric>Remaining base</TableHead>
                  <TableHead numeric>Unit cost</TableHead>
                  <TableHead numeric>Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order.items ?? []).map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-semibold">
                      {line.product.name}
                      <p className="text-xs text-text-muted">
                        {line.product.sku}
                        {line.product.tileProfile?.displaySize
                          ? ` · ${line.product.tileProfile.displaySize}`
                          : ''}
                      </p>
                    </TableCell>
                    <TableCell numeric>
                      {line.quantity} {line.unit.code}
                    </TableCell>
                    <TableCell numeric>
                      {line.receivedBaseQuantity} {productBaseUnitCode(line.productId, products)}
                    </TableCell>
                    <TableCell numeric className="font-bold">
                      {line.remainingBaseQuantity} {productBaseUnitCode(line.productId, products)}
                    </TableCell>
                    <TableCell numeric>{line.unitCost} BDT</TableCell>
                    <TableCell numeric>{line.lineTotal} BDT</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Related goods receipts</CardTitle>
            <CardDescription>PO → physical receipt history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.receipts?.length ? (
              order.receipts.map((receipt) => (
                <Link
                  key={receipt.id}
                  href={`${ROOT}/receipts/${receipt.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-neutral-hover"
                >
                  <span className="font-semibold text-primary">{receipt.receiptNumber}</span>
                  <span className="text-xs text-text-muted">
                    {new Date(receipt.receivedAt).toLocaleDateString()}
                  </span>
                </Link>
              ))
            ) : (
              <EmptyState title="No goods received yet" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Document totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <TotalRow label="Subtotal" value={order.subtotal} />
            <TotalRow label="Discount" value={order.discount} />
            <TotalRow label="Tax" value={order.tax} />
            <TotalRow label="Freight" value={order.freight} />
            <TotalRow label="Grand total" value={order.total} strong />
          </CardContent>
        </Card>
      </div>
      {can('purchase.approve') ? (
        <div className="flex flex-wrap justify-end gap-2">
          {order.status === 'DRAFT' ? (
            <Button onClick={() => setAction('submit')}>Submit</Button>
          ) : null}
          {order.status === 'SUBMITTED' ? (
            <Button onClick={() => setAction('confirm')}>Confirm PO</Button>
          ) : null}
          {['DRAFT', 'SUBMITTED'].includes(order.status) ? (
            <Button variant="danger" onClick={() => setAction('cancel')}>
              Cancel PO
            </Button>
          ) : null}
          {order.status === 'RECEIVED' ? (
            <Button variant="outline" onClick={() => setAction('close')}>
              Close PO
            </Button>
          ) : null}
        </div>
      ) : null}
      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionLabel}?</DialogTitle>
            <DialogDescription>
              The backend validates the current lifecycle state and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-neutral-soft p-4 text-sm">
            <strong>{order.orderNumber}</strong>
            <p className="mt-1 text-text-secondary">
              Current status: {orderStatusLabel(order.status)}
            </p>
            {action === 'confirm' ? (
              <p className="mt-2 text-text-secondary">
                Confirmation still has no inventory effect.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction('')} disabled={busy}>
              Go back
            </Button>
            <Button
              variant={action === 'cancel' ? 'danger' : 'primary'}
              loading={busy}
              onClick={() => void transition()}
            >
              {actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptList() {
  const { api, branchId, can } = usePurchasing();
  const f = useListFilters();
  const params = new URLSearchParams({ page: String(f.page), limit: String(PAGE_SIZE) });
  if (f.search.trim()) params.set('search', f.search.trim());
  if (f.supplierId) params.set('supplierId', f.supplierId);
  const q = useQuery({
    queryKey: ['purchasing', 'receipts', branchId, params.toString()],
    queryFn: () => api<Page<GoodsReceipt>>(`/purchases/receipts?${params}`),
  });
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Purchasing"
        title="Goods receipts"
        description="Physical receipt history with explicit warehouse and batch/shade traceability."
        actions={
          can('purchase.receive') ? (
            <Link href={`${ROOT}/receipts/new`}>
              <Button>Receive goods</Button>
            </Link>
          ) : undefined
        }
      />
      <ListFilters
        search={f.search}
        setSearch={f.setSearch}
        supplierId={f.supplierId}
        setSupplierId={f.setSupplierId}
      />
      <ListResult loading={q.isLoading} error={q.error} empty={!q.data?.items.length}>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GR / supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`${ROOT}/receipts/${r.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {r.receiptNumber}
                    </Link>
                    <p className="text-xs text-text-muted">{r.supplier.name}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={documentStatusTone(r.status)}>{r.status}</StatusBadge>
                  </TableCell>
                  <TableCell>{new Date(r.receivedAt).toLocaleString()}</TableCell>
                  <TableCell>{r._count?.items ?? 0} line(s)</TableCell>
                  <TableCell>
                    <Link href={`${ROOT}/receipts/${r.id}`}>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListResult>
      {q.data ? (
        <Pagination
          currentPage={f.page}
          pageCount={pages}
          totalItems={q.data.total}
          onPrevious={f.page > 1 ? () => f.setPage(f.page - 1) : undefined}
          onNext={f.page < pages ? () => f.setPage(f.page + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

function ReceiptDetail({ id }: { id: string }) {
  const { api, can, products } = usePurchasing();
  const q = useQuery({
    queryKey: ['purchasing', 'receipt', id],
    queryFn: () => api<GoodsReceipt>(`/purchases/receipts/${id}`),
  });
  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState description={q.error.message} />;
  const receipt = q.data;
  if (!receipt) return <EmptyState title="Goods receipt not found" />;
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Purchasing · Goods receipt"
        title={receipt.receiptNumber}
        description={`${receipt.supplier.name} · Posted ${new Date(receipt.receivedAt).toLocaleString()}`}
        actions={
          <>
            <Link href={`${ROOT}/receipts`}>
              <Button variant="outline">Back</Button>
            </Link>
            {can('purchase.invoice') ? (
              <Link href={`${ROOT}/invoices/new/${receipt.id}`}>
                <Button>Create invoice</Button>
              </Link>
            ) : null}
            {can('purchase.return') ? (
              <Link href={`${ROOT}/returns/new/${receipt.id}`}>
                <Button variant="outline">Return goods</Button>
              </Link>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Summary label="Status">
          <StatusBadge tone={documentStatusTone(receipt.status)}>{receipt.status}</StatusBadge>
        </Summary>
        <Summary label="Warehouse">
          <p className="font-semibold">{receipt.warehouse?.name}</p>
          <p className="text-xs text-text-muted">{receipt.warehouse?.code}</p>
        </Summary>
        <Summary label="Related PO">
          <Link
            href={`${ROOT}/orders/${receipt.orderId}`}
            className="font-semibold text-primary hover:underline"
          >
            Open purchase order
          </Link>
        </Summary>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Received lines</CardTitle>
          <CardDescription>
            These quantities increased inventory through immutable purchase-receipt movements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead numeric>Transaction quantity</TableHead>
                  <TableHead numeric>Base quantity</TableHead>
                  <TableHead>Batch / lot / shade</TableHead>
                  <TableHead numeric>Cost snapshot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(receipt.items ?? []).map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-semibold">
                      {line.product.name}
                      <p className="text-xs text-text-muted">{line.product.sku}</p>
                    </TableCell>
                    <TableCell numeric>
                      {line.quantity} {line.unit.code}
                    </TableCell>
                    <TableCell numeric>
                      {line.baseQuantity} {productBaseUnitCode(line.productId, products)}
                      <p className="text-xs text-text-muted">Factor × {line.conversionFactor}</p>
                    </TableCell>
                    <TableCell>
                      {line.batch ? (
                        <>
                          <span className="font-mono font-semibold">{line.batch.batchNumber}</span>
                          <p className="text-xs text-text-muted">
                            Lot {line.batch.lotNumber ?? '—'} · Shade {line.batch.shade ?? '—'}
                          </p>
                        </>
                      ) : (
                        'Not batch tracked'
                      )}
                    </TableCell>
                    <TableCell numeric>{line.unitCost} BDT</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceList() {
  const { api, branchId, can } = usePurchasing();
  const f = useListFilters();
  const [status, setStatusState] = useState('');
  const setStatus = (v: string) => {
    setStatusState(v);
    f.setPage(1);
  };
  const params = new URLSearchParams({ page: String(f.page), limit: String(PAGE_SIZE) });
  if (f.search.trim()) params.set('search', f.search.trim());
  if (f.supplierId) params.set('supplierId', f.supplierId);
  if (status) params.set('invoiceStatus', status);
  const q = useQuery({
    queryKey: ['purchasing', 'invoices', branchId, params.toString()],
    queryFn: () => api<Page<PurchaseInvoice>>(`/purchases/invoices?${params}`),
  });
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Purchasing"
        title="Supplier invoices"
        description="Draft and posted supplier obligations remain visibly distinct."
        actions={
          can('purchase.invoice') ? (
            <Link href={`${ROOT}/invoices/new`}>
              <Button>Create invoice draft</Button>
            </Link>
          ) : undefined
        }
      />
      <ListFilters
        search={f.search}
        setSearch={f.setSearch}
        supplierId={f.supplierId}
        setSupplierId={f.setSupplierId}
        status={status}
        setStatus={setStatus}
        statuses={['DRAFT', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'VOIDED'].map((v) => [
          v,
          v.toLowerCase().replace(/_/g, ' '),
        ])}
      />
      <ListResult loading={q.isLoading} error={q.error} empty={!q.data?.items.length}>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice / supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date / due</TableHead>
                <TableHead numeric>Total</TableHead>
                <TableHead numeric>Paid</TableHead>
                <TableHead numeric>Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.items.map((invoice) => {
                const f = invoiceFinancials(
                  invoice.total,
                  invoice.paymentAllocations,
                  invoice.returns,
                );
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`${ROOT}/invoices/${invoice.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="text-xs text-text-muted">
                        {invoice.supplier.name}
                        {invoice.supplierInvoiceNumber ? ` · ${invoice.supplierInvoiceNumber}` : ''}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={documentStatusTone(invoice.status)}>
                        {invoice.status.replace(/_/g, ' ')}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                      <p className="text-xs text-text-muted">
                        Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
                      </p>
                    </TableCell>
                    <TableCell numeric>{invoice.total} BDT</TableCell>
                    <TableCell numeric>{f.paid} BDT</TableCell>
                    <TableCell numeric className="font-bold">
                      {f.outstanding} BDT
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ListResult>
      {q.data ? (
        <Pagination
          currentPage={f.page}
          pageCount={pages}
          totalItems={q.data.total}
          onPrevious={f.page > 1 ? () => f.setPage(f.page - 1) : undefined}
          onNext={f.page < pages ? () => f.setPage(f.page + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

function InvoiceDetail({ id }: { id: string }) {
  const { api, can, refresh } = usePurchasing();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ['purchasing', 'invoice', id],
    queryFn: () => api<PurchaseInvoice>(`/purchases/invoices/${id}`),
  });
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState description={q.error.message} />;
  const invoice = q.data;
  if (!invoice) return <EmptyState title="Invoice not found" />;
  const finance = invoiceFinancials(invoice.total, invoice.paymentAllocations, invoice.returns);
  const post = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/purchases/invoices/${invoice.id}/post`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `purchase-ui-${crypto.randomUUID()}` },
      });
      await client.invalidateQueries({ queryKey: ['purchasing'] });
      await refresh();
      setReview(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invoice posting failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Heading
        eyebrow="Purchasing · Supplier invoice"
        title={invoice.invoiceNumber}
        description={`${invoice.supplier.name}${invoice.supplierInvoiceNumber ? ` · Supplier ref ${invoice.supplierInvoiceNumber}` : ''}`}
        actions={
          <>
            <Link href={`${ROOT}/invoices`}>
              <Button variant="outline">Back</Button>
            </Link>
            {invoice.status === 'DRAFT' && can('purchase.invoice') ? (
              <Button onClick={() => setReview(true)}>Post invoice</Button>
            ) : null}
            {['POSTED', 'PARTIALLY_PAID'].includes(invoice.status) &&
            can('supplier.payment.create') ? (
              <Link href={`${ROOT}/payments/new/${invoice.supplierId}`}>
                <Button>Pay supplier</Button>
              </Link>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Summary label="Status">
          <StatusBadge tone={documentStatusTone(invoice.status)}>
            {invoice.status.replace(/_/g, ' ')}
          </StatusBadge>
        </Summary>
        <Summary label="Total">
          <MoneyDisplay
            value={invoice.total}
            currency={invoice.currencyCode}
            className="text-xl font-bold"
          />
        </Summary>
        <Summary label="Paid / credited">
          <p className="font-mono font-bold">
            {finance.paid} / {finance.credited} BDT
          </p>
        </Summary>
        <Summary label="Outstanding">
          <p className="font-mono text-xl font-bold">{finance.outstanding} BDT</p>
        </Summary>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invoice lines</CardTitle>
          <CardDescription>
            Historical quantity, conversion, cost, discount and tax snapshots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead numeric>Quantity</TableHead>
                  <TableHead numeric>Unit cost</TableHead>
                  <TableHead numeric>Discount</TableHead>
                  <TableHead numeric>Tax</TableHead>
                  <TableHead numeric>Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.items ?? []).map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-semibold">
                      {line.product.name}
                      <p className="text-xs text-text-muted">{line.product.sku}</p>
                    </TableCell>
                    <TableCell numeric>
                      {line.quantity} {line.unit.code}
                    </TableCell>
                    <TableCell numeric>{line.unitCost}</TableCell>
                    <TableCell numeric>{line.discount}</TableCell>
                    <TableCell numeric>{line.tax}</TableCell>
                    <TableCell numeric className="font-bold">
                      {line.lineTotal} BDT
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Related documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoice.orderId ? (
              <RelatedLink href={`${ROOT}/orders/${invoice.orderId}`} label="Purchase order" />
            ) : null}
            {invoice.receiptId ? (
              <RelatedLink href={`${ROOT}/receipts/${invoice.receiptId}`} label="Goods receipt" />
            ) : null}
            {invoice.paymentAllocations?.map((row) =>
              row.payment ? (
                <RelatedLink
                  key={row.payment.id}
                  href={`${ROOT}/payments/${encodeURIComponent(row.payment.paymentNumber)}`}
                  label={`Payment ${row.payment.paymentNumber}`}
                />
              ) : null,
            )}
            {invoice.returns?.map((row) =>
              row.returnNumber ? (
                <RelatedLink
                  key={row.returnNumber}
                  href={`${ROOT}/returns/${encodeURIComponent(row.returnNumber)}`}
                  label={`Return ${row.returnNumber}`}
                />
              ) : null,
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Financial totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <TotalRow label="Subtotal" value={invoice.subtotal} />
            <TotalRow label="Discount" value={invoice.discount} />
            <TotalRow label="Tax" value={invoice.tax} />
            <TotalRow label="Freight" value={invoice.freight} />
            <TotalRow label="Additional costs" value={invoice.additionalCost} />
            <TotalRow label="Grand total" value={invoice.total} strong />
          </CardContent>
        </Card>
      </div>
      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post supplier invoice?</DialogTitle>
            <DialogDescription>
              Posting creates the supplier payable entry and makes financial amounts immutable.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-neutral-soft p-4">
            <strong>{invoice.invoiceNumber}</strong>
            <p>
              {invoice.total} {invoice.currencyCode} · {invoice.supplier.name}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReview(false)} disabled={busy}>
              Go back
            </Button>
            <Button loading={busy} onClick={() => void post()}>
              Post invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentList() {
  const { api, branchId, can } = usePurchasing();
  const f = useListFilters();
  const params = new URLSearchParams({ page: String(f.page), limit: String(PAGE_SIZE) });
  if (f.search.trim()) params.set('search', f.search.trim());
  if (f.supplierId) params.set('supplierId', f.supplierId);
  const q = useQuery({
    queryKey: ['purchasing', 'payments', branchId, params.toString()],
    queryFn: () => api<Page<SupplierPayment>>(`/purchases/payments?${params}`),
  });
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Purchasing"
        title="Supplier payments"
        description="Trace allocated invoice payments and explicit unapplied supplier advances."
        actions={
          can('supplier.payment.create') ? (
            <Link href={`${ROOT}/payments/new`}>
              <Button>Post supplier payment</Button>
            </Link>
          ) : undefined
        }
      />
      <ListFilters
        search={f.search}
        setSearch={f.setSearch}
        supplierId={f.supplierId}
        setSupplierId={f.setSupplierId}
      />
      <ListResult loading={q.isLoading} error={q.error} empty={!q.data?.items.length}>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment / supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead numeric>Total paid</TableHead>
                <TableHead numeric>Allocated</TableHead>
                <TableHead numeric>Unapplied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.items.map((payment) => {
                const s = paymentAllocationSummary(payment.amount, payment.purchaseAllocations);
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Link
                        href={`${ROOT}/payments/${encodeURIComponent(payment.paymentNumber)}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {payment.paymentNumber}
                      </Link>
                      <p className="text-xs text-text-muted">{payment.supplier.name}</p>
                    </TableCell>
                    <TableCell>{new Date(payment.paidAt).toLocaleString()}</TableCell>
                    <TableCell>{payment.method.name}</TableCell>
                    <TableCell numeric>{payment.amount} BDT</TableCell>
                    <TableCell numeric>{s.allocated} BDT</TableCell>
                    <TableCell numeric className="font-bold">
                      {s.unapplied} BDT
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ListResult>
      {q.data ? (
        <Pagination
          currentPage={f.page}
          pageCount={pages}
          totalItems={q.data.total}
          onPrevious={f.page > 1 ? () => f.setPage(f.page - 1) : undefined}
          onNext={f.page < pages ? () => f.setPage(f.page + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

function PaymentDetail({ documentNumber }: { documentNumber: string }) {
  const { api } = usePurchasing();
  const q = useQuery({
    queryKey: ['purchasing', 'payment-number', documentNumber],
    queryFn: () =>
      api<Page<SupplierPayment>>(
        `/purchases/payments?limit=10&search=${encodeURIComponent(documentNumber)}`,
      ),
  });
  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState description={q.error.message} />;
  const payment = q.data?.items.find((item) => item.paymentNumber === documentNumber);
  if (!payment) return <EmptyState title="Supplier payment not found" />;
  const summary = paymentAllocationSummary(payment.amount, payment.purchaseAllocations);
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Purchasing · Supplier payment"
        title={payment.paymentNumber}
        description={`${payment.supplier.name} · ${new Date(payment.paidAt).toLocaleString()}`}
        actions={
          <Link href={`${ROOT}/payments`}>
            <Button variant="outline">Back</Button>
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Summary label="Method">
          <p className="font-semibold">{payment.method.name}</p>
        </Summary>
        <Summary label="Total paid">
          <p className="font-mono text-xl font-bold">{payment.amount} BDT</p>
        </Summary>
        <Summary label="Allocated">
          <p className="font-mono text-xl font-bold">{summary.allocated} BDT</p>
        </Summary>
        <Summary label="Unapplied advance">
          <p className="font-mono text-xl font-bold">{summary.unapplied} BDT</p>
        </Summary>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invoice allocations</CardTitle>
          <CardDescription>Immutable allocation history for this payment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {payment.purchaseAllocations.length ? (
            payment.purchaseAllocations.map((row) => (
              <RelatedLink
                key={row.invoiceId}
                href={`${ROOT}/invoices/${row.invoiceId}`}
                label={`Invoice allocation · ${row.amount} BDT`}
              />
            ))
          ) : (
            <Alert tone="info">
              No invoice allocation. The payment is retained as supplier advance.
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReturnList() {
  const { api, branchId, can } = usePurchasing();
  const f = useListFilters();
  const params = new URLSearchParams({ page: String(f.page), limit: String(PAGE_SIZE) });
  if (f.search.trim()) params.set('search', f.search.trim());
  if (f.supplierId) params.set('supplierId', f.supplierId);
  const q = useQuery({
    queryKey: ['purchasing', 'returns', branchId, params.toString()],
    queryFn: () => api<Page<PurchaseReturn>>(`/purchases/returns?${params}`),
  });
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Purchasing"
        title="Purchase returns"
        description="Exact receipt-line returns with inventory-only or linked supplier-credit effects."
        actions={
          can('purchase.return') ? (
            <Link href={`${ROOT}/returns/new`}>
              <Button>Post purchase return</Button>
            </Link>
          ) : undefined
        }
      />
      <ListFilters
        search={f.search}
        setSearch={f.setSearch}
        supplierId={f.supplierId}
        setSupplierId={f.setSupplierId}
      />
      <ListResult loading={q.isLoading} error={q.error} empty={!q.data?.items.length}>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return / supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Effect</TableHead>
                <TableHead numeric>Supplier credit</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`${ROOT}/returns/${encodeURIComponent(row.returnNumber)}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {row.returnNumber}
                    </Link>
                    <p className="text-xs text-text-muted">{row.supplier.name}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={documentStatusTone(row.status)}>{row.status}</StatusBadge>
                  </TableCell>
                  <TableCell>{new Date(row.returnedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge tone={row.invoiceId ? 'warning' : 'neutral'}>
                      {row.invoiceId ? 'Inventory + credit' : 'Inventory only'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell numeric>{row.financialTotal} BDT</TableCell>
                  <TableCell className="max-w-56 truncate">{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListResult>
      {q.data ? (
        <Pagination
          currentPage={f.page}
          pageCount={pages}
          totalItems={q.data.total}
          onPrevious={f.page > 1 ? () => f.setPage(f.page - 1) : undefined}
          onNext={f.page < pages ? () => f.setPage(f.page + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

function ReturnDetail({ documentNumber }: { documentNumber: string }) {
  const { api } = usePurchasing();
  const q = useQuery({
    queryKey: ['purchasing', 'return-number', documentNumber],
    queryFn: () =>
      api<Page<PurchaseReturn>>(
        `/purchases/returns?limit=10&search=${encodeURIComponent(documentNumber)}`,
      ),
  });
  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState description={q.error.message} />;
  const row = q.data?.items.find((item) => item.returnNumber === documentNumber);
  if (!row) return <EmptyState title="Purchase return not found" />;
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Purchasing · Purchase return"
        title={row.returnNumber}
        description={`${row.supplier.name} · ${new Date(row.returnedAt).toLocaleString()}`}
        actions={
          <Link href={`${ROOT}/returns`}>
            <Button variant="outline">Back</Button>
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Summary label="Status">
          <StatusBadge tone={documentStatusTone(row.status)}>{row.status}</StatusBadge>
        </Summary>
        <Summary label="Effect">
          <StatusBadge tone={row.invoiceId ? 'warning' : 'neutral'}>
            {row.invoiceId ? 'Inventory + supplier credit' : 'Received-only · inventory only'}
          </StatusBadge>
        </Summary>
        <Summary label="Financial credit">
          <MoneyDisplay value={row.financialTotal} currency="BDT" className="text-xl font-bold" />
        </Summary>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reason and source documents</CardTitle>
          <CardDescription>The original receipt and invoice remain immutable.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-text-secondary">{row.reason}</p>
          <RelatedLink href={`${ROOT}/receipts/${row.receiptId}`} label="Original goods receipt" />
          {row.invoiceId ? (
            <RelatedLink
              href={`${ROOT}/invoices/${row.invoiceId}`}
              label="Linked supplier invoice"
            />
          ) : (
            <Alert tone="info">
              No invoice was linked, so this return created no supplier financial credit.
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}
function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${strong ? 'border-t border-border pt-3 text-base font-bold' : 'text-text-secondary'}`}
    >
      <span>{label}</span>
      <span className="font-mono">{value} BDT</span>
    </div>
  );
}
function RelatedLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border border-border p-3 text-sm font-semibold text-primary hover:bg-neutral-hover"
    >
      <span>{label}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}

export { Heading };
