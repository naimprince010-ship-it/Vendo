import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import { Button } from './button';
import { cn } from './lib/cn';

const alertVariants = cva('rounded-md border px-4 py-3 text-sm', {
  variants: {
    tone: {
      info: 'border-info/20 bg-info-soft text-info',
      success: 'border-success/20 bg-success-soft text-success',
      warning: 'border-warning/20 bg-warning-soft text-warning',
      danger: 'border-danger/20 bg-danger-soft text-danger',
    },
  },
  defaultVariants: { tone: 'info' },
});

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof alertVariants> {
  title?: ReactNode;
}

export function Alert({ children, className, title, tone, ...props }: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      {title ? <div className="font-semibold">{title}</div> : null}
      {children ? <div className={cn(title && 'mt-1')}>{children}</div> : null}
    </div>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-sm bg-neutral-hover', className)}
      {...props}
    />
  );
}

interface StateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  action?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}

function State({ action, className, description, icon, title, ...props }: StateProps) {
  return (
    <div
      className={cn(
        'flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-secondary p-6 text-center',
        className,
      )}
      {...props}
    >
      {icon ? <div className="mb-3 text-2xl text-text-muted">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <State icon={props.icon ?? '○'} {...props} />;
}

export interface LoadingStateProps extends Omit<StateProps, 'title'> {
  title?: ReactNode;
}

export function LoadingState({ title = 'Loading…', ...props }: LoadingStateProps) {
  return (
    <State
      role="status"
      aria-live="polite"
      icon={<span className="inline-block animate-spin">◌</span>}
      title={title}
      {...props}
    />
  );
}

export interface ErrorStateProps extends Omit<StateProps, 'title'> {
  onRetry?: () => void;
  title?: ReactNode;
}

export function ErrorState({
  action,
  onRetry,
  title = 'Something went wrong',
  ...props
}: ErrorStateProps) {
  return (
    <State
      role="alert"
      icon="!"
      title={title}
      action={action ?? (onRetry ? <Button onClick={onRetry}>Try again</Button> : undefined)}
      {...props}
    />
  );
}
