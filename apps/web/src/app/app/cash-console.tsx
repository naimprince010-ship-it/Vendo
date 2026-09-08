'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';

type Page<T> = { items: T[]; total: number };
type Branch = { id: string; code: string; name: string; isActive: boolean };
type Register = { id: string; branchId: string; code: string; name: string; isActive: boolean };
type Method = { id: string; code: string; name: string; isCash: boolean };
type Category = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};
type Shift = {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openingCash: string;
  expectedCash: string;
  actualCash: string | null;
  variance: string | null;
  openedAt: string;
  closedAt: string | null;
  register: { code: string; name: string };
  totals: Record<string, string>;
};
type Movement = {
  id: string;
  type: string;
  amount: string;
  reason: string | null;
  occurredAt: string;
};
type Expense = {
  id: string;
  expenseNumber: string;
  amount: string;
  status: string;
  description: string;
  expenseDate: string;
  category: Category;
  paymentMethod: Method;
};

const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400';
const primary =
  'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50';
const secondary = 'rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50';
const opKey = (name: string) => `cash-ui-${name}-${crypto.randomUUID()}`;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function CashConsole() {
  const { user, authenticatedFetch } = useAuth();
  const client = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [opening, setOpening] = useState('0');
  const [amount, setAmount] = useState('0');
  const [reason, setReason] = useState('Owner drawer float');
  const [actual, setActual] = useState('0');
  const [categoryCode, setCategoryCode] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const can = (permission: string) => Boolean(user?.permissions.includes(permission));
  const api = async <T,>(path: string, init: RequestInit = {}, branch = '') => {
    const headers = new Headers(init.headers);
    if (branch) headers.set('x-branch-id', branch);
    if (init.body) headers.set('content-type', 'application/json');
    const response = await authenticatedFetch(path, { ...init, headers });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      throw new Error(
        Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? `Request failed (${response.status})`),
      );
    }
    if (response.status === 204) return undefined as T;
    const body = await response.text();
    return (body ? JSON.parse(body) : undefined) as T;
  };
  const run = async (work: () => Promise<unknown>, success: string) => {
    setError('');
    setMessage('');
    try {
      await work();
      await client.invalidateQueries({ queryKey: ['cash'] });
      await client.invalidateQueries({ queryKey: ['sales'] });
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    }
  };
  const branches = useQuery({
    queryKey: ['cash', 'branches'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100'),
  });
  const activeBranchId = branchId || branches.data?.items.find((row) => row.isActive)?.id || '';
  const registers = useQuery({
    queryKey: ['cash', 'registers', activeBranchId],
    queryFn: () => api<Page<Register>>(`/registers?branchId=${activeBranchId}&limit=100`),
    enabled: Boolean(activeBranchId),
  });
  const activeRegisterId =
    registerId || registers.data?.items.find((row) => row.isActive)?.id || '';
  const current = useQuery({
    queryKey: ['cash', 'current', activeBranchId, activeRegisterId],
    queryFn: () =>
      api<Shift | null>(
        `/cash/shifts/current?registerId=${activeRegisterId}`,
        {},
        activeBranchId,
      ).then((shift) => shift ?? null),
    enabled: Boolean(activeBranchId && activeRegisterId && can('cash.view_shift')),
  });
  const shifts = useQuery({
    queryKey: ['cash', 'shifts', activeBranchId],
    queryFn: () => api<Page<Shift>>('/cash/shifts?limit=25', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('cash.view_shift')),
  });
  const movements = useQuery({
    queryKey: ['cash', 'movements', activeBranchId, current.data?.id],
    queryFn: () =>
      api<Page<Movement>>(
        `/cash/movements?limit=50${current.data?.id ? `&shiftId=${current.data.id}` : ''}`,
        {},
        activeBranchId,
      ),
    enabled: Boolean(activeBranchId && can('cash.view_history')),
  });
  const categories = useQuery({
    queryKey: ['cash', 'categories', activeBranchId],
    queryFn: () => api<Category[]>('/expense-categories', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('expense.view')),
  });
  const methods = useQuery({
    queryKey: ['cash', 'methods', activeBranchId],
    queryFn: () => api<{ paymentMethods: Method[] }>('/sales/pos/context', {}, activeBranchId),
    enabled: Boolean(activeBranchId),
  });
  const expenses = useQuery({
    queryKey: ['cash', 'expenses', activeBranchId],
    queryFn: () => api<Page<Expense>>('/expenses?limit=25', {}, activeBranchId),
    enabled: Boolean(activeBranchId && can('expense.view')),
  });
  const selectedMethodId = methodId || methods.data?.paymentMethods[0]?.id || '';
  const selectedMethod = methods.data?.paymentMethods.find((row) => row.id === selectedMethodId);
  const selectedCategoryId = categoryId || categories.data?.find((row) => row.isActive)?.id || '';
  const headers = (name: string) => ({ 'Idempotency-Key': opKey(name) });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className={`${field} max-w-xs`}
          aria-label="Cash branch"
          value={activeBranchId}
          onChange={(event) => {
            setBranchId(event.target.value);
            setRegisterId('');
          }}
        >
          {(branches.data?.items ?? [])
            .filter((row) => row.isActive)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.code} · {row.name}
              </option>
            ))}
        </select>
        <select
          className={`${field} max-w-xs`}
          aria-label="Cash register"
          value={activeRegisterId}
          onChange={(event) => setRegisterId(event.target.value)}
        >
          {(registers.data?.items ?? [])
            .filter((row) => row.isActive)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.code} · {row.name}
              </option>
            ))}
        </select>
        <span
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${current.data ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}
        >
          {current.data ? 'Shift open' : 'No shift open'}
        </span>
      </div>
      {message && (
        <p className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-300">{message}</p>
      )}
      {error && <p className="rounded-lg bg-rose-950 p-3 text-sm text-rose-300">{error}</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Active cash shift">
          {!current.data ? (
            <div className="space-y-3">
              <input
                className={field}
                aria-label="Opening cash"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
                placeholder="Opening cash"
              />
              <button
                className={primary}
                disabled={!activeRegisterId || !can('cash.open_shift')}
                onClick={() =>
                  void run(
                    () =>
                      api(
                        '/cash/shifts/open',
                        {
                          method: 'POST',
                          headers: headers('open'),
                          body: JSON.stringify({
                            registerId: activeRegisterId,
                            openingCash: opening,
                          }),
                        },
                        activeBranchId,
                      ),
                    'Cash shift opened',
                  )
                }
              >
                Open shift
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                {current.data.register.code} · opened{' '}
                {new Date(current.data.openedAt).toLocaleString()}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>
                  Opening <b>{current.data.openingCash}</b>
                </p>
                <p>
                  Expected <b>{current.data.expectedCash}</b>
                </p>
                <p>
                  Cash sales <b>{current.data.totals.CASH_SALE}</b>
                </p>
                <p>
                  Collections <b>{current.data.totals.CUSTOMER_COLLECTION}</b>
                </p>
                <p>
                  Refunds <b>{current.data.totals.CASH_REFUND}</b>
                </p>
                <p>
                  Expenses <b>{current.data.totals.EXPENSE}</b>
                </p>
              </div>
              <input
                className={field}
                aria-label="Actual closing cash"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                placeholder="Counted actual cash"
              />
              <button
                className={primary}
                disabled={!can('cash.close_shift')}
                onClick={() =>
                  void run(
                    () =>
                      api(
                        `/cash/shifts/${current.data?.id}/close`,
                        {
                          method: 'POST',
                          headers: headers('close'),
                          body: JSON.stringify({ actualCash: actual, note: 'Counted by cashier' }),
                        },
                        activeBranchId,
                      ),
                    'Shift closed and variance preserved',
                  )
                }
              >
                Close shift
              </button>
            </div>
          )}
        </Card>
        <Card title="Manual cash control">
          <div className="space-y-3">
            <input
              className={field}
              aria-label="Cash movement amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
            />
            <input
              className={field}
              aria-label="Cash movement reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required reason"
            />
            <div className="flex gap-2">
              <button
                className={primary}
                disabled={!current.data || !can('cash.cash_in')}
                onClick={() =>
                  void run(
                    () =>
                      api(
                        '/cash/movements/in',
                        {
                          method: 'POST',
                          headers: headers('in'),
                          body: JSON.stringify({ registerId: activeRegisterId, amount, reason }),
                        },
                        activeBranchId,
                      ),
                    'Cash in posted',
                  )
                }
              >
                Cash in
              </button>
              <button
                className={secondary}
                disabled={!current.data || !can('cash.cash_out')}
                onClick={() =>
                  void run(
                    () =>
                      api(
                        '/cash/movements/out',
                        {
                          method: 'POST',
                          headers: headers('out'),
                          body: JSON.stringify({ registerId: activeRegisterId, amount, reason }),
                        },
                        activeBranchId,
                      ),
                    'Cash out posted',
                  )
                }
              >
                Cash out
              </button>
            </div>
          </div>
        </Card>
        <Card title="Expense categories">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={field}
              aria-label="Expense category code"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              placeholder="Code"
            />
            <input
              className={field}
              aria-label="Expense category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Name"
            />
          </div>
          <button
            className={`${primary} mt-3`}
            disabled={!categoryCode || !categoryName || !can('expense.create')}
            onClick={() =>
              void run(
                () =>
                  api(
                    '/expense-categories',
                    {
                      method: 'POST',
                      body: JSON.stringify({ code: categoryCode, name: categoryName }),
                    },
                    activeBranchId,
                  ),
                'Expense category created',
              )
            }
          >
            Create category
          </button>
          <div className="mt-3 space-y-2">
            {(categories.data ?? []).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 p-2 text-sm"
              >
                <span>
                  {row.code} · {row.name}
                </span>
                <button
                  className={secondary}
                  disabled={!can('expense.edit')}
                  onClick={() =>
                    void run(
                      () =>
                        api(
                          `/expense-categories/${row.id}/status`,
                          { method: 'PATCH', body: JSON.stringify({ isActive: !row.isActive }) },
                          activeBranchId,
                        ),
                      `Category ${row.isActive ? 'deactivated' : 'activated'}`,
                    )
                  }
                >
                  {row.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Post expense">
          <div className="space-y-3">
            <select
              className={field}
              aria-label="Expense category"
              value={selectedCategoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {(categories.data ?? [])
                .filter((row) => row.isActive)
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </option>
                ))}
            </select>
            <select
              className={field}
              aria-label="Expense payment method"
              value={selectedMethodId}
              onChange={(e) => setMethodId(e.target.value)}
            >
              {(methods.data?.paymentMethods ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <input
              className={field}
              aria-label="Expense amount"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="Amount"
            />
            <input
              className={field}
              aria-label="Expense description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
            <button
              className={primary}
              disabled={
                !selectedCategoryId ||
                !selectedMethodId ||
                !description ||
                !can('expense.post') ||
                Boolean(selectedMethod?.isCash && !current.data)
              }
              onClick={() =>
                void run(
                  () =>
                    api(
                      '/expenses',
                      {
                        method: 'POST',
                        headers: headers('expense'),
                        body: JSON.stringify({
                          categoryId: selectedCategoryId,
                          paymentMethodId: selectedMethodId,
                          registerId: selectedMethod?.isCash ? activeRegisterId : undefined,
                          amount: expenseAmount,
                          description,
                        }),
                      },
                      activeBranchId,
                    ),
                  'Expense posted',
                )
              }
            >
              Post expense
            </button>
          </div>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Cash movement history">
          <div className="max-h-80 space-y-2 overflow-auto">
            {(movements.data?.items ?? []).map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-800 p-3 text-sm">
                <b>{row.type}</b> · {row.amount}
                <p className="text-xs text-slate-400">
                  {row.reason ?? 'Business-linked movement'} ·{' '}
                  {new Date(row.occurredAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Expense and shift history">
          <div className="max-h-80 space-y-2 overflow-auto">
            {(expenses.data?.items ?? []).map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-800 p-3 text-sm">
                <b>{row.expenseNumber}</b> · {row.amount} · {row.status}
                <p className="text-xs text-slate-400">
                  {row.category.name} · {row.paymentMethod.name} · {row.description}
                </p>
                {row.status === 'POSTED' && (
                  <button
                    className={`${secondary} mt-2`}
                    disabled={
                      !can('expense.reverse') || Boolean(row.paymentMethod.isCash && !current.data)
                    }
                    onClick={() =>
                      void run(
                        () =>
                          api(
                            `/expenses/${row.id}/reverse`,
                            {
                              method: 'POST',
                              headers: headers('expense-reverse'),
                              body: JSON.stringify({
                                registerId: row.paymentMethod.isCash ? activeRegisterId : undefined,
                                reason: `Correction: ${row.description}`,
                              }),
                            },
                            activeBranchId,
                          ),
                        'Expense reversed with compensating drawer effect',
                      )
                    }
                  >
                    Reverse
                  </button>
                )}
              </div>
            ))}
            {(shifts.data?.items ?? []).map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-800 p-3 text-sm">
                <b>{row.register.code}</b> · {row.status}
                <p className="text-xs text-slate-400">
                  Expected {row.expectedCash ?? 'open'} · actual {row.actualCash ?? '—'} · variance{' '}
                  {row.variance ?? '—'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
