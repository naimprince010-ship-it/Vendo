import type { HTMLAttributes } from 'react';
import { cn } from './lib/cn';

type DisplayValue = number | string;

export interface MoneyDisplayProps extends HTMLAttributes<HTMLSpanElement> {
  currency?: string;
  value: DisplayValue;
}

export function formatMoneyValue(value: DisplayValue, currency = 'BDT') {
  const raw = String(value).trim();
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return `${currency} ${raw}`;

  const fraction = (match[3] ?? '').padEnd(3, '0');
  let minorUnits = BigInt(match[2]) * BigInt(100) + BigInt(fraction.slice(0, 2));
  if (Number(fraction[2]) >= 5) minorUnits += BigInt(1);
  const negative = match[1] === '-' && minorUnits !== BigInt(0);
  const major = (minorUnits / BigInt(100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const minor = (minorUnits % BigInt(100)).toString().padStart(2, '0');
  return `${currency} ${negative ? '-' : ''}${major}.${minor}`;
}

export function MoneyDisplay({ className, currency = 'BDT', value, ...props }: MoneyDisplayProps) {
  return (
    <span className={cn('font-medium tabular-nums text-text-primary', className)} {...props}>
      {formatMoneyValue(value, currency)}
    </span>
  );
}

export interface QuantityDisplayProps extends HTMLAttributes<HTMLSpanElement> {
  unit?: string;
  value: DisplayValue;
}

export function formatQuantityValue(value: DisplayValue) {
  const raw = String(value).trim();
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return raw;
  const fraction = (match[3] ?? '').replace(/0+$/, '');
  return `${match[1]}${match[2]}${fraction ? `.${fraction}` : ''}`;
}

export function QuantityDisplay({ className, unit, value, ...props }: QuantityDisplayProps) {
  return (
    <span className={cn('tabular-nums text-text-primary', className)} {...props}>
      {formatQuantityValue(value)}
      {unit ? <span className="ml-1 text-xs font-medium text-text-secondary">{unit}</span> : null}
    </span>
  );
}
