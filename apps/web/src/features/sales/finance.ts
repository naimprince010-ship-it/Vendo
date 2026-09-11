import {
  decimalCompare,
  decimalDivide,
  decimalMax,
  decimalMultiply,
  decimalSubtract,
  decimalSum,
} from '../pos/decimal';
import type { SaleDetail, SaleReturn, TimelineEvent } from './types';

export function returnRefunded(saleReturn: SaleReturn) {
  return decimalSum(saleReturn.refunds.map((refund) => refund.amount));
}

export function returnRefundable(saleReturn: SaleReturn) {
  return decimalMax(
    decimalSubtract(
      decimalSubtract(
        decimalSubtract(saleReturn.totalCredit, saleReturn.receivableApplied),
        saleReturn.exchange?.creditApplied ?? '0',
      ),
      returnRefunded(saleReturn),
    ),
  );
}

export function lineReturnableQuantity(baseQuantity: string, conversionFactor: string) {
  return decimalDivide(baseQuantity, conversionFactor, 6);
}

export function collectionAllocation(amount: string, outstanding: string) {
  if (decimalCompare(amount || '0', outstanding) > 0) return outstanding;
  return decimalMax(amount || '0');
}

export function collectionAdvance(amount: string, outstanding: string) {
  return decimalMax(decimalSubtract(amount || '0', outstanding));
}

export function returnCreditPreview(sale: SaleDetail, selections: Record<string, string>) {
  return decimalSum(
    sale.items.map((line) => {
      const quantity = selections[line.id] ?? '0';
      if (decimalCompare(quantity, '0') <= 0) return '0';
      const selectedBase = decimalMultiply(quantity, line.conversionFactor);
      return decimalMultiply(
        sale.total,
        decimalDivide(
          decimalMultiply(line.lineTotal, selectedBase),
          decimalMultiply(decimalSum(sale.items.map((item) => item.lineTotal)), line.baseQuantity),
          8,
        ),
      );
    }),
  );
}

export function saleTimeline(
  sale: SaleDetail,
  collections: Array<{
    id: string;
    paymentNumber: string;
    amount: string;
    paidAt: string;
    method: { name: string };
    reference: string | null;
  }>,
): TimelineEvent[] {
  const originalPaymentIds = new Set(sale.paymentAllocations.map(({ payment }) => payment.id));
  const events: TimelineEvent[] = [
    {
      amount: sale.total,
      detail: `${sale.items.length} item${sale.items.length === 1 ? '' : 's'} · ${sale.pricingMode.toLowerCase()} pricing`,
      id: `sale-${sale.id}`,
      label: 'Sale completed',
      reference: sale.invoiceNumber,
      timestamp: sale.completedAt ?? sale.saleDate,
      tone: 'success',
    },
    ...sale.paymentAllocations.map(({ amount, payment }) => ({
      amount,
      id: `payment-${payment.id}`,
      label: 'Original sale payment',
      method: payment.method.name,
      reference: payment.paymentNumber,
      timestamp: payment.paidAt,
      tone: 'info' as const,
    })),
    ...collections
      .filter((payment) => !originalPaymentIds.has(payment.id))
      .map((payment) => ({
        amount: payment.amount,
        detail: payment.reference ?? undefined,
        id: `collection-${payment.id}`,
        label: 'Due collection',
        method: payment.method.name,
        reference: payment.paymentNumber,
        timestamp: payment.paidAt,
        tone: 'success' as const,
      })),
    ...sale.returns.flatMap((saleReturn) => [
      {
        amount: saleReturn.totalCredit,
        detail: saleReturn.reason,
        id: `return-${saleReturn.id}`,
        label: saleReturn.kind === 'VOID' ? 'Sale voided' : 'Return credit posted',
        reference: saleReturn.returnNumber,
        timestamp: saleReturn.returnedAt,
        tone: saleReturn.kind === 'VOID' ? ('danger' as const) : ('warning' as const),
      },
      ...saleReturn.refunds.map((refund) => ({
        amount: refund.amount,
        id: `refund-${refund.payment.id}`,
        label: 'Refund paid',
        method: refund.payment.method.name,
        reference: refund.payment.paymentNumber,
        timestamp: refund.payment.paidAt,
        tone: 'danger' as const,
      })),
      ...(saleReturn.exchange
        ? [
            {
              amount: saleReturn.exchange.creditApplied,
              detail: `Replacement difference ${saleReturn.exchange.difference}`,
              id: `exchange-${saleReturn.exchange.exchangeNumber}`,
              label: 'Exchange credit applied',
              reference: saleReturn.exchange.exchangeNumber,
              timestamp: saleReturn.createdAt,
              tone: 'info' as const,
            },
          ]
        : []),
    ]),
  ];
  return events.sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
}
