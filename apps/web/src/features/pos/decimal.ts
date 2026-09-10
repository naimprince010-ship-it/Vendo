import type { CartLine, PaymentMethod } from './types';

type Decimal = { coefficient: bigint; scale: number };

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TWO = BigInt(2);
const BIGINT_TEN = BigInt(10);

const powers = new Map<number, bigint>([[0, BIGINT_ONE]]);

function powerOfTen(scale: number) {
  const existing = powers.get(scale);
  if (existing) return existing;
  const value = BIGINT_TEN ** BigInt(scale);
  powers.set(scale, value);
  return value;
}

function parse(value: string | number): Decimal {
  const source = String(value).trim();
  const match = source.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return { coefficient: BIGINT_ZERO, scale: 0 };
  const fraction = match[3] ?? '';
  const sign = match[1] === '-' ? -BIGINT_ONE : BIGINT_ONE;
  return {
    coefficient: sign * BigInt(`${match[2]}${fraction}`),
    scale: fraction.length,
  };
}

function normalize(decimal: Decimal): Decimal {
  let { coefficient, scale } = decimal;
  while (scale > 0 && coefficient % BIGINT_TEN === BIGINT_ZERO) {
    coefficient /= BIGINT_TEN;
    scale -= 1;
  }
  return { coefficient, scale };
}

function serialize(decimal: Decimal) {
  const value = normalize(decimal);
  const negative = value.coefficient < BIGINT_ZERO;
  const digits = (negative ? -value.coefficient : value.coefficient).toString();
  if (!value.scale) return `${negative ? '-' : ''}${digits}`;
  const padded = digits.padStart(value.scale + 1, '0');
  const point = padded.length - value.scale;
  return `${negative ? '-' : ''}${padded.slice(0, point)}.${padded.slice(point)}`;
}

function align(left: Decimal, right: Decimal) {
  const scale = Math.max(left.scale, right.scale);
  return {
    left: left.coefficient * powerOfTen(scale - left.scale),
    right: right.coefficient * powerOfTen(scale - right.scale),
    scale,
  };
}

export function decimalAdd(left: string | number, right: string | number) {
  const aligned = align(parse(left), parse(right));
  return serialize({ coefficient: aligned.left + aligned.right, scale: aligned.scale });
}

export function decimalSubtract(left: string | number, right: string | number) {
  const aligned = align(parse(left), parse(right));
  return serialize({ coefficient: aligned.left - aligned.right, scale: aligned.scale });
}

export function decimalMultiply(left: string | number, right: string | number) {
  const first = parse(left);
  const second = parse(right);
  return serialize({
    coefficient: first.coefficient * second.coefficient,
    scale: first.scale + second.scale,
  });
}

export function decimalDivide(
  numerator: string | number,
  denominator: string | number,
  precision = 6,
) {
  const first = parse(numerator);
  const second = parse(denominator);
  if (second.coefficient === BIGINT_ZERO) return '0';
  const scaledNumerator = first.coefficient * powerOfTen(precision + second.scale - first.scale);
  const quotient = scaledNumerator / second.coefficient;
  const remainder = scaledNumerator % second.coefficient;
  const sameSign = first.coefficient >= BIGINT_ZERO === second.coefficient >= BIGINT_ZERO;
  const rounded =
    (remainder < BIGINT_ZERO ? -remainder : remainder) * BIGINT_TWO >=
    (second.coefficient < BIGINT_ZERO ? -second.coefficient : second.coefficient)
      ? quotient + (sameSign ? BIGINT_ONE : -BIGINT_ONE)
      : quotient;
  return serialize({ coefficient: rounded, scale: precision });
}

export function decimalCompare(left: string | number, right: string | number) {
  const aligned = align(parse(left), parse(right));
  return aligned.left === aligned.right ? 0 : aligned.left > aligned.right ? 1 : -1;
}

export function decimalMax(value: string, floor = '0') {
  return decimalCompare(value, floor) < 0 ? floor : value;
}

export function decimalSum(values: Array<string | number>) {
  return values.reduce<string>((sum, value) => decimalAdd(sum, value), '0');
}

export function configuredPrice(
  product: CartLine['product'],
  unitId: string,
  mode: 'RETAIL' | 'WHOLESALE',
) {
  return product.prices.find((row) => row.unitId === unitId && row.type === mode)?.amount ?? '';
}

export function baseQuantityForLine(line: CartLine) {
  const factor =
    line.product.units.find(({ unit }) => unit.id === line.unitId)?.factorToBase ?? '1';
  return decimalMultiply(line.quantity || '0', factor);
}

export function convertedQuantity(baseQuantity: string, factorToBase: string) {
  return decimalDivide(baseQuantity, factorToBase, 6);
}

export function productAvailability(product: CartLine['product']) {
  if (Array.isArray(product.availability)) {
    return decimalSum(product.availability.map((batch) => batch.baseQuantity));
  }
  return product.availability.baseQuantity ?? '0';
}

export function checkoutPreview(
  cart: CartLine[],
  invoiceDiscount: string,
  invoiceTax: string,
  payments: Array<{
    amount: string;
    tendered: string;
    methodId: string;
  }>,
  methods: PaymentMethod[],
) {
  const subtotal = decimalSum(
    cart.map((line) => decimalMultiply(line.quantity || '0', line.unitPrice || '0')),
  );
  const lineDiscount = decimalSum(cart.map((line) => line.discount || '0'));
  const lineTax = decimalSum(cart.map((line) => line.tax || '0'));
  const total = decimalMax(
    decimalAdd(
      decimalSubtract(decimalSubtract(subtotal, lineDiscount), invoiceDiscount || '0'),
      decimalAdd(lineTax, invoiceTax || '0'),
    ),
  );
  const paid = decimalSum(payments.map((payment) => payment.amount || '0'));
  const due = decimalMax(decimalSubtract(total, paid));
  const change = decimalSum(
    payments.map((payment) => {
      const method = methods.find((candidate) => candidate.id === payment.methodId);
      if (!method?.isCash || !payment.tendered) return '0';
      return decimalMax(decimalSubtract(payment.tendered, payment.amount || '0'));
    }),
  );
  return { subtotal, lineDiscount, lineTax, total, paid, due, change };
}
