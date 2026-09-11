'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  MoneyDisplay,
  Select,
  Textarea,
} from '@vendo/ui';
import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { InvoiceDocument, type InvoiceData } from '../../app/app/reporting-console';
import { useBranchContext } from '../../contexts/branch-context';
import { configuredPrice, decimalCompare } from '../pos/decimal';
import {
  FinancialSummary,
  ExchangeLinks,
  OutstandingCard,
  PaymentTimeline,
  PostSaleActionBar,
  RefundSummary,
  ReturnLineSelector,
  SaleHeader,
  SaleLineTable,
} from './components';
import {
  collectionAdvance,
  collectionAllocation,
  returnCreditPreview,
  returnRefundable,
  saleTimeline,
} from './finance';
import type { Collection, Page, PosContext, PosProduct, SaleDetail } from './types';

type Action = 'collect' | 'exchange' | 'print' | 'refund' | 'return' | 'void' | null;
type Pending = Exclude<Action, null> | '';

function operationSignature(type: string, payload: unknown) {
  return `${type}:${JSON.stringify(payload)}`;
}

export function SaleDetailWorkspace({ saleId }: { saleId: string }) {
  const { user } = useAuth();
  const { activeBranchId } = useBranchContext();
  const api = useSalesApi();
  const queryClient = useQueryClient();
  const operation = useRef<{ key: string; signature: string } | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [pending, setPending] = useState<Pending>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [methodId, setMethodId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [disposition, setDisposition] = useState<'NON_RESELLABLE' | 'RESTOCK'>('RESTOCK');
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [returnId, setReturnId] = useState('');
  const [replacementSearch, setReplacementSearch] = useState('');
  const [replacement, setReplacement] = useState<PosProduct | null>(null);
  const [replacementUnitId, setReplacementUnitId] = useState('');
  const [replacementBatchId, setReplacementBatchId] = useState('');
  const [replacementQuantity, setReplacementQuantity] = useState('1');
  const [printMode, setPrintMode] = useState<'a4' | 'thermal'>('thermal');

  const detail = useQuery({
    queryKey: ['sales', 'detail', activeBranchId, saleId],
    queryFn: () => api<SaleDetail>(`/sales/${saleId}`),
    enabled: Boolean(activeBranchId && saleId),
  });
  const collections = useQuery({
    queryKey: ['sales', 'collections', activeBranchId, saleId],
    queryFn: () => api<Page<Collection>>(`/sales/collections?saleId=${saleId}&limit=100`),
    enabled: Boolean(
      activeBranchId && saleId && user?.permissions.includes('customer.view_payments'),
    ),
  });
  const context = useQuery({
    queryKey: ['sales', 'post-sale-context', activeBranchId],
    queryFn: () => api<PosContext>('/sales/pos/context'),
    enabled: Boolean(activeBranchId),
  });
  const replacementProducts = useQuery({
    queryKey: [
      'sales',
      'exchange-products',
      activeBranchId,
      detail.data?.warehouseId,
      replacementSearch,
    ],
    queryFn: () =>
      api<{ items: PosProduct[] }>(
        `/sales/pos/products?warehouseId=${detail.data?.warehouseId}&search=${encodeURIComponent(replacementSearch.trim())}`,
      ),
    enabled: Boolean(detail.data?.warehouseId && replacementSearch.trim().length >= 2),
  });
  const invoice = useQuery({
    queryKey: ['reports', 'invoice', activeBranchId, saleId],
    queryFn: () => api<InvoiceData>(`/reports/invoices/${saleId}`),
    enabled: Boolean(activeBranchId && saleId && action === 'print'),
  });

  const activeMethodId = methodId || context.data?.paymentMethods[0]?.id || '';
  const activeRegisterId =
    registerId || detail.data?.registerId || context.data?.registers[0]?.id || '';
  const selectedReturn =
    detail.data?.returns.find((item) => item.id === returnId) ??
    detail.data?.returns.find((item) => decimalCompare(returnRefundable(item), '0') > 0);
  const chosenUnitId =
    replacementUnitId || replacement?.scannedUnitId || replacement?.baseUnit.id || '';
  const chosenPrice = replacement
    ? configuredPrice(replacement as never, chosenUnitId, detail.data?.pricingMode ?? 'RETAIL')
    : '';
  const timeline = useMemo(
    () => (detail.data ? saleTimeline(detail.data, collections.data?.items ?? []) : []),
    [collections.data?.items, detail.data],
  );
  const selectedRows = Object.entries(selections).filter(
    ([, quantity]) => decimalCompare(quantity || '0', '0') > 0,
  );
  const previewCredit = detail.data ? returnCreditPreview(detail.data, selections) : '0';
  const allocation = detail.data
    ? collectionAllocation(amount, detail.data.currentOutstanding)
    : '0';
  const advance = detail.data ? collectionAdvance(amount, detail.data.currentOutstanding) : '0';

  const can = (permission: string) => Boolean(user?.permissions.includes(permission));
  const resetForm = () => {
    setAmount('');
    setReason('');
    setSelections({});
    setDisposition('RESTOCK');
    setReturnId('');
    setReplacementSearch('');
    setReplacement(null);
    setReplacementUnitId('');
    setReplacementBatchId('');
    setReplacementQuantity('1');
    operation.current = null;
  };
  const close = () => {
    if (pending) return;
    setAction(null);
    setError('');
    resetForm();
  };
  const run = async (
    type: Exclude<Action, null>,
    path: string,
    payload: unknown,
    success: string,
  ) => {
    if (pending) return;
    const signature = operationSignature(type, payload);
    if (!operation.current || operation.current.signature !== signature) {
      operation.current = { key: `${type}-ui-${crypto.randomUUID()}`, signature };
    }
    setPending(type);
    setError('');
    try {
      await api(path, {
        method: 'POST',
        headers: { 'Idempotency-Key': operation.current.key },
        body: JSON.stringify(payload),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      ]);
      setMessage(success);
      setAction(null);
      resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The operation could not be completed.');
    } finally {
      setPending('');
    }
  };

  if (!activeBranchId)
    return (
      <EmptyState
        title="Select an active branch"
        description="Sale detail requires an authorized branch context."
      />
    );
  if (detail.isLoading)
    return (
      <LoadingState
        title="Loading sale detail…"
        description="Reading immutable invoice and post-sale history."
      />
    );
  if (detail.isError)
    return (
      <ErrorState
        title="Sale detail unavailable"
        description={detail.error.message}
        onRetry={() => void detail.refetch()}
      />
    );
  if (!detail.data)
    return (
      <EmptyState
        title="Sale not found"
        description="The requested invoice is unavailable in this branch."
      />
    );
  const sale = detail.data;

  const postCollection = () =>
    run(
      'collect',
      '/sales/collections',
      {
        customerId: sale.customerId,
        methodId: activeMethodId,
        registerId: activeRegisterId || undefined,
        amount,
        allocations:
          decimalCompare(allocation, '0') > 0 ? [{ saleId: sale.id, amount: allocation }] : [],
        notes:
          decimalCompare(advance, '0') > 0
            ? 'Invoice collection with explicit customer advance'
            : 'Invoice collection from sale detail',
      },
      'Collection posted. Outstanding and customer ledger were refreshed.',
    );

  const postReturn = () =>
    run(
      'return',
      '/sales/returns',
      {
        saleId: sale.id,
        reason,
        items: selectedRows.map(([saleItemId, quantity]) => ({
          saleItemId,
          quantity,
          disposition,
        })),
      },
      'Return posted. Inventory and financial effects were committed atomically.',
    );

  const postRefund = () =>
    selectedReturn &&
    run(
      'refund',
      '/sales/refunds',
      {
        returnId: selectedReturn.id,
        methodId: activeMethodId,
        registerId: activeRegisterId || undefined,
        amount,
        reason,
      },
      'Refund posted without changing the original payment.',
    );

  const postExchange = () => {
    if (!replacement) return;
    void run(
      'exchange',
      '/sales/exchanges',
      {
        reason,
        saleReturn: {
          saleId: sale.id,
          reason,
          items: selectedRows.map(([saleItemId, quantity]) => ({
            saleItemId,
            quantity,
            disposition: 'RESTOCK',
          })),
        },
        replacementSale: {
          warehouseId: sale.warehouseId,
          registerId: sale.registerId,
          customerId: sale.customerId,
          pricingMode: sale.pricingMode,
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
          payments:
            decimalCompare(amount || '0', '0') > 0
              ? [{ methodId: activeMethodId, amount }]
              : undefined,
        },
      },
      'Exchange posted as one linked return and replacement sale.',
    );
  };

  const postVoid = () =>
    run(
      'void',
      `/sales/${sale.id}/void`,
      { reason },
      'Sale voided through a compensating reversal.',
    );

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <SaleHeader sale={sale} />
      {message ? <Alert tone="success">{message}</Alert> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <OutstandingCard sale={sale} />
          <SaleLineTable sale={sale} />
          <ExchangeLinks sale={sale} />
          <PaymentTimeline events={timeline} />
        </div>
        <aside className="space-y-5">
          <FinancialSummary sale={sale} />
          <div className="rounded-lg border border-border bg-surface p-4 text-sm">
            <h2 className="font-semibold text-text-primary">Customer context</h2>
            <p className="mt-2 text-text-secondary">
              {sale.customer.code} · {sale.customer.name}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {sale.customer.isWalkIn
                ? 'System walk-in customer'
                : `Credit limit BDT ${sale.customer.creditLimit}`}
            </p>
          </div>
        </aside>
      </div>
      <PostSaleActionBar
        sale={sale}
        canCollect={can('customer.collect_payment')}
        canReturn={can('sale.return')}
        canRefund={can('sale.refund')}
        canExchange={can('sale.exchange')}
        canVoid={can('sale.void')}
        onCollect={() => setAction('collect')}
        onReturn={() => setAction('return')}
        onRefund={() => setAction('refund')}
        onExchange={() => setAction('exchange')}
        onPrint={() => setAction('print')}
        onVoid={() => setAction('void')}
      />

      <Dialog open={action === 'print'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Print or reprint invoice</DialogTitle>
            <DialogDescription>
              The verified historical invoice projection is reused without changing Stage 12 print
              layouts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={printMode === 'thermal' ? 'secondary' : 'outline'}
              onClick={() => setPrintMode('thermal')}
            >
              Thermal receipt
            </Button>
            <Button
              variant={printMode === 'a4' ? 'secondary' : 'outline'}
              onClick={() => setPrintMode('a4')}
            >
              A4 invoice
            </Button>
            <Button className="ml-auto" onClick={() => window.print()} disabled={!invoice.data}>
              Print
            </Button>
          </div>
          <div className="mt-4 max-h-[60vh] overflow-auto rounded-md bg-surface-secondary p-4">
            {invoice.isLoading ? (
              <LoadingState title="Loading historical invoice…" />
            ) : invoice.isError ? (
              <ErrorState
                description={invoice.error.message}
                onRetry={() => void invoice.refetch()}
              />
            ) : invoice.data ? (
              <InvoiceDocument data={invoice.data} mode={printMode} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'collect'} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect invoice due</DialogTitle>
            <DialogDescription>
              Allocate to this invoice first. Any deliberate excess becomes customer advance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-md bg-surface-secondary p-3 text-sm">
              <div>
                <p className="text-text-muted">Outstanding</p>
                <MoneyDisplay value={sale.currentOutstanding} />
              </div>
              <div>
                <p className="text-text-muted">Allocated</p>
                <MoneyDisplay value={allocation} />
              </div>
              <div>
                <p className="text-text-muted">Advance</p>
                <MoneyDisplay value={advance} />
              </div>
            </div>
            <FormField htmlFor="collection-amount" label="Collection amount" required>
              <Input
                id="collection-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                autoFocus
              />
            </FormField>
            <PaymentControls
              context={context.data}
              methodId={activeMethodId}
              registerId={activeRegisterId}
              setMethodId={setMethodId}
              setRegisterId={setRegisterId}
            />
            {error ? <Alert tone="danger">{error}</Alert> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={pending === 'collect'}
              disabled={decimalCompare(amount || '0', '0') <= 0 || !activeMethodId}
              onClick={() => void postCollection()}
            >
              Confirm collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'return'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Return original sale items</DialogTitle>
            <DialogDescription>
              The server validates remaining quantity and calculates final credit from immutable
              invoice snapshots.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ReturnLineSelector
              sale={sale}
              selections={selections}
              setSelection={(id, value) =>
                setSelections((current) => ({ ...current, [id]: value }))
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="return-disposition" label="Inventory disposition">
                <Select
                  id="return-disposition"
                  value={disposition}
                  onChange={(event) => setDisposition(event.target.value as typeof disposition)}
                >
                  <option value="RESTOCK">Restock exact warehouse / batch / shade</option>
                  <option value="NON_RESELLABLE">Non-resellable · do not add sellable stock</option>
                </Select>
              </FormField>
              <FormField htmlFor="return-reason" label="Reason" required>
                <Textarea
                  id="return-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </FormField>
            </div>
            <Alert tone="info">
              Estimated credit preview: <MoneyDisplay value={previewCredit} />. The backend posts
              the authoritative rounded credit and applies receivable first.
            </Alert>
            {sale.customer.isWalkIn ? (
              <Alert tone="warning">
                Walk-in returns require an immediate full refund. Use a named-customer sale for a
                standalone return, or process the required refund through the verified workflow.
              </Alert>
            ) : null}
            {error ? <Alert tone="danger">{error}</Alert> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={pending === 'return'}
              disabled={!selectedRows.length || reason.trim().length < 3 || sale.customer.isWalkIn}
              onClick={() => void postReturn()}
            >
              Review and post return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'refund'} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund posted return credit</DialogTitle>
            <DialogDescription>
              Refunds are new outbound payments. Original payments remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField htmlFor="refund-return" label="Eligible return">
              <Select
                id="refund-return"
                value={selectedReturn?.id ?? ''}
                onChange={(event) => setReturnId(event.target.value)}
              >
                {sale.returns
                  .filter((item) => decimalCompare(returnRefundable(item), '0') > 0)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.returnNumber}
                    </option>
                  ))}
              </Select>
            </FormField>
            {selectedReturn ? <RefundSummary saleReturn={selectedReturn} /> : null}
            <FormField htmlFor="refund-amount" label="Refund amount" required>
              <Input
                id="refund-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </FormField>
            <PaymentControls
              context={context.data}
              methodId={activeMethodId}
              registerId={activeRegisterId}
              setMethodId={setMethodId}
              setRegisterId={setRegisterId}
            />
            <FormField htmlFor="refund-reason" label="Reason" required>
              <Textarea
                id="refund-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormField>
            {error ? <Alert tone="danger">{error}</Alert> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={pending === 'refund'}
              disabled={
                !selectedReturn ||
                !amount ||
                decimalCompare(amount, returnRefundable(selectedReturn)) > 0 ||
                reason.trim().length < 3
              }
              onClick={() => void postRefund()}
            >
              Confirm refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'exchange'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Exchange items</DialogTitle>
            <DialogDescription>
              One atomic backend operation links the original return side to the replacement sale
              side.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">1 · Original return side</h3>
              <ReturnLineSelector
                sale={sale}
                selections={selections}
                setSelection={(id, value) =>
                  setSelections((current) => ({ ...current, [id]: value }))
                }
              />
              <p className="text-xs text-text-secondary">
                Credit preview <MoneyDisplay value={previewCredit} /> · exact original stock
                position
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">2 · Replacement sale side</h3>
              <Input
                aria-label="Replacement product search"
                placeholder="Search SKU, barcode or product"
                value={replacementSearch}
                onChange={(event) => setReplacementSearch(event.target.value)}
              />
              <div className="max-h-36 space-y-2 overflow-y-auto">
                {(replacementProducts.data?.items ?? []).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className={`block w-full rounded-md border p-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary ${replacement?.id === product.id ? 'border-primary bg-primary-soft' : 'border-border'}`}
                    onClick={() => {
                      setReplacement(product);
                      setReplacementUnitId(product.scannedUnitId || product.baseUnit.id);
                      setReplacementBatchId(
                        Array.isArray(product.availability)
                          ? (product.availability[0]?.id ?? '')
                          : '',
                      );
                    }}
                  >
                    {product.sku} · {product.name}
                  </button>
                ))}
              </div>
              {replacement ? (
                <>
                  <FormField htmlFor="replacement-unit" label="Replacement unit">
                    <Select
                      id="replacement-unit"
                      value={chosenUnitId}
                      onChange={(event) => setReplacementUnitId(event.target.value)}
                    >
                      {replacement.units.map(({ unit }) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.code} · {unit.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  {Array.isArray(replacement.availability) ? (
                    <FormField htmlFor="replacement-batch" label="Exact replacement batch / shade">
                      <Select
                        id="replacement-batch"
                        value={replacementBatchId}
                        onChange={(event) => setReplacementBatchId(event.target.value)}
                      >
                        {replacement.availability.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.batchNumber} · Lot {batch.lotNumber ?? '—'} · Shade{' '}
                            {batch.shade ?? '—'}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  ) : null}
                  <FormField htmlFor="replacement-quantity" label="Replacement quantity">
                    <Input
                      id="replacement-quantity"
                      inputMode="decimal"
                      value={replacementQuantity}
                      onChange={(event) => setReplacementQuantity(event.target.value)}
                    />
                  </FormField>
                  <p className="text-xs text-text-secondary">
                    Configured price <MoneyDisplay value={chosenPrice || '0'} />
                  </p>
                </>
              ) : null}
              <PaymentControls
                context={context.data}
                methodId={activeMethodId}
                registerId={activeRegisterId}
                setMethodId={setMethodId}
                setRegisterId={setRegisterId}
              />
              <FormField htmlFor="exchange-payment" label="Additional customer payment" optional>
                <Input
                  id="exchange-payment"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0 if return credit covers replacement"
                />
              </FormField>
              <FormField htmlFor="exchange-reason" label="Reason" required>
                <Textarea
                  id="exchange-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </FormField>
            </div>
          </div>
          {error ? (
            <Alert className="mt-4" tone="danger">
              {error}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={pending === 'exchange'}
              disabled={
                !selectedRows.length || !replacement || !chosenPrice || reason.trim().length < 3
              }
              onClick={postExchange}
            >
              Post atomic exchange
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={action === 'void'} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void {sale.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a compensating reversal, never a deletion. Remaining returnable stock is
              restored to original positions and financial credit reduces receivable first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-3">
            <div className="rounded-md bg-danger-soft p-3 text-sm text-danger">
              <strong>Inventory impact:</strong>{' '}
              {
                sale.items.filter((item) => decimalCompare(item.returnableBaseQuantity, '0') > 0)
                  .length
              }{' '}
              remaining line(s) will be reversed.
              <br />
              <strong>Financial impact:</strong> backend-calculated remaining invoice credit will be
              posted.
            </div>
            <FormField htmlFor="void-reason" label="Required reason">
              <Textarea
                id="void-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormField>
            {error ? <Alert tone="danger">{error}</Alert> : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={close}>
                Keep sale
              </Button>
            </AlertDialogCancel>
            <Button
              variant="danger"
              loading={pending === 'void'}
              disabled={reason.trim().length < 3}
              onClick={() => void postVoid()}
            >
              Confirm void
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PaymentControls({
  context,
  methodId,
  registerId,
  setMethodId,
  setRegisterId,
}: {
  context?: PosContext;
  methodId: string;
  registerId: string;
  setMethodId(value: string): void;
  setRegisterId(value: string): void;
}) {
  const method = context?.paymentMethods.find((item) => item.id === methodId);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField htmlFor="post-sale-method" label="Payment method">
        <Select
          id="post-sale-method"
          value={methodId}
          onChange={(event) => setMethodId(event.target.value)}
        >
          {(context?.paymentMethods ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {item.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        htmlFor="post-sale-register"
        label="Register"
        description={
          method?.isCash
            ? 'Cash requires an open shift on this register.'
            : 'Used for transaction context.'
        }
      >
        <Select
          id="post-sale-register"
          value={registerId}
          onChange={(event) => setRegisterId(event.target.value)}
        >
          {(context?.registers ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {item.name}
              {item.cashShifts.length ? ' · Shift open' : ''}
            </option>
          ))}
        </Select>
      </FormField>
    </div>
  );
}

function useSalesApi() {
  const { authenticatedFetch } = useAuth();
  const { activeBranchId } = useBranchContext();
  return async <T,>(path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (activeBranchId) headers.set('x-branch-id', activeBranchId);
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
}
