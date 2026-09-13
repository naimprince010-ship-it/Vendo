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
import { CategoryDialog, ExpenseDialog, ReverseExpenseDialog } from '../cash/operations';
import { personName } from '../cash/presentation';
import { useCash } from '../cash/cash-context';
import type { Expense, ExpenseCategory, Page } from '../cash/types';

const ROOT = '/app/expenses';
const LIMIT = 20;

function Heading({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-primary">Cash & Expenses</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function ExpenseNavigation() {
  const path = usePathname();
  const links = [
    [ROOT, 'Expenses'],
    [`${ROOT}/categories`, 'Expense categories'],
  ] as const;
  return (
    <nav
      aria-label="Expense sections"
      className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
    >
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${path === href ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:bg-neutral-hover hover:text-text-primary'}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ExpensesRouter() {
  const path = usePathname();
  return path === `${ROOT}/categories` ? <CategoryList /> : <ExpenseList />;
}

function ExpenseList() {
  const { api, can, currentShift } = useCash();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const categories = useQuery({
    queryKey: ['cash-ui', 'categories'],
    queryFn: () => api<ExpenseCategory[]>('/expense-categories'),
    enabled: can('expense.view'),
  });
  const query = useQuery({
    queryKey: ['cash-ui', 'expenses', page, status, categoryId],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (status) params.set('status', status);
      if (categoryId) params.set('categoryId', categoryId);
      return api<Page<Expense>>(`/expenses?${params}`);
    },
    enabled: can('expense.view'),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / LIMIT));
  return (
    <div className="space-y-5">
      <Heading
        title="Expenses"
        description="Posted expense history remains auditable. Cash expenses affect the open drawer; non-cash expenses do not."
        actions={
          can('expense.post') ? (
            <ExpenseDialog
              categories={categories.data ?? []}
              trigger={
                <Button disabled={!categories.data?.some((row) => row.isActive)}>
                  Post expense
                </Button>
              }
            />
          ) : undefined
        }
      />
      <ExpenseNavigation />
      <Card>
        <CardHeader>
          <CardTitle>Expense history</CardTitle>
          <CardDescription>
            Bounded, branch-scoped financial records. Corrections are separate reversals, never
            edits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              aria-label="Expense status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed</option>
            </Select>
            <Select
              aria-label="Expense category filter"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
            <div className="flex items-center rounded-md border border-border bg-surface-subtle px-3 text-sm text-text-secondary">
              {currentShift ? 'Cash drawer is open' : 'No open cash shift'}
            </div>
          </div>
          {query.isLoading ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState description={query.error.message} />
          ) : !query.data?.items.length ? (
            <EmptyState
              title="No expenses found"
              description="Post an expense or adjust the filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created by</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-semibold text-text-primary">{row.expenseNumber}</p>
                        <p className="text-xs text-text-secondary">
                          {new Date(row.expenseDate).toLocaleString()}
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-text-muted">{row.description}</p>
                      </TableCell>
                      <TableCell>
                        <p>{row.category.name}</p>
                        <p className="text-xs text-text-muted">{row.reference ?? 'No reference'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{row.paymentMethod.name}</p>
                        <p className="text-xs text-text-muted">
                          {row.paymentMethod.isCash ? 'Cash drawer' : 'Non-cash · no drawer effect'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <MoneyDisplay value={row.amount} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={row.status === 'POSTED' ? 'success' : 'neutral'}>
                          {row.status === 'POSTED' ? 'Posted' : 'Reversed'}
                        </StatusBadge>
                        {row.reversalReason ? (
                          <p className="mt-1 max-w-48 text-xs text-text-muted">
                            {row.reversalReason}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <p>{personName(row.createdBy)}</p>
                      </TableCell>
                      <TableCell>
                        {row.status === 'POSTED' && can('expense.reverse') ? (
                          <ReverseExpenseDialog
                            expense={row}
                            trigger={
                              <Button variant="ghost" size="sm">
                                Reverse
                              </Button>
                            }
                          />
                        ) : (
                          <span className="text-xs text-text-muted">History locked</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {query.data ? (
            <Pagination
              currentPage={page}
              pageCount={pages}
              totalItems={query.data.total}
              onPrevious={page > 1 ? () => setPage(page - 1) : undefined}
              onNext={page < pages ? () => setPage(page + 1) : undefined}
            />
          ) : null}
        </CardContent>
      </Card>
      <Alert tone="info" title="Cash classification">
        Only payment methods marked as Cash create drawer movements. Bank, card, mobile and other
        configured non-cash methods remain expense records without changing Expected Cash.
      </Alert>
    </div>
  );
}

function CategoryList() {
  const { api, can, refresh } = useCash();
  const query = useQuery({
    queryKey: ['cash-ui', 'categories'],
    queryFn: () => api<ExpenseCategory[]>('/expense-categories'),
    enabled: can('expense.view'),
  });
  const toggle = async (row: ExpenseCategory) => {
    await api(`/expense-categories/${row.id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive: !row.isActive }),
    });
    await refresh();
  };
  return (
    <div className="space-y-5">
      <Heading
        title="Expense categories"
        description="Company-scoped categories organise expense history without hardcoded business assumptions."
        actions={
          can('expense.create') ? (
            <CategoryDialog trigger={<Button>New category</Button>} />
          ) : undefined
        }
      />
      <ExpenseNavigation />
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Inactive categories remain readable in historical records but are unavailable for new
            expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState description={query.error.message} />
          ) : !query.data?.length ? (
            <EmptyState title="No expense categories" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell className="font-semibold">{row.name}</TableCell>
                      <TableCell className="max-w-md text-text-secondary">
                        {row.description ?? '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {can('expense.edit') ? (
                            <>
                              <CategoryDialog
                                category={row}
                                trigger={
                                  <Button size="sm" variant="ghost">
                                    Edit
                                  </Button>
                                }
                              />
                              <Button size="sm" variant="ghost" onClick={() => void toggle(row)}>
                                {row.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
