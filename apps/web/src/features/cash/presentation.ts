const decimal = /^(-?)(\d+)(?:\.(\d+))?$/;

type Parsed = { negative: boolean; digits: bigint; scale: number };

function parse(value: string): Parsed {
  const match = decimal.exec(value.trim());
  if (!match) return { negative: false, digits: BigInt(0), scale: 0 };
  const fraction = match[3] ?? '';
  return {
    negative: match[1] === '-',
    digits: BigInt(`${match[2]}${fraction}`),
    scale: fraction.length,
  };
}

function scaled(value: Parsed, scale: number) {
  const result = value.digits * BigInt(10) ** BigInt(scale - value.scale);
  return value.negative ? -result : result;
}

function render(value: bigint, scale: number) {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const source = absolute.toString().padStart(scale + 1, '0');
  const whole = scale ? source.slice(0, -scale) : source;
  const fraction = scale ? source.slice(-scale).replace(/0+$/, '') : '';
  return `${negative ? '-' : ''}${whole || '0'}${fraction ? `.${fraction}` : ''}`;
}

export function compareMoney(left: string, right = '0') {
  const a = parse(left);
  const b = parse(right);
  const scale = Math.max(4, a.scale, b.scale);
  const difference = scaled(a, scale) - scaled(b, scale);
  return difference === BigInt(0) ? 0 : difference > BigInt(0) ? 1 : -1;
}

export function subtractMoney(left: string, right: string) {
  const a = parse(left);
  const b = parse(right);
  const scale = Math.max(4, a.scale, b.scale);
  return render(scaled(a, scale) - scaled(b, scale), scale);
}

const labels: Record<string, string> = {
  OPENING: 'Opening cash',
  CASH_SALE: 'Cash sale',
  CUSTOMER_COLLECTION: 'Customer collection',
  SUPPLIER_PAYMENT: 'Supplier payment',
  CASH_REFUND: 'Cash refund',
  CASH_IN: 'Cash in',
  CASH_OUT: 'Cash out',
  EXPENSE: 'Expense',
  CLOSING_ADJUSTMENT: 'Closing adjustment',
};

const inbound = new Set(['OPENING', 'CASH_SALE', 'CUSTOMER_COLLECTION', 'CASH_IN']);

export function movementLabel(type: string) {
  return (
    labels[type] ??
    type
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^./, (v) => v.toUpperCase())
  );
}

export function movementDirection(type: string) {
  return inbound.has(type) ? ('in' as const) : ('out' as const);
}

export function signedMovement(type: string, amount: string) {
  return `${movementDirection(type) === 'in' ? '+' : '-'}${amount.replace(/^-/, '')}`;
}

export function movementTone(type: string) {
  if (movementDirection(type) === 'in') return 'success' as const;
  if (['CASH_REFUND', 'EXPENSE', 'CASH_OUT'].includes(type)) return 'danger' as const;
  return 'warning' as const;
}

export function shiftTone(status: string) {
  return status === 'OPEN' ? ('success' as const) : ('neutral' as const);
}

export function variancePresentation(value: string | null) {
  if (value === null)
    return { label: 'Not counted', tone: 'neutral' as const, value: null as string | null };
  const comparison = compareMoney(value);
  if (comparison > 0) return { label: 'Over', tone: 'warning' as const, value };
  if (comparison < 0) return { label: 'Short', tone: 'danger' as const, value };
  return { label: 'Balanced', tone: 'success' as const, value };
}

export function personName(
  person?: { firstName: string; lastName?: string | null; email: string } | null,
) {
  if (!person) return '—';
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email;
}

export function friendlyCashError(message: string) {
  if (/No open cash shift/i.test(message))
    return 'Open a cash shift for this register before posting drawer activity.';
  if (/already has an open cash shift/i.test(message))
    return 'This register already has an open shift. Refresh to view it.';
  if (/already closed/i.test(message)) return 'This shift is already closed.';
  if (/Cash activity changed|concurrent|serialization|deadlock/i.test(message))
    return 'Cash activity changed. Refresh and review the shift before closing.';
  if (/must match/i.test(message)) return 'Enter a valid amount using up to four decimal places.';
  return message;
}
