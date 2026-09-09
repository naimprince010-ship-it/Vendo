import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from './lib/cn';

const controlStyles =
  'h-control-md w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted hover:border-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-disabled aria-invalid:border-danger aria-invalid:ring-danger/15 read-only:bg-surface-secondary';

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m12.5 12.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BarcodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none">
      <path
        d="M3 4v12M6 4v12M9 4v12M13 4v12M15 4v12M17 4v12"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export interface FormFieldProps {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  error?: ReactNode;
  htmlFor: string;
  label: ReactNode;
  optional?: boolean;
  required?: boolean;
}

export function FormField({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
  optional,
  required,
}: FormFieldProps) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
        {optional ? <span className="ml-1 font-normal text-text-muted">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : description ? (
        <p className="text-xs text-text-secondary">{description}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input ref={ref} className={cn(controlStyles, className)} aria-invalid={invalid} {...props} />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(controlStyles, 'min-h-24 resize-y py-2.5', className)}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(controlStyles, 'cursor-pointer pr-8', className)} {...props}>
        {children}
      </select>
    );
  },
);

export interface SearchInputProps extends InputProps {
  accessibleLabel?: string;
}
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { accessibleLabel = 'Search', className, ...props },
  ref,
) {
  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
        <SearchIcon />
      </span>
      <Input
        ref={ref}
        type="search"
        aria-label={accessibleLabel}
        className={cn('pl-9', className)}
        {...props}
      />
    </div>
  );
});

export const BarcodeSearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function BarcodeSearchInput(
    { accessibleLabel = 'Search by barcode, SKU, or product name', className, ...props },
    ref,
  ) {
    return (
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        >
          <BarcodeIcon />
        </span>
        <Input
          ref={ref}
          type="search"
          inputMode="search"
          autoComplete="off"
          aria-label={accessibleLabel}
          className={cn('pl-10 font-mono', className)}
          {...props}
        />
      </div>
    );
  },
);

interface ChoiceProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}
export const Checkbox = forwardRef<HTMLInputElement, ChoiceProps>(function Checkbox(
  { className, label, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <label htmlFor={inputId} className="inline-flex items-center gap-2 text-sm text-text-primary">
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className={cn(
          'size-4 rounded-sm border-border-strong accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
});
export const Radio = forwardRef<HTMLInputElement, ChoiceProps>(function Radio(
  { className, label, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <label htmlFor={inputId} className="inline-flex items-center gap-2 text-sm text-text-primary">
      <input
        ref={ref}
        id={inputId}
        type="radio"
        className={cn(
          'size-4 border-border-strong accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
});
export const Switch = forwardRef<HTMLInputElement, ChoiceProps>(function Switch(
  { className, label, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <label htmlFor={inputId} className="inline-flex items-center gap-2 text-sm text-text-primary">
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="peer sr-only"
        role="switch"
        {...props}
      />
      <span
        className={cn(
          'relative h-5 w-9 rounded-full bg-border-strong transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4',
          className,
        )}
      />
      <span>{label}</span>
    </label>
  );
});
