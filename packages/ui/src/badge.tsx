import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from './lib/cn';

const badgeVariants = cva('inline-flex items-center rounded-sm px-2 py-1 text-xs font-semibold', {
  variants: {
    tone: {
      neutral: 'bg-neutral-hover text-text-secondary',
      primary: 'bg-primary-soft text-primary',
      info: 'bg-info-soft text-info',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
      amber: 'bg-amber-soft text-amber',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

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
