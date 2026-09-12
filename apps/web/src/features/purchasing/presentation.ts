const decimalPattern = /^(-?)(\d+)(?:\.(\d+))?$/;
const positivePattern = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;
const nonNegativePattern = /^(?:0|0\.\d+|[1-9]\d*(?:\.\d+)?)$/;

function decimalParts(value: string) {
  const match = decimalPattern.exec(value.trim());
  if (!match) throw new Error('Invalid decimal value');
  return { negative: match[1] === '-', whole: match[2]!, fraction: match[3] ?? '' };
}

export function normalizeDecimal(value: string) {
  const parts = decimalParts(value);
  const whole = parts.whole.replace(/^0+(?=\d)/, '') || '0';
  const fraction = parts.fraction.replace(/0+$/, '');
  const unsigned = fraction ? `${whole}.${fraction}` : whole;
  return parts.negative && unsigned !== '0' ? `-${unsigned}` : unsigned;
}

function scaled(value: string, scale: number) {
  const parts = decimalParts(value);
  const raw = BigInt(`${parts.whole}${parts.fraction.padEnd(scale, '0')}`);
  return parts.negative ? -raw : raw;
}

export function addDecimal(...values: string[]) {
  if (!values.length) return '0';
  const scale = Math.max(...values.map((value) => decimalParts(value).fraction.length));
  const result = values.reduce((sum, value) => sum + scaled(value, scale), BigInt(0));
  const negative = result < BigInt(0);
  const digits = (negative ? -result : result).toString().padStart(scale + 1, '0');
  const raw = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
  return normalizeDecimal(`${negative ? '-' : ''}${raw}`);
}

export function subtractDecimal(left: string, right: string) {
  const normalizedRight = normalizeDecimal(right);
  return addDecimal(left, normalizedRight === '0' ? '0' : `-${normalizedRight}`);
}

export function multiplyDecimal(left: string, right: string) {
  const a = decimalParts(left);
  const b = decimalParts(right);
  const scale = a.fraction.length + b.fraction.length;
  const rawA = BigInt(`${a.whole}${a.fraction}`);
  const rawB = BigInt(`${b.whole}${b.fraction}`);
  const result = rawA * rawB;
  const negative = a.negative !== b.negative && result !== BigInt(0);
  const digits = result.toString().padStart(scale + 1, '0');
  const raw = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
  return normalizeDecimal(`${negative ? '-' : ''}${raw}`);
}

export function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    APPROVED: 'Confirmed',
    PARTIALLY_RECEIVED: 'Partially received',
    RECEIVED: 'Received',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  };
  return labels[status] ?? status.toLowerCase().replace(/_/g, ' ');
}

export function documentStatusTone(status: string) {
  if (['APPROVED', 'POSTED', 'PAID', 'RECEIVED', 'CLOSED'].includes(status))
    return 'success' as const;
  if (['SUBMITTED', 'PARTIALLY_RECEIVED', 'PARTIALLY_PAID'].includes(status))
    return 'warning' as const;
  if (['CANCELLED', 'VOIDED'].includes(status)) return 'danger' as const;
  return 'neutral' as const;
}

export function receivingProgress(received: string, ordered: string) {
  const remaining = subtractDecimal(ordered, received);
  return { ordered: normalizeDecimal(ordered), received: normalizeDecimal(received), remaining };
}

export function invoiceFinancials(
  total: string,
  allocations: Array<{ amount: string }> = [],
  returns: Array<{ financialTotal: string }> = [],
) {
  const paid = addDecimal('0', ...allocations.map((row) => row.amount));
  const credited = addDecimal('0', ...returns.map((row) => row.financialTotal));
  return { paid, credited, outstanding: subtractDecimal(subtractDecimal(total, paid), credited) };
}

export function paymentAllocationSummary(amount: string, allocations: Array<{ amount: string }>) {
  const allocated = addDecimal('0', ...allocations.map((row) => row.amount));
  return { allocated, unapplied: subtractDecimal(amount, allocated) };
}

export function lineDraftIssues(
  lines: Array<{ productId: string; unitId: string; quantity: string; unitCost: string }>,
) {
  const issues: string[] = [];
  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    if (!line.productId) issues.push(`${label}: select a product.`);
    if (!line.unitId) issues.push(`${label}: select a unit.`);
    if (!positivePattern.test(line.quantity))
      issues.push(`${label}: quantity must be greater than zero.`);
    if (!nonNegativePattern.test(line.unitCost))
      issues.push(`${label}: unit cost must be zero or greater.`);
  });
  return issues;
}

export function friendlyPurchaseError(message: string) {
  if (/over.?receiv|remaining.*quantity|exceed.*order/i.test(message))
    return 'Receiving quantity exceeds the remaining purchase-order quantity. Refresh and review the PO.';
  if (/allocation.*exceed|over.?allocat/i.test(message))
    return 'Payment allocation exceeds the current invoice outstanding amount. Refresh and review the allocation.';
  if (/return.*exceed|returnable/i.test(message))
    return 'Return quantity exceeds the remaining returnable receipt quantity.';
  if (/batch.*required/i.test(message))
    return 'Batch, lot and shade details are required for this product.';
  return message;
}

export function productBaseUnitCode(
  productId: string,
  products: Array<{ id: string; baseUnit?: { code: string } }>,
) {
  return products.find((product) => product.id === productId)?.baseUnit?.code ?? 'BASE';
}
