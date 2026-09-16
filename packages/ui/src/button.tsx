import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from './lib/cn';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
  {
    variants: {
      variant: {
        primary:
          'border border-primary bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-card',
        secondary:
          'border border-primary/10 bg-primary-soft text-primary hover:border-primary/20 hover:bg-neutral-hover',
        outline:
          'border border-border-strong bg-surface text-text-primary shadow-[0_1px_1px_rgb(20_32_51/0.03)] hover:border-text-muted hover:bg-neutral-hover',
        ghost: 'text-text-secondary hover:bg-neutral-hover hover:text-text-primary',
        danger: 'bg-danger text-white hover:bg-danger/90',
      },
      size: {
        sm: 'h-control-sm px-3 text-xs',
        md: 'h-control-md px-4 text-sm',
        lg: 'h-control-lg px-5 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, children, disabled, loading = false, type = 'button', variant, size, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {children}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, size = 'md', children, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      size={size}
      className={cn('aspect-square px-0', className)}
      aria-label={label}
      {...props}
    >
      {children}
    </Button>
  );
});
