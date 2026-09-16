import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from './lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-1 text-xs font-semibold',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-surface-secondary text-text-secondary',
        primary: 'border-primary/15 bg-primary-soft text-primary',
        info: 'border-info/15 bg-info-soft text-info',
        success: 'border-success/15 bg-success-soft text-success',
        warning: 'border-warning/15 bg-warning-soft text-warning',
        danger: 'border-danger/15 bg-danger-soft text-danger',
        amber: 'border-amber/15 bg-amber-soft text-amber',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StatusBadgeProps extends Omit<BadgeProps, 'tone'> {
  tone: StatusTone;
}

export function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return (
    <Badge
      tone={tone}
      className={cn(
        'gap-1.5 rounded-full before:size-1.5 before:rounded-full before:bg-current',
        className,
      )}
      {...props}
    />
  );
}
