export type Page<T> = { items: T[]; total: number; page?: number; limit?: number };

export type Register = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  isCash: boolean;
  isActive?: boolean;
};

export type Person = {
  firstName: string;
  lastName?: string | null;
  email: string;
};

export type CashTotals = Record<string, string>;

export type CashShift = {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openingCash: string;
  expectedCash: string | null;
  actualCash: string | null;
  variance: string | null;
  openedAt: string;
  closedAt: string | null;
  registerId?: string;
  register: { id?: string; code: string; name: string };
  cashier: Person;
  closedBy?: Person | null;
  totals?: CashTotals;
};

export type CashMovement = {
  id: string;
  shiftId: string;
  registerId: string;
  type: string;
  amount: string;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  occurredAt: string;
  createdAt: string;
  recordedBy: Person;
};

export type ExpenseCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type Expense = {
  id: string;
  expenseNumber: string;
  amount: string;
  status: 'POSTED' | 'REVERSED';
  description: string;
  reference: string | null;
  expenseDate: string;
  reversedAt: string | null;
  reversalReason: string | null;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  createdBy: Person;
};

export type Api = <T>(path: string, init?: RequestInit, branchId?: string) => Promise<T>;
