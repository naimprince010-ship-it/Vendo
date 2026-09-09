import { forwardRef, type HTMLAttributes, type TableHTMLAttributes } from 'react';
import { cn } from './lib/cn';

export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
  function Table({ className, ...props }, ref) {
    return (
      <div className="w-full overflow-x-auto rounded-md border border-border">
        <table ref={ref} className={cn('w-full border-collapse text-sm', className)} {...props} />
      </div>
    );
  },
);

export function TableHeader(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}
export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TableFooter({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot className={cn('border-t border-divider bg-surface-secondary', className)} {...props} />
  );
}
export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-divider transition-colors last:border-0 hover:bg-neutral-hover data-[selected=true]:bg-primary-soft',
        className,
      )}
      {...props}
    />
  );
}

interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TableHead({ className, numeric, ...props }: TableCellProps) {
  return (
    <th
      className={cn(
        'h-10 bg-surface-secondary px-4 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary',
        numeric && 'text-right tabular-nums',
        className,
      )}
      {...props}
    />
  );
}
export function TableCell({ className, numeric, ...props }: TableCellProps) {
  return (
    <td
      className={cn('px-4 py-3 text-text-primary', numeric && 'text-right tabular-nums', className)}
      {...props}
    />
  );
}
export function TableCaption({ className, ...props }: HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn('mt-3 text-sm text-text-secondary', className)} {...props} />;
}
