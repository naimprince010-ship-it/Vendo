'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';

type Page<T> = { items: T[]; total: number };
type Group = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};
type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: string;
  isWalkIn: boolean;
  isActive: boolean;
  balance?: string;
  group: Group | null;
};
type Supplier = {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  balance?: string;
};
type LedgerEntry = {
  id: string;
  type: string;
  amount: string;
  debit: string;
  credit: string;
  runningBalance: string | null;
  effectiveAt: string;
  description: string;
};
type LedgerPage = Page<LedgerEntry> & { balance: string };
type Tab = 'customers' | 'groups' | 'suppliers';

const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400';
const primary =
  'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function PartiesConsole() {
  const { user, authenticatedFetch } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('customers');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const can = (permission: string) => Boolean(user?.permissions.includes(permission));
  const api = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await authenticatedFetch(path, init);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      throw new Error(
        Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? `Request failed (${response.status})`),
      );
    }
    return response.json() as Promise<T>;
  };
  const run = async (work: () => Promise<unknown>, keys: string[], success: string) => {
    setError('');
    setMessage('');
    try {
      await work();
      await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    }
  };
  const query = new URLSearchParams({ limit: '50' });
  if (search.trim()) query.set('search', search.trim());
  const customers = useQuery({
    queryKey: ['party-customers', search],
    queryFn: () => api<Page<Customer>>(`/customers?${query}`),
    enabled: can('customer.view'),
  });
  const groups = useQuery({
    queryKey: ['party-groups'],
    queryFn: () => api<Page<Group>>('/customer-groups?limit=100'),
    enabled: can('customer_group.view'),
  });
  const suppliers = useQuery({
    queryKey: ['party-suppliers', search],
    queryFn: () => api<Page<Supplier>>(`/suppliers?${query}`),
    enabled: can('supplier.view'),
  });
  const tabs: Array<[Tab, string, string]> = [
    ['customers', 'Customers', 'customer.view'],
    ['groups', 'Customer groups', 'customer_group.view'],
    ['suppliers', 'Suppliers', 'supplier.view'],
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs
          .filter(([, , permission]) => can(permission))
          .map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setSelectedId('');
              }}
              className={tab === id ? primary : secondary}
            >
              {label}
            </button>
          ))}
      </div>
      {message && (
        <p className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-300">{message}</p>
      )}
      {error && <p className="rounded-lg bg-rose-950 p-3 text-sm text-rose-300">{error}</p>}
      {tab === 'groups' ? (
        <GroupsPanel groups={groups.data?.items ?? []} api={api} run={run} can={can} />
      ) : (
        <>
          <input
            className={field}
            placeholder={
              tab === 'customers'
                ? 'Search code, name, phone, or email'
                : 'Search code, name, contact, phone, or email'
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
            <Card title={tab === 'customers' ? 'Customers' : 'Suppliers'}>
              <PartyCreateForm
                kind={tab === 'customers' ? 'customer' : 'supplier'}
                groups={groups.data?.items ?? []}
                api={api}
                run={run}
                can={can}
              />
              <div className="mt-5 space-y-2">
                {(tab === 'customers' ? customers.data?.items : suppliers.data?.items)?.map(
                  (party) => (
                    <button
                      key={party.id}
                      type="button"
                      onClick={() => setSelectedId(party.id)}
                      className="block w-full rounded-lg border border-slate-800 p-3 text-left hover:border-amber-400"
                    >
                      <span className="font-medium">{party.name}</span>
                      {'isWalkIn' in party && party.isWalkIn && (
                        <span className="ml-2 rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-slate-950">
                          System walk-in
                        </span>
                      )}
                      <span className="block text-xs text-slate-400">
                        {party.code} · {party.phone ?? 'No phone'} ·{' '}
                        {party.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  ),
                )}
                {(tab === 'customers'
                  ? customers.data?.items.length
                  : suppliers.data?.items.length) === 0 && (
                  <p className="text-sm text-slate-400">No matching records.</p>
                )}
              </div>
            </Card>
            <PartyDetail
              kind={tab === 'customers' ? 'customer' : 'supplier'}
              id={selectedId}
              api={api}
              run={run}
              can={can}
            />
          </div>
        </>
      )}
    </div>
  );
}

function GroupsPanel({
  groups,
  api,
  run,
  can,
}: {
  groups: Group[];
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  run: (work: () => Promise<unknown>, keys: string[], success: string) => Promise<void>;
  can: (permission: string) => boolean;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(
      () =>
        api('/customer-groups', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code: data.get('code'),
            name: data.get('name'),
            description: data.get('description') || undefined,
          }),
        }),
      ['party-groups'],
      'Customer group created.',
    ).then(() => form.reset());
  };
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {can('customer_group.manage') && (
        <Card title="Create customer group">
          <form className="space-y-3" onSubmit={submit}>
            <input className={field} name="code" placeholder="Code" required />
            <input className={field} name="name" placeholder="Name" required />
            <textarea className={field} name="description" placeholder="Description" />
            <button className={primary} type="submit">
              Create group
            </button>
          </form>
        </Card>
      )}
      <Card title="Customer groups">
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 p-3"
            >
              <div>
                <strong>{group.name}</strong>
                <p className="text-xs text-slate-400">
                  {group.code} · {group.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              {can('customer_group.manage') && (
                <button
                  className={secondary}
                  type="button"
                  onClick={() =>
                    void run(
                      () =>
                        api(`/customer-groups/${group.id}/status`, {
                          method: 'PATCH',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({ isActive: !group.isActive }),
                        }),
                      ['party-groups'],
                      `Group ${group.isActive ? 'deactivated' : 'reactivated'}.`,
                    )
                  }
                >
                  {group.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PartyCreateForm({
  kind,
  groups,
  api,
  run,
  can,
}: {
  kind: 'customer' | 'supplier';
  groups: Group[];
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  run: (work: () => Promise<unknown>, keys: string[], success: string) => Promise<void>;
  can: (permission: string) => boolean;
}) {
  if (!can(`${kind}.create`))
    return <p className="text-sm text-slate-400">You can view records but cannot create them.</p>;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const body = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== ''));
    void run(
      () =>
        api(`/${kind}s`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
      [`party-${kind}s`],
      `${kind === 'customer' ? 'Customer' : 'Supplier'} created.`,
    ).then(() => form.reset());
  };
  return (
    <form className="grid gap-2 sm:grid-cols-2" onSubmit={submit}>
      <input className={field} name="code" placeholder="Code" required />
      <input className={field} name="name" placeholder="Name" required />
      {kind === 'supplier' && (
        <input className={field} name="contactName" placeholder="Contact person" />
      )}
      <input className={field} name="phone" placeholder="Phone" />
      <input className={field} name="email" type="email" placeholder="Email" />
      <input className={field} name="address" placeholder="Address" />
      {kind === 'customer' && (
        <>
          <select className={field} name="groupId">
            <option value="">No group</option>
            {groups
              .filter((group) => group.isActive)
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
          </select>
          <input className={field} name="creditLimit" placeholder="Credit limit" defaultValue="0" />
        </>
      )}
      <button className={primary} type="submit">
        Create {kind}
      </button>
    </form>
  );
}

function PartyDetail({
  kind,
  id,
  api,
  run,
  can,
}: {
  kind: 'customer' | 'supplier';
  id: string;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  run: (work: () => Promise<unknown>, keys: string[], success: string) => Promise<void>;
  can: (permission: string) => boolean;
}) {
  const detail = useQuery({
    queryKey: ['party-detail', kind, id],
    queryFn: () => api<Customer | Supplier>(`/${kind}s/${id}`),
    enabled: Boolean(id),
  });
  const ledgerPermission = `${kind}.view_ledger`;
  const ledger = useQuery({
    queryKey: ['party-ledger', kind, id],
    queryFn: () => api<LedgerPage>(`/${kind}s/${id}/ledger?limit=50`),
    enabled: Boolean(id) && can(ledgerPermission),
  });
  if (!id || !detail.data)
    return (
      <Card title="Party details">
        <p className="text-slate-400">
          Select a record to view contact, balance, and ledger history.
        </p>
      </Card>
    );
  const party = detail.data;
  const updateName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = new FormData(form).get('name');
    void run(
      () =>
        api(`/${kind}s/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name }),
        }),
      ['party-detail', `party-${kind}s`],
      `${kind} updated.`,
    );
  };
  return (
    <Card title={party.name}>
      <div className="space-y-5">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-slate-400">Code:</span> {party.code}
          </p>
          <p>
            <span className="text-slate-400">Phone:</span> {party.phone ?? '—'}
          </p>
          <p>
            <span className="text-slate-400">Email:</span> {party.email ?? '—'}
          </p>
          <p>
            <span className="text-slate-400">Status:</span> {party.isActive ? 'Active' : 'Inactive'}
          </p>
          {'creditLimit' in party && (
            <p>
              <span className="text-slate-400">Credit limit:</span> {party.creditLimit}
            </p>
          )}
          <p>
            <span className="text-slate-400">Ledger balance:</span>{' '}
            {ledger.data?.balance ?? party.balance ?? 'Restricted'}
          </p>
        </div>
        {can(`${kind}.edit`) && !('isWalkIn' in party && party.isWalkIn) && (
          <form className="flex gap-2" onSubmit={updateName}>
            <input className={field} name="name" defaultValue={party.name} required />
            <button className={secondary} type="submit">
              Update name
            </button>
          </form>
        )}
        {'creditLimit' in party && can('customer.manage_credit') && (
          <CreditLimitForm id={id} api={api} run={run} />
        )}
        {can(`${kind}.adjust_balance`) && <LedgerPosting kind={kind} id={id} api={api} run={run} />}
        {can(ledgerPermission) && (
          <div>
            <h3 className="mb-2 font-semibold">Immutable ledger history</h3>
            <p className="mb-3 text-xs text-slate-400">
              No sales, purchase, or payment history is shown until those workflows post real
              entries.
            </p>
            <div className="space-y-2">
              {ledger.data?.items.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-800 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <strong>{entry.type.replaceAll('_', ' ')}</strong>
                    <span>{new Date(entry.effectiveAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-400">{entry.description}</p>
                  <p>
                    Debit {entry.debit} · Credit {entry.credit}
                    {entry.runningBalance ? ` · Balance ${entry.runningBalance}` : ''}
                  </p>
                </div>
              ))}
              {ledger.data?.items.length === 0 && (
                <p className="text-sm text-slate-400">No ledger entries have been posted.</p>
              )}
            </div>
          </div>
        )}
        {can(`${kind}.edit`) && !('isWalkIn' in party && party.isWalkIn) && (
          <button
            className={secondary}
            type="button"
            onClick={() =>
              void run(
                () =>
                  api(`/${kind}s/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ isActive: !party.isActive }),
                  }),
                ['party-detail', `party-${kind}s`],
                `${kind} ${party.isActive ? 'deactivated' : 'reactivated'}.`,
              )
            }
          >
            {party.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        )}
      </div>
    </Card>
  );
}

function CreditLimitForm({
  id,
  api,
  run,
}: {
  id: string;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  run: (work: () => Promise<unknown>, keys: string[], success: string) => Promise<void>;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(
      () =>
        api(`/customers/${id}/credit-limit`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            creditLimit: data.get('creditLimit'),
            reason: data.get('reason'),
          }),
        }),
      ['party-detail'],
      'Credit limit updated with audit history.',
    );
  };
  return (
    <form className="grid gap-2 sm:grid-cols-3" onSubmit={submit}>
      <input className={field} name="creditLimit" placeholder="Credit limit" required />
      <input className={field} name="reason" placeholder="Reason" required />
      <button className={secondary} type="submit">
        Set credit limit
      </button>
    </form>
  );
}

function LedgerPosting({
  kind,
  id,
  api,
  run,
}: {
  kind: 'customer' | 'supplier';
  id: string;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  run: (work: () => Promise<unknown>, keys: string[], success: string) => Promise<void>;
}) {
  const post = (
    event: FormEvent<HTMLFormElement>,
    operation: 'opening' | 'opening-corrections' | 'adjustments',
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const amountKey = operation === 'opening-corrections' ? 'correctedAmount' : 'amount';
    const body = {
      [amountKey]: data.get('amount'),
      effectiveAt: new Date(String(data.get('date'))).toISOString(),
      ...(operation === 'opening-corrections'
        ? { reason: data.get('description') }
        : { description: data.get('description') }),
    };
    void run(
      () =>
        api(`/${kind}s/${id}/ledger/${operation}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'Idempotency-Key': `ui-${crypto.randomUUID()}`,
          },
          body: JSON.stringify(body),
        }),
      ['party-ledger', 'party-detail'],
      operation === 'opening'
        ? 'Opening balance posted.'
        : operation === 'opening-corrections'
          ? 'Opening balance correction posted.'
          : 'Balance adjustment posted.',
    ).then(() => form.reset());
  };
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {(
        [
          ['opening', 'Post opening balance'],
          ['opening-corrections', 'Correct opening balance'],
          ['adjustments', 'Post adjustment'],
        ] as const
      ).map(([operation, label]) => (
        <form
          key={operation}
          className="space-y-2 rounded-lg border border-slate-800 p-3"
          onSubmit={(event) => post(event, operation)}
        >
          <strong className="text-sm">{label}</strong>
          <input
            className={field}
            name="amount"
            placeholder={
              operation === 'opening-corrections' ? 'Corrected signed amount' : 'Signed amount'
            }
            required
          />
          <input className={field} name="date" type="date" defaultValue={today} required />
          <input
            className={field}
            name="description"
            placeholder="Reason / reference note"
            required
          />
          <button className={secondary} type="submit">
            Post
          </button>
        </form>
      ))}
    </div>
  );
}
