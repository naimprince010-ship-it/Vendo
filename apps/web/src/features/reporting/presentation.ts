import type { ReportKind } from './types';

export const REPORTS: ReadonlyArray<{
  kind: ReportKind;
  label: string;
  description: string;
  permission: string;
  endpoint: string;
  exportable: boolean;
}> = [
  {
    kind: 'sales',
    label: 'Sales',
    description: 'Invoices, returns and net sales',
    permission: 'report.view_sales',
    endpoint: 'sales',
    exportable: true,
  },
  {
    kind: 'products',
    label: 'Products / Tiles',
    description: 'Product performance and tile context',
    permission: 'report.view_sales',
    endpoint: 'products',
    exportable: true,
  },
  {
    kind: 'inventory',
    label: 'Inventory',
    description: 'Authoritative stock and low-stock positions',
    permission: 'report.view_inventory',
    endpoint: 'inventory',
    exportable: true,
  },
  {
    kind: 'purchases',
    label: 'Purchasing',
    description: 'Invoices, receipts, payments and returns',
    permission: 'report.view_purchases',
    endpoint: 'purchases',
    exportable: true,
  },
  {
    kind: 'customers',
    label: 'Customers',
    description: 'Ledger-derived receivables and advances',
    permission: 'report.view_customers',
    endpoint: 'customers',
    exportable: true,
  },
  {
    kind: 'suppliers',
    label: 'Suppliers',
    description: 'Ledger-derived payables and advances',
    permission: 'report.view_suppliers',
    endpoint: 'suppliers',
    exportable: true,
  },
  {
    kind: 'expenses',
    label: 'Expenses',
    description: 'Posted and reversed business expenses',
    permission: 'report.view_expenses',
    endpoint: 'expenses',
    exportable: true,
  },
  {
    kind: 'cash',
    label: 'Cash',
    description: 'Shift and drawer reconciliation',
    permission: 'report.view_cash',
    endpoint: 'cash',
    exportable: true,
  },
  {
    kind: 'financial',
    label: 'Financial Summary',
    description: 'Operational financial position',
    permission: 'report.view_profit',
    endpoint: 'financial-summary',
    exportable: false,
  },
];

export function reportForSegment(segment?: string) {
  return REPORTS.find((report) => report.kind === segment) ?? REPORTS[0];
}

export function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function objectLabel(value: unknown, keys = ['name', 'invoiceNumber', 'code']) {
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'object') return String(value);
  const record = value as Record<string, unknown>;
  for (const key of keys)
    if (record[key] !== null && record[key] !== undefined) return String(record[key]);
  return '—';
}

export function dateTimeLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function reportPath(kind: ReportKind) {
  return `/app/reports/${kind}`;
}

export function reportQuery(params: {
  from: string;
  to: string;
  search: string;
  page: number;
  limit: number;
}) {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.search.trim()) query.set('search', params.search.trim());
  return query.toString();
}
