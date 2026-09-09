import type { HTMLAttributes } from 'react';
import { Button } from './button';
import { cn } from './lib/cn';

export interface PaginationProps extends HTMLAttributes<HTMLElement> {
  currentPage: number;
  onNext?: () => void;
  onPrevious?: () => void;
  pageCount?: number;
  totalItems?: number;
}

export function Pagination({
  className,
  currentPage,
  onNext,
  onPrevious,
  pageCount,
  totalItems,
  ...props
}: PaginationProps) {
  const validPageCount = pageCount && pageCount > 0 ? pageCount : undefined;
  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4', className)}
      {...props}
    >
      <p className="text-sm text-text-secondary" aria-live="polite">
        Page <span className="font-semibold text-text-primary">{currentPage}</span>
        {validPageCount ? ` of ${validPageCount}` : ''}
        {typeof totalItems === 'number' ? ` · ${totalItems} items` : ''}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!onPrevious || currentPage <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!onNext || (validPageCount !== undefined && currentPage >= validPageCount)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
