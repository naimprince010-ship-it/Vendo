'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  MoneyDisplay,
  Select,
  Textarea,
} from '@vendo/ui';
import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useCash } from './cash-context';
import { friendlyCashError, subtractMoney } from './presentation';
import type { Expense, ExpenseCategory } from './types';

const nonNegativeMoney = /^(?:0|0\.\d+|[1-9]\d*(?:\.\d+)?)$/;
const positiveMoney = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;
const operationKey = (name: string) => `cash-ui-${name}-${crypto.randomUUID()}`;

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <FormField htmlFor={id} label={label} description={hint} required>
      {control}
    </FormField>
  );
}

function ActionFrame({
  open,
  onOpenChange,
  title,
  description,
  error,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description: string;
  error: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="space-y-4">{children}</div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OpenShiftDialog({ trigger }: { trigger: ReactNode }) {
  const { api, registerId, registers, refresh } = useCash();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('5000');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = useRef('');
  const selected = registers.find((row) => row.id === registerId);
  const close = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setReview(false);
      setError('');
      key.current = '';
    }
  };
  const post = async () => {
    if (!nonNegativeMoney.test(amount)) {
      setError('Opening cash must be zero or a positive amount.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      key.current ||= operationKey('open');
      await api('/cash/shifts/open', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': key.current },
        body: JSON.stringify({ registerId, openingCash: amount }),
      });
      await refresh();
      close(false);
    } catch (cause) {
      setError(friendlyCashError(cause instanceof Error ? cause.message : 'Shift opening failed.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ActionFrame
        open={open}
        onOpenChange={close}
        title={review ? 'Review shift opening' : 'Open cash shift'}
        description="Opening cash is the starting drawer balance. It is not sales revenue or business income."
        error={error}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => (review ? setReview(false) : close(false))}
              disabled={busy}
            >
              {review ? 'Back' : 'Cancel'}
            </Button>
            {review ? (
              <Button onClick={() => void post()} loading={busy}>
                Open shift
              </Button>
            ) : (
              <Button
                onClick={() => setReview(true)}
                disabled={!registerId || !nonNegativeMoney.test(amount)}
              >
                Review
              </Button>
            )}
          </>
        }
      >
        {review ? (
          <div className="rounded-lg border border-border bg-surface-subtle p-4 text-sm">
            <p className="text-text-secondary">Register</p>
            <p className="font-semibold text-text-primary">
              {selected?.code} · {selected?.name}
            </p>
            <p className="mt-3 text-text-secondary">Starting drawer balance</p>
            <MoneyDisplay value={amount} className="text-lg font-bold" />
          </div>
        ) : (
          <Field label="Opening cash" hint="The exact physical float placed in the drawer.">
            <Input
              aria-label="Opening cash"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        )}
      </ActionFrame>
    </>
  );
}

export function ManualCashDialog({
  direction,
  trigger,
}: {
  direction: 'in' | 'out';
  trigger: ReactNode;
}) {
  const { api, currentShift, registerId, refresh } = useCash();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = useRef('');
  const reset = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setAmount('');
      setReason('');
      setReview(false);
      setError('');
      key.current = '';
    }
  };
  const valid = positiveMoney.test(amount) && reason.trim().length >= 3;
  const post = async () => {
    if (!currentShift) {
      setError('Open a cash shift before posting a manual drawer movement.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      key.current ||= operationKey(direction);
      await api(`/cash/movements/${direction}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': key.current },
        body: JSON.stringify({ registerId, amount, reason }),
      });
      await refresh();
      reset(false);
    } catch (cause) {
      setError(friendlyCashError(cause instanceof Error ? cause.message : 'Cash movement failed.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ActionFrame
        open={open}
        onOpenChange={reset}
        title={review ? `Review cash ${direction}` : `Manual cash ${direction}`}
        description={
          direction === 'in'
            ? 'Record a documented drawer deposit.'
            : 'Record a documented withdrawal from the active drawer.'
        }
        error={error}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => (review ? setReview(false) : reset(false))}
              disabled={busy}
            >
              {review ? 'Back' : 'Cancel'}
            </Button>
            {review ? (
              <Button
                variant={direction === 'out' ? 'danger' : 'primary'}
                onClick={() => void post()}
                loading={busy}
              >
                Post cash {direction}
              </Button>
            ) : (
              <Button onClick={() => setReview(true)} disabled={!valid || !currentShift}>
                Review
              </Button>
            )}
          </>
        }
      >
        {review ? (
          <div className="rounded-lg border border-border bg-surface-subtle p-4">
            <p className="text-sm text-text-secondary">Drawer impact</p>
            <MoneyDisplay
              value={direction === 'in' ? amount : `-${amount}`}
              className="text-xl font-bold"
            />
            <p className="mt-3 text-sm text-text-secondary">Reason</p>
            <p className="font-medium text-text-primary">{reason}</p>
          </div>
        ) : (
          <>
            <Field label="Amount">
              <Input
                aria-label="Cash movement amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Reason" hint="Required for audit history.">
              <Textarea
                aria-label="Cash movement reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            {!currentShift ? (
              <Alert tone="warning">
                This action requires an open shift on the selected register.
              </Alert>
            ) : null}
          </>
        )}
      </ActionFrame>
    </>
  );
}

export function CloseShiftDialog({ trigger }: { trigger: ReactNode }) {
  const { api, currentShift, refresh } = useCash();
  const [open, setOpen] = useState(false);
  const [actual, setActual] = useState('');
  const [note, setNote] = useState('Counted at shift close');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = useRef('');
  const expected = currentShift?.expectedCash ?? '0';
  const variance = nonNegativeMoney.test(actual) ? subtractMoney(actual, expected) : null;
  const close = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setActual('');
      setError('');
      key.current = '';
    }
  };
  const post = async () => {
    if (!currentShift || !nonNegativeMoney.test(actual)) return;
    setBusy(true);
    setError('');
    try {
      key.current ||= operationKey('close');
      await api(`/cash/shifts/${currentShift.id}/close`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': key.current },
        body: JSON.stringify({ actualCash: actual, note: note || undefined }),
      });
      await refresh();
      close(false);
    } catch (cause) {
      setError(friendlyCashError(cause instanceof Error ? cause.message : 'Shift close failed.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ActionFrame
        open={open}
        onOpenChange={close}
        title="Review and close shift"
        description="Expected cash is recalculated by the backend at posting time. The close snapshot remains immutable."
        error={error}
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void post()}
              loading={busy}
              disabled={!currentShift || !nonNegativeMoney.test(actual)}
            >
              Close shift
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-subtle p-4">
          <div>
            <p className="text-xs text-text-secondary">Expected cash</p>
            <MoneyDisplay value={expected} className="font-bold" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Variance preview</p>
            {variance === null ? (
              <span className="text-sm text-text-muted">Enter actual cash</span>
            ) : (
              <MoneyDisplay value={variance} className="font-bold" />
            )}
          </div>
        </div>
        <Field label="Actual counted cash">
          <Input
            aria-label="Actual cash"
            inputMode="decimal"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </Field>
        <Field label="Closing note">
          <Textarea
            aria-label="Closing note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </ActionFrame>
    </>
  );
}

export function ExpenseDialog({
  categories,
  trigger,
}: {
  categories: ExpenseCategory[];
  trigger: ReactNode;
}) {
  const { api, currentShift, paymentMethods, registerId, refresh } = useCash();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = useRef('');
  const activeCategories = categories.filter((row) => row.isActive);
  const selectedCategoryId = categoryId || activeCategories[0]?.id || '';
  const selectedMethodId =
    methodId || paymentMethods.find((row) => row.isActive !== false)?.id || '';
  const method = paymentMethods.find((row) => row.id === selectedMethodId);
  const category = categories.find((row) => row.id === selectedCategoryId);
  const valid =
    selectedCategoryId &&
    selectedMethodId &&
    positiveMoney.test(amount) &&
    description.trim().length >= 3 &&
    (!method?.isCash || currentShift);
  const reset = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setAmount('');
      setDescription('');
      setReference('');
      setReview(false);
      setError('');
      key.current = '';
    }
  };
  const post = async () => {
    setBusy(true);
    setError('');
    try {
      key.current ||= operationKey('expense');
      await api('/expenses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': key.current },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          paymentMethodId: selectedMethodId,
          registerId: method?.isCash ? registerId : undefined,
          amount,
          description,
          reference: reference || undefined,
        }),
      });
      await refresh();
      reset(false);
    } catch (cause) {
      setError(
        friendlyCashError(cause instanceof Error ? cause.message : 'Expense posting failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ActionFrame
        open={open}
        onOpenChange={reset}
        title={review ? 'Review expense posting' : 'Post expense'}
        description="Posted expenses are immutable. Corrections use a separate reversal."
        error={error}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => (review ? setReview(false) : reset(false))}
              disabled={busy}
            >
              {review ? 'Back' : 'Cancel'}
            </Button>
            {review ? (
              <Button onClick={() => void post()} loading={busy}>
                Post expense
              </Button>
            ) : (
              <Button onClick={() => setReview(true)} disabled={!valid}>
                Review
              </Button>
            )}
          </>
        }
      >
        {review ? (
          <div className="space-y-3 rounded-lg border border-border bg-surface-subtle p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Category</span>
              <b>{category?.name}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Payment</span>
              <b>{method?.name}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Amount</span>
              <MoneyDisplay value={amount} />
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Drawer effect</span>
              <b>{method?.isCash ? <MoneyDisplay value={`-${amount}`} /> : 'No cash movement'}</b>
            </div>
            <p className="border-t border-divider pt-3 text-text-secondary">{description}</p>
          </div>
        ) : (
          <>
            <Field label="Category">
              <Select
                aria-label="Expense category"
                value={selectedCategoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {activeCategories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payment method">
              <Select
                aria-label="Expense payment method"
                value={selectedMethodId}
                onChange={(e) => setMethodId(e.target.value)}
              >
                {paymentMethods
                  .filter((row) => row.isActive !== false)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                      {row.isCash ? ' · Cash drawer' : ' · Non-cash'}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Amount">
              <Input
                aria-label="Expense amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Description">
              <Textarea
                aria-label="Expense description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field label="Reference">
              <Input
                aria-label="Expense reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
            {method?.isCash ? (
              <Alert tone={currentShift ? 'warning' : 'danger'}>
                {currentShift
                  ? 'This cash expense will reduce the active drawer.'
                  : 'Open a shift before posting a cash expense.'}
              </Alert>
            ) : (
              <Alert tone="info">This non-cash expense will not change drawer cash.</Alert>
            )}
          </>
        )}
      </ActionFrame>
    </>
  );
}

export function CategoryDialog({
  category,
  trigger,
}: {
  category?: ExpenseCategory;
  trigger: ReactNode;
}) {
  const { api, refresh } = useCash();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(category?.code ?? '');
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(category ? `/expense-categories/${category.id}` : '/expense-categories', {
        method: category ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(!category ? { code } : {}),
          name,
          description: description || undefined,
        }),
      });
      await refresh();
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Category save failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ActionFrame
        open={open}
        onOpenChange={setOpen}
        title={category ? 'Edit expense category' : 'Create expense category'}
        description="Categories are company-scoped and remain available in historical expense records."
        error={error}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => void save()}
              loading={busy}
              disabled={(!category && code.trim().length < 2) || name.trim().length < 2}
            >
              Save category
            </Button>
          </>
        }
      >
        {!category ? (
          <Field label="Code">
            <Input
              aria-label="Category code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </Field>
        ) : null}
        <Field label="Name">
          <Input
            aria-label="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Description">
          <Textarea
            aria-label="Category description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </ActionFrame>
    </>
  );
}

export function ReverseExpenseDialog({
  expense,
  trigger,
}: {
  expense: Expense;
  trigger: ReactNode;
}) {
  const { api, currentShift, registerId, refresh } = useCash();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = useRef('');
  const post = async () => {
    setBusy(true);
    setError('');
    try {
      key.current ||= operationKey('reverse-expense');
      await api(`/expenses/${expense.id}/reverse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': key.current },
        body: JSON.stringify({
          registerId: expense.paymentMethod.isCash ? registerId : undefined,
          reason,
        }),
      });
      await refresh();
      setOpen(false);
    } catch (cause) {
      setError(
        friendlyCashError(cause instanceof Error ? cause.message : 'Expense reversal failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  const allowed = reason.trim().length >= 3 && (!expense.paymentMethod.isCash || currentShift);
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ActionFrame
        open={open}
        onOpenChange={setOpen}
        title="Reverse posted expense"
        description="The original expense stays immutable. A cash expense reversal adds a compensating Cash In movement."
        error={error}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void post()} loading={busy} disabled={!allowed}>
              Reverse expense
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-border bg-surface-subtle p-4 text-sm">
          <p className="font-semibold text-text-primary">
            {expense.expenseNumber} · {expense.category.name}
          </p>
          <MoneyDisplay value={expense.amount} className="mt-1 text-lg font-bold" />
          <p className="mt-2 text-text-secondary">
            {expense.paymentMethod.isCash
              ? 'A compensating Cash In will be posted to the active drawer.'
              : 'No drawer movement will be created for this non-cash reversal.'}
          </p>
        </div>
        <Field label="Reversal reason">
          <Textarea
            aria-label="Reversal reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        {expense.paymentMethod.isCash && !currentShift ? (
          <Alert tone="danger">Open a shift before reversing this cash expense.</Alert>
        ) : null}
      </ActionFrame>
    </>
  );
}
