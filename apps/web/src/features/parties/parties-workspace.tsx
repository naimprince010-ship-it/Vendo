'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Badge,
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
import {
  CreditLimitDialog,
  CustomerEditor,
  GroupEditorDialog,
  GroupStatusDialog,
  LedgerActionDialog,
  StatusDialog,
  SupplierEditor,
} from './operations';
import { PartiesProvider, useParties } from './parties-context';
import {
  availableCredit,
  compareDecimal,
  financialPosition,
  ledgerTypeLabel,
} from './presentation';
import type {
  Customer,
  CustomerGroup,
  LedgerPage,
  Page,
  PartyKind,
  RelatedCollection,
  RelatedInvoice,
  RelatedPurchaseOrder,
  RelatedSale,
  Supplier,
} from './types';

const CUSTOMER_ROOT = '/app/customers';
const SUPPLIER_ROOT = '/app/suppliers';
const PAGE_SIZE = 20;

function Heading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
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

function PartyNav({ kind }: { kind: PartyKind }) {
  const path = usePathname();
  const links =
    kind === 'customer'
      ? ([
          [`${CUSTOMER_ROOT}`, 'Customers'],
          [`${CUSTOMER_ROOT}/groups`, 'Customer groups'],
        ] as const)
      : ([[`${SUPPLIER_ROOT}`, 'Suppliers']] as const);
  return (
    <nav
      aria-label={`${kind === 'customer' ? 'Customer' : 'Supplier'} sections`}
      className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
    >
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${path === href || (href === CUSTOMER_ROOT && path.startsWith(`${CUSTOMER_ROOT}/`) && !path.startsWith(`${CUSTOMER_ROOT}/groups`)) || (href === SUPPLIER_ROOT && path.startsWith(`${SUPPLIER_ROOT}/`)) ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:bg-neutral-hover hover:text-text-primary'}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function PartiesWorkspace() {
  return (
    <PartiesProvider>
      <PartiesRouter />
    </PartiesProvider>
  );
}

function PartiesRouter() {
  const path = usePathname();
  const { can, activeBranchName } = useParties();
  const isSupplier = path.startsWith(SUPPLIER_ROOT);
  const kind: PartyKind = isSupplier ? 'supplier' : 'customer';
  const root = isSupplier ? SUPPLIER_ROOT : CUSTOMER_ROOT;
  const parts = path.slice(root.length).split('/').filter(Boolean);
  const denied = <EmptyState title="You do not have permission for this action" />;
  let content: ReactNode;
  if (kind === 'customer' && parts[0] === 'groups')
    content = can('customer_group.view') ? <CustomerGroups /> : denied;
  else if (!parts.length) content = kind === 'customer' ? <CustomerList /> : <SupplierList />;
  else if (parts[0] === 'new')
    content = can(`${kind}.create`) ? (
      kind === 'customer' ? (
        <CustomerEditor />
      ) : (
        <SupplierEditor />
      )
    ) : (
      denied
    );
  else if (parts[1] === 'edit')
    content = can(`${kind}.edit`) ? <PartyEditorLoader kind={kind} id={parts[0]!} /> : denied;
  else
    content =
      kind === 'customer' ? <CustomerDetail id={parts[0]!} /> : <SupplierDetail id={parts[0]!} />;
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PartyNav kind={kind} />
      <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm">
        <span className="text-text-muted">Company-wide party records</span>
        <strong className="text-text-primary">Operational branch · {activeBranchName}</strong>
      </div>
      {content}
    </div>
  );
}

function PartyEditorLoader({ kind, id }: { kind: PartyKind; id: string }) {
  const { api } = useParties();
  const query = useQuery({
    queryKey: ['parties', kind, id],
    queryFn: () => api<Customer | Supplier>(`/${kind}s/${id}`),
  });
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState description={query.error.message} />;
  if (!query.data) return <EmptyState title={`${kind} not found`} />;
  return kind === 'customer' ? (
    <CustomerEditor customer={query.data as Customer} />
  ) : (
    <SupplierEditor supplier={query.data as Supplier} />
  );
}

function useListState() {
  const [search, setSearchState] = useState('');
  const [status, setStatusState] = useState('');
  const [page, setPage] = useState(1);
  return {
    search,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    status,
    setStatus: (value: string) => {
      setStatusState(value);
      setPage(1);
    },
    page,
    setPage,
  };
}

function ListFilters({
  state,
  placeholder,
}: {
  state: ReturnType<typeof useListState>;
  placeholder: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-3 pt-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <SearchInput
          accessibleLabel="Search parties"
          placeholder={placeholder}
          value={state.search}
          onChange={(e) => state.setSearch(e.target.value)}
        />
        <Select
          aria-label="Status filter"
          value={state.status}
          onChange={(e) => state.setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </CardContent>
    </Card>
  );
}

function CustomerList() {
  const { api, can } = useParties();
  const state = useListState();
  const params = new URLSearchParams({ page: String(state.page), limit: String(PAGE_SIZE) });
  if (state.search.trim()) params.set('search', state.search.trim());
  if (state.status) params.set('isActive', state.status);
  const query = useQuery({
    queryKey: ['parties', 'customers', params.toString()],
    queryFn: () => api<Page<Customer>>(`/customers?${params}`),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Customers"
        title="Customer directory"
        description="Search company-wide customer identity, classification and credit configuration."
        actions={
          can('customer.create') ? (
            <Link href={`${CUSTOMER_ROOT}/new`}>
              <Button>Create customer</Button>
            </Link>
          ) : undefined
        }
      />
      <ListFilters state={state} placeholder="Search name, code, phone, or email" />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState description={query.error.message} />
      ) : !query.data?.items.length ? (
        <EmptyState title="No customers found" description="Try another search or status filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead numeric>Credit limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`${CUSTOMER_ROOT}/${customer.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {customer.name}
                    </Link>
                    <p className="text-xs text-text-muted">{customer.code}</p>
                    {customer.isWalkIn ? (
                      <Badge tone="info" className="mt-1">
                        System customer
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {customer.group ? (
                      <>
                        <p className="font-medium">{customer.group.name}</p>
                        <p className="text-xs text-text-muted">{customer.group.code}</p>
                      </>
                    ) : (
                      <span className="text-text-muted">No group</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.phone ?? 'No phone'}
                    <p className="text-xs text-text-muted">{customer.email ?? 'No email'}</p>
                  </TableCell>
                  <TableCell numeric>
                    <MoneyDisplay value={customer.creditLimit} currency="BDT" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={customer.isActive ? 'success' : 'neutral'}>
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <Link href={`${CUSTOMER_ROOT}/${customer.id}`}>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {query.data ? (
        <Pagination
          currentPage={state.page}
          pageCount={pages}
          totalItems={query.data.total}
          onPrevious={state.page > 1 ? () => state.setPage(state.page - 1) : undefined}
          onNext={state.page < pages ? () => state.setPage(state.page + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

function SupplierList() {
  const { api, can } = useParties();
  const state = useListState();
  const params = new URLSearchParams({ page: String(state.page), limit: String(PAGE_SIZE) });
  if (state.search.trim()) params.set('search', state.search.trim());
  if (state.status) params.set('isActive', state.status);
  const query = useQuery({
    queryKey: ['parties', 'suppliers', params.toString()],
    queryFn: () => api<Page<Supplier>>(`/suppliers?${params}`),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Suppliers"
        title="Supplier directory"
        description="Company-wide supplier identity with immutable payable history."
        actions={
          can('supplier.create') ? (
            <Link href={`${SUPPLIER_ROOT}/new`}>
              <Button>Create supplier</Button>
            </Link>
          ) : undefined
        }
      />
      <ListFilters state={state} placeholder="Search name, code, contact, phone, or email" />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState description={query.error.message} />
      ) : !query.data?.items.length ? (
        <EmptyState title="No suppliers found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact person</TableHead>
                <TableHead>Phone / email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Link
                      href={`${SUPPLIER_ROOT}/${supplier.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {supplier.name}
                    </Link>
                    <p className="text-xs text-text-muted">{supplier.code}</p>
                  </TableCell>
                  <TableCell>{supplier.contactName ?? 'Not set'}</TableCell>
                  <TableCell>
                    {supplier.phone ?? 'No phone'}
                    <p className="text-xs text-text-muted">{supplier.email ?? 'No email'}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={supplier.isActive ? 'success' : 'neutral'}>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <Link href={`${SUPPLIER_ROOT}/${supplier.id}`}>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {query.data ? (
        <Pagination
          currentPage={state.page}
          pageCount={pages}
          totalItems={query.data.total}
          onPrevious={state.page > 1 ? () => state.setPage(state.page - 1) : undefined}
          onNext={state.page < pages ? () => state.setPage(state.page + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

function CustomerGroups() {
  const { api, can } = useParties();
  const state = useListState();
  const params = new URLSearchParams({ page: String(state.page), limit: String(PAGE_SIZE) });
  if (state.search.trim()) params.set('search', state.search.trim());
  if (state.status) params.set('isActive', state.status);
  const query = useQuery({
    queryKey: ['parties', 'groups', params.toString()],
    queryFn: () => api<Page<CustomerGroup>>(`/customer-groups?${params}`),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Customers"
        title="Customer groups"
        description="Classify customers without hardcoded retail, wholesale, contractor, or dealer assumptions."
        actions={can('customer_group.manage') ? <GroupEditorDialog /> : undefined}
      />
      <ListFilters state={state} placeholder="Search group code or name" />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState description={query.error.message} />
      ) : !query.data?.items.length ? (
        <EmptyState title="No customer groups found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Description</TableHead>
                <TableHead numeric>Customers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <p className="font-semibold">{group.name}</p>
                    <p className="text-xs text-text-muted">{group.code}</p>
                  </TableCell>
                  <TableCell className="max-w-md">
                    {group.description ?? 'No description'}
                  </TableCell>
                  <TableCell numeric>{group._count?.customers ?? 0}</TableCell>
                  <TableCell>
                    <StatusBadge tone={group.isActive ? 'success' : 'neutral'}>
                      {group.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {can('customer_group.manage') ? (
                      <div className="flex gap-1">
                        <GroupEditorDialog group={group} />
                        <GroupStatusDialog group={group} />
                      </div>
                    ) : (
                      'View only'
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
          currentPage={state.page}
          pageCount={pages}
          totalItems={query.data.total}
          onPrevious={state.page > 1 ? () => state.setPage(state.page - 1) : undefined}
          onNext={state.page < pages ? () => state.setPage(state.page + 1) : undefined}
        />
      ) : null}
    </div>
  );
}

function FinancialPositionCard({ kind, balance }: { kind: PartyKind; balance: string }) {
  const position = financialPosition(balance, kind);
  return (
    <Card>
      <CardHeader>
        <CardDescription>{position.label}</CardDescription>
        <CardTitle>
          <MoneyDisplay value={position.amount} currency="BDT" className="text-2xl" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <StatusBadge tone={position.tone}>{position.label}</StatusBadge>
        <p className="mt-2 text-xs text-text-muted">{position.explanation}</p>
      </CardContent>
    </Card>
  );
}

function CustomerDetail({ id }: { id: string }) {
  const { api, can, activeBranchId } = useParties();
  const customer = useQuery({
    queryKey: ['parties', 'customer', id],
    queryFn: () => api<Customer>(`/customers/${id}`),
  });
  const sales = useQuery({
    queryKey: ['parties', 'customer', id, 'sales', activeBranchId],
    queryFn: () => api<Page<RelatedSale>>(`/sales?customerId=${id}&status=COMPLETED&limit=5`),
    enabled: Boolean(activeBranchId && can('sale.view')),
  });
  const collections = useQuery({
    queryKey: ['parties', 'customer', id, 'collections', activeBranchId],
    queryFn: () => api<Page<RelatedCollection>>(`/sales/collections?customerId=${id}&limit=5`),
    enabled: Boolean(activeBranchId && can('customer.view_payments')),
  });
  if (customer.isLoading) return <LoadingState />;
  if (customer.isError) return <ErrorState description={customer.error.message} />;
  if (!customer.data) return <EmptyState title="Customer not found" />;
  const row = customer.data;
  const balance = row.balance ?? '0';
  const position = financialPosition(balance, 'customer');
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Customers · Profile"
        title={row.name}
        description={`${row.code}${row.group ? ` · ${row.group.name}` : ''}`}
        actions={
          <>
            <Link href={CUSTOMER_ROOT}>
              <Button variant="outline">Back</Button>
            </Link>
            {can('customer.edit') && !row.isWalkIn ? (
              <Link href={`${CUSTOMER_ROOT}/${row.id}/edit`}>
                <Button variant="outline">Edit profile</Button>
              </Link>
            ) : null}
            {can('customer.manage_credit') && !row.isWalkIn ? (
              <CreditLimitDialog customer={row} />
            ) : null}
            {can('customer.adjust_balance') && !row.isWalkIn ? (
              <LedgerActionDialog kind="customer" party={row} />
            ) : null}
          </>
        }
      />
      {row.isWalkIn ? (
        <Alert tone="info">
          <strong>System Customer · Walk-in</strong>
          <br />
          This company-local identity cannot be renamed, deactivated, or duplicated.
        </Alert>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinancialPositionCard kind="customer" balance={balance} />
        <Card>
          <CardHeader>
            <CardDescription>Credit limit</CardDescription>
            <CardTitle>
              <MoneyDisplay value={row.creditLimit} currency="BDT" className="text-2xl" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">
              Backend credit enforcement remains authoritative.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Available credit</CardDescription>
            <CardTitle>
              <MoneyDisplay
                value={availableCredit(row.creditLimit, balance)}
                currency="BDT"
                className="text-2xl"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">
              Credit limit less current signed ledger balance.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle>{row.isActive ? 'Active customer' : 'Inactive customer'}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>
              {row.isActive ? 'Active' : 'Inactive'}
            </StatusBadge>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <ContactCard kind="customer" party={row} />
        <PartyLedger kind="customer" id={id} />
      </div>
      <CustomerRelated
        sales={sales.data?.items ?? []}
        collections={collections.data?.items ?? []}
        canSales={can('sale.view')}
        canCollections={can('customer.view_payments')}
      />
      {can('customer.edit') && !row.isWalkIn ? (
        <div className="flex justify-end">
          <StatusDialog kind="customer" party={row} />
        </div>
      ) : null}
      <Alert tone={position.tone === 'warning' ? 'warning' : 'info'}>{position.explanation}</Alert>
    </div>
  );
}

function SupplierDetail({ id }: { id: string }) {
  const { api, can, activeBranchId } = useParties();
  const supplier = useQuery({
    queryKey: ['parties', 'supplier', id],
    queryFn: () => api<Supplier>(`/suppliers/${id}`),
  });
  const orders = useQuery({
    queryKey: ['parties', 'supplier', id, 'orders', activeBranchId],
    queryFn: () => api<Page<RelatedPurchaseOrder>>(`/purchases/orders?supplierId=${id}&limit=5`),
    enabled: Boolean(activeBranchId && can('purchase.view')),
  });
  const invoices = useQuery({
    queryKey: ['parties', 'supplier', id, 'invoices', activeBranchId],
    queryFn: () => api<Page<RelatedInvoice>>(`/purchases/invoices?supplierId=${id}&limit=5`),
    enabled: Boolean(activeBranchId && can('purchase.view')),
  });
  if (supplier.isLoading) return <LoadingState />;
  if (supplier.isError) return <ErrorState description={supplier.error.message} />;
  if (!supplier.data) return <EmptyState title="Supplier not found" />;
  const row = supplier.data;
  const balance = row.balance ?? '0';
  const position = financialPosition(balance, 'supplier');
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Suppliers · Profile"
        title={row.name}
        description={`${row.code}${row.contactName ? ` · ${row.contactName}` : ''}`}
        actions={
          <>
            <Link href={SUPPLIER_ROOT}>
              <Button variant="outline">Back</Button>
            </Link>
            {can('supplier.edit') ? (
              <Link href={`${SUPPLIER_ROOT}/${row.id}/edit`}>
                <Button variant="outline">Edit profile</Button>
              </Link>
            ) : null}
            {can('supplier.adjust_balance') ? (
              <LedgerActionDialog kind="supplier" party={row} />
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <FinancialPositionCard kind="supplier" balance={balance} />
        <Card>
          <CardHeader>
            <CardDescription>Financial interpretation</CardDescription>
            <CardTitle>{position.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">{position.explanation}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle>{row.isActive ? 'Active supplier' : 'Inactive supplier'}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>
              {row.isActive ? 'Active' : 'Inactive'}
            </StatusBadge>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <ContactCard kind="supplier" party={row} />
        <PartyLedger kind="supplier" id={id} />
      </div>
      <SupplierRelated
        supplierId={id}
        orders={orders.data?.items ?? []}
        invoices={invoices.data?.items ?? []}
        canPurchases={can('purchase.view')}
        canPayment={can('supplier.payment.create')}
      />
      {can('supplier.edit') ? (
        <div className="flex justify-end">
          <StatusDialog kind="supplier" party={row} />
        </div>
      ) : null}
    </div>
  );
}

function ContactCard({ kind, party }: { kind: PartyKind; party: Customer | Supplier }) {
  const supplier = kind === 'supplier' ? (party as Supplier) : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile and contact</CardTitle>
        <CardDescription>Company-scoped master record.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-1">
          <div>
            <dt className="text-text-muted">Code</dt>
            <dd className="font-semibold">{party.code}</dd>
          </div>
          {supplier ? (
            <div>
              <dt className="text-text-muted">Contact person</dt>
              <dd>{supplier.contactName ?? 'Not set'}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-text-muted">Phone</dt>
            <dd>{party.phone ?? 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Email</dt>
            <dd>{party.email ?? 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Address</dt>
            <dd>{party.address ?? 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Tax / business ID</dt>
            <dd>{party.taxIdentifier ?? 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Notes</dt>
            <dd>{party.notes ?? 'No notes'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function PartyLedger({ kind, id }: { kind: PartyKind; id: string }) {
  const { api, can } = useParties();
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const permission = `${kind}.view_ledger`;
  const params = new URLSearchParams({ page: String(page), limit: '15' });
  if (type) params.set('type', type);
  const query = useQuery({
    queryKey: ['parties', kind, id, 'ledger', params.toString()],
    queryFn: () => api<LedgerPage>(`/${kind}s/${id}/ledger?${params}`),
    enabled: can(permission),
  });
  if (!can(permission))
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">Ledger access is restricted by permission.</p>
        </CardContent>
      </Card>
    );
  const types =
    kind === 'customer'
      ? [
          'OPENING_BALANCE',
          'OPENING_CORRECTION',
          'ADJUSTMENT',
          'SALE_INVOICE',
          'PAYMENT',
          'SALE_RETURN',
          'CREDIT_NOTE',
        ]
      : [
          'OPENING_BALANCE',
          'OPENING_CORRECTION',
          'ADJUSTMENT',
          'PURCHASE_INVOICE',
          'PAYMENT',
          'PURCHASE_RETURN',
        ];
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 15));
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Immutable ledger</CardTitle>
            <CardDescription>Posted history has no edit or delete controls.</CardDescription>
          </div>
          <Select
            aria-label="Ledger entry type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="sm:w-56"
          >
            <option value="">All entry types</option>
            {types.map((value) => (
              <option key={value} value={value}>
                {ledgerTypeLabel(value)}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState description={query.error.message} />
        ) : !query.data?.items.length ? (
          <EmptyState
            title="No ledger entries"
            description="No implemented financial workflow has posted history for this party."
          />
        ) : (
          <div className="space-y-3">
            {query.data.items.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <StatusBadge
                      tone={
                        entry.type.includes('CORRECTION')
                          ? 'warning'
                          : entry.type === 'PAYMENT'
                            ? 'success'
                            : 'neutral'
                      }
                    >
                      {ledgerTypeLabel(entry.type)}
                    </StatusBadge>
                    <p className="mt-2 text-sm text-text-secondary">{entry.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-text-primary">
                      {compareDecimal(entry.debit) > 0
                        ? `Debit ${entry.debit}`
                        : `Credit ${entry.credit}`}{' '}
                      BDT
                    </p>
                    {entry.runningBalance ? (
                      <p className="text-xs text-text-muted">
                        Running balance {entry.runningBalance} BDT
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>{new Date(entry.effectiveAt).toLocaleString()}</span>
                  <span>{entry.referenceType ?? 'Manual ledger action'}</span>
                  <span>
                    {entry.createdBy
                      ? `${entry.createdBy.firstName} ${entry.createdBy.lastName ?? ''}`.trim()
                      : 'System'}
                  </span>
                </div>
              </div>
            ))}
            <Pagination
              currentPage={page}
              pageCount={pages}
              totalItems={query.data.total}
              onPrevious={page > 1 ? () => setPage(page - 1) : undefined}
              onNext={page < pages ? () => setPage(page + 1) : undefined}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerRelated({
  sales,
  collections,
  canSales,
  canCollections,
}: {
  sales: RelatedSale[];
  collections: RelatedCollection[];
  canSales: boolean;
  canCollections: boolean;
}) {
  if (!canSales && !canCollections) return null;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {canSales ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent sales</CardTitle>
                <CardDescription>Open immutable invoices in Sale Detail.</CardDescription>
              </div>
              <Link href="/app/sales">
                <Button size="sm" variant="outline">
                  All sales
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {sales.length ? (
              sales.map((sale) => (
                <Link
                  key={sale.id}
                  href={`/app/sales/${sale.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-neutral-hover"
                >
                  <div>
                    <p className="font-semibold text-primary">{sale.invoiceNumber}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(sale.saleDate).toLocaleDateString()} · {sale.status}
                    </p>
                  </div>
                  <MoneyDisplay value={sale.total} currency="BDT" />
                </Link>
              ))
            ) : (
              <p className="text-sm text-text-muted">No sales in the active branch.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
      {canCollections ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent collections</CardTitle>
            <CardDescription>Inbound customer payments for the active branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {collections.length ? (
              collections.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="font-semibold">{payment.paymentNumber}</p>
                    <p className="text-xs text-text-muted">
                      {payment.method.name} · {new Date(payment.paidAt).toLocaleDateString()}
                    </p>
                  </div>
                  <MoneyDisplay value={payment.amount} currency="BDT" />
                </div>
              ))
            ) : (
              <p className="text-sm text-text-muted">No collections in the active branch.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SupplierRelated({
  supplierId,
  orders,
  invoices,
  canPurchases,
  canPayment,
}: {
  supplierId: string;
  orders: RelatedPurchaseOrder[];
  invoices: RelatedInvoice[];
  canPurchases: boolean;
  canPayment: boolean;
}) {
  if (!canPurchases) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Purchasing context</CardTitle>
            <CardDescription>
              Related documents remain in the Stage 7 Purchasing workspace.
            </CardDescription>
          </div>
          <Link href="/app/purchases">
            <Button size="sm" variant="outline">
              Open Purchasing
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Recent purchase orders</h3>
          <div className="space-y-2">
            {orders.length ? (
              orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/app/purchases/orders/${order.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-neutral-hover"
                >
                  <div>
                    <p className="font-semibold text-primary">{order.orderNumber}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(order.orderDate).toLocaleDateString()} · {order.status}
                    </p>
                  </div>
                  <MoneyDisplay value={order.total} currency="BDT" />
                </Link>
              ))
            ) : (
              <p className="text-sm text-text-muted">No purchase orders in the active branch.</p>
            )}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Recent supplier invoices</h3>
          <div className="space-y-2">
            {invoices.length ? (
              invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/app/purchases/invoices/${invoice.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-neutral-hover"
                >
                  <div>
                    <p className="font-semibold text-primary">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(invoice.invoiceDate).toLocaleDateString()} · {invoice.status}
                    </p>
                  </div>
                  <MoneyDisplay value={invoice.total} currency="BDT" />
                </Link>
              ))
            ) : (
              <p className="text-sm text-text-muted">No supplier invoices in the active branch.</p>
            )}
          </div>
        </div>
        <div className="lg:col-span-2 flex flex-wrap gap-2">
          {canPayment ? (
            <Link href={`/app/purchases/payments/new/${supplierId}`}>
              <Button size="sm" variant="outline">
                Pay supplier
              </Button>
            </Link>
          ) : null}
          <Link href="/app/purchases/returns">
            <Button size="sm" variant="ghost">
              Purchase returns
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
