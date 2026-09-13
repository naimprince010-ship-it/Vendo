'use client';

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField as BaseFormField,
  Input,
  Select,
  StatusBadge,
  Textarea,
} from '@vendo/ui';
import { useRouter } from 'next/navigation';
import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useParties } from './parties-context';
import { friendlyPartyError } from './presentation';
import type { Customer, CustomerGroup, PartyKind, Supplier } from './types';

const positiveMoney = /^\d{1,14}(?:\.\d{1,4})?$/;
const today = () => new Date().toISOString().slice(0, 10);
const operationKey = () => `ui-${crypto.randomUUID()}`;

function FormField({
  label,
  children,
  required,
  hint,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <BaseFormField
      htmlFor={id}
      label={label}
      required={required}
      description={hint}
      className={className}
    >
      {control}
    </BaseFormField>
  );
}

function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirm,
  busy,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description: string;
  confirm: string;
  busy: boolean;
  onConfirm(): void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-surface-subtle p-4 text-sm text-text-secondary">
          {children}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={busy}>
            {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerEditor({ customer }: { customer?: Customer }) {
  const { api, groups, refresh } = useParties();
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? '');
  const [code, setCode] = useState(customer?.code ?? '');
  const [groupId, setGroupId] = useState(customer?.groupId ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [taxIdentifier, setTaxIdentifier] = useState(customer?.taxIdentifier ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [creditLimit, setCreditLimit] = useState(customer?.creditLimit ?? '0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!name.trim() || (!customer && !code.trim())) {
      setError('Name and customer code are required.');
      return;
    }
    if (!customer && !positiveMoney.test(creditLimit)) {
      setError('Credit limit must be zero or a positive amount with up to four decimals.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = {
        ...(!customer ? { code, creditLimit } : {}),
        name,
        groupId: groupId || null,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        taxIdentifier: taxIdentifier || undefined,
        notes: notes || undefined,
      };
      const saved = await api<Customer>(customer ? `/customers/${customer.id}` : '/customers', {
        method: customer ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      await refresh();
      router.push(`/app/customers/${saved.id}`);
    } catch (cause) {
      setError(
        friendlyPartyError(cause instanceof Error ? cause.message : 'Customer save failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>{customer ? 'Edit customer' : 'Create customer'}</CardTitle>
          <CardDescription>
            Identity and classification remain company-scoped. Phone and email are searchable, not
            globally unique.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {!customer ? (
            <FormField label="Customer code" required hint="Company-scoped; WALK-IN is reserved.">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </FormField>
          ) : null}
          <FormField label="Customer name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Customer group">
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">No group</option>
              {groups
                .filter((group) => group.isActive || group.id === customer?.groupId)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.isActive ? '' : ' · Inactive'}
                  </option>
                ))}
            </Select>
          </FormField>
          {!customer ? (
            <FormField
              label="Initial credit limit"
              required
              hint="Further changes use the audited credit-limit action."
            >
              <Input
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                inputMode="decimal"
              />
            </FormField>
          ) : null}
          <FormField label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Tax / business identifier">
            <Input value={taxIdentifier} onChange={(e) => setTaxIdentifier(e.target.value)} />
          </FormField>
          <FormField label="Address" className="md:col-span-2">
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
          <FormField label="Notes" className="md:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} loading={busy}>
          {customer ? 'Save customer' : 'Create customer'}
        </Button>
      </div>
    </div>
  );
}

export function SupplierEditor({ supplier }: { supplier?: Supplier }) {
  const { api, refresh } = useParties();
  const router = useRouter();
  const [name, setName] = useState(supplier?.name ?? '');
  const [code, setCode] = useState(supplier?.code ?? '');
  const [contactName, setContactName] = useState(supplier?.contactName ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [taxIdentifier, setTaxIdentifier] = useState(supplier?.taxIdentifier ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!name.trim() || (!supplier && !code.trim())) {
      setError('Name and supplier code are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await api<Supplier>(supplier ? `/suppliers/${supplier.id}` : '/suppliers', {
        method: supplier ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(!supplier ? { code } : {}),
          name,
          contactName: contactName || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          taxIdentifier: taxIdentifier || undefined,
          notes: notes || undefined,
        }),
      });
      await refresh();
      router.push(`/app/suppliers/${saved.id}`);
    } catch (cause) {
      setError(
        friendlyPartyError(cause instanceof Error ? cause.message : 'Supplier save failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>{supplier ? 'Edit supplier' : 'Create supplier'}</CardTitle>
          <CardDescription>
            Maintain company-scoped supplier identity and contact details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {!supplier ? (
            <FormField label="Supplier code" required>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </FormField>
          ) : null}
          <FormField label="Supplier name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Contact person">
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </FormField>
          <FormField label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Tax / business identifier">
            <Input value={taxIdentifier} onChange={(e) => setTaxIdentifier(e.target.value)} />
          </FormField>
          <FormField label="Address" className="md:col-span-2">
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
          <FormField label="Notes" className="md:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} loading={busy}>
          {supplier ? 'Save supplier' : 'Create supplier'}
        </Button>
      </div>
    </div>
  );
}

export function CreditLimitDialog({ customer }: { customer: Customer }) {
  const { api, refresh } = useParties();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(customer.creditLimit);
  const [reason, setReason] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const openReview = () => {
    if (!positiveMoney.test(amount) || reason.trim().length < 3) {
      setError('Enter a non-negative limit and a reason of at least three characters.');
      return;
    }
    setError('');
    setOpen(false);
    setReview(true);
  };
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/customers/${customer.id}/credit-limit`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creditLimit: amount, reason }),
      });
      await refresh();
      setReview(false);
    } catch (cause) {
      setError(
        friendlyPartyError(cause instanceof Error ? cause.message : 'Credit-limit update failed.'),
      );
      setReview(false);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Change credit limit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change credit limit</DialogTitle>
            <DialogDescription>
              This audited setting guides backend credit-sale enforcement.
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="grid gap-4">
            <FormField label="New credit limit" required>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
              />
            </FormField>
            <FormField label="Reason" required>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={openReview}>Review change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ActionDialog
        open={review}
        onOpenChange={setReview}
        title="Apply credit-limit change?"
        description="The new limit and reason are recorded in the customer audit history."
        confirm="Apply change"
        busy={busy}
        onConfirm={() => void submit()}
      >
        <p className="font-semibold text-text-primary">
          {customer.code} · {customer.name}
        </p>
        <p className="mt-1">New credit limit: {amount} BDT</p>
        <p className="mt-1">Reason: {reason}</p>
      </ActionDialog>
    </>
  );
}

type LedgerOperation = 'opening' | 'opening-corrections' | 'adjustments';

export function LedgerActionDialog({
  kind,
  party,
}: {
  kind: PartyKind;
  party: Customer | Supplier;
}) {
  const { api, refresh } = useParties();
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState<LedgerOperation>('opening');
  const [meaning, setMeaning] = useState<'positive' | 'negative'>('positive');
  const [amount, setAmount] = useState('');
  const [effectiveAt, setEffectiveAt] = useState(today());
  const [reason, setReason] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const keyRef = useRef(operationKey());
  const signed = `${meaning === 'negative' ? '-' : ''}${amount}`;
  const operationLabel =
    operation === 'opening'
      ? 'Post opening balance'
      : operation === 'opening-corrections'
        ? 'Correct opening balance'
        : 'Post adjustment';
  const positiveLabel = kind === 'customer' ? 'Customer owes company' : 'Company owes supplier';
  const negativeLabel =
    kind === 'customer' ? 'Customer has advance' : 'Supplier holds company advance';
  const openReview = () => {
    if (
      !positiveMoney.test(amount) ||
      amount.replace(/[.0]/g, '') === '' ||
      reason.trim().length < 3
    ) {
      setError('Enter an amount greater than zero and a clear reason.');
      return;
    }
    setError('');
    setOpen(false);
    setReview(true);
  };
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/${kind}s/${party.id}/ledger/${operation}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': keyRef.current },
        body: JSON.stringify(
          operation === 'opening-corrections'
            ? { correctedAmount: signed, effectiveAt: new Date(effectiveAt).toISOString(), reason }
            : {
                amount: signed,
                effectiveAt: new Date(effectiveAt).toISOString(),
                description: reason,
              },
        ),
      });
      keyRef.current = operationKey();
      await refresh();
      setReview(false);
      setOpen(false);
      setAmount('');
      setReason('');
    } catch (cause) {
      setError(
        friendlyPartyError(cause instanceof Error ? cause.message : 'Ledger posting failed.'),
      );
      setReview(false);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Financial action
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Party financial action</DialogTitle>
            <DialogDescription>
              Posted ledger history is immutable. Corrections create new compensating entries.
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Action" required>
              <Select
                value={operation}
                onChange={(e) => setOperation(e.target.value as LedgerOperation)}
              >
                <option value="opening">Post opening balance</option>
                <option value="opening-corrections">Correct opening balance</option>
                <option value="adjustments">Post adjustment</option>
              </Select>
            </FormField>
            <FormField label="Financial meaning" required>
              <Select
                value={meaning}
                onChange={(e) => setMeaning(e.target.value as 'positive' | 'negative')}
              >
                <option value="positive">{positiveLabel}</option>
                <option value="negative">{negativeLabel}</option>
              </Select>
            </FormField>
            <FormField label="Amount" required>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
              />
            </FormField>
            <FormField label="Effective date" required>
              <Input
                type="date"
                value={effectiveAt}
                onChange={(e) => setEffectiveAt(e.target.value)}
              />
            </FormField>
            <FormField label="Reason" required className="md:col-span-2">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormField>
          </div>
          <Alert tone="info">
            {meaning === 'positive' ? positiveLabel : negativeLabel}. The API will store the signed
            Decimal amount.
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={openReview}>{operationLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ActionDialog
        open={review}
        onOpenChange={setReview}
        title={`${operationLabel}?`}
        description="This creates an immutable, audited ledger entry."
        confirm="Post entry"
        busy={busy}
        onConfirm={() => void submit()}
      >
        <p className="font-semibold text-text-primary">
          {party.code} · {party.name}
        </p>
        <p className="mt-1">
          {meaning === 'positive' ? positiveLabel : negativeLabel}: {amount} BDT
        </p>
        <p className="mt-1">
          Effective {effectiveAt} · {reason}
        </p>
      </ActionDialog>
    </>
  );
}

export function StatusDialog({ kind, party }: { kind: PartyKind; party: Customer | Supplier }) {
  const { api, refresh } = useParties();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activate = !party.isActive;
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/${kind}s/${party.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: activate }),
      });
      await refresh();
      setOpen(false);
    } catch (cause) {
      setError(
        friendlyPartyError(cause instanceof Error ? cause.message : 'Status update failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button variant={activate ? 'outline' : 'danger'} onClick={() => setOpen(true)}>
        {activate ? 'Reactivate' : 'Deactivate'}
      </Button>
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title={`${activate ? 'Reactivate' : 'Deactivate'} ${kind}?`}
        description="Historical documents and ledger entries remain readable."
        confirm={activate ? 'Reactivate' : 'Deactivate'}
        busy={busy}
        onConfirm={() => void submit()}
      >
        <p className="font-semibold text-text-primary">
          {party.code} · {party.name}
        </p>
        <StatusBadge tone={activate ? 'success' : 'warning'}>
          {activate ? 'Will become active' : 'Will become inactive'}
        </StatusBadge>
      </ActionDialog>
    </>
  );
}

export function GroupEditorDialog({ group }: { group?: CustomerGroup }) {
  const { api, refresh } = useParties();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(group?.code ?? '');
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!name.trim() || (!group && !code.trim())) {
      setError('Code and name are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api(group ? `/customer-groups/${group.id}` : '/customer-groups', {
        method: group ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(!group ? { code } : {}),
          name,
          description: description || undefined,
        }),
      });
      await refresh();
      setOpen(false);
    } catch (cause) {
      setError(friendlyPartyError(cause instanceof Error ? cause.message : 'Group save failed.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        size={group ? 'sm' : 'md'}
        variant={group ? 'ghost' : 'primary'}
        onClick={() => setOpen(true)}
      >
        {group ? 'Edit' : 'Create customer group'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{group ? 'Edit customer group' : 'Create customer group'}</DialogTitle>
            <DialogDescription>
              Inactive groups remain readable but cannot be assigned to new customers.
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="grid gap-4">
            {!group ? (
              <FormField label="Group code" required>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              </FormField>
            ) : null}
            <FormField label="Group name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Description">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} loading={busy}>
              Save group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GroupStatusDialog({ group }: { group: CustomerGroup }) {
  const { api, refresh } = useParties();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activate = !group.isActive;
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/customer-groups/${group.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: activate }),
      });
      await refresh();
      setOpen(false);
    } catch (cause) {
      setError(
        friendlyPartyError(cause instanceof Error ? cause.message : 'Group status update failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {activate ? 'Reactivate' : 'Deactivate'}
      </Button>
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title={`${activate ? 'Reactivate' : 'Deactivate'} customer group?`}
        description="Historical customer relationships remain readable."
        confirm={activate ? 'Reactivate' : 'Deactivate'}
        busy={busy}
        onConfirm={() => void submit()}
      >
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <p>
          {group.code} · {group.name}
        </p>
        <p className="mt-1">{group._count?.customers ?? 0} linked customer(s)</p>
      </ActionDialog>
    </>
  );
}
