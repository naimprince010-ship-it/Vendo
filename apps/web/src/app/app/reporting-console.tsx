'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';

type Page<T> = { items: T[]; total: number };
type Branch = { id: string; name: string; isActive: boolean };
type Dashboard = {
  localDate: string;
  timezone: string;
  currencyCode: string;
  kpis: Record<string, string | number | null>;
  topProducts: Record<string, unknown>[];
  lowStock: Record<string, unknown>[];
  recentSales: Record<string, unknown>[];
  recentPurchases: Record<string, unknown>[];
};
type ReportResponse = {
  meta: Record<string, unknown>;
  summary?: Record<string, unknown>;
  items: Record<string, unknown>[];
};
type InvoiceData = {
  company: {
    name: string;
    legalName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    currencyCode: string;
    timezone: string;
  };
  branch: { name: string; phone: string | null; address: string | null };
  invoice: {
    invoiceNumber: string;
    completedAt: string;
    pricingMode: string;
    status: string;
    notes: string | null;
  };
  register: { name: string; code: string };
  customer: { code: string; name: string; phone: string | null; address: string | null };
  cashier: { name: string; email: string };
  items: {
    id: string;
    productName: string;
    sku: string;
    tileSize: string | null;
    batchNumber: string | null;
    shade: string | null;
    quantity: string;
    unit: string;
    baseQuantity: string;
    unitPrice: string;
    discount: string;
    tax: string;
    lineTotal: string;
  }[];
  totals: {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    paid: string;
    returnCredits: string;
    refunded: string;
    outstanding: string;
    change: string;
  };
  payments: { number: string; method: string; amount: string; reference: string | null }[];
  returns: { number: string; kind: string; amount: string }[];
};

const field =
  'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400';
const button =
  'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50';
const reportKinds = [
  'sales',
  'products',
  'inventory',
  'purchases',
  'customers',
  'suppliers',
  'expenses',
  'cash',
] as const;

function useReportApi() {
  const { authenticatedFetch } = useAuth();
  return async <T,>(path: string, branchId?: string) => {
    const response = await authenticatedFetch(path, {
      headers: branchId ? { 'x-branch-id': branchId } : undefined,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      throw new Error(
        Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? `Request failed (${response.status})`),
      );
    }
    return (await response.json()) as T;
  };
}

function useBranches() {
  const api = useReportApi();
  const branches = useQuery({
    queryKey: ['reports', 'branches'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100'),
  });
  return { branches, api };
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Money({ value, currency = 'BDT' }: { value: unknown; currency?: string }) {
  const formatted = new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
  return <>{formatted}</>;
}

export function DashboardConsole() {
  const { user } = useAuth();
  const { branches, api } = useBranches();
  const [branchId, setBranchId] = useState('');
  const activeBranchId = branchId || branches.data?.items.find((row) => row.isActive)?.id || '';
  const dashboard = useQuery({
    queryKey: ['reports', 'dashboard', activeBranchId],
    queryFn: () => api<Dashboard>('/reports/dashboard', activeBranchId),
    enabled: Boolean(activeBranchId && user?.permissions.includes('report.view_sales')),
  });
  const kpiLabels: Record<string, string> = {
    grossSales: 'Gross sales',
    returnCredits: 'Returns / voids',
    netSales: 'Net sales',
    invoiceCount: 'Invoices',
    grossProfit: 'Gross profit',
    receivables: 'Customer receivables',
    payables: 'Supplier payables',
    expenses: 'Expenses',
    lowStockPositions: 'Low stock',
    purchaseInvoices: 'Purchase invoices',
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Operational dashboard</h2>
          <p className="text-sm text-slate-400">
            Real transaction events for {dashboard.data?.localDate ?? 'today'} in{' '}
            {dashboard.data?.timezone ?? 'company timezone'}.
          </p>
        </div>
        <select
          aria-label="Dashboard branch"
          className={field}
          value={activeBranchId}
          onChange={(event) => setBranchId(event.target.value)}
        >
          {(branches.data?.items ?? [])
            .filter((row) => row.isActive)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
        </select>
      </div>
      {dashboard.isError ? (
        <p className="rounded-lg border border-red-800 bg-red-950 p-3 text-red-200">
          {dashboard.error.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(dashboard.data?.kpis ?? {}).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {kpiLabels[key] ?? key}
            </p>
            <p className="mt-2 text-xl font-semibold">
              {key.includes('Count') || key.includes('Positions') || key === 'invoiceCount' ? (
                String(value ?? 0)
              ) : value === null ? (
                'Restricted'
              ) : (
                <Money value={value} currency={dashboard.data?.currencyCode} />
              )}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Recent sales">
          <SimpleRows
            rows={dashboard.data?.recentSales ?? []}
            primary="invoiceNumber"
            secondary="netTotal"
            currency={dashboard.data?.currencyCode}
          />
        </Card>
        <Card title="Recent purchase invoices">
          <SimpleRows
            rows={dashboard.data?.recentPurchases ?? []}
            primary="invoiceNumber"
            secondary="total"
            currency={dashboard.data?.currencyCode}
          />
        </Card>
        <Card title="Top products">
          <SimpleRows
            rows={dashboard.data?.topProducts ?? []}
            primary="name"
            secondary="netRevenue"
            currency={dashboard.data?.currencyCode}
          />
        </Card>
        <Card title="Low stock">
          <SimpleRows
            rows={dashboard.data?.lowStock ?? []}
            primary="product"
            secondary="baseQuantity"
          />
        </Card>
      </div>
    </div>
  );
}

function SimpleRows({
  rows,
  primary,
  secondary,
  currency,
}: {
  rows: Record<string, unknown>[];
  primary: string;
  secondary: string;
  currency?: string;
}) {
  if (!rows.length) return <p className="text-sm text-slate-400">No records in this period.</p>;
  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const raw = row[primary];
        const label =
          typeof raw === 'object' && raw
            ? String((raw as Record<string, unknown>).name ?? '')
            : String(raw ?? '');
        return (
          <div
            key={String(row.id ?? index)}
            className="flex items-center justify-between border-b border-slate-800 pb-2 text-sm"
          >
            <span>{label}</span>
            <span className="font-mono text-slate-300">
              {currency ? (
                <Money value={row[secondary]} currency={currency} />
              ) : (
                String(row[secondary] ?? '')
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportsConsole() {
  const { user, authenticatedFetch } = useAuth();
  const { branches, api } = useBranches();
  const [branchId, setBranchId] = useState('');
  const [kind, setKind] = useState<(typeof reportKinds)[number]>('sales');
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');
  const activeBranchId = branchId || branches.data?.items.find((row) => row.isActive)?.id || '';
  const path = `/reports/${kind}?from=${from}&to=${to}&search=${encodeURIComponent(search)}&limit=50`;
  const report = useQuery({
    queryKey: ['reports', kind, activeBranchId, from, to, search],
    queryFn: () => api<ReportResponse>(path, activeBranchId),
    enabled: Boolean(activeBranchId),
  });
  const download = async () => {
    const response = await authenticatedFetch(
      `/reports/exports/${kind}?from=${from}&to=${to}&search=${encodeURIComponent(search)}`,
      { headers: { 'x-branch-id': activeBranchId } },
    );
    if (!response.ok) throw new Error('Export failed');
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vendo-${kind}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const loadInvoice = async () =>
    setInvoice(await api<InvoiceData>(`/reports/invoices/${invoiceId}`, activeBranchId));
  const print = (mode: 'thermal' | 'a4') => {
    setPrintMode(mode);
    window.setTimeout(() => window.print(), 50);
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Branch</label>
          <select
            aria-label="Report branch"
            className={field}
            value={activeBranchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            {(branches.data?.items ?? [])
              .filter((row) => row.isActive)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">From</label>
          <input
            aria-label="Report from"
            className={field}
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">To</label>
          <input
            aria-label="Report to"
            className={field}
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Search</label>
          <input
            aria-label="Report search"
            className={field}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button className={button} type="button" onClick={() => void download()}>
          Export CSV
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {reportKinds.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setKind(item)}
            className={`rounded-lg px-3 py-2 text-sm capitalize ${kind === item ? 'bg-amber-400 text-slate-950' : 'border border-slate-700'}`}
          >
            {item}
          </button>
        ))}
      </div>
      <Card title={`${kind[0].toUpperCase()}${kind.slice(1)} report`}>
        {report.isError ? (
          <p className="text-red-300">{report.error.message}</p>
        ) : report.isLoading ? (
          <p className="text-slate-400">Loading real report data…</p>
        ) : (
          <>
            <div className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(report.data?.summary ?? {}).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">{key}</p>
                  <p className="font-mono text-sm">{String(value ?? '')}</p>
                </div>
              ))}
            </div>
            <ReportTable rows={report.data?.items ?? []} />
          </>
        )}
      </Card>
      {user?.permissions.includes('sale.view') ? (
        <Card title="Historical sale document">
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Sale ID for invoice"
              className={`${field} min-w-80`}
              placeholder="Completed sale UUID"
              value={invoiceId}
              onChange={(event) => setInvoiceId(event.target.value)}
            />
            <button
              className={button}
              disabled={!invoiceId}
              type="button"
              onClick={() => void loadInvoice()}
            >
              Load invoice
            </button>
            {invoice ? (
              <>
                <button className={button} type="button" onClick={() => print('thermal')}>
                  Print thermal
                </button>
                <button className={button} type="button" onClick={() => print('a4')}>
                  Print A4
                </button>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}
      {invoice ? <InvoiceDocument data={invoice} mode={printMode} /> : null}
    </div>
  );
}

function ReportTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length)
    return <p className="text-sm text-slate-400">No records match this period and filter.</p>;
  const keys = Object.keys(rows[0])
    .filter((key) => !['id'].includes(key))
    .slice(0, 8);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            {keys.map((key) => (
              <th className="border-b border-slate-700 px-3 py-2" key={key}>
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {keys.map((key) => (
                <td className="border-b border-slate-800 px-3 py-2" key={key}>
                  {typeof row[key] === 'object' && row[key]
                    ? String((row[key] as Record<string, unknown>).name ?? JSON.stringify(row[key]))
                    : String(row[key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceDocument({ data, mode }: { data: InvoiceData; mode: 'thermal' | 'a4' }) {
  return (
    <article
      data-testid="print-document"
      className={`print-document ${mode === 'thermal' ? 'print-thermal' : 'print-a4'} rounded-xl bg-white p-6 text-slate-950`}
    >
      <header className="text-center">
        <h1 className="text-xl font-bold">{data.company.legalName ?? data.company.name}</h1>
        <p>{data.branch.name}</p>
        <p className="text-xs">
          {data.branch.address ?? data.company.address} {data.branch.phone ?? data.company.phone}
        </p>
        <h2 className="mt-3 font-bold">Invoice {data.invoice.invoiceNumber}</h2>
      </header>
      <div className="my-4 grid grid-cols-2 gap-2 text-xs">
        <p>
          Date:{' '}
          {new Intl.DateTimeFormat('en-BD', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: data.company.timezone,
          }).format(new Date(data.invoice.completedAt))}
        </p>
        <p>Register: {data.register.name}</p>
        <p>Customer: {data.customer.name}</p>
        <p>Cashier: {data.cashier.name}</p>
      </div>
      <table className="w-full text-left text-xs">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.id} className="border-t border-slate-300">
              <td className="py-2">
                <strong>{item.productName}</strong>
                <br />
                {item.sku}
                {item.tileSize ? ` · ${item.tileSize}` : ''}
                {item.batchNumber ? (
                  <>
                    <br />
                    Batch {item.batchNumber}
                    {item.shade ? ` · Shade ${item.shade}` : ''}
                  </>
                ) : null}
              </td>
              <td>
                {item.quantity} {item.unit}
              </td>
              <td className="text-right">{item.unitPrice}</td>
              <td className="text-right">{item.lineTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-64 space-y-1 text-xs">
        {Object.entries(data.totals).map(([key, value]) => (
          <div className="flex justify-between" key={key}>
            <span>{key}</span>
            <strong>
              {value} {data.company.currencyCode}
            </strong>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs">
        <strong>Payments</strong>
        {data.payments.map((payment) => (
          <p key={payment.number}>
            {payment.method}: {payment.amount} {data.company.currencyCode}
            {payment.reference ? ` (${payment.reference})` : ''}
          </p>
        ))}
        {data.returns.map((row) => (
          <p key={row.number}>
            {row.kind} {row.number}: -{row.amount}
          </p>
        ))}
      </div>
      <footer className="mt-6 border-t border-slate-300 pt-3 text-center text-xs">
        Thank you for your business.
      </footer>
    </article>
  );
}
