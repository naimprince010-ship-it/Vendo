import type { HTMLAttributes } from 'react';
import { cn } from './lib/cn';

type DisplayValue = number | string;

export interface MoneyDisplayProps extends HTMLAttributes<HTMLSpanElement> {
  currency?: string;
  value: DisplayValue;
}

export function MoneyDisplay({ className, currency = 'BDT', value, ...props }: MoneyDisplayProps) {
  const raw = String(value);
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  const output = match
    ? `${currency} ${match[1]}${match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${(match[3] ?? '').padEnd(2, '0') || '00'}`
    : `${currency} ${raw}`;
  return (
    <span className={cn('font-medium tabular-nums text-text-primary', className)} {...props}>
      {output}
    </span>
  );
}

export interface QuantityDisplayProps extends HTMLAttributes<HTMLSpanElement> {
  unit?: string;
  value: DisplayValue;
}

export function QuantityDisplay({ className, unit, value, ...props }: QuantityDisplayProps) {
  return (
    <span className={cn('tabular-nums text-text-primary', className)} {...props}>
      {String(value)}
      {unit ? <span className="ml-1 text-xs font-medium text-text-secondary">{unit}</span> : null}
    </span>
  );
}
