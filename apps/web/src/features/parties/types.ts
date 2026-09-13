export type Page<T> = { items: T[]; total: number; page?: number; limit?: number };

export type CustomerGroup = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: { customers: number };
};

export type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxIdentifier: string | null;
  notes: string | null;
  creditLimit: string;
  isWalkIn: boolean;
  isActive: boolean;
  balance?: string;
  groupId: string | null;
  group: CustomerGroup | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Supplier = {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxIdentifier: string | null;
  notes: string | null;
  isActive: boolean;
  balance?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LedgerEntry = {
  id: string;
  type: string;
  amount: string;
  debit: string;
  credit: string;
  runningBalance: string | null;
  effectiveAt: string;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  createdBy?: { id: string; firstName: string; lastName: string | null };
};

export type LedgerPage = Page<LedgerEntry> & {
  balance: string;
  runningBalanceScope: string | null;
};

export type RelatedSale = {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  total: string;
  paid: string;
  due: string;
  status: string;
};

export type RelatedCollection = {
  id: string;
  paymentNumber: string;
  amount: string;
  paidAt: string;
  reference: string | null;
  method: { id: string; code: string; name: string };
};

export type RelatedPurchaseOrder = {
  id: string;
  orderNumber: string;
  orderDate: string;
  total: string;
  status: string;
};

export type RelatedInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: string;
  status: string;
};

export type Api = <T>(path: string, init?: RequestInit, branchId?: string) => Promise<T>;
export type PartyKind = 'customer' | 'supplier';
