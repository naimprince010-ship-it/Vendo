import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  Input,
  MoneyDisplay,
  QuantityDisplay,
  Select,
  StatusBadge,
} from '@vendo/ui';
import type { Ref } from 'react';
import {
  baseQuantityForLine,
  configuredPrice,
  convertedQuantity,
  decimalMax,
  decimalMultiply,
  decimalAdd,
  decimalSubtract,
  productAvailability,
  decimalSum,
} from './decimal';
import type { CartLine, Customer, PaymentMethod, PosProduct, PricingMode, Sale } from './types';

function AddIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none">
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProductResult({
  mode,
  onAdd,
  product,
}: {
  mode: PricingMode;
  onAdd: () => void;
  product: PosProduct;
}) {
  const unitId = product.scannedUnitId || product.baseUnit.id;
  const unit =
    product.units.find((candidate) => candidate.unit.id === unitId)?.unit ?? product.baseUnit;
  const price = configuredPrice(product, unitId, mode);
  const available = productAvailability(product);
  const descriptor = [product.brand?.name, product.model, product.tile?.displaySize]
    .filter(Boolean)
    .join(' · ');
  return (
    <article className="group rounded-lg border border-border bg-surface p-3 transition hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
            product.type === 'TILE' ? 'bg-amber-soft text-amber' : 'bg-primary-soft text-primary'
          }`}
        >
          {product.type === 'TILE' ? 'TL' : product.type.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-text-primary">{product.name}</h3>
              <p className="truncate text-xs text-text-muted">{product.sku}</p>
            </div>
            <Button
              aria-label={`Add ${product.name}`}
              size="sm"
              className="size-8 px-0"
              onClick={onAdd}
            >
              <AddIcon />
            </Button>
          </div>
          {descriptor ? (
            <p className="mt-1 truncate text-xs text-text-secondary">{descriptor}</p>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">
              <QuantityDisplay value={available} unit={product.baseUnit.code} /> available
            </span>
            {price ? (
              <span className="text-xs">
                <MoneyDisplay value={price} /> / {unit.code}
              </span>
            ) : (
              <Badge tone="warning">No {mode.toLowerCase()} price</Badge>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ConversionSummary({ line }: { line: CartLine }) {
  const baseQuantity = baseQuantityForLine(line);
  const selectedUnit = line.product.units.find(({ unit }) => unit.id === line.unitId)?.unit;
  const equivalents = line.product.units
    .filter(({ unit }) => unit.id !== line.unitId)
    .map(({ unit, factorToBase }) => ({
      code: unit.code,
      quantity: convertedQuantity(baseQuantity, factorToBase),
    }))
    .filter(({ code }) => ['PCS', 'BOX', 'SQFT', 'SQM', 'SQ.FT', 'SQ.M'].includes(code))
    .slice(0, 3);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
      <strong className="text-text-primary">
        <QuantityDisplay value={line.quantity || '0'} unit={selectedUnit?.code} />
      </strong>
      {equivalents.map((equivalent) => (
        <span key={equivalent.code}>
          · <QuantityDisplay value={equivalent.quantity} unit={equivalent.code} />
        </span>
      ))}
    </div>
  );
}

export function PosCartRow({
  canDiscount,
  canOverridePrice,
  index,
  line,
  mode,
  onChange,
  onRemove,
}: {
  canDiscount: boolean;
  canOverridePrice: boolean;
  index: number;
  line: CartLine;
  mode: PricingMode;
  onChange: (patch: Partial<CartLine>) => void;
  onRemove: () => void;
}) {
  const batches = Array.isArray(line.product.availability) ? line.product.availability : [];
  const selectedBatch = batches.find((batch) => batch.id === line.batchId);
  const configured = configuredPrice(line.product, line.unitId, mode);
  const overrideActive = configured && configured !== line.unitPrice;
  const lineTotal = decimalMax(
    decimalAdd(
      decimalSubtract(
        decimalMultiply(line.quantity || '0', line.unitPrice || '0'),
        line.discount || '0',
      ),
      line.tax || '0',
    ),
  );
  return (
    <article className="rounded-lg border border-border bg-surface p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{line.product.name}</h3>
            <Badge tone={line.product.type === 'TILE' ? 'amber' : 'neutral'}>
              {line.product.type}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {line.product.sku}
            {line.product.tile?.displaySize ? ` · ${line.product.tile.displaySize}` : ''}
            {line.product.model ? ` · ${line.product.model}` : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 px-0 text-danger"
          aria-label={`Remove ${line.product.name}`}
          onClick={onRemove}
        >
          <RemoveIcon />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-[90px_minmax(88px,0.7fr)_minmax(110px,1fr)] gap-2">
        <FormField htmlFor={`pos-unit-${index}`} label="Unit">
          <Select
            id={`pos-unit-${index}`}
            aria-label={`Sale unit for ${line.product.name}`}
            value={line.unitId}
            onChange={(event) =>
              onChange({
                unitId: event.target.value,
                unitPrice: configuredPrice(line.product, event.target.value, mode),
              })
            }
          >
            {line.product.units.map(({ unit }) => (
              <option key={unit.id} value={unit.id}>
                {unit.code}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField htmlFor={`pos-quantity-${index}`} label="Quantity">
          <Input
            id={`pos-quantity-${index}`}
            inputMode="decimal"
            aria-label={`Sale quantity for ${line.product.name}`}
            value={line.quantity}
            onChange={(event) => onChange({ quantity: event.target.value })}
          />
        </FormField>
        <FormField
          htmlFor={`pos-price-${index}`}
          label="Unit price"
          description={
            overrideActive ? `Configured ${mode.toLowerCase()}: ${configured}` : undefined
          }
        >
          <Input
            id={`pos-price-${index}`}
            inputMode="decimal"
            aria-label={`Unit price for ${line.product.name}`}
            value={line.unitPrice}
            readOnly={!canOverridePrice}
            onChange={(event) => onChange({ unitPrice: event.target.value })}
          />
        </FormField>
      </div>

      {line.product.type === 'TILE' ? (
        <div className="mt-2 rounded-md bg-surface-secondary px-3 py-2">
          <ConversionSummary line={line} />
          {selectedBatch ? (
            <p className="mt-1 text-xs font-medium text-text-primary">
              Batch {selectedBatch.batchNumber}
              {selectedBatch.lotNumber ? ` · Lot ${selectedBatch.lotNumber}` : ''} · Shade{' '}
              {selectedBatch.shade ?? '—'}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {line.product.batchTracking ? (
          <FormField htmlFor={`pos-batch-${index}`} label="Batch / shade" required>
            <Select
              id={`pos-batch-${index}`}
              aria-label={`Sale batch and shade for ${line.product.name}`}
              value={line.batchId}
              onChange={(event) => onChange({ batchId: event.target.value })}
            >
              <option value="">Select exact batch / shade</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batchNumber} · Shade {batch.shade ?? '—'} · {batch.baseQuantity}{' '}
                  {line.product.baseUnit.code}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {canDiscount ? (
          <FormField htmlFor={`pos-discount-${index}`} label="Line discount">
            <Input
              id={`pos-discount-${index}`}
              inputMode="decimal"
              aria-label={`Line discount for ${line.product.name}`}
              value={line.discount}
              onChange={(event) => onChange({ discount: event.target.value })}
            />
          </FormField>
        ) : null}
        {canOverridePrice && overrideActive ? (
          <FormField
            className="sm:col-span-2"
            htmlFor={`pos-override-${index}`}
            label="Price override reason"
            required
          >
            <Input
              id={`pos-override-${index}`}
              aria-label={`Price override reason for ${line.product.name}`}
              value={line.overrideReason}
              onChange={(event) => onChange({ overrideReason: event.target.value })}
              placeholder="Why is this price being changed?"
            />
          </FormField>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-divider pt-2 text-xs">
        <span className="text-text-muted">
          Backend recalculates price, conversion, discount and tax.
        </span>
        <MoneyDisplay className="text-sm font-semibold" value={lineTotal} />
      </div>
    </article>
  );
}

export function PaymentRow({
  amount,
  amountRef,
  label,
  methodId,
  methods,
  onAmountChange,
  onMethodChange,
  onTenderedChange,
  tendered,
}: {
  amount: string;
  amountRef?: Ref<HTMLInputElement>;
  label: string;
  methodId: string;
  methods: PaymentMethod[];
  onAmountChange: (value: string) => void;
  onMethodChange: (value: string) => void;
  onTenderedChange: (value: string) => void;
  tendered: string;
}) {
  const method = methods.find((candidate) => candidate.id === methodId);
  return (
    <div className="rounded-md border border-border bg-surface-secondary p-2.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
        <Select
          aria-label={`${label} method`}
          value={methodId}
          onChange={(event) => onMethodChange(event.target.value)}
        >
          {methods.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.code} · {candidate.name}
            </option>
          ))}
        </Select>
        <Input
          ref={amountRef}
          inputMode="decimal"
          aria-label={`${label} applied amount`}
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder="Applied"
        />
      </div>
      {method?.isCash ? (
        <Input
          className="mt-2"
          inputMode="decimal"
          aria-label={`${label} cash tendered`}
          value={tendered}
          onChange={(event) => onTenderedChange(event.target.value)}
          placeholder="Cash tendered"
        />
      ) : null}
    </div>
  );
}

export type CheckoutValues = {
  subtotal: string;
  lineDiscount: string;
  lineTax: string;
  total: string;
  paid: string;
  due: string;
  change: string;
};

export function CheckoutSummary({
  invoiceDiscount,
  invoiceTax,
  values,
}: {
  invoiceDiscount: string;
  invoiceTax: string;
  values: CheckoutValues;
}) {
  const rows = [
    ['Subtotal', values.subtotal],
    ['Line discount', `-${values.lineDiscount}`],
    ['Invoice discount', `-${invoiceDiscount || '0'}`],
    ['Tax', decimalAddSafe(values.lineTax, invoiceTax)],
  ];
  return (
    <div className="space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{label}</span>
          <MoneyDisplay value={value} />
        </div>
      ))}
      <div className="flex items-end justify-between border-y border-divider py-3">
        <span className="text-sm font-bold uppercase tracking-wide text-text-primary">Total</span>
        <MoneyDisplay className="text-2xl font-bold" value={values.total} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-surface-secondary p-2.5">
          <p className="text-xs text-text-muted">Paid</p>
          <MoneyDisplay className="font-semibold" value={values.paid} />
        </div>
        <div className="rounded-md bg-warning-soft p-2.5">
          <p className="text-xs text-warning">Due</p>
          <MoneyDisplay className="font-semibold" value={values.due} />
        </div>
      </div>
      <div className="rounded-md bg-success-soft p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-success">Change</span>
          <MoneyDisplay className="text-base font-bold text-success" value={values.change} />
        </div>
      </div>
    </div>
  );
}

function decimalAddSafe(left: string, right: string) {
  return decimalSubtract(left, `-${right || '0'}`);
}

export function HeldSaleItem({ onResume, sale }: { onResume: () => void; sale: Sale }) {
  return (
    <button
      type="button"
      onClick={onResume}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-left outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{sale.customer.name}</span>
        <span className="block text-xs text-text-muted">{sale.invoiceNumber}</span>
      </span>
      <MoneyDisplay className="text-xs" value={sale.total} />
    </button>
  );
}

export function CartEmpty() {
  return (
    <EmptyState
      className="min-h-48"
      title="Current sale is empty"
      description="Scan a barcode or search by SKU, name, brand, model, or tile size."
    />
  );
}

export function CustomerContext({ customer }: { customer?: Customer }) {
  if (!customer) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-surface-secondary px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{customer.name}</p>
        <p className="text-xs text-text-muted">
          {customer.isWalkIn
            ? 'Walk-in customer'
            : `${customer.code}${customer.phone ? ` · ${customer.phone}` : ''}`}
        </p>
      </div>
      {customer.isWalkIn ? (
        <StatusBadge tone="neutral">Walk-in</StatusBadge>
      ) : (
        <div className="text-right text-xs text-text-secondary">
          <p>Credit limit</p>
          <MoneyDisplay value={customer.creditLimit} />
        </div>
      )}
    </div>
  );
}

export function SaleHistoryDialog({
  onOpenChange,
  onSelect,
  open,
  sale,
  sales,
}: {
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  open: boolean;
  sale?: Sale;
  sales: Sale[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b border-divider px-5 py-4">
          <DialogTitle>Recent sales</DialogTitle>
          <DialogDescription>
            Read-only access to completed invoices. Returns and refunds remain available from Sales.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
          <div className="max-h-[65vh] overflow-y-auto border-r border-divider p-3">
            <div className="space-y-2">
              {sales.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => onSelect(candidate.id)}
                  className={`block w-full rounded-md border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    candidate.id === sale?.id
                      ? 'border-primary bg-primary-soft'
                      : 'border-border hover:bg-neutral-hover'
                  }`}
                >
                  <span className="block text-sm font-semibold">{candidate.invoiceNumber}</span>
                  <span className="block truncate text-xs text-text-muted">
                    {candidate.customer.name}
                  </span>
                  <MoneyDisplay className="mt-1 text-xs" value={candidate.total} />
                </button>
              ))}
              {!sales.length ? (
                <EmptyState
                  title="No completed sales"
                  description="Completed invoices appear here."
                />
              ) : null}
            </div>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-5">
            {sale ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{sale.invoiceNumber}</h3>
                    <p className="text-sm text-text-secondary">{sale.customer.name}</p>
                  </div>
                  <StatusBadge tone="success">{sale.lifecycleStatus ?? sale.status}</StatusBadge>
                </div>
                <div className="space-y-2">
                  {sale.items?.map((line) => (
                    <div key={line.id} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{line.product.name}</p>
                          <p className="text-xs text-text-muted">
                            {line.quantity} {line.unit.code} · {line.baseQuantity}{' '}
                            {line.product.baseUnit.code}
                            {line.batch
                              ? ` · Batch ${line.batch.batchNumber} · Shade ${line.batch.shade ?? '—'}`
                              : ''}
                          </p>
                        </div>
                        <MoneyDisplay value={line.lineTotal} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-md bg-surface-secondary p-4">
                  <div className="flex justify-between text-sm">
                    <span>Total</span>
                    <MoneyDisplay className="font-bold" value={sale.total} />
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span>Current outstanding</span>
                    <MoneyDisplay value={sale.currentOutstanding ?? sale.due} />
                  </div>
                </div>
                {sale.paymentAllocations?.length ? (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Payments</h4>
                    {sale.paymentAllocations.map((allocation) => (
                      <p
                        key={`${allocation.payment.paymentNumber}-${allocation.amount}`}
                        className="mb-1 flex justify-between text-xs text-text-secondary"
                      >
                        <span>
                          {allocation.payment.paymentNumber} · {allocation.payment.method.name}
                        </span>
                        <MoneyDisplay value={allocation.amount} />
                      </p>
                    ))}
                  </div>
                ) : null}
                {sale.returns?.length ? (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Returns and refunds</h4>
                    {sale.returns.map((saleReturn) => (
                      <div key={saleReturn.id} className="mb-2 rounded-md border border-border p-3">
                        <p className="text-sm font-semibold">
                          {saleReturn.returnNumber} · {saleReturn.kind}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          Credit {saleReturn.totalCredit} · Due reduction{' '}
                          {saleReturn.receivableApplied} · Refunded{' '}
                          {decimalSum(saleReturn.refunds.map((refund) => refund.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="Select an invoice"
                description="Choose a recent completed sale to inspect its immutable snapshot."
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
