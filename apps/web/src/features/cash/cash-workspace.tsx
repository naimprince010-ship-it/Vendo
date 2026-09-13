'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  MoneyDisplay,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vendo/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ExpensesRouter } from '../expenses/expenses-workspace';
import { CashProvider, useCash } from './cash-context';
import { CloseShiftDialog, ManualCashDialog, OpenShiftDialog } from './operations';
import {
  movementDirection,
  movementLabel,
  movementTone,
  personName,
  shiftTone,
  signedMovement,
  variancePresentation,
} from './presentation';
import type { CashMovement, CashShift, Page } from './types';

const ROOT = '/app/cash';
const LIMIT = 20;

function Heading({
  eyebrow = 'Cash & Expenses',
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function CashNavigation() {
  const path = usePathname();
  const links = [
    [ROOT, 'Current shift'],
    [`${ROOT}/shifts`, 'Shift history'],
    [`${ROOT}/movements`, 'Cash movements'],
    ['/app/expenses', 'Expenses'],
    ['/app/expenses/categories', 'Categories'],
  ] as const;
  return (
    <nav
      aria-label="Cash and expense sections"
      className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
    >
      {links.map(([href, label]) => {
        const active = href === ROOT ? path === ROOT : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${active ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:bg-neutral-hover hover:text-text-primary'}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CashWorkspace() {
  return (
    <CashProvider>
      <CashRouter />
    </CashProvider>
  );
}

function CashRouter() {
  const path = usePathname();
  if (path.startsWith('/app/expenses'))
    return (
      <div className="space-y-5">
        <CashNavigation />
        <ExpensesRouter />
      </div>
    );
  const parts = path.slice(ROOT.length).split('/').filter(Boolean);
  let content: ReactNode;
  if (!parts.length) content = <CurrentShift />;
  else if (parts[0] === 'shifts' && parts[1]) content = <ShiftDetail id={parts[1]} />;
  else if (parts[0] === 'shifts') content = <ShiftHistory />;
  else if (parts[0] === 'movements') content = <MovementHistory />;
  else
    content = (
      <EmptyState
        title="Cash page not found"
        description="Choose an available Cash & Expenses section."
      />
    );
  return (
    <div className="space-y-5">
      <CashNavigation />
      {content}
    </div>
  );
}

function RegisterSelector() {
  const { registerId, registers, setRegisterId, branchName } = useCash();
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,18rem)_auto] sm:items-end">
      <label className="grid gap-1.5 text-sm font-medium text-text-primary">
        Register
        <Select
          aria-label="Cash register"
          value={registerId}
          onChange={(e) => setRegisterId(e.target.value)}
        >
          {registers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </Select>
      </label>
      <p className="pb-2 text-xs text-text-secondary">
        Branch: <b className="text-text-primary">{branchName}</b>
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone?: 'default' | 'in' | 'out';
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <MoneyDisplay
          value={value}
          className={`mt-2 block text-xl font-bold ${tone === 'in' ? 'text-success' : tone === 'out' ? 'text-danger' : ''}`}
        />
        <p className="mt-1 text-xs text-text-secondary">{helper}</p>
      </CardContent>
    </Card>
  );
}

function CurrentShift() {
  const { can, currentLoading, currentShift, registerId, registers } = useCash();
  const selected = registers.find((row) => row.id === registerId);
  const totals = currentShift?.totals ?? {};
  return (
    <div className="space-y-5">
      <Heading
        title="Current shift"
        description="Live drawer position for the selected register. Expected Cash comes from the immutable movement journal."
        actions={
          currentShift ? (
            <>
              {can('cash.cash_in') ? (
                <ManualCashDialog
                  direction="in"
                  trigger={<Button variant="outline">Cash in</Button>}
                />
              ) : null}
              {can('cash.cash_out') ? (
                <ManualCashDialog
                  direction="out"
                  trigger={<Button variant="outline">Cash out</Button>}
                />
              ) : null}
              {can('cash.close_shift') ? (
                <CloseShiftDialog trigger={<Button variant="danger">Close shift</Button>} />
              ) : null}
            </>
          ) : can('cash.open_shift') ? (
            <OpenShiftDialog trigger={<Button>Open shift</Button>} />
          ) : undefined
        }
      />
      <RegisterSelector />
      {currentLoading ? (
        <LoadingState />
      ) : !registerId ? (
        <EmptyState
          title="No active register"
          description="An active register in the selected branch is required."
        />
      ) : !currentShift ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No shift open"
              description={`${selected?.code ?? 'This register'} has no active drawer shift. Opening cash is starting float, not income.`}
              action={
                can('cash.open_shift') ? (
                  <OpenShiftDialog trigger={<Button>Open cash shift</Button>} />
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Opening cash"
              value={currentShift.openingCash}
              helper="Starting drawer balance · not revenue"
            />
            <SummaryCard
              label="Expected cash"
              value={currentShift.expectedCash ?? '0'}
              helper="Backend-derived current drawer total"
            />
            <SummaryCard
              label="Cash sales"
              value={totals.CASH_SALE ?? '0'}
              helper="Applied cash only · tender/change excluded"
              tone="in"
            />
            <SummaryCard
              label="Cash expenses"
              value={totals.EXPENSE ?? '0'}
              helper="Posted cash expenses only"
              tone="out"
            />
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Drawer activity</CardTitle>
                  <CardDescription>
                    {currentShift.register.code} · opened{' '}
                    {new Date(currentShift.openedAt).toLocaleString()} by{' '}
                    {personName(currentShift.cashier)}
                  </CardDescription>
                </div>
                <StatusBadge tone="success">Open</StatusBadge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <CashBreakdown label="Cash sales" value={totals.CASH_SALE ?? '0'} direction="in" />
                <CashBreakdown
                  label="Customer collections"
                  value={totals.CUSTOMER_COLLECTION ?? '0'}
                  direction="in"
                />
                <CashBreakdown
                  label="Cash in / reversals"
                  value={totals.CASH_IN ?? '0'}
                  direction="in"
                />
                <CashBreakdown
                  label="Supplier payments"
                  value={totals.SUPPLIER_PAYMENT ?? '0'}
                  direction="out"
                />
                <CashBreakdown
                  label="Cash refunds"
                  value={totals.CASH_REFUND ?? '0'}
                  direction="out"
                />
                <CashBreakdown
                  label="Cash expenses"
                  value={totals.EXPENSE ?? '0'}
                  direction="out"
                />
                <CashBreakdown
                  label="Manual cash out"
                  value={totals.CASH_OUT ?? '0'}
                  direction="out"
                />
                <CashBreakdown
                  label="Expected cash"
                  value={currentShift.expectedCash ?? '0'}
                  direction="balance"
                />
              </div>
            </CardContent>
          </Card>
          <Alert tone="info" title="Drawer truth">
            Only applied cash is journalled. Tendered cash and change do not inflate Expected Cash,
            and non-cash methods create no drawer movement.
          </Alert>
        </>
      )}
    </div>
  );
}

function CashBreakdown({
  label,
  value,
  direction,
}: {
  label: string;
  value: string;
  direction: 'in' | 'out' | 'balance';
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <MoneyDisplay
        value={direction === 'out' ? `-${value.replace(/^-/, '')}` : value}
        className={`mt-1 block font-bold ${direction === 'in' ? 'text-success' : direction === 'out' ? 'text-danger' : ''}`}
      />
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {direction === 'in' ? 'Cash in' : direction === 'out' ? 'Cash out' : 'Drawer balance'}
      </p>
    </div>
  );
}

function ShiftHistory() {
  const { api, can, registers } = useCash();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [registerId, setRegisterId] = useState('');
  const query = useQuery({
    queryKey: ['cash-ui', 'shifts', page, status, registerId],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (status) params.set('status', status);
      if (registerId) params.set('registerId', registerId);
      return api<Page<CashShift>>(`/cash/shifts?${params}`);
    },
    enabled: can('cash.view_shift'),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / LIMIT));
  return (
    <div className="space-y-5">
      <Heading
        title="Shift history"
        description="Open and closed register shifts with immutable closing snapshots and reconciliation variance."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          aria-label="Shift status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </Select>
        <Select
          aria-label="Shift register"
          value={registerId}
          onChange={(e) => {
            setRegisterId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All registers</option>
          {registers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </Select>
      </div>
      <Card>
        <CardContent>
          {query.isLoading ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState description={query.error.message} />
          ) : !query.data?.items.length ? (
            <EmptyState title="No shifts found" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Opening</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Action</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.items.map((row) => {
                    const variance = variancePresentation(row.variance);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="font-semibold">
                            {row.register.code} · {row.register.name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {row.id.slice(0, 8).toUpperCase()}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p>{new Date(row.openedAt).toLocaleString()}</p>
                          <p className="text-xs text-text-muted">{personName(row.cashier)}</p>
                        </TableCell>
                        <TableCell>
                          <MoneyDisplay value={row.openingCash} />
                        </TableCell>
                        <TableCell>
                          {row.expectedCash ? <MoneyDisplay value={row.expectedCash} /> : 'Live'}
                        </TableCell>
                        <TableCell>
                          {row.actualCash ? <MoneyDisplay value={row.actualCash} /> : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={variance.tone}>{variance.label}</StatusBadge>
                          {variance.value ? (
                            <MoneyDisplay value={variance.value} className="mt-1 block text-xs" />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={shiftTone(row.status)}>
                            {row.status === 'OPEN' ? 'Open' : 'Closed'}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <Link href={`${ROOT}/shifts/${row.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {query.data ? (
            <Pagination
              className="mt-4"
              currentPage={page}
              pageCount={pages}
              totalItems={query.data.total}
              onPrevious={page > 1 ? () => setPage(page - 1) : undefined}
              onNext={page < pages ? () => setPage(page + 1) : undefined}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ShiftDetail({ id }: { id: string }) {
  const { api, can } = useCash();
  const shift = useQuery({
    queryKey: ['cash-ui', 'shift', id],
    queryFn: () => api<CashShift>(`/cash/shifts/${id}`),
    enabled: can('cash.view_shift'),
  });
  const movements = useQuery({
    queryKey: ['cash-ui', 'shift-movements', id],
    queryFn: () => api<Page<CashMovement>>(`/cash/movements?shiftId=${id}&limit=100`),
    enabled: can('cash.view_history'),
  });
  if (shift.isLoading) return <LoadingState />;
  if (shift.isError) return <ErrorState description={shift.error.message} />;
  if (!shift.data) return <EmptyState title="Shift not found" />;
  const row = shift.data;
  const variance = variancePresentation(row.variance);
  return (
    <div className="space-y-5">
      <Heading
        title={`${row.register.code} shift`}
        description={`Opened ${new Date(row.openedAt).toLocaleString()} by ${personName(row.cashier)}`}
        actions={
          <Link href={`${ROOT}/shifts`}>
            <Button variant="outline">Back to history</Button>
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Opening" value={row.openingCash} helper="Starting drawer balance" />
        <SummaryCard
          label="Expected"
          value={row.expectedCash ?? '0'}
          helper={row.status === 'OPEN' ? 'Live backend-derived total' : 'Closing snapshot'}
        />
        <SummaryCard
          label="Actual"
          value={row.actualCash ?? '0'}
          helper={row.actualCash ? 'Counted at close' : 'Not counted yet'}
        />
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Variance
            </p>
            <div className="mt-2">
              <StatusBadge tone={variance.tone}>{variance.label}</StatusBadge>
            </div>
            {variance.value ? (
              <MoneyDisplay value={variance.value} className="mt-2 block text-xl font-bold" />
            ) : null}
            <p className="mt-1 text-xs text-text-secondary">Actual minus Expected</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Shift movement timeline</CardTitle>
          <CardDescription>
            Immutable drawer activity. Original business records remain linked by source reference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.isLoading ? (
            <LoadingState />
          ) : movements.isError ? (
            <ErrorState description={movements.error.message} />
          ) : (
            <MovementTable items={movements.data?.items ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MovementHistory() {
  const { api, can, registers } = useCash();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [reference, setReference] = useState('');
  const query = useQuery({
    queryKey: ['cash-ui', 'movements', page, type, registerId, reference],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (type) params.set('type', type);
      if (registerId) params.set('registerId', registerId);
      if (reference.trim()) params.set('reference', reference.trim());
      return api<Page<CashMovement>>(`/cash/movements?${params}`);
    },
    enabled: can('cash.view_history'),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / LIMIT));
  return (
    <div className="space-y-5">
      <Heading
        title="Cash movements"
        description="The immutable physical-drawer journal. There are no edit or delete actions."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <SearchInput
          accessibleLabel="Search movement reference"
          placeholder="Reference or reason"
          value={reference}
          onChange={(e) => {
            setReference(e.target.value);
            setPage(1);
          }}
        />
        <Select
          aria-label="Movement type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All movement types</option>
          {[
            'OPENING',
            'CASH_SALE',
            'CUSTOMER_COLLECTION',
            'SUPPLIER_PAYMENT',
            'CASH_REFUND',
            'CASH_IN',
            'CASH_OUT',
            'EXPENSE',
            'CLOSING_ADJUSTMENT',
          ].map((value) => (
            <option key={value} value={value}>
              {movementLabel(value)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Movement register"
          value={registerId}
          onChange={(e) => {
            setRegisterId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All registers</option>
          {registers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </Select>
      </div>
      <Card>
        <CardContent>
          {query.isLoading ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState description={query.error.message} />
          ) : (
            <MovementTable items={query.data?.items ?? []} />
          )}{' '}
          {query.data ? (
            <Pagination
              className="mt-4"
              currentPage={page}
              pageCount={pages}
              totalItems={query.data.total}
              onPrevious={page > 1 ? () => setPage(page - 1) : undefined}
              onNext={page < pages ? () => setPage(page + 1) : undefined}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MovementTable({ items }: { items: CashMovement[] }) {
  if (!items.length) return <EmptyState title="No cash movements found" />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date / time</TableHead>
            <TableHead>Movement</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Source / reason</TableHead>
            <TableHead>Actor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap">
                <p>{new Date(row.occurredAt).toLocaleString()}</p>
                <p className="text-xs text-text-muted">
                  Shift {row.shiftId.slice(0, 8).toUpperCase()}
                </p>
              </TableCell>
              <TableCell>
                <StatusBadge tone={movementTone(row.type)}>{movementLabel(row.type)}</StatusBadge>
              </TableCell>
              <TableCell
                className={`font-semibold ${movementDirection(row.type) === 'in' ? 'text-success' : 'text-danger'}`}
              >
                {movementDirection(row.type) === 'in' ? 'Cash in' : 'Cash out'}
              </TableCell>
              <TableCell>
                <MoneyDisplay
                  value={signedMovement(row.type, row.amount)}
                  className={movementDirection(row.type) === 'in' ? 'text-success' : 'text-danger'}
                />
              </TableCell>
              <TableCell>
                <p className="font-medium text-text-primary">
                  {row.referenceType ?? 'Manual drawer entry'}
                </p>
                <p className="max-w-xs text-xs text-text-secondary">
                  {row.reason ?? (row.referenceId ? row.referenceId : 'Business-linked movement')}
                </p>
              </TableCell>
              <TableCell>
                <p>{personName(row.recordedBy)}</p>
                <p className="text-xs text-text-muted">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
