export type ReportKind =
  | 'sales'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'cash'
  | 'financial';

export type ReportMeta = {
  from?: string;
  to?: string;
  timezone?: string;
  currencyCode?: string;
  page?: number;
  limit?: number;
  total?: number;
};

export type ReportResponse = {
  meta: ReportMeta;
  summary?: Record<string, unknown>;
  items?: Record<string, unknown>[];
  [key: string]: unknown;
};

export type DashboardResponse = {
  asOf: string;
  localDate: string;
  timezone: string;
  currencyCode: string;
  branch: { id: string; name: string };
  kpis: {
    grossSales: string;
    returnCredits: string;
    netSales: string;
    invoiceCount: number;
    grossProfit: string | null;
    receivables: string | null;
    payables: string | null;
    expenses: string | null;
    lowStockPositions: number | null;
    purchaseInvoices: string | null;
  };
  topProducts: Record<string, unknown>[];
  lowStock: Record<string, unknown>[];
  recentSales: Record<string, unknown>[];
  recentPurchases: Record<string, unknown>[];
  openShifts: Record<string, unknown>[];
};

export type BranchPage = {
  items: { id: string; code: string; name: string; isActive: boolean }[];
  total: number;
};
