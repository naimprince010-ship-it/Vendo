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
  Input,
  LoadingState,
  MoneyDisplay,
  Pagination,
  QuantityDisplay,
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
import { useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';
import { useBranchContext } from '../../contexts/branch-context';
import { useVendoApi } from '../../hooks/use-vendo-api';
import {
  REPORTS,
  dateTimeLabel,
  objectLabel,
  reportForSegment,
  reportPath,
  reportQuery,
  titleCase,
} from './presentation';
import type { BranchPage, DashboardResponse, ReportKind, ReportResponse } from './types';

const PAGE_SIZE = 25;
type Column = {
  key: string;
  label: string;
  kind?: 'money' | 'quantity' | 'date' | 'status' | 'position' | 'text';
  unitKey?: string;
  nestedKeys?: string[];
  profit?: boolean;
};

const columns: Record<Exclude<ReportKind, 'financial'>, Column[]> = {
  sales: [
    { key: 'completedAt', label: 'Date', kind: 'date' },
    { key: 'invoiceNumber', label: 'Invoice' },
    { key: 'customer', label: 'Customer', nestedKeys: ['name'] },
    { key: 'grossTotal', label: 'Gross', kind: 'money' },
    { key: 'returnCredits', label: 'Return / Void', kind: 'money' },
    { key: 'netTotal', label: 'Net', kind: 'money' },
    { key: 'paid', label: 'Paid', kind: 'money' },
    { key: 'outstanding', label: 'Outstanding', kind: 'money' },
    { key: 'status', label: 'Status', kind: 'status' },
  ],
  products: [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Product' },
    { key: 'size', label: 'Tile size' },
    { key: 'category', label: 'Category' },
    { key: 'brand', label: 'Brand' },
    { key: 'soldBaseQuantity', label: 'Sold', kind: 'quantity', unitKey: 'baseUnit' },
    { key: 'returnedBaseQuantity', label: 'Returned', kind: 'quantity', unitKey: 'baseUnit' },
    { key: 'netBaseQuantity', label: 'Net quantity', kind: 'quantity', unitKey: 'baseUnit' },
    { key: 'netRevenue', label: 'Net sales', kind: 'money' },
  ],
  inventory: [
    { key: 'product', label: 'Product', nestedKeys: ['name'] },
    { key: 'warehouse', label: 'Warehouse', nestedKeys: ['name'] },
    { key: 'batch', label: 'Batch / Shade', nestedKeys: ['batchNumber', 'shade'] },
    { key: 'baseQuantity', label: 'Base stock', kind: 'quantity', unitKey: 'baseUnit' },
    { key: 'equivalents', label: 'Derived equivalents' },
    { key: 'reorderLevel', label: 'Reorder level', kind: 'quantity', unitKey: 'baseUnit' },
    { key: 'lowStock', label: 'State', kind: 'status' },
  ],
  purchases: [
    { key: 'invoiceDate', label: 'Invoice date', kind: 'date' },
    { key: 'invoiceNumber', label: 'Invoice' },
    { key: 'supplierReference', label: 'Supplier ref.' },
    { key: 'supplier', label: 'Supplier', nestedKeys: ['name'] },
    { key: 'total', label: 'Invoice total', kind: 'money' },
    { key: 'paid', label: 'Paid', kind: 'money' },
    { key: 'returnCredits', label: 'Return credits', kind: 'money' },
    { key: 'outstanding', label: 'Outstanding', kind: 'money' },
    { key: 'status', label: 'Status', kind: 'status' },
  ],
  customers: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Customer' },
    { key: 'group', label: 'Group' },
    { key: 'phone', label: 'Phone' },
    { key: 'creditLimit', label: 'Credit limit', kind: 'money' },
    { key: 'balance', label: 'Ledger balance', kind: 'money' },
    { key: 'position', label: 'Position', kind: 'position' },
  ],
  suppliers: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Supplier' },
    { key: 'contactName', label: 'Contact' },
    { key: 'phone', label: 'Phone' },
    { key: 'balance', label: 'Ledger balance', kind: 'money' },
    { key: 'position', label: 'Position', kind: 'position' },
  ],
  expenses: [
    { key: 'expenseDate', label: 'Date', kind: 'date' },
    { key: 'expenseNumber', label: 'Expense' },
    { key: 'category', label: 'Category' },
    { key: 'paymentMethod', label: 'Payment method' },
    { key: 'amount', label: 'Amount', kind: 'money' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status', kind: 'status' },
  ],
  cash: [
    { key: 'openedAt', label: 'Opened', kind: 'date' },
    { key: 'register', label: 'Register', nestedKeys: ['name'] },
    { key: 'cashier', label: 'Cashier' },
    { key: 'openingCash', label: 'Opening', kind: 'money' },
    { key: 'cashSales', label: 'Cash sales', kind: 'money' },
    { key: 'expectedCash', label: 'Expected', kind: 'money' },
    { key: 'actualCash', label: 'Actual', kind: 'money' },
    { key: 'variance', label: 'Variance', kind: 'money' },
    { key: 'status', label: 'Status', kind: 'status' },
  ],
};

const summaryLabels: Record<string, string> = {
  invoiceCount: 'Invoices',
  grossSales: 'Gross sales',
  returnCredits: 'Return / void credits',
  netSales: 'Net sales',
  subtotal: 'Subtotal',
  discount: 'Discount',
  tax: 'Tax',
  grossProfit: 'Gross profit',
  positions: 'Stock positions',
  lowStockPositions: 'Low stock',
  invoiceTotal: 'Supplier invoices',
  netPurchases: 'Net purchases',
  payments: 'Payments',
  goodsReceipts: 'Goods receipts',
  freightAndAdditional: 'Freight + additional',
  receivables: 'Receivables',
  payables: 'Payables',
  advances: 'Advances',
  posted: 'Posted expenses',
  reversed: 'Reversed expenses',
};

const countSummary = new Set(['invoiceCount', 'positions', 'lowStockPositions', 'goodsReceipts']);

function useReporting() {
  const api = useVendoApi();
  const { user, authenticatedFetch } = useAuth();
  const { activeBranchId, setActiveBranchId } = useBranchContext();
  const branches = useQuery({
    queryKey: ['reporting', 'branches'],
    queryFn: () => api<BranchPage>('/branches?limit=100'),
  });
  const branchId =
    activeBranchId || branches.data?.items.find((branch) => branch.isActive)?.id || '';
  const can = (permission: string) => Boolean(user?.permissions.includes(permission));
  return { api, authenticatedFetch, branches, branchId, setActiveBranchId, can };
}

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
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function BranchSelect({
  branchId,
  branches,
  onChange,
}: {
  branchId: string;
  branches: BranchPage['items'];
  onChange: (id: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-text-secondary">
      Branch
      <Select
        aria-label="Report branch"
        value={branchId}
        onChange={(event) => onChange(event.target.value)}
      >
        {branches
          .filter((branch) => branch.isActive)
          .map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
      </Select>
    </label>
  );
}

function Metric({
  label,
  value,
  currency,
  count = false,
  href,
}: {
  label: string;
  value: unknown;
  currency: string;
  count?: boolean;
  href?: string;
}) {
  const content = (
    <Card className="h-full transition-colors hover:border-border-strong">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
          {count ? (
            String(value ?? 0)
          ) : (
            <MoneyDisplay currency={currency} value={String(value ?? '0')} />
          )}
        </p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export function DashboardWorkspace() {
  const { api, branches, branchId, setActiveBranchId, can } = useReporting();
  const dashboard = useQuery({
    queryKey: ['reporting', 'dashboard', branchId],
    queryFn: () => api<DashboardResponse>('/reports/dashboard'),
    enabled: Boolean(branchId),
  });
  if (!branchId && branches.isLoading) return <LoadingState title="Loading dashboard…" />;
  if (branches.isError)
    return (
      <ErrorState description={branches.error.message} onRetry={() => void branches.refetch()} />
    );
  const data = dashboard.data;
  const currency = data?.currencyCode ?? 'BDT';
  return (
    <div className="space-y-6">
      <Heading
        eyebrow="Dashboard"
        title="Business at a glance"
        description={
          data
            ? `${data.branch.name} · ${data.localDate} · ${data.timezone}`
            : 'Operational activity from verified business records.'
        }
        actions={
          <BranchSelect
            branchId={branchId}
            branches={branches.data?.items ?? []}
            onChange={setActiveBranchId}
          />
        }
      />
      {dashboard.isError ? (
        <ErrorState
          description={dashboard.error.message}
          onRetry={() => void dashboard.refetch()}
        />
      ) : null}
      {dashboard.isLoading ? (
        <LoadingState title="Loading real business metrics…" />
      ) : data ? (
        <>
          <section
            aria-label="Today key performance indicators"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Metric
              label="Today net sales"
              value={data.kpis.netSales}
              currency={currency}
              href={reportPath('sales')}
            />
            <Metric
              label="Invoices"
              value={data.kpis.invoiceCount}
              currency={currency}
              count
              href={reportPath('sales')}
            />
            {can('report.view_profit') && data.kpis.grossProfit !== null ? (
              <Metric
                label="Gross profit"
                value={data.kpis.grossProfit}
                currency={currency}
                href={reportPath('financial')}
              />
            ) : null}
            {can('report.view_expenses') && data.kpis.expenses !== null ? (
              <Metric
                label="Expenses"
                value={data.kpis.expenses}
                currency={currency}
                href={reportPath('expenses')}
              />
            ) : null}
            {can('report.view_customers') && data.kpis.receivables !== null ? (
              <Metric
                label="Customer net position"
                value={data.kpis.receivables}
                currency={currency}
                href={reportPath('customers')}
              />
            ) : null}
            {can('report.view_suppliers') && data.kpis.payables !== null ? (
              <Metric
                label="Supplier net position"
                value={data.kpis.payables}
                currency={currency}
                href={reportPath('suppliers')}
              />
            ) : null}
            {can('report.view_inventory') && data.kpis.lowStockPositions !== null ? (
              <Metric
                label="Low-stock positions"
                value={data.kpis.lowStockPositions}
                currency={currency}
                count
                href={reportPath('inventory')}
              />
            ) : null}
          </section>
          <div className="grid gap-5 xl:grid-cols-2">
            <DashboardList
              title="Recent sales"
              description="Completed invoices in today's event period."
              rows={data.recentSales}
              empty="No sales recorded today."
              render={(row) => (
                <Link
                  href={`/app/sales/${String(row.id)}`}
                  className="flex items-center justify-between gap-4 rounded-md px-2 py-3 hover:bg-neutral-hover"
                >
                  <span>
                    <strong className="block text-sm text-text-primary">
                      {String(row.invoiceNumber)}
                    </strong>
                    <span className="text-xs text-text-muted">{objectLabel(row.customer)}</span>
                  </span>
                  <MoneyDisplay currency={currency} value={String(row.netTotal)} />
                </Link>
              )}
            />
            {can('report.view_inventory') ? (
              <DashboardList
                title="Low stock"
                description="Positions at or below configured reorder levels."
                rows={data.lowStock}
                empty="No low-stock positions need attention."
                render={(row) => {
                  const product = row.product as Record<string, unknown>;
                  return (
                    <Link
                      href={reportPath('inventory')}
                      className="flex items-center justify-between gap-4 rounded-md px-2 py-3 hover:bg-neutral-hover"
                    >
                      <span>
                        <strong className="block text-sm text-text-primary">
                          {String(product?.name ?? 'Product')}
                        </strong>
                        <span className="text-xs text-text-muted">
                          {objectLabel(row.warehouse)}
                        </span>
                      </span>
                      <QuantityDisplay
                        value={String(row.baseQuantity)}
                        unit={String(row.baseUnit)}
                      />
                    </Link>
                  );
                }}
              />
            ) : null}
            <DashboardList
              title="Top products"
              description="Net sales performance for today's event period."
              rows={data.topProducts}
              empty="No product sales recorded today."
              render={(row) => (
                <Link
                  href={reportPath('products')}
                  className="flex items-center justify-between gap-4 rounded-md px-2 py-3 hover:bg-neutral-hover"
                >
                  <span>
                    <strong className="block text-sm text-text-primary">{String(row.name)}</strong>
                    <span className="text-xs text-text-muted">
                      {[row.size, row.brand].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <MoneyDisplay currency={currency} value={String(row.netRevenue)} />
                </Link>
              )}
            />
            {can('report.view_purchases') ? (
              <DashboardList
                title="Recent supplier invoices"
                description="Posted purchasing documents, separate from receipts and payments."
                rows={data.recentPurchases}
                empty="No supplier invoices recorded today."
                render={(row) => (
                  <Link
                    href={reportPath('purchases')}
                    className="flex items-center justify-between gap-4 rounded-md px-2 py-3 hover:bg-neutral-hover"
                  >
                    <span>
                      <strong className="block text-sm text-text-primary">
                        {String(row.invoiceNumber)}
                      </strong>
                      <span className="text-xs text-text-muted">{objectLabel(row.supplier)}</span>
                    </span>
                    <MoneyDisplay currency={currency} value={String(row.total)} />
                  </Link>
                )}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DashboardList({
  title,
  description,
  rows,
  empty,
  render,
}: {
  title: string;
  description: string;
  rows: Record<string, unknown>[];
  empty: string;
  render: (row: Record<string, unknown>) => ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-divider p-3">
        {rows.length ? (
          rows.map((row, index) => <div key={String(row.id ?? index)}>{render(row)}</div>)
        ) : (
          <EmptyState title={empty} className="min-h-28" />
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsWorkspace() {
  const pathname = usePathname();
  const segment = pathname.split('/').filter(Boolean)[2];
  const selected = reportForSegment(segment);
  const { api, authenticatedFetch, branches, branchId, setActiveBranchId, can } = useReporting();
  const available = REPORTS.filter(
    (report) => can(report.permission) && (report.kind !== 'financial' || can('report.view_sales')),
  );
  const active = available.find((report) => report.kind === selected.kind);
  const [draft, setDraft] = useState({ from: '', to: '', search: '' });
  const [filters, setFilters] = useState({ from: '', to: '', search: '' });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const queryString = useMemo(
    () => reportQuery({ ...filters, page, limit: PAGE_SIZE }),
    [filters, page],
  );
  const query = useQuery({
    queryKey: ['reporting', active?.kind, branchId, queryString],
    queryFn: () => api<ReportResponse>(`/reports/${active?.endpoint}?${queryString}`),
    enabled: Boolean(active && branchId),
  });
  if (!available.length)
    return (
      <EmptyState
        title="Reports unavailable"
        description="Your role does not currently include a reporting permission."
      />
    );
  if (!active)
    return (
      <EmptyState
        title="Report access unavailable"
        description="Your role does not include permission to view this report. Choose an available report from the Reports navigation."
      />
    );
  const meta = query.data?.meta ?? {};
  const currency = meta.currencyCode ?? 'BDT';
  const rows = query.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((meta.total ?? rows.length) / PAGE_SIZE));
  const exportCsv = async () => {
    if (!active.exportable) return;
    setExporting(true);
    setExportError('');
    try {
      const exportQuery = reportQuery({ ...filters, page: 1, limit: 100 });
      const response = await authenticatedFetch(
        `/reports/exports/${active.endpoint}?${exportQuery}`,
        { headers: { 'x-branch-id': branchId } },
      );
      if (!response.ok) throw new Error('CSV export could not be generated.');
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `vendo-${active.kind}.csv`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'CSV export failed.');
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="space-y-6">
      <Heading
        eyebrow="Reports"
        title={active.label}
        description={active.description}
        actions={
          active.exportable ? (
            <Button variant="outline" loading={exporting} onClick={() => void exportCsv()}>
              Export CSV
            </Button>
          ) : undefined
        }
      />
      <nav
        aria-label="Report sections"
        className="flex gap-2 overflow-x-auto border-b border-divider pb-3"
      >
        {available.map((report) => (
          <Link
            key={report.kind}
            href={reportPath(report.kind)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${report.kind === active.kind ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:bg-neutral-hover hover:text-text-primary'}`}
          >
            {report.label}
          </Link>
        ))}
      </nav>
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <BranchSelect
            branchId={branchId}
            branches={branches.data?.items ?? []}
            onChange={(id) => {
              setActiveBranchId(id);
              setPage(1);
            }}
          />
          {active.kind !== 'inventory' &&
          active.kind !== 'customers' &&
          active.kind !== 'suppliers' ? (
            <>
              <label className="grid gap-1 text-xs font-semibold text-text-secondary">
                From
                <Input
                  type="date"
                  aria-label="Report from"
                  value={draft.from}
                  onChange={(event) => setDraft({ ...draft, from: event.target.value })}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-text-secondary">
                To
                <Input
                  type="date"
                  aria-label="Report to"
                  value={draft.to}
                  onChange={(event) => setDraft({ ...draft, to: event.target.value })}
                />
              </label>
            </>
          ) : null}
          {active.kind !== 'financial' ? (
            <label className="grid min-w-56 flex-1 gap-1 text-xs font-semibold text-text-secondary">
              Search
              <Input
                aria-label="Report search"
                placeholder="Search this report"
                value={draft.search}
                onChange={(event) => setDraft({ ...draft, search: event.target.value })}
              />
            </label>
          ) : null}
          <Button
            onClick={() => {
              setFilters(draft);
              setPage(1);
            }}
          >
            Apply filters
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const clear = { from: '', to: '', search: '' };
              setDraft(clear);
              setFilters(clear);
              setPage(1);
            }}
          >
            Reset
          </Button>
        </CardContent>
      </Card>
      {exportError ? <Alert tone="danger">{exportError}</Alert> : null}
      {query.isError ? (
        <ErrorState description={query.error.message} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <LoadingState title={`Loading ${active.label.toLowerCase()}…`} />
      ) : active.kind === 'financial' ? (
        <FinancialSummary data={query.data} currency={currency} />
      ) : (
        <>
          {meta.from && meta.to ? (
            <p className="text-xs text-text-muted">
              Event period {meta.from} – {meta.to} · company timezone {meta.timezone}
            </p>
          ) : null}
          <ReportSummary
            summary={query.data?.summary}
            currency={currency}
            allowProfit={can('report.view_profit')}
          />
          <ReportDataTable
            kind={active.kind}
            rows={rows}
            currency={currency}
            allowProfit={can('report.view_profit')}
          />
          <Pagination
            currentPage={page}
            pageCount={pages}
            totalItems={meta.total ?? rows.length}
            onPrevious={page > 1 ? () => setPage(page - 1) : undefined}
            onNext={page < pages ? () => setPage(page + 1) : undefined}
          />
        </>
      )}
    </div>
  );
}

function ReportSummary({
  summary,
  currency,
  allowProfit,
}: {
  summary?: Record<string, unknown>;
  currency: string;
  allowProfit: boolean;
}) {
  const entries = Object.entries(summary ?? {}).filter(
    ([key]) => key !== 'grossProfit' || allowProfit,
  );
  if (!entries.length) return null;
  return (
    <section aria-label="Report summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {entries.map(([key, value]) => (
        <Metric
          key={key}
          label={summaryLabels[key] ?? titleCase(key)}
          value={value}
          currency={currency}
          count={countSummary.has(key)}
        />
      ))}
    </section>
  );
}

function ReportDataTable({
  kind,
  rows,
  currency,
  allowProfit,
}: {
  kind: Exclude<ReportKind, 'financial'>;
  rows: Record<string, unknown>[];
  currency: string;
  allowProfit: boolean;
}) {
  const visible = columns[kind].filter((column) => !column.profit || allowProfit);
  if (!rows.length)
    return (
      <EmptyState
        title="No records in this report"
        description="Try another date range, branch, or search term."
      />
    );
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            {visible.map((column) => (
              <TableHead
                key={column.key}
                numeric={column.kind === 'money' || column.kind === 'quantity'}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={String(row.id ?? index)}>
              {visible.map((column) => (
                <TableCell
                  key={column.key}
                  numeric={column.kind === 'money' || column.kind === 'quantity'}
                >
                  {renderCell(row, column, currency)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function renderCell(row: Record<string, unknown>, column: Column, currency: string) {
  const value = row[column.key];
  if (column.key === 'equivalents' && Array.isArray(value)) {
    const derived = value.slice(1) as { unit: string; quantity: string }[];
    return derived.length ? (
      <div className="flex flex-wrap justify-end gap-1">
        {derived.map((item) => (
          <StatusBadge tone="neutral" key={item.unit}>
            {item.quantity} {item.unit} equivalent
          </StatusBadge>
        ))}
      </div>
    ) : (
      '—'
    );
  }
  if (column.key === 'batch' && value && typeof value === 'object') {
    const batch = value as Record<string, unknown>;
    return (
      <span>
        {String(batch.batchNumber)}
        {batch.shade ? (
          <span className="block text-xs font-semibold text-primary">
            Shade {String(batch.shade)}
          </span>
        ) : null}
      </span>
    );
  }
  if (column.kind === 'money')
    return value === null || value === undefined ? (
      '—'
    ) : (
      <MoneyDisplay currency={currency} value={String(value)} />
    );
  if (column.kind === 'quantity')
    return value === null || value === undefined ? (
      '—'
    ) : (
      <QuantityDisplay
        value={String(value)}
        unit={column.unitKey ? String(row[column.unitKey] ?? '') : undefined}
      />
    );
  if (column.kind === 'date') return dateTimeLabel(value);
  if (column.kind === 'status') {
    const label =
      typeof value === 'boolean'
        ? value
          ? 'Low stock'
          : 'In range'
        : String(value ?? 'Unknown').replaceAll('_', ' ');
    const tone =
      typeof value === 'boolean'
        ? value
          ? 'danger'
          : 'success'
        : ['PAID', 'COMPLETED', 'POSTED', 'CLOSED'].includes(String(value))
          ? 'success'
          : ['VOIDED', 'REVERSED', 'CANCELLED'].includes(String(value))
            ? 'danger'
            : 'warning';
    return <StatusBadge tone={tone}>{label}</StatusBadge>;
  }
  if (column.kind === 'position')
    return (
      <StatusBadge tone={String(value) === 'ADVANCE' ? 'info' : 'warning'}>
        {String(value)}
      </StatusBadge>
    );
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const labels = (column.nestedKeys ?? ['name'])
      .map((key) => record[key])
      .filter(Boolean)
      .map(String);
    return labels.length ? labels.join(' · ') : objectLabel(value);
  }
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function FinancialSummary({ data, currency }: { data?: ReportResponse; currency: string }) {
  if (!data) return null;
  const values = [
    ['Net sales', data.netSales],
    ['Gross profit', data.grossProfit],
    ['Posted expenses', data.expenses],
    ['Customer net position', data.receivables],
    ['Supplier net position', data.payables],
    ['Cash inflow', data.cashInflow],
    ['Cash outflow', data.cashOutflow],
    ['Net cash movement', data.netCashMovement],
  ] as const;
  return (
    <div className="space-y-4">
      <Alert tone="info">
        Operational summary only. Collections remain separate from revenue, opening cash is excluded
        from cash inflow, and no full net-income statement is claimed.
      </Alert>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {values.map(([label, value]) => (
          <Metric key={label} label={label} value={value} currency={currency} />
        ))}
      </section>
      {data.note ? <p className="text-sm text-text-muted">{String(data.note)}</p> : null}
    </div>
  );
}
