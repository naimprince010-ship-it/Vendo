export type Page<T> = {
  items: T[];
  limit: number;
  page: number;
  total: number;
};

export type Named = { id: string; code: string; name: string };

export type Person = {
  email?: string;
  firstName: string;
  id: string;
  lastName: string | null;
};

export type SaleListItem = {
  _count: { items: number };
  createdBy: Person;
  customer: Named & { isWalkIn: boolean };
  discount: string;
  due: string;
  id: string;
  invoiceNumber: string;
  paid: string;
  pricingMode: 'RETAIL' | 'WHOLESALE';
  register: Named;
  saleDate: string;
  status: 'DRAFT' | 'HELD' | 'COMPLETED';
  subtotal: string;
  tax: string;
  total: string;
};

export type SaleLine = {
  baseQuantity: string;
  batch: (Named & { batchNumber: string; lotNumber: string | null; shade: string | null }) | null;
  batchId: string | null;
  batchNumberSnapshot: string | null;
  configuredPrice: string;
  conversionFactor: string;
  discount: string;
  id: string;
  lineTotal: string;
  lotNumberSnapshot: string | null;
  product: {
    baseUnit: Named;
    id: string;
    name: string;
    sku: string;
    type: string;
  };
  productNameSnapshot: string;
  quantity: string;
  returnableBaseQuantity: string;
  returnedBaseQuantity: string;
  shadeSnapshot: string | null;
  skuSnapshot: string;
  tax: string;
  tileSizeSnapshot: string | null;
  unit: Named;
  unitCodeSnapshot: string;
  unitPrice: string;
};

export type Payment = {
  amount: string;
  direction: 'INBOUND' | 'OUTBOUND';
  id: string;
  method: Named & { isCash?: boolean };
  paidAt: string;
  paymentNumber: string;
  reference: string | null;
};

export type PaymentAllocation = {
  amount: string;
  createdAt: string;
  payment: Payment;
};

export type ReturnItem = {
  baseQuantity: string;
  batch: { batchNumber: string; lotNumber: string | null; shade: string | null } | null;
  creditAmount: string;
  disposition: 'RESTOCK' | 'NON_RESELLABLE';
  id: string;
  product: Named;
  quantity: string;
  saleItemId: string;
  unit: Named;
};

export type SaleReturn = {
  createdAt: string;
  exchange: {
    creditApplied: string;
    difference: string;
    exchangeNumber: string;
    replacementSaleId: string;
  } | null;
  id: string;
  items: ReturnItem[];
  kind: 'RETURN' | 'VOID';
  reason: string;
  receivableApplied: string;
  refunds: Array<{ amount: string; createdAt: string; payment: Payment }>;
  returnNumber: string;
  returnedAt: string;
  totalCredit: string;
};

export type SaleDetail = {
  branch: Named;
  branchId: string;
  change: string;
  completedAt: string | null;
  createdBy: Person;
  currentOutstanding: string;
  customer: Named & { creditLimit: string; isWalkIn: boolean };
  customerId: string;
  discount: string;
  due: string;
  id: string;
  invoiceNumber: string;
  items: SaleLine[];
  lifecycleStatus: string;
  notes: string | null;
  originalExchanges: Array<{
    creditApplied: string;
    difference: string;
    exchangeNumber: string;
    replacementSaleId: string;
  }>;
  paid: string;
  paymentAllocations: PaymentAllocation[];
  pricingMode: 'RETAIL' | 'WHOLESALE';
  register: Named;
  registerId: string;
  replacementExchanges: Array<{
    exchangeNumber: string;
    originalSaleId: string;
  }>;
  returns: SaleReturn[];
  saleDate: string;
  status: 'DRAFT' | 'HELD' | 'COMPLETED';
  subtotal: string;
  tax: string;
  total: string;
  warehouse: Named;
  warehouseId: string;
};

export type Collection = Payment & {
  customer: Named;
  saleAllocations: Array<{ amount: string; saleId: string }>;
};

export type PaymentMethod = Named & { isCash: boolean };

export type PosContext = {
  paymentMethods: PaymentMethod[];
  registers: Array<Named & { cashShifts: Array<{ id: string }> }>;
  warehouses: Named[];
};

export type PosProduct = {
  availability:
    | Array<{
        baseQuantity: string;
        batchNumber: string;
        id: string;
        lotNumber: string | null;
        shade: string | null;
      }>
    | { baseQuantity: string | null };
  baseUnit: Named;
  batchTracking: boolean;
  id: string;
  name: string;
  prices: Array<{
    amount: string;
    type: 'RETAIL' | 'WHOLESALE' | 'MINIMUM';
    unitId: string;
  }>;
  scannedUnitId: string;
  sku: string;
  tile: { displaySize: string | null } | null;
  type: string;
  units: Array<{ factorToBase: string; unit: Named }>;
};

export type TimelineEvent = {
  amount: string;
  detail?: string;
  id: string;
  label: string;
  method?: string;
  reference?: string;
  timestamp: string;
  tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning';
};
