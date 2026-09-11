'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  MoneyDisplay,
  QuantityDisplay,
  StatusBadge,
} from '@vendo/ui';
import Link from 'next/link';
import { decimalCompare, decimalMax, decimalSubtract, decimalSum } from '../pos/decimal';
import { lineReturnableQuantity, returnRefundable, returnRefunded } from './finance';
import type { SaleDetail, SaleLine, SaleListItem, SaleReturn, TimelineEvent } from './types';

function dateTime(value: string | null) {
  if (!value) return 'Not completed';
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function personName(person: { firstName: string; lastName: string | null }) {
  return `${person.firstName}${person.lastName ? ` ${person.lastName}` : ''}`;
}

export function statusPresentation(status: string): {
  label: string;
  tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning';
} {
  const values: Record<
    string,
    { label: string; tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning' }
  > = {
    COMPLETED: { label: 'Completed', tone: 'success' },
    EXCHANGED: { label: 'Exchanged', tone: 'info' },
    HELD: { label: 'Held', tone: 'warning' },
    PARTIALLY_RETURNED: { label: 'Partially returned', tone: 'warning' },
    RETURNED: { label: 'Returned', tone: 'neutral' },
    VOIDED: { label: 'Voided', tone: 'danger' },
  };
  return values[status] ?? { label: status.replaceAll('_', ' '), tone: 'neutral' };
}

export function SaleListCard({ sale }: { sale: SaleListItem }) {
  const settled = decimalCompare(sale.due, '0') <= 0;
  return (
    <Link
      href={`/app/sales/${sale.id}`}
      className="grid gap-3 rounded-lg border border-border bg-surface p-4 outline-none transition hover:border-primary/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-text-primary">{sale.invoiceNumber}</span>
          <StatusBadge tone={settled ? 'success' : 'warning'}>
            {settled ? 'Settled at sale' : 'Due at sale'}
          </StatusBadge>
          <Badge tone="neutral">{sale.pricingMode.toLowerCase()}</Badge>
        </div>
        <p className="mt-1 truncate text-sm text-text-secondary">
          {sale.customer.name} · {sale.register.name} · {sale._count.items} item
          {sale._count.items === 1 ? '' : 's'}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {dateTime(sale.saleDate)} · {personName(sale.createdBy)}
        </p>
      </div>
      <div className="text-left sm:text-right">
        <MoneyDisplay className="text-base font-bold" value={sale.total} />
        <p className="mt-1 text-xs text-text-muted">Open transaction detail →</p>
      </div>
    </Link>
  );
}

export function SaleHeader({ sale }: { sale: SaleDetail }) {
  const status = statusPresentation(sale.lifecycleStatus);
  return (
    <div className="flex flex-col gap-4 border-b border-divider pb-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <Link
          className="text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
          href="/app/sales"
        >
          ← Sales history
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {sale.invoiceNumber}
          </h1>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <Badge tone="neutral">{sale.pricingMode.toLowerCase()}</Badge>
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          {dateTime(sale.completedAt ?? sale.saleDate)} · {sale.branch.name} · {sale.register.name}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3 lg:text-right">
        <div>
          <dt className="text-text-muted">Cashier</dt>
          <dd className="font-medium text-text-primary">{personName(sale.createdBy)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Customer</dt>
          <dd className="font-medium text-text-primary">{sale.customer.name}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Items</dt>
          <dd className="font-medium text-text-primary">{sale.items.length}</dd>
        </div>
      </dl>
    </div>
  );
}

function HistoricalLineContext({ line }: { line: SaleLine }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
      <span>SKU {line.skuSnapshot}</span>
      {line.tileSizeSnapshot ? <span>Size {line.tileSizeSnapshot}</span> : null}
      {line.batchNumberSnapshot ? <span>Batch {line.batchNumberSnapshot}</span> : null}
      {line.lotNumberSnapshot ? <span>Lot {line.lotNumberSnapshot}</span> : null}
      {line.shadeSnapshot ? <span>Shade {line.shadeSnapshot}</span> : null}
    </div>
  );
}

export function SaleLineTable({ sale }: { sale: SaleDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Original sale items</CardTitle>
        <p className="mt-1 text-sm text-text-secondary">
          Immutable names, units, tile size, batch, lot, shade, conversion, price and tax from the
          invoice.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-divider">
          {sale.items.map((line) => (
            <article
              key={line.id}
              className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-text-primary">{line.productNameSnapshot}</h3>
                  <Badge tone="neutral">{line.product.type.toLowerCase()}</Badge>
                </div>
                <HistoricalLineContext line={line} />
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <span>
                    <QuantityDisplay value={line.quantity} unit={line.unitCodeSnapshot} /> sold
                  </span>
                  <span>
                    <QuantityDisplay value={line.baseQuantity} unit={line.product.baseUnit.code} />{' '}
                    base
                  </span>
                  {decimalCompare(line.returnedBaseQuantity, '0') > 0 ? (
                    <span className="text-warning">
                      {line.returnedBaseQuantity} {line.product.baseUnit.code} returned
                    </span>
                  ) : null}
                </div>
              </div>
              <dl className="grid min-w-56 grid-cols-2 gap-x-5 gap-y-1 text-sm md:text-right">
                <dt className="text-text-muted">Unit price</dt>
                <dd>
                  <MoneyDisplay value={line.unitPrice} />
                </dd>
                <dt className="text-text-muted">Discount</dt>
                <dd>
                  <MoneyDisplay value={line.discount} />
                </dd>
                <dt className="text-text-muted">Tax</dt>
                <dd>
                  <MoneyDisplay value={line.tax} />
                </dd>
                <dt className="font-medium text-text-primary">Line total</dt>
                <dd>
                  <MoneyDisplay className="font-bold" value={line.lineTotal} />
                </dd>
              </dl>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialSummary({ sale }: { sale: SaleDetail }) {
  const lineDiscount = decimalSum(sale.items.map((item) => item.discount));
  const lineTax = decimalSum(sale.items.map((item) => item.tax));
  const invoiceDiscount = decimalMax(decimalSubtract(sale.discount, lineDiscount));
  const invoiceTax = decimalMax(decimalSubtract(sale.tax, lineTax));
  const credits = decimalSum(sale.returns.map((item) => item.totalCredit));
  const refunds = decimalSum(
    sale.returns.flatMap((item) => item.refunds.map((refund) => refund.amount)),
  );
  const rows = [
    ['Gross / subtotal', sale.subtotal],
    ['Line discount', lineDiscount],
    ['Invoice discount', invoiceDiscount],
    ['Tax', sale.tax, lineTax !== sale.tax ? `Line ${lineTax} · invoice ${invoiceTax}` : undefined],
    ['Net total', sale.total],
    ['Original paid', sale.paid],
    ['Credits / returns', credits],
    ['Refunded', refunds],
  ] as const;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(([label, value, detail]) => (
          <div key={label} className="flex items-start justify-between gap-4 text-sm">
            <span className="text-text-secondary">
              {label}
              {detail ? <small className="block text-text-muted">{detail}</small> : null}
            </span>
            <MoneyDisplay className={label === 'Net total' ? 'font-bold' : ''} value={value} />
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between border-t border-divider pt-3">
          <span className="font-semibold text-text-primary">Current outstanding</span>
          <MoneyDisplay
            className="text-xl font-bold text-primary"
            value={sale.currentOutstanding}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function OutstandingCard({ sale }: { sale: SaleDetail }) {
  const settled = decimalCompare(sale.currentOutstanding, '0') <= 0;
  return (
    <Card
      className={
        settled ? 'border-success/30 bg-success-soft/30' : 'border-warning/30 bg-warning-soft/30'
      }
    >
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {settled ? 'Invoice settled' : 'Outstanding due'}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {settled
              ? 'No receivable remains on this invoice.'
              : 'Derived from payments, collections, returns and exchange credits.'}
          </p>
        </div>
        <MoneyDisplay
          className={`text-2xl font-bold ${settled ? 'text-success' : 'text-warning'}`}
          value={sale.currentOutstanding}
        />
      </CardContent>
    </Card>
  );
}

export function ExchangeLinks({ sale }: { sale: SaleDetail }) {
  if (!sale.originalExchanges.length && !sale.replacementExchanges.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked exchange transactions</CardTitle>
        <p className="mt-1 text-sm text-text-secondary">
          The return and replacement remain separate immutable sales linked by the exchange record.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sale.originalExchanges.map((exchange) => (
          <div
            key={exchange.exchangeNumber}
            className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {exchange.exchangeNumber} · Replacement sale
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Credit applied <MoneyDisplay value={exchange.creditApplied} /> · settlement
                difference <MoneyDisplay value={exchange.difference} />
              </p>
            </div>
            <Link
              className="inline-flex h-control-sm items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-text-primary outline-none transition hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary"
              href={`/app/sales/${exchange.replacementSaleId}`}
            >
              Open replacement sale
            </Link>
          </div>
        ))}
        {sale.replacementExchanges.map((exchange) => (
          <div
            key={exchange.exchangeNumber}
            className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {exchange.exchangeNumber} · Original sale
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                This invoice is the replacement side of an atomic exchange.
              </p>
            </div>
            <Link
              className="inline-flex h-control-sm items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-text-primary outline-none transition hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary"
              href={`/app/sales/${exchange.originalSaleId}`}
            >
              Open original sale
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PaymentTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length ? (
          <ol className="space-y-0">
            {events.map((event, index) => (
              <li
                key={event.id}
                className="relative grid grid-cols-[18px_minmax(0,1fr)_auto] gap-3 pb-5 last:pb-0"
              >
                {index < events.length - 1 ? (
                  <span className="absolute left-[8px] top-4 h-full w-px bg-divider" />
                ) : null}
                <span
                  className={`relative z-10 mt-1 size-[18px] rounded-full border-4 border-surface ${event.tone === 'danger' ? 'bg-danger' : event.tone === 'warning' ? 'bg-warning' : event.tone === 'success' ? 'bg-success' : event.tone === 'info' ? 'bg-info' : 'bg-text-muted'}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{event.label}</p>
                  <p className="text-xs text-text-muted">
                    {dateTime(event.timestamp)}
                    {event.reference ? ` · ${event.reference}` : ''}
                    {event.method ? ` · ${event.method}` : ''}
                  </p>
                  {event.detail ? (
                    <p className="mt-1 text-xs text-text-secondary">{event.detail}</p>
                  ) : null}
                </div>
                <MoneyDisplay className="text-sm" value={event.amount} />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="No financial events"
            description="Posted transaction events will appear here."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function ReturnLineSelector({
  selections,
  setSelection,
  sale,
}: {
  selections: Record<string, string>;
  setSelection(id: string, value: string): void;
  sale: SaleDetail;
}) {
  return (
    <div className="space-y-3">
      {sale.items.map((line) => {
        const remaining = lineReturnableQuantity(
          line.returnableBaseQuantity,
          line.conversionFactor,
        );
        return (
          <div
            key={line.id}
            className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-end"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">{line.productNameSnapshot}</p>
              <p className="mt-1 text-xs text-text-secondary">
                Sold {line.quantity} {line.unitCodeSnapshot} · previously returned{' '}
                {line.returnedBaseQuantity} {line.product.baseUnit.code} · returnable {remaining}{' '}
                {line.unitCodeSnapshot}
              </p>
              {line.batchNumberSnapshot ? (
                <p className="mt-1 text-xs text-text-muted">
                  Restock target: {sale.warehouse.name} · Batch {line.batchNumberSnapshot}
                  {line.lotNumberSnapshot ? ` · Lot ${line.lotNumberSnapshot}` : ''} · Shade{' '}
                  {line.shadeSnapshot ?? '—'}
                </p>
              ) : null}
            </div>
            <label className="grid gap-1 text-xs font-medium text-text-secondary">
              Return quantity
              <input
                aria-label={`Return quantity for ${line.productNameSnapshot}`}
                className="h-control-md rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                inputMode="decimal"
                max={remaining}
                min="0"
                value={selections[line.id] ?? ''}
                onChange={(event) => setSelection(line.id, event.target.value)}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}

export function RefundSummary({ saleReturn }: { saleReturn: SaleReturn }) {
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-md bg-surface-secondary p-4 text-sm">
      <dt className="text-text-secondary">Return credit</dt>
      <dd className="text-right">
        <MoneyDisplay value={saleReturn.totalCredit} />
      </dd>
      <dt className="text-text-secondary">Applied to due</dt>
      <dd className="text-right">
        <MoneyDisplay value={saleReturn.receivableApplied} />
      </dd>
      <dt className="text-text-secondary">Prior refunds</dt>
      <dd className="text-right">
        <MoneyDisplay value={returnRefunded(saleReturn)} />
      </dd>
      <dt className="font-semibold text-text-primary">Available refundable</dt>
      <dd className="text-right">
        <MoneyDisplay className="font-bold" value={returnRefundable(saleReturn)} />
      </dd>
    </dl>
  );
}

export function PostSaleActionBar({
  canCollect,
  canExchange,
  canRefund,
  canReturn,
  canVoid,
  onCollect,
  onExchange,
  onRefund,
  onReturn,
  onPrint,
  onVoid,
  sale,
}: {
  canCollect: boolean;
  canExchange: boolean;
  canRefund: boolean;
  canReturn: boolean;
  canVoid: boolean;
  onCollect(): void;
  onExchange(): void;
  onRefund(): void;
  onReturn(): void;
  onPrint(): void;
  onVoid(): void;
  sale: SaleDetail;
}) {
  const hasOutstanding = decimalCompare(sale.currentOutstanding, '0') > 0;
  const hasReturnable = sale.items.some(
    (line) => decimalCompare(line.returnableBaseQuantity, '0') > 0,
  );
  const hasRefundable = sale.returns.some(
    (item) => decimalCompare(returnRefundable(item), '0') > 0,
  );
  return (
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/95 p-3 shadow-dialog backdrop-blur">
      {canCollect && hasOutstanding && !sale.customer.isWalkIn ? (
        <Button onClick={onCollect}>Collect due</Button>
      ) : null}
      {canReturn && hasReturnable ? (
        <Button variant="outline" onClick={onReturn}>
          Return items
        </Button>
      ) : null}
      {canExchange && hasReturnable ? (
        <Button variant="outline" onClick={onExchange}>
          Exchange
        </Button>
      ) : null}
      {canRefund && hasRefundable ? (
        <Button variant="ghost" className="text-danger" onClick={onRefund}>
          Refund credit
        </Button>
      ) : null}
      <Button variant="outline" onClick={onPrint}>
        Print / reprint
      </Button>
      {canVoid && hasReturnable ? (
        <Button className="ml-auto" variant="danger" onClick={onVoid}>
          Void sale
        </Button>
      ) : null}
    </div>
  );
}
