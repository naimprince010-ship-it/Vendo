export type PositionKind = 'customer' | 'supplier';

type Parsed = { negative: boolean; digits: bigint; scale: number };

function parse(value: string): Parsed {
  const match = value.trim().match(/^(-)?(\d+)(?:\.(\d+))?$/);
  if (!match) return { negative: false, digits: BigInt(0), scale: 0 };
  const fraction = match[3] ?? '';
  return {
    negative: Boolean(match[1]),
    digits: BigInt(`${match[2]}${fraction}`),
    scale: fraction.length,
  };
}

function scaled(value: Parsed, scale: number) {
  return (
    (value.negative ? -value.digits : value.digits) * BigInt(10) ** BigInt(scale - value.scale)
  );
}

function format(value: bigint, scale = 4) {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const source = absolute.toString().padStart(scale + 1, '0');
  const integer = source.slice(0, -scale) || '0';
  const fraction = source.slice(-scale).replace(/0+$/, '');
  return `${negative ? '-' : ''}${integer}${fraction ? `.${fraction}` : ''}`;
}

export function compareDecimal(left: string, right = '0') {
  const a = parse(left);
  const b = parse(right);
  const scale = Math.max(4, a.scale, b.scale);
  const difference = scaled(a, scale) - scaled(b, scale);
  return difference === BigInt(0) ? 0 : difference > BigInt(0) ? 1 : -1;
}

export function absoluteDecimal(value: string) {
  const parsed = parse(value);
  const scale = Math.max(4, parsed.scale);
  return format(parsed.digits * BigInt(10) ** BigInt(scale - parsed.scale), scale);
}

export function subtractDecimal(left: string, right: string) {
  const a = parse(left);
  const b = parse(right);
  const scale = Math.max(4, a.scale, b.scale);
  return format(scaled(a, scale) - scaled(b, scale), scale);
}

export function availableCredit(creditLimit: string, balance: string) {
  const remainder = subtractDecimal(creditLimit, balance);
  return compareDecimal(remainder) < 0 ? '0' : remainder;
}

export function financialPosition(value: string, kind: PositionKind) {
  const comparison = compareDecimal(value);
  if (comparison === 0) {
    return {
      label: kind === 'customer' ? 'No receivable' : 'Settled',
      amount: '0',
      tone: 'success' as const,
      explanation:
        kind === 'customer'
          ? 'This customer currently has no receivable or advance.'
          : 'There is currently no payable or supplier advance.',
    };
  }
  if (comparison > 0) {
    return {
      label: kind === 'customer' ? 'Customer receivable' : 'Supplier payable',
      amount: absoluteDecimal(value),
      tone: 'warning' as const,
      explanation:
        kind === 'customer'
          ? 'Positive balance means the customer owes the company.'
          : 'Positive balance means the company owes the supplier.',
    };
  }
  return {
    label: kind === 'customer' ? 'Customer advance' : 'Supplier advance',
    amount: absoluteDecimal(value),
    tone: 'info' as const,
    explanation:
      kind === 'customer'
        ? 'Negative balance means the company holds customer credit.'
        : 'Negative balance means the supplier holds company funds.',
  };
}

const labels: Record<string, string> = {
  OPENING_BALANCE: 'Opening balance',
  OPENING_CORRECTION: 'Opening correction',
  ADJUSTMENT: 'Adjustment',
  SALE_INVOICE: 'Sale invoice',
  PAYMENT: 'Payment',
  SALE_RETURN: 'Sale return',
  CREDIT_NOTE: 'Credit note',
  PURCHASE_INVOICE: 'Purchase invoice',
  PURCHASE_RETURN: 'Purchase return',
};

export function ledgerTypeLabel(type: string) {
  return (
    labels[type] ??
    type
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^./, (v) => v.toUpperCase())
  );
}

export function friendlyPartyError(message: string) {
  if (message.includes('reserved customer code'))
    return 'WALK-IN is reserved for the system customer.';
  if (message.includes('invalid or inactive')) return 'Select an active customer group.';
  if (message.includes('already in use')) return message;
  if (message.includes('already been posted'))
    return 'An opening balance has already been posted. Use a correction instead.';
  if (message.includes('has not been posted'))
    return 'Post the opening balance before creating a correction.';
  if (message.includes('must not be zero'))
    return 'Enter an amount greater than zero and choose its financial meaning.';
  return message;
}
