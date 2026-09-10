export type Page<T> = { items: T[]; total: number };

export type Branch = { id: string; code: string; name: string; isActive: boolean };

export type Named = { id: string; code: string; name: string };

export type Register = Named & {
  cashShifts: { id: string; cashierId: string; openedAt: string }[];
};

export type Customer = Named & {
  phone?: string | null;
  isWalkIn: boolean;
  creditLimit: string;
};

export type PaymentMethod = Named & { isCash: boolean };

export type Unit = Named & { decimalScale?: number };

export type Price = {
  unitId: string;
  type: 'RETAIL' | 'WHOLESALE' | 'MINIMUM';
  amount: string;
};

export type Batch = {
  id: string;
  batchNumber: string;
  lotNumber: string | null;
  shade: string | null;
  baseQuantity: string;
};

export type PosProduct = {
  id: string;
  sku: string;
  name: string;
  type: string;
  model: string | null;
  brand?: { id: string; name: string } | null;
  manufacturer?: { id: string; name: string } | null;
  primaryBarcode: string | null;
  scannedUnitId: string;
  baseUnit: Unit;
  units: { unit: Unit; factorToBase: string }[];
  prices: Price[];
  batchTracking: boolean;
  trackInventory: boolean;
  availability: Batch[] | { baseQuantity: string | null };
  tile: { displaySize: string | null; color: string | null } | null;
};

export type CartLine = {
  product: PosProduct;
  unitId: string;
  batchId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  tax: string;
  overrideReason: string;
};

export type SaleLine = {
  id: string;
  productId: string;
  unitId: string;
  batchId: string | null;
  quantity: string;
  baseQuantity: string;
  configuredPrice: string;
  unitPrice: string;
  discount: string;
  tax: string;
  lineTotal: string;
  priceOverrideReason: string | null;
  product: PosProduct;
  unit: Unit;
  batch: Batch | null;
};

export type Sale = {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'HELD' | 'COMPLETED';
  pricingMode: 'RETAIL' | 'WHOLESALE';
  warehouseId: string;
  registerId: string;
  customerId: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paid: string;
  due: string;
  change: string;
  saleDate: string;
  customer: Customer;
  register: Named;
  items?: SaleLine[];
  currentOutstanding?: string;
  lifecycleStatus?: string;
  paymentAllocations?: {
    amount: string;
    payment: {
      paymentNumber: string;
      direction: 'INBOUND' | 'OUTBOUND';
      method: Named;
    };
  }[];
  returns?: {
    id: string;
    returnNumber: string;
    kind: 'RETURN' | 'VOID';
    totalCredit: string;
    receivableApplied: string;
    refunds: { amount: string; payment: { paymentNumber: string; method: Named } }[];
    exchange: { exchangeNumber: string; creditApplied: string; difference: string } | null;
  }[];
};

export type PosContext = {
  warehouses: Named[];
  registers: Register[];
  paymentMethods: PaymentMethod[];
  walkIn: Customer;
};

export type PricingMode = 'RETAIL' | 'WHOLESALE';
export type ProductFilter = 'ALL' | 'TILE' | 'SANITARY' | 'OTHER';
