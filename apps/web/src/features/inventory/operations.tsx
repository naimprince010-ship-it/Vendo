'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  FormField,
  Input,
  LoadingState,
  Pagination,
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
import { useMemo, useState } from 'react';
import { useInventory } from './inventory-context';
import {
  countTone,
  friendlyInventoryError,
  multiplyDecimal,
  normalizeDecimal,
  selectProductForLine,
  stockLineIssues,
  subtractDecimal,
} from './presentation';
import type {
  Batch,
  CountDetail,
  CountSummary,
  Page,
  ProductDetail,
  StockLineDraft,
} from './types';

const ROOT = '/app/inventory';
const PAGE_SIZE = 20;

function operationKey() {
  return crypto.randomUUID();
}

const nonNegativeQuantity = /^(?:0|0\.\d+|[1-9]\d*(?:\.\d+)?)$/;

function errorText(error: unknown) {
  return friendlyInventoryError(error instanceof Error ? error.message : 'The operation failed.');
}

function newLine(): StockLineDraft {
  return { key: crypto.randomUUID(), productId: '', unitId: '', batchId: '', quantity: '' };
}

function unitOptions(product?: ProductDetail) {
  if (!product) return [];
  return [
    { unit: product.baseUnit, factor: '1' },
    ...product.conversions.map((conversion) => ({
      unit: conversion.fromUnit,
      factor: conversion.factorToBase,
    })),
  ];
}

function StockLineEditor({
  line,
  onChange,
  onRemove,
  warehouseId,
}: {
  line: StockLineDraft;
  onChange: (next: StockLineDraft) => void;
  onRemove?: () => void;
  warehouseId?: string;
}) {
  const { api, branchId, products } = useInventory();
  const productQuery = useQuery({
    queryKey: ['inventory', 'product-detail', line.productId],
    queryFn: () => api<ProductDetail>(`/products/${line.productId}`, {}, branchId),
    enabled: Boolean(line.productId),
  });
  const product = productQuery.data;
  const batches = useQuery({
    queryKey: ['inventory', 'batches', line.productId, 'active'],
    queryFn: () =>
      api<Page<Batch>>(
        `/inventory/batches?limit=100&productId=${line.productId}&isActive=true`,
        {},
        branchId,
      ),
    enabled: Boolean(product?.batchTracking),
  });
  const balance = useQuery({
    queryKey: ['inventory', 'position-preview', warehouseId, line.productId, line.batchId],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: '10',
        warehouseId: warehouseId!,
        productId: line.productId,
      });
      if (line.batchId) params.set('batchId', line.batchId);
      return api<Page<{ baseQuantity: string }>>(`/inventory/balances?${params}`, {}, branchId);
    },
    enabled: Boolean(warehouseId && line.productId),
  });
  const options = unitOptions(product);
  const selected = options.find((option) => option.unit.id === line.unitId);
  const baseChange =
    line.quantity && selected ? multiplyDecimal(line.quantity, selected.factor) : null;

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-surface-subtle p-4 lg:grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_auto]">
      <FormField htmlFor={`product-${line.key}`} label="Product">
        <Select
          id={`product-${line.key}`}
          value={line.productId}
          onChange={(event) => {
            const selectedProduct = products.find((item) => item.id === event.target.value);
            onChange(selectProductForLine(line, selectedProduct));
          }}
        >
          <option value="">Select product</option>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.sku} — {item.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField htmlFor={`unit-${line.key}`} label="Unit">
        <Select
          id={`unit-${line.key}`}
          value={line.unitId}
          disabled={!product}
          onChange={(event) => onChange({ ...line, unitId: event.target.value })}
        >
          {options.map((option) => (
            <option key={option.unit.id} value={option.unit.id}>
              {option.unit.code}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        htmlFor={`batch-${line.key}`}
        label={product?.batchTracking ? 'Batch / shade' : 'Batch'}
      >
        <Select
          id={`batch-${line.key}`}
          value={line.batchId}
          disabled={!product?.batchTracking}
          onChange={(event) => onChange({ ...line, batchId: event.target.value })}
        >
          <option value="">
            {product?.batchTracking ? 'Select required batch' : 'Not applicable'}
          </option>
          {batches.data?.items.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.batchNumber}
              {batch.shade ? ` · Shade ${batch.shade}` : ''}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        htmlFor={`quantity-${line.key}`}
        label="Quantity"
        description={baseChange ? `${baseChange} ${product?.baseUnit.code} base change` : undefined}
      >
        <Input
          id={`quantity-${line.key}`}
          inputMode="decimal"
          value={line.quantity}
          onChange={(event) => onChange({ ...line, quantity: event.target.value })}
          placeholder="0"
        />
      </FormField>
      <div className="flex items-end gap-2">
        {balance.data?.items[0] ? (
          <span className="pb-2 text-xs text-text-muted" title="Current base stock">
            Stock {normalizeDecimal(balance.data.items[0].baseQuantity)} {product?.baseUnit.code}
          </span>
        ) : null}
        {onRemove ? (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function BatchCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  onCreated?(): void | Promise<void>;
}) {
  const { api, branchId, products, refresh } = useInventory();
  const client = useQueryClient();
  const [productId, setProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [shade, setShade] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
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
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['inventory', 'batches'] });
      await refresh();
      await onCreated?.();
      setProductId('');
      setBatchNumber('');
      setLotNumber('');
      setShade('');
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create batch / lot / shade</DialogTitle>
          <DialogDescription>
            Use the exact manufacturer identity. Inventory will never assign this silently.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {mutation.error ? <Alert tone="danger">{errorText(mutation.error)}</Alert> : null}
          <FormField htmlFor="batch-product" label="Batch-tracked product">
            <Select
              id="batch-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Select product</option>
              {products
                .filter((p) => p.batchTracking)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField htmlFor="batch-number" label="Batch number">
            <Input
              id="batch-number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
            />
          </FormField>
          <FormField htmlFor="lot-number" label="Lot number" optional>
            <Input
              id="lot-number"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
            />
          </FormField>
          <FormField htmlFor="batch-shade" label="Shade" optional>
            <Input id="batch-shade" value={shade} onChange={(e) => setShade(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={!productId || !batchNumber.trim()}
            onClick={() => mutation.mutate()}
          >
            Create batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type OperationKind = 'opening' | 'adjustments' | 'damage-loss' | 'transfers';

const OPERATION_META = {
  opening: {
    title: 'Post opening stock',
    description: 'Initialize a new stock position. Use adjustments for routine corrections.',
    endpoint: 'opening',
    permission: 'inventory.opening_stock',
  },
  adjustments: {
    title: 'Adjust stock',
    description: 'Record a deliberate stock correction with an explicit direction and reason.',
    endpoint: 'adjustments',
    permission: 'inventory.adjust',
  },
  'damage-loss': {
    title: 'Record damage or loss',
    description: 'Remove unusable or missing stock from the exact warehouse and batch.',
    endpoint: 'damage',
    permission: 'inventory.damage',
  },
  transfers: {
    title: 'Transfer warehouse stock',
    description: 'One atomic request deducts the source and adds the destination.',
    endpoint: 'transfers',
    permission: 'inventory.transfer',
  },
} as const;

export function StockOperationWorkspace({ kind }: { kind: OperationKind }) {
  const { api, branchId, branchName, warehouses, products, can, refresh } = useInventory();
  const meta = OPERATION_META[kind];
  const [warehouseId, setWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [damageKind, setDamageKind] = useState<'damage' | 'loss'>('damage');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<StockLineDraft[]>([newLine()]);
  const [review, setReview] = useState(false);
  const [success, setSuccess] = useState('');
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [key, setKey] = useState(operationKey);
  const allowed = can(
    kind === 'damage-loss' && damageKind === 'loss' ? 'inventory.loss' : meta.permission,
  );
  const selectedWarehouse = warehouses.find((item) => item.id === warehouseId);
  const destination = warehouses.find((item) => item.id === destinationWarehouseId);
  const lineIssues = stockLineIssues(lines, products);
  const validate = () => {
    const issues = [...lineIssues];
    if (!warehouseId) issues.unshift('Select a warehouse.');
    if (reason.trim().length < 3) issues.push('Enter a reason of at least 3 characters.');
    if (kind === 'transfers' && !destinationWarehouseId) {
      issues.push('Select a destination warehouse.');
    } else if (kind === 'transfers' && destinationWarehouseId === warehouseId) {
      issues.push('Source and destination warehouses must be different.');
    }
    setValidationIssues(issues);
    return issues.length === 0;
  };
  const mutation = useMutation({
    mutationFn: () => {
      const payloadLines = lines.map(({ productId, unitId, batchId, quantity }) => ({
        productId,
        unitId,
        ...(batchId && { batchId }),
        quantity,
      }));
      const body =
        kind === 'transfers'
          ? { sourceWarehouseId: warehouseId, destinationWarehouseId, reason, lines: payloadLines }
          : {
              warehouseId,
              reason,
              lines: payloadLines,
              ...(kind === 'adjustments' && { direction }),
            };
      const endpoint = kind === 'damage-loss' ? damageKind : meta.endpoint;
      return api(
        `/inventory/${endpoint}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': key },
          body: JSON.stringify(body),
        },
        branchId,
      );
    },
    onSuccess: async () => {
      await refresh();
      setReview(false);
      setSuccess(
        `${meta.title} completed. The movement ledger and base balance were updated atomically.`,
      );
      setReason('');
      setLines([newLine()]);
      setValidationIssues([]);
      setKey(operationKey());
    },
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Inventory · Operations</p>
        <h1 className="mt-1 text-2xl font-bold text-text-primary">{meta.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{meta.description}</p>
      </div>
      {!allowed ? (
        <Alert tone="warning">You do not have permission for this operation.</Alert>
      ) : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
      {mutation.error ? <Alert tone="danger">{errorText(mutation.error)}</Alert> : null}
      {validationIssues.length ? (
        <Alert tone="warning" title="Complete the required fields">
          <ul className="list-disc space-y-1 pl-5">
            {validationIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Location and impact</CardTitle>
          <CardDescription>
            Branch: {branchName}. Warehouse selection is always explicit.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField
            htmlFor="operation-warehouse"
            label={kind === 'transfers' ? 'From warehouse' : 'Warehouse'}
          >
            <Select
              id="operation-warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </Select>
          </FormField>
          {kind === 'transfers' ? (
            <FormField htmlFor="destination-warehouse" label="To warehouse">
              <Select
                id="destination-warehouse"
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
              >
                <option value="">Select destination</option>
                {warehouses
                  .filter((w) => w.id !== warehouseId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
              </Select>
            </FormField>
          ) : null}
          {kind === 'adjustments' ? (
            <FormField htmlFor="adjustment-direction" label="Direction">
              <Select
                id="adjustment-direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'IN' | 'OUT')}
              >
                <option value="IN">Add stock</option>
                <option value="OUT">Remove stock</option>
              </Select>
            </FormField>
          ) : null}
          {kind === 'damage-loss' ? (
            <FormField htmlFor="removal-type" label="Removal type">
              <Select
                id="removal-type"
                value={damageKind}
                onChange={(e) => setDamageKind(e.target.value as 'damage' | 'loss')}
              >
                <option value="damage">Damage</option>
                <option value="loss">Loss</option>
              </Select>
            </FormField>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Stock lines</CardTitle>
          <CardDescription>
            Transaction units are converted by the backend into one authoritative base quantity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, index) => (
            <StockLineEditor
              key={line.key}
              line={line}
              warehouseId={warehouseId}
              onChange={(next) =>
                setLines((current) => current.map((item) => (item.key === next.key ? next : item)))
              }
              onRemove={
                lines.length > 1
                  ? () =>
                      setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  : undefined
              }
            />
          ))}
          <Button variant="outline" onClick={() => setLines((current) => [...current, newLine()])}>
            Add another line
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Posting reason</CardTitle>
          <CardDescription>
            This reason becomes part of the immutable movement history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField htmlFor="operation-reason" label="Reason">
            <Input
              id="operation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="At least 3 characters"
            />
          </FormField>
          <div className="mt-4 flex justify-end">
            <Button
              variant={kind === 'damage-loss' ? 'danger' : 'primary'}
              disabled={!allowed || mutation.isPending}
              onClick={() => {
                if (validate()) setReview(true);
              }}
            >
              Review impact
            </Button>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={review} onOpenChange={setReview}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {meta.title.toLowerCase()}</AlertDialogTitle>
            <AlertDialogDescription>
              This creates immutable movement records. The backend validates conversions, batch
              rules, stock policy and concurrency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 rounded-lg bg-surface-subtle p-4 text-sm">
            <p>
              <strong>{kind === 'transfers' ? 'From' : 'Warehouse'}:</strong>{' '}
              {selectedWarehouse?.name}
            </p>
            {destination ? (
              <p>
                <strong>To:</strong> {destination.name}
              </p>
            ) : null}
            <p>
              <strong>Lines:</strong> {lines.length}
            </p>
            <p>
              <strong>Reason:</strong> {reason}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant={kind === 'damage-loss' ? 'danger' : 'primary'}
                loading={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                Post operation
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function CountList() {
  const { api, branchId, warehouses, can } = useInventory();
  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const params = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (warehouseId) value.set('warehouseId', warehouseId);
    if (status) value.set('status', status);
    return value;
  }, [page, status, warehouseId]);
  const query = useQuery({
    queryKey: ['inventory', 'counts', params.toString()],
    queryFn: () => api<Page<CountSummary>>(`/inventory/counts?${params}`, {}, branchId),
  });
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Inventory · Control</p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">Physical stock counts</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Draft, review and reconcile exact warehouse positions.
          </p>
        </div>
        {can('inventory.count') ? (
          <Button onClick={() => setCreateOpen(true)}>New count</Button>
        ) : null}
      </div>
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
          <FormField htmlFor="count-warehouse-filter" label="Warehouse">
            <Select
              id="count-warehouse-filter"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField htmlFor="count-status-filter" label="Status">
            <Select
              id="count-status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_REVIEW">In review</option>
              <option value="POSTED">Posted</option>
            </Select>
          </FormField>
        </CardContent>
      </Card>
      {query.isLoading ? (
        <LoadingState title="Loading counts" />
      ) : query.error ? (
        <ErrorState description={errorText(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data?.items.length ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Count</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Positions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((count) => (
                  <TableRow key={count.id}>
                    <TableCell className="font-mono font-semibold">{count.countNumber}</TableCell>
                    <TableCell>{count.warehouse.name}</TableCell>
                    <TableCell>{count._count.items}</TableCell>
                    <TableCell>
                      <StatusBadge tone={countTone(count.status)}>
                        {count.status.replace('_', ' ')}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>{new Date(count.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Link
                        className="inline-flex h-control-sm items-center rounded-md px-3 text-xs font-semibold text-primary hover:bg-primary-soft"
                        href={`${ROOT}/counts/${count.id}`}
                      >
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={page}
            pageCount={Math.max(1, Math.ceil(query.data.total / PAGE_SIZE))}
            totalItems={query.data.total}
            onPrevious={page > 1 ? () => setPage((value) => value - 1) : undefined}
            onNext={
              page * PAGE_SIZE < query.data.total ? () => setPage((value) => value + 1) : undefined
            }
          />
        </>
      ) : (
        <EmptyState
          title="No physical counts"
          description="Create a count for an explicit warehouse when you are ready to reconcile."
        />
      )}
      <CreateCountDialog open={createOpen} onOpenChange={setCreateOpen} />
    </section>
  );
}

function CreateCountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const { api, branchId, warehouses, products, refresh } = useInventory();
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<StockLineDraft[]>([newLine()]);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const mutation = useMutation({
    mutationFn: () =>
      api(
        '/inventory/counts',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            warehouseId,
            countNumber: `COUNT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
            ...(notes.trim() && { notes }),
            items: lines.map(({ productId, unitId, batchId, quantity }) => ({
              productId,
              unitId,
              ...(batchId && { batchId }),
              quantity,
            })),
          }),
        },
        branchId,
      ),
    onSuccess: async () => {
      await refresh();
      setWarehouseId('');
      setNotes('');
      setLines([newLine()]);
      setValidationIssues([]);
      onOpenChange(false);
    },
  });
  const validate = () => {
    const issues = stockLineIssues(lines, products, true);
    if (!warehouseId) issues.unshift('Select a warehouse.');
    setValidationIssues(issues);
    return issues.length === 0;
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create physical count</DialogTitle>
          <DialogDescription>
            The current balance/version is snapshotted when the draft is created.
          </DialogDescription>
        </DialogHeader>
        {mutation.error ? <Alert tone="danger">{errorText(mutation.error)}</Alert> : null}
        {validationIssues.length ? (
          <Alert tone="warning" title="Complete the required fields">
            <ul className="list-disc space-y-1 pl-5">
              {validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <div className="grid gap-4">
          <FormField htmlFor="create-count-warehouse" label="Warehouse">
            <Select
              id="create-count-warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </FormField>
          {lines.map((line, index) => (
            <StockLineEditor
              key={line.key}
              line={line}
              warehouseId={warehouseId}
              onChange={(next) =>
                setLines((current) => current.map((item) => (item.key === next.key ? next : item)))
              }
              onRemove={
                lines.length > 1
                  ? () =>
                      setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  : undefined
              }
            />
          ))}
          <Button variant="outline" onClick={() => setLines((current) => [...current, newLine()])}>
            Add count line
          </Button>
          <FormField htmlFor="count-notes" label="Notes" optional>
            <Input id="count-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={mutation.isPending}
            onClick={() => {
              if (validate()) mutation.mutate();
            }}
          >
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountDetailView({ countId }: { countId: string }) {
  const { api, branchId, can, refresh } = useInventory();
  const [confirm, setConfirm] = useState<'review' | 'reopen' | 'post' | null>(null);
  const [postKey, setPostKey] = useState(operationKey);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ['inventory', 'count', countId],
    queryFn: () => api<CountDetail>(`/inventory/counts/${countId}`, {}, branchId),
  });
  const action = useMutation({
    mutationFn: (name: 'review' | 'reopen' | 'post') =>
      api(
        `/inventory/counts/${countId}/${name}`,
        { method: 'POST', ...(name === 'post' && { headers: { 'idempotency-key': postKey } }) },
        branchId,
      ),
    onSuccess: async (_, name) => {
      await refresh();
      await query.refetch();
      setConfirm(null);
      if (name === 'post') setPostKey(operationKey());
    },
  });
  const save = useMutation({
    mutationFn: (count: CountDetail) =>
      api(
        `/inventory/counts/${countId}/items`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            items: count.items.map((item) => ({
              productId: item.productId,
              unitId: item.unit.id,
              ...(item.batchId && { batchId: item.batchId }),
              quantity: draftQuantities[item.id] ?? item.transactionQuantity,
            })),
          }),
        },
        branchId,
      ),
    onSuccess: async () => {
      await refresh();
      await query.refetch();
    },
  });
  if (query.isLoading) return <LoadingState title="Loading count" />;
  if (query.error || !query.data)
    return <ErrorState description={errorText(query.error)} onRetry={() => void query.refetch()} />;
  const count = query.data;
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            className="text-sm font-semibold text-primary hover:underline"
            href={`${ROOT}/counts`}
          >
            ← All counts
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-text-primary">{count.countNumber}</h1>
          <p className="text-sm text-text-secondary">
            {count.warehouse.name} · snapshot-protected reconciliation
          </p>
        </div>
        <div className="flex gap-2">
          {count.status === 'DRAFT' && can('inventory.count') ? (
            <Button onClick={() => setConfirm('review')}>Send to review</Button>
          ) : null}
          {count.status === 'IN_REVIEW' && can('inventory.count') ? (
            <Button variant="outline" onClick={() => setConfirm('reopen')}>
              Reopen
            </Button>
          ) : null}
          {count.status === 'IN_REVIEW' && can('inventory.reconcile') ? (
            <Button onClick={() => setConfirm('post')}>Post reconciliation</Button>
          ) : null}
        </div>
      </div>
      {action.error || save.error ? (
        <Alert tone="danger">{errorText(action.error ?? save.error)}</Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Count positions</CardTitle>
          <CardDescription>
            Only each variance becomes an inventory movement; the counted total is not reposted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch / shade</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Counted</TableHead>
                  <TableHead>Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {count.items.map((item) => {
                  const countedBase =
                    count.status === 'DRAFT' &&
                    nonNegativeQuantity.test(draftQuantities[item.id] ?? '')
                      ? multiplyDecimal(
                          draftQuantities[item.id] ?? item.transactionQuantity,
                          item.conversionFactor,
                        )
                      : item.countedQuantity;
                  const variance = subtractDecimal(countedBase, item.snapshotQuantity);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold">
                        {item.product.name}
                        <p className="font-mono text-xs text-text-muted">{item.product.sku}</p>
                      </TableCell>
                      <TableCell>
                        {item.batch
                          ? `${item.batch.batchNumber}${item.batch.shade ? ` · Shade ${item.batch.shade}` : ''}`
                          : 'Not batch tracked'}
                      </TableCell>
                      <TableCell>
                        {normalizeDecimal(item.snapshotQuantity)} {item.product.baseUnit.code}
                      </TableCell>
                      <TableCell>
                        {count.status === 'DRAFT' ? (
                          <div className="min-w-44">
                            <Input
                              aria-label={`Counted quantity for ${item.product.name}`}
                              inputMode="decimal"
                              value={draftQuantities[item.id] ?? item.transactionQuantity}
                              onChange={(event) =>
                                setDraftQuantities((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                            />
                            <p className="mt-1 text-xs text-text-muted">
                              {item.unit.code} · snapshot factor {item.conversionFactor}
                            </p>
                          </div>
                        ) : (
                          <>
                            {normalizeDecimal(item.countedQuantity)} {item.product.baseUnit.code}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            variance.startsWith('-')
                              ? 'font-semibold text-danger'
                              : variance === '0'
                                ? 'text-text-muted'
                                : 'font-semibold text-success'
                          }
                        >
                          {variance} {item.product.baseUnit.code}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {count.status === 'DRAFT' && can('inventory.count') ? (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                loading={save.isPending}
                disabled={Object.values(draftQuantities).some(
                  (quantity) => !nonNegativeQuantity.test(quantity),
                )}
                onClick={() => save.mutate(count)}
              >
                Save count entries
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'post'
                ? 'Post reconciliation?'
                : confirm === 'reopen'
                  ? 'Reopen this count?'
                  : 'Move count to review?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'post'
                ? 'The backend will reject stale snapshots and post only variance movements.'
                : 'The lifecycle transition is controlled by the backend.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button loading={action.isPending} onClick={() => confirm && action.mutate(confirm)}>
                Confirm
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function CountWorkspace({ countId }: { countId?: string }) {
  return countId ? <CountDetailView countId={countId} /> : <CountList />;
}
