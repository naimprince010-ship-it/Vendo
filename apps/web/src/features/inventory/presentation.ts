import type { Product, StockLineDraft } from './types';

const decimalPattern = /^(-?)(\d+)(?:\.(\d+))?$/;
const positiveQuantityPattern = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;
const nonNegativeQuantityPattern = /^(?:0|0\.\d+|[1-9]\d*(?:\.\d+)?)$/;

function parts(value: string) {
  const match = decimalPattern.exec(value.trim());
  if (!match) throw new Error('Invalid decimal value');
  return { negative: match[1] === '-', whole: match[2]!, fraction: match[3] ?? '' };
}

export function normalizeDecimal(value: string) {
  const parsed = parts(value);
  const whole = parsed.whole.replace(/^0+(?=\d)/, '') || '0';
  const fraction = parsed.fraction.replace(/0+$/, '');
  const unsigned = fraction ? `${whole}.${fraction}` : whole;
  return parsed.negative && unsigned !== '0' ? `-${unsigned}` : unsigned;
}

export function subtractDecimal(left: string, right: string) {
  const a = parts(left),
    b = parts(right),
    scale = Math.max(a.fraction.length, b.fraction.length);
  const integer = (value: ReturnType<typeof parts>) => {
    const raw = BigInt(`${value.whole}${value.fraction.padEnd(scale, '0')}`);
    return value.negative ? -raw : raw;
  };
  const result = integer(a) - integer(b);
  const negative = result < BigInt(0);
  const digits = (negative ? -result : result).toString().padStart(scale + 1, '0');
  const value = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
  return normalizeDecimal(`${negative ? '-' : ''}${value}`);
}

export function multiplyDecimal(left: string, right: string) {
  const a = parts(left),
    b = parts(right),
    scale = a.fraction.length + b.fraction.length,
    rawA = BigInt(`${a.whole}${a.fraction}`),
    rawB = BigInt(`${b.whole}${b.fraction}`),
    result = rawA * rawB,
    negative = a.negative !== b.negative && result !== BigInt(0),
    digits = result.toString().padStart(scale + 1, '0'),
    value = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
  return normalizeDecimal(`${negative ? '-' : ''}${value}`);
}

export function signedQuantity(value: string) {
  const normalized = normalizeDecimal(value);
  return normalized.startsWith('-') || normalized === '0' ? normalized : `+${normalized}`;
}

export function movementLabel(type: string) {
  const labels: Record<string, string> = {
    OPENING: 'Opening stock',
    PURCHASE_RECEIPT: 'Purchase receipt',
    SALE: 'Sale',
    SALE_RETURN: 'Sale return',
    PURCHASE_RETURN: 'Purchase return',
    ADJUSTMENT: 'Adjustment',
    DAMAGE: 'Damage',
    LOSS: 'Loss',
    TRANSFER_OUT: 'Transfer out',
    TRANSFER_IN: 'Transfer in',
    COUNT_RECONCILIATION: 'Count reconciliation',
  };
  return labels[type] ?? type.toLowerCase().replace(/_/g, ' ');
}

export function movementTone(type: string) {
  if (['OPENING', 'PURCHASE_RECEIPT', 'SALE_RETURN', 'TRANSFER_IN'].includes(type))
    return 'success' as const;
  if (['SALE', 'PURCHASE_RETURN', 'DAMAGE', 'LOSS', 'TRANSFER_OUT'].includes(type))
    return 'danger' as const;
  if (type === 'COUNT_RECONCILIATION') return 'info' as const;
  return 'warning' as const;
}

export function countTone(status: string) {
  if (status === 'POSTED') return 'success' as const;
  if (status === 'IN_REVIEW') return 'warning' as const;
  return 'neutral' as const;
}

export function friendlyInventoryError(message: string) {
  if (/Counted quantity must be zero or greater/i.test(message))
    return 'Counted quantity must be zero or greater.';
  if (/changed since|stale|snapshot|version/i.test(message))
    return 'Inventory changed since this count was prepared. Refresh or reopen the count before posting.';
  return message;
}

export function selectProductForLine(line: StockLineDraft, product?: Product): StockLineDraft {
  return {
    ...line,
    productId: product?.id ?? '',
    unitId: product?.baseUnit.id ?? '',
    batchId: '',
    quantity: '',
  };
}

export function stockLineIssues(lines: StockLineDraft[], products: Product[], allowZero = false) {
  const quantityPattern = allowZero ? nonNegativeQuantityPattern : positiveQuantityPattern;
  const issues: string[] = [];
  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    const product = products.find((item) => item.id === line.productId);
    if (!product) issues.push(`${label}: select a product.`);
    if (!line.unitId) issues.push(`${label}: select a unit.`);
    if (!quantityPattern.test(line.quantity)) {
      issues.push(`${label}: enter a valid ${allowZero ? 'non-negative' : 'positive'} quantity.`);
    }
    if (product?.batchTracking && !line.batchId) {
      issues.push(`${label}: select the required batch and shade.`);
    }
  });
  return issues;
}
