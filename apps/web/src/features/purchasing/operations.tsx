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
  FormField as BaseFormField,
  Input,
  LoadingState,
  MoneyDisplay,
  Select,
  StatusBadge,
  Textarea,
} from '@vendo/ui';
import { useRouter } from 'next/navigation';
import {
  cloneElement,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { usePurchasing } from './purchasing-context';
import {
  friendlyPurchaseError,
  lineDraftIssues,
  normalizeDecimal,
  paymentAllocationSummary,
  productBaseUnitCode,
} from './presentation';
import type {
  GoodsReceipt,
  PurchaseInvoice,
  PurchaseLineDraft,
  PurchaseOrder,
  SupplierDue,
} from './types';

const ROOT = '/app/purchases';
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const operationKey = () => `purchase-ui-${crypto.randomUUID()}`;
const newLine = (): PurchaseLineDraft => ({
  key: crypto.randomUUID(),
  productId: '',
  unitId: '',
  quantity: '',
  unitCost: '0',
  discount: '0',
  tax: '0',
});

function FormField({
  children,
  htmlFor,
  ...props
}: Omit<ComponentProps<typeof BaseFormField>, 'htmlFor' | 'children'> & {
  children: ReactElement<{ id?: string }>;
  htmlFor?: string;
}) {
  const generatedId = useId();
  const controlId = htmlFor ?? children.props.id ?? generatedId;

  return (
    <BaseFormField {...props} htmlFor={controlId}>
      {cloneElement(children, { id: controlId })}
    </BaseFormField>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busy,
  children,
  onConfirm,
}: {
  open: boolean;
  onOpenChange(value: boolean): void;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  children: ReactNode;
  onConfirm(): void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-neutral-soft p-4 text-sm text-text-secondary">
          {children}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Go back
          </Button>
          <Button onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductLineEditor({
  lines,
  setLines,
}: {
  lines: PurchaseLineDraft[];
  setLines(lines: PurchaseLineDraft[]): void;
}) {
  const { products, units } = usePurchasing();
  const update = (key: string, patch: Partial<PurchaseLineDraft>) =>
    setLines(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const product = products.find((item) => item.id === line.productId);
        return (
          <div key={line.key} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Line {index + 1}</p>
                {product ? (
                  <p className="text-xs text-text-muted">
                    {product.sku} · {product.type}
                    {product.tileProfile?.displaySize
                      ? ` · ${product.tileProfile.displaySize}`
                      : ''}
                  </p>
                ) : null}
              </div>
              {lines.length > 1 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLines(lines.filter((item) => item.key !== line.key))}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <FormField label="Product" required className="xl:col-span-2">
                <Select
                  value={line.productId}
                  onChange={(event) => {
                    const selected = products.find((item) => item.id === event.target.value);
                    update(line.key, {
                      productId: event.target.value,
                      unitId: selected?.baseUnit?.id ?? '',
                    });
                  }}
                >
                  <option value="">Select product</option>
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} · {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Unit" required>
                <Select
                  value={line.unitId}
                  onChange={(e) => update(line.key, { unitId: e.target.value })}
                >
                  <option value="">Select unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Quantity" required>
                <Input
                  value={line.quantity}
                  onChange={(e) => update(line.key, { quantity: e.target.value })}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label="Unit cost" required>
                <Input
                  value={line.unitCost}
                  onChange={(e) => update(line.key, { unitCost: e.target.value })}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label="Line discount / tax">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    aria-label={`Line ${index + 1} discount`}
                    value={line.discount}
                    onChange={(e) => update(line.key, { discount: e.target.value })}
                    inputMode="decimal"
                  />
                  <Input
                    aria-label={`Line ${index + 1} tax`}
                    value={line.tax}
                    onChange={(e) => update(line.key, { tax: e.target.value })}
                    inputMode="decimal"
                  />
                </div>
              </FormField>
            </div>
          </div>
        );
      })}
      <Button variant="outline" onClick={() => setLines([...lines, newLine()])}>
        Add line
      </Button>
    </div>
  );
}

export function PurchaseOrderEditor({ order }: { order?: PurchaseOrder }) {
  const { api, suppliers, warehouses, refresh } = usePurchasing();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? '');
  const [warehouseId, setWarehouseId] = useState(order?.warehouseId ?? '');
  const [orderDate, setOrderDate] = useState(order?.orderDate?.slice(0, 10) ?? today());
  const [expectedAt, setExpectedAt] = useState(order?.expectedAt?.slice(0, 10) ?? '');
  const [discount, setDiscount] = useState(order?.discount ?? '0');
  const [tax, setTax] = useState(order?.tax ?? '0');
  const [freight, setFreight] = useState(order?.freight ?? '0');
  const [notes, setNotes] = useState(order?.notes ?? '');
  const [lines, setLines] = useState<PurchaseLineDraft[]>(
    order?.items?.map((line) => ({
      key: line.id,
      productId: line.productId,
      unitId: line.unitId,
      quantity: line.quantity,
      unitCost: line.unitCost,
      discount: line.discount,
      tax: line.tax,
    })) ?? [newLine()],
  );
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    const nextIssues = [
      ...(!supplierId ? ['Select a supplier.'] : []),
      ...(!warehouseId ? ['Select the intended receiving warehouse.'] : []),
      ...lineDraftIssues(lines),
    ];
    setIssues(nextIssues);
    if (nextIssues.length) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<PurchaseOrder>(
        order ? `/purchases/orders/${order.id}` : '/purchases/orders',
        {
          method: order ? 'PUT' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            supplierId,
            warehouseId,
            orderDate,
            expectedAt: expectedAt || undefined,
            discount,
            tax,
            freight,
            notes: notes || undefined,
            items: lines.map(
              ({
                productId,
                unitId,
                quantity,
                unitCost,
                discount: lineDiscount,
                tax: lineTax,
              }) => ({
                productId,
                unitId,
                quantity,
                unitCost,
                discount: lineDiscount,
                tax: lineTax,
              }),
            ),
          }),
        },
      );
      await refresh();
      router.push(`${ROOT}/orders/${result.id}`);
    } catch (cause) {
      setError(
        friendlyPurchaseError(
          cause instanceof Error ? cause.message : 'Purchase order save failed.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {issues.length ? <Alert tone="warning">{issues.join(' ')}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>{order ? `Edit ${order.orderNumber}` : 'Create purchase order'}</CardTitle>
          <CardDescription>
            A purchase order is a commitment only. Inventory changes when a Goods Receipt is posted.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Supplier" required>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.code} · {supplier.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Intended warehouse" required>
            <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} · {warehouse.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Order date" required>
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </FormField>
          <FormField label="Expected date">
            <Input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          <CardDescription>Products, purchase units and historical cost snapshots.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductLineEditor lines={lines} setLines={setLines} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Document adjustments</CardTitle>
          <CardDescription>
            The backend recalculates and validates all authoritative totals when saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Document discount">
            <Input
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              inputMode="decimal"
            />
          </FormField>
          <FormField label="Document tax">
            <Input value={tax} onChange={(e) => setTax(e.target.value)} inputMode="decimal" />
          </FormField>
          <FormField label="Freight">
            <Input
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
              inputMode="decimal"
            />
          </FormField>
          <FormField label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button loading={busy} onClick={() => void save()}>
          {order ? 'Save draft changes' : 'Create draft PO'}
        </Button>
      </div>
    </div>
  );
}

type ReceiptDraft = {
  orderItemId: string;
  unitId: string;
  quantity: string;
  batchNumber: string;
  lotNumber: string;
  shade: string;
};

export function GoodsReceiptEditor({ initialOrderId = '' }: { initialOrderId?: string }) {
  const { api, branchId, products, warehouses, refresh } = usePurchasing();
  const router = useRouter();
  const client = useQueryClient();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [warehouseId, setWarehouseId] = useState('');
  const [receivedAt, setReceivedAt] = useState(today());
  const [notes, setNotes] = useState('');
  const [drafts, setDrafts] = useState<Record<string, ReceiptDraft>>({});
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const keyRef = useRef(operationKey());
  const orders = useQuery({
    queryKey: ['purchasing', 'receivable-orders', branchId],
    queryFn: () => api<{ items: PurchaseOrder[] }>('/purchases/orders?limit=100'),
  });
  const order = useQuery({
    queryKey: ['purchasing', 'order', orderId],
    queryFn: () => api<PurchaseOrder>(`/purchases/orders/${orderId}`),
    enabled: Boolean(orderId),
  });
  const activeWarehouseId = warehouseId || order.data?.warehouseId || '';
  const draftFor = (line: NonNullable<PurchaseOrder['items']>[number]): ReceiptDraft =>
    drafts[line.id] ?? {
      orderItemId: line.id,
      unitId: line.unitId,
      quantity: '',
      batchNumber: '',
      lotNumber: '',
      shade: '',
    };
  const selectedLines = (order.data?.items ?? []).filter((line) => draftFor(line).quantity.trim());
  const validate = () => {
    if (!orderId || !activeWarehouseId) return 'Select a confirmed PO and explicit warehouse.';
    if (!selectedLines.length) return 'Enter a receiving quantity for at least one line.';
    for (const line of selectedLines) {
      const draft = draftFor(line);
      if (!/^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/.test(draft.quantity))
        return 'Receiving quantity must be greater than zero.';
      if (line.product.batchTracking && !draft.batchNumber.trim())
        return `${line.product.name} requires a batch number.`;
    }
    return '';
  };
  const post = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await api<GoodsReceipt>('/purchases/receipts', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': keyRef.current },
        body: JSON.stringify({
          orderId,
          warehouseId: activeWarehouseId,
          receivedAt: new Date(`${receivedAt}T12:00:00`).toISOString(),
          notes: notes || undefined,
          items: selectedLines.map((line) => ({
            orderItemId: line.id,
            unitId: draftFor(line).unitId,
            quantity: draftFor(line).quantity,
            batchNumber: draftFor(line).batchNumber || undefined,
            lotNumber: draftFor(line).lotNumber || undefined,
            shade: draftFor(line).shade || undefined,
          })),
        }),
      });
      keyRef.current = operationKey();
      await client.invalidateQueries({ queryKey: ['purchasing'] });
      await refresh();
      router.push(`${ROOT}/receipts/${result.id}`);
    } catch (cause) {
      setError(
        friendlyPurchaseError(cause instanceof Error ? cause.message : 'Goods receipt failed.'),
      );
    } finally {
      setBusy(false);
      setReview(false);
    }
  };
  const openReview = () => {
    const issue = validate();
    setError(issue);
    if (!issue) setReview(true);
  };
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Receive goods</CardTitle>
          <CardDescription>
            Posting creates inventory movements. The purchase order itself has no stock effect.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField label="Confirmed purchase order" required>
            <Select
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                setWarehouseId('');
                setDrafts({});
              }}
            >
              <option value="">Select PO</option>
              {(orders.data?.items ?? [])
                .filter((item) => ['APPROVED', 'PARTIALLY_RECEIVED'].includes(item.status))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.orderNumber} · {item.supplier.name}
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField label="Receiving warehouse" required>
            <Select value={activeWarehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} · {warehouse.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Receipt date" required>
            <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
      {order.isLoading ? (
        <LoadingState />
      ) : order.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Receiving lines</CardTitle>
            <CardDescription>
              Enter only what is physically received now. Remaining quantities come from the
              backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(order.data.items ?? []).map((line) => {
              const draft = draftFor(line);
              return (
                <div key={line.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{line.product.name}</p>
                      <p className="text-xs text-text-muted">
                        {line.product.sku} · Ordered {line.quantity} {line.unit.code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">Remaining base</p>
                      <p className="font-mono font-bold text-text-primary">
                        {line.remainingBaseQuantity} {productBaseUnitCode(line.productId, products)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <FormField label={`Receiving now (${line.unit.code})`}>
                      <Input
                        value={draft.quantity}
                        onChange={(e) =>
                          setDrafts({
                            ...drafts,
                            [line.id]: { ...draft, quantity: e.target.value },
                          })
                        }
                        inputMode="decimal"
                      />
                    </FormField>
                    {line.product.batchTracking ? (
                      <>
                        <FormField label="Batch" required>
                          <Input
                            value={draft.batchNumber}
                            onChange={(e) =>
                              setDrafts({
                                ...drafts,
                                [line.id]: { ...draft, batchNumber: e.target.value },
                              })
                            }
                          />
                        </FormField>
                        <FormField label="Lot">
                          <Input
                            value={draft.lotNumber}
                            onChange={(e) =>
                              setDrafts({
                                ...drafts,
                                [line.id]: { ...draft, lotNumber: e.target.value },
                              })
                            }
                          />
                        </FormField>
                        <FormField label="Shade">
                          <Input
                            value={draft.shade}
                            onChange={(e) =>
                              setDrafts({
                                ...drafts,
                                [line.id]: { ...draft, shade: e.target.value },
                              })
                            }
                          />
                        </FormField>
                        <div className="rounded-md bg-primary-soft p-3">
                          <p className="text-xs font-semibold text-primary">Tile traceability</p>
                          <p className="mt-1 text-xs text-text-secondary">
                            Batch is explicit; shade is never silently assigned.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="md:col-span-3 rounded-md bg-neutral-soft p-3 text-sm text-text-secondary">
                        This product does not require batch data.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <FormField label="Receipt notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
          </CardContent>
        </Card>
      ) : null}
      <div className="flex justify-end">
        <Button onClick={openReview}>Review goods receipt</Button>
      </div>
      <ConfirmDialog
        open={review}
        onOpenChange={setReview}
        title="Post goods receipt?"
        description="This will increase inventory atomically in the selected warehouse."
        confirmLabel="Post goods receipt"
        busy={busy}
        onConfirm={() => void post()}
      >
        <p>
          <strong>{order.data?.orderNumber}</strong> · {order.data?.supplier.name}
        </p>
        <p className="mt-1">
          Warehouse: {warehouses.find((item) => item.id === activeWarehouseId)?.name}
        </p>
        <p className="mt-1">
          {selectedLines.length} line(s) will create purchase-receipt movements.
        </p>
      </ConfirmDialog>
    </div>
  );
}

type InvoiceDraftLine = {
  receiptItemId: string;
  productId: string;
  unitId: string;
  quantity: string;
  unitCost: string;
  discount: string;
  tax: string;
  selected: boolean;
};

export function SupplierInvoiceEditor({ initialReceiptId = '' }: { initialReceiptId?: string }) {
  const { api, branchId, refresh } = usePurchasing();
  const router = useRouter();
  const [receiptId, setReceiptId] = useState(initialReceiptId);
  const [supplierReference, setSupplierReference] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [freight, setFreight] = useState('0');
  const [additionalCost, setAdditionalCost] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Record<string, InvoiceDraftLine>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const receipts = useQuery({
    queryKey: ['purchasing', 'invoice-receipts', branchId],
    queryFn: () => api<{ items: GoodsReceipt[] }>('/purchases/receipts?limit=100'),
  });
  const receipt = useQuery({
    queryKey: ['purchasing', 'receipt', receiptId],
    queryFn: () => api<GoodsReceipt>(`/purchases/receipts/${receiptId}`),
    enabled: Boolean(receiptId),
  });
  const lineFor = (line: NonNullable<GoodsReceipt['items']>[number]): InvoiceDraftLine =>
    lines[line.id] ?? {
      receiptItemId: line.id,
      productId: line.productId,
      unitId: line.unitId,
      quantity: line.quantity,
      unitCost: line.unitCost,
      discount: '0',
      tax: '0',
      selected: true,
    };
  const selected = (receipt.data?.items ?? []).map(lineFor).filter((line) => line.selected);
  const save = async () => {
    if (!receipt.data || !selected.length) {
      setError('Select a receipt and at least one invoice line.');
      return;
    }
    const issues = lineDraftIssues(
      selected.map((line) => ({
        productId: line.productId,
        unitId: line.unitId,
        quantity: line.quantity,
        unitCost: line.unitCost,
      })),
    );
    if (issues.length) {
      setError(issues.join(' '));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api<PurchaseInvoice>('/purchases/invoices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supplierId: receipt.data.supplierId,
          orderId: receipt.data.orderId,
          receiptId: receipt.data.id,
          supplierInvoiceNumber: supplierReference || undefined,
          invoiceDate,
          dueDate: dueDate || undefined,
          discount,
          tax,
          freight,
          additionalCost,
          currencyCode: 'BDT',
          notes: notes || undefined,
          items: selected.map(
            ({
              receiptItemId,
              productId,
              unitId,
              quantity,
              unitCost,
              discount: lineDiscount,
              tax: lineTax,
            }) => ({
              receiptItemId,
              productId,
              unitId,
              quantity,
              unitCost,
              discount: lineDiscount,
              tax: lineTax,
            }),
          ),
        }),
      });
      await refresh();
      router.push(`${ROOT}/invoices/${result.id}`);
    } catch (cause) {
      setError(
        friendlyPurchaseError(cause instanceof Error ? cause.message : 'Invoice draft failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Create supplier invoice draft</CardTitle>
          <CardDescription>
            Saving a draft has no final payable effect. Posting is a separate reviewed action.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Goods receipt" required>
            <Select
              value={receiptId}
              onChange={(e) => {
                setReceiptId(e.target.value);
                setLines({});
              }}
            >
              <option value="">Select receipt</option>
              {(receipts.data?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.receiptNumber} · {item.supplier.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Supplier invoice reference">
            <Input
              value={supplierReference}
              onChange={(e) => setSupplierReference(e.target.value)}
            />
          </FormField>
          <FormField label="Invoice date">
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </FormField>
          <FormField label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
      {receipt.isLoading ? (
        <LoadingState />
      ) : receipt.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Invoice lines</CardTitle>
            <CardDescription>
              Quantities and costs are snapshots; the backend validates invoice capacity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(receipt.data.items ?? []).map((item) => {
              const line = lineFor(item);
              return (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[auto_1fr_150px_150px] md:items-end"
                >
                  <input
                    aria-label={`Include ${item.product.name}`}
                    type="checkbox"
                    checked={line.selected}
                    onChange={(e) =>
                      setLines({ ...lines, [item.id]: { ...line, selected: e.target.checked } })
                    }
                    className="size-4"
                  />
                  <div>
                    <p className="font-semibold">{item.product.name}</p>
                    <p className="text-xs text-text-muted">
                      {item.product.sku} · Receipt {item.quantity} {item.unit.code}
                    </p>
                  </div>
                  <FormField label="Invoice quantity">
                    <Input
                      value={line.quantity}
                      onChange={(e) =>
                        setLines({ ...lines, [item.id]: { ...line, quantity: e.target.value } })
                      }
                    />
                  </FormField>
                  <FormField label="Unit cost">
                    <Input
                      value={line.unitCost}
                      onChange={(e) =>
                        setLines({ ...lines, [item.id]: { ...line, unitCost: e.target.value } })
                      }
                    />
                  </FormField>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Totals and additional costs</CardTitle>
          <CardDescription>
            All displayed entry values are submitted as Decimal strings; the saved document total
            comes from the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField label="Invoice discount">
            <Input value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </FormField>
          <FormField label="Invoice tax">
            <Input value={tax} onChange={(e) => setTax(e.target.value)} />
          </FormField>
          <FormField label="Freight">
            <Input value={freight} onChange={(e) => setFreight(e.target.value)} />
          </FormField>
          <FormField label="Additional cost">
            <Input value={additionalCost} onChange={(e) => setAdditionalCost(e.target.value)} />
          </FormField>
          <FormField label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button loading={busy} onClick={() => void save()}>
          Save invoice draft
        </Button>
      </div>
    </div>
  );
}

export function SupplierPaymentEditor({ initialSupplierId = '' }: { initialSupplierId?: string }) {
  const { api, suppliers, paymentMethods, registers, refresh } = usePurchasing();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [methodId, setMethodId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const keyRef = useRef(operationKey());
  const due = useQuery({
    queryKey: ['purchasing', 'supplier-due', supplierId],
    queryFn: () => api<SupplierDue>(`/purchases/suppliers/${supplierId}/due`),
    enabled: Boolean(supplierId),
  });
  const method = paymentMethods.find((item) => item.id === methodId);
  const appliedRows = Object.entries(allocations)
    .filter(([, value]) => normalizeDecimal(value || '0') !== '0')
    .map(([invoiceId, value]) => ({ invoiceId, amount: value }));
  const summary = useMemo(
    () => paymentAllocationSummary(amount || '0', appliedRows),
    [amount, appliedRows],
  );
  const openReview = () => {
    if (!supplierId || !methodId || !/^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/.test(amount)) {
      setError('Select supplier and method, then enter a payment greater than zero.');
      return;
    }
    if (method?.isCash && !registerId) {
      setError('Select the active cash register for a cash supplier payment.');
      return;
    }
    if (normalizeDecimal(summary.unapplied).startsWith('-')) {
      setError('Invoice allocations cannot exceed the payment amount.');
      return;
    }
    setError('');
    setReview(true);
  };
  const post = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ id: string; paymentNumber: string }>('/purchases/payments', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': keyRef.current },
        body: JSON.stringify({
          supplierId,
          methodId,
          registerId: method?.isCash ? registerId : undefined,
          amount,
          paidAt: now(),
          reference: reference || undefined,
          allocations: appliedRows,
        }),
      });
      keyRef.current = operationKey();
      await refresh();
      router.push(`${ROOT}/payments/${encodeURIComponent(result.paymentNumber)}`);
    } catch (cause) {
      setError(
        friendlyPurchaseError(cause instanceof Error ? cause.message : 'Supplier payment failed.'),
      );
    } finally {
      setBusy(false);
      setReview(false);
    }
  };
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Post supplier payment</CardTitle>
          <CardDescription>
            Allocate against posted invoices or retain the unapplied remainder as supplier advance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Supplier" required>
            <Select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setAllocations({});
              }}
            >
              <option value="">Select supplier</option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Payment method" required>
            <Select value={methodId} onChange={(e) => setMethodId(e.target.value)}>
              <option value="">Select method</option>
              {paymentMethods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          {method?.isCash ? (
            <FormField label="Cash register" required>
              <Select value={registerId} onChange={(e) => setRegisterId(e.target.value)}>
                <option value="">Select register</option>
                {registers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
          <FormField label="Payment amount" required>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </FormField>
          <FormField label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
      {due.data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Supplier position</CardTitle>
              <CardDescription>Derived from the immutable supplier ledger.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <StatusBadge
                tone={
                  due.data.position === 'ADVANCE'
                    ? 'info'
                    : normalizeDecimal(due.data.balance) === '0'
                      ? 'success'
                      : 'warning'
                }
              >
                {due.data.position}
              </StatusBadge>
              <MoneyDisplay
                value={due.data.balance}
                currency="BDT"
                className="text-2xl font-bold"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invoice allocation</CardTitle>
              <CardDescription>
                Leave allocations empty to post the full amount as unapplied supplier advance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {due.data.invoices
                .filter((invoice) => normalizeDecimal(invoice.outstanding) !== '0')
                .map((invoice) => (
                  <div
                    key={invoice.id}
                    className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[1fr_160px_180px] md:items-end"
                  >
                    <div>
                      <p className="font-semibold">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-text-muted">
                        Total {invoice.total} · Paid {invoice.paid} · Credited {invoice.credited}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Outstanding</p>
                      <p className="font-mono font-bold">{invoice.outstanding} BDT</p>
                    </div>
                    <FormField label="Allocate now">
                      <Input
                        value={allocations[invoice.id] ?? ''}
                        onChange={(e) =>
                          setAllocations({ ...allocations, [invoice.id]: e.target.value })
                        }
                      />
                    </FormField>
                  </div>
                ))}
            </CardContent>
          </Card>
        </>
      ) : null}
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-text-muted">Payment</p>
            <p className="font-mono text-xl font-bold">{amount || '0'} BDT</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Allocated</p>
            <p className="font-mono text-xl font-bold">{summary.allocated} BDT</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Unapplied advance</p>
            <p className="font-mono text-xl font-bold">{summary.unapplied} BDT</p>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={openReview}>Review payment</Button>
      </div>
      <ConfirmDialog
        open={review}
        onOpenChange={setReview}
        title="Post supplier payment?"
        description="This writes an immutable payment and supplier-ledger entry."
        confirmLabel="Post payment"
        busy={busy}
        onConfirm={() => void post()}
      >
        <p>{suppliers.find((item) => item.id === supplierId)?.name}</p>
        <p className="mt-1">
          Payment {amount} BDT · Allocated {summary.allocated} · Advance {summary.unapplied}
        </p>
      </ConfirmDialog>
    </div>
  );
}

export function PurchaseReturnEditor({ initialReceiptId = '' }: { initialReceiptId?: string }) {
  const { api, branchId, refresh } = usePurchasing();
  const router = useRouter();
  const [receiptId, setReceiptId] = useState(initialReceiptId);
  const [receiptItemId, setReceiptItemId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [invoiceItemId, setInvoiceItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const keyRef = useRef(operationKey());
  const receipts = useQuery({
    queryKey: ['purchasing', 'return-receipts', branchId],
    queryFn: () => api<{ items: GoodsReceipt[] }>('/purchases/receipts?limit=100'),
  });
  const receipt = useQuery({
    queryKey: ['purchasing', 'receipt', receiptId],
    queryFn: () => api<GoodsReceipt>(`/purchases/receipts/${receiptId}`),
    enabled: Boolean(receiptId),
  });
  const invoices = useQuery({
    queryKey: ['purchasing', 'return-invoices', branchId, receipt.data?.supplierId],
    queryFn: () =>
      api<{ items: PurchaseInvoice[] }>(
        `/purchases/invoices?limit=100&supplierId=${receipt.data!.supplierId}`,
      ),
    enabled: Boolean(receipt.data?.supplierId),
  });
  const invoice = useQuery({
    queryKey: ['purchasing', 'invoice', invoiceId],
    queryFn: () => api<PurchaseInvoice>(`/purchases/invoices/${invoiceId}`),
    enabled: Boolean(invoiceId),
  });
  const line = receipt.data?.items?.find((item) => item.id === receiptItemId);
  const post = async () => {
    if (
      !line ||
      reason.trim().length < 3 ||
      !/^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/.test(quantity)
    ) {
      setError('Select an exact receipt line, enter a positive quantity, and provide a reason.');
      return;
    }
    if (invoiceId && !invoiceItemId) {
      setError('Select the linked invoice line for financial credit.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api<{ returnNumber: string }>('/purchases/returns', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': keyRef.current },
        body: JSON.stringify({
          receiptId,
          invoiceId: invoiceId || undefined,
          returnedAt: now(),
          reason,
          items: [
            {
              receiptItemId,
              invoiceItemId: invoiceItemId || undefined,
              unitId: line.unitId,
              quantity,
            },
          ],
        }),
      });
      keyRef.current = operationKey();
      await refresh();
      router.push(`${ROOT}/returns/${encodeURIComponent(result.returnNumber)}`);
    } catch (cause) {
      setError(
        friendlyPurchaseError(cause instanceof Error ? cause.message : 'Purchase return failed.'),
      );
    } finally {
      setBusy(false);
      setReview(false);
    }
  };
  const openReview = () => {
    if (!line || reason.trim().length < 3 || !quantity) {
      setError('Complete the receipt line, quantity and reason.');
      return;
    }
    setError('');
    setReview(true);
  };
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Post purchase return</CardTitle>
          <CardDescription>
            Return the exact original receipt line and warehouse/batch position. Financial credit
            applies only when a posted invoice line is linked.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Goods receipt" required>
            <Select
              value={receiptId}
              onChange={(e) => {
                setReceiptId(e.target.value);
                setReceiptItemId('');
                setInvoiceId('');
              }}
            >
              <option value="">Select receipt</option>
              {(receipts.data?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.receiptNumber} · {item.supplier.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Exact receipt line" required>
            <Select
              value={receiptItemId}
              onChange={(e) => {
                setReceiptItemId(e.target.value);
                setInvoiceItemId('');
              }}
            >
              <option value="">Select line</option>
              {(receipt.data?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product.sku} · {item.quantity} {item.unit.code}
                  {item.batch?.shade ? ` · Shade ${item.batch.shade}` : ''}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Posted invoice (optional)">
            <Select
              value={invoiceId}
              onChange={(e) => {
                setInvoiceId(e.target.value);
                setInvoiceItemId('');
              }}
            >
              <option value="">Received-only return</option>
              {(invoices.data?.items ?? [])
                .filter((item) => item.status !== 'DRAFT' && item.receiptId === receiptId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.invoiceNumber}
                  </option>
                ))}
            </Select>
          </FormField>
          {invoiceId ? (
            <FormField label="Invoice line" required>
              <Select value={invoiceItemId} onChange={(e) => setInvoiceItemId(e.target.value)}>
                <option value="">Select invoice line</option>
                {(invoice.data?.items ?? [])
                  .filter((item) => item.receiptItemId === receiptItemId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.product.name} · {item.lineTotal} BDT
                    </option>
                  ))}
              </Select>
            </FormField>
          ) : null}
          <FormField label={`Return quantity${line ? ` (${line.unit.code})` : ''}`} required>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </FormField>
          <FormField label="Reason" required className="md:col-span-2">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
      {line ? (
        <Card>
          <CardHeader>
            <CardTitle>Return impact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-text-muted">Inventory</p>
              <p className="font-semibold">
                −{quantity || '0'} {line.unit.code}
              </p>
              <p className="text-xs text-text-muted">
                {receipt.data?.warehouse?.name ?? 'Original receipt warehouse'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Batch / shade</p>
              <p className="font-semibold">{line.batch?.batchNumber ?? 'Not batch tracked'}</p>
              <p className="text-xs text-text-muted">
                {line.batch?.shade ? `Shade ${line.batch.shade}` : 'No shade'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Financial effect</p>
              <StatusBadge tone={invoiceId ? 'warning' : 'neutral'}>
                {invoiceId ? 'Inventory + supplier credit' : 'Inventory only'}
              </StatusBadge>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <div className="flex justify-end">
        <Button onClick={openReview}>Review purchase return</Button>
      </div>
      <ConfirmDialog
        open={review}
        onOpenChange={setReview}
        title="Post purchase return?"
        description="The original receipt and invoice remain immutable."
        confirmLabel="Post return"
        busy={busy}
        onConfirm={() => void post()}
      >
        <p>
          {line?.product.name} · {quantity} {line?.unit.code}
        </p>
        <p className="mt-1">
          {invoiceId
            ? 'Inventory deduction and supplier credit post atomically.'
            : 'Received-only: inventory deduction with no financial entry.'}
        </p>
      </ConfirmDialog>
    </div>
  );
}
