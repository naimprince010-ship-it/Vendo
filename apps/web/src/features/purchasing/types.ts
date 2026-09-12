export type Page<T> = { items: T[]; total: number; page?: number; limit?: number };

export type Unit = { id: string; code: string; name: string };
export type Branch = { id: string; code: string; name: string; isActive: boolean };
export type Warehouse = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
};
export type Supplier = { id: string; code: string; name: string; isActive: boolean };
export type Product = {
  id: string;
  sku: string;
  name: string;
  type: 'TILE' | 'SANITARY' | 'ACCESSORY' | 'GENERAL';
  model: string | null;
  batchTracking: boolean;
  baseUnit?: Unit;
  tileProfile: { displaySize: string | null } | null;
};

export type OrderStatus =
  'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';

export type PurchaseOrderLine = {
  id: string;
  productId: string;
  unitId: string;
  quantity: string;
  baseQuantity: string;
  conversionFactor: string;
  receivedBaseQuantity?: string;
  remainingBaseQuantity?: string;
  unitCost: string;
  discount: string;
  tax: string;
  lineTotal: string;
  product: Product;
  unit: Unit;
};

export type PurchaseOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedAt: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  freight: string;
  total: string;
  notes: string | null;
  createdAt: string;
  createdById: string;
  supplier: Supplier;
  warehouse?: Warehouse;
  items?: PurchaseOrderLine[];
  receipts?: Array<{ id: string; receiptNumber: string; receivedAt: string; status: string }>;
  _count?: { items: number; receipts: number };
};

export type Batch = {
  id: string;
  batchNumber: string;
  lotNumber: string | null;
  shade: string | null;
};

export type GoodsReceiptLine = {
  id: string;
  orderItemId: string;
  productId: string;
  unitId: string;
  batchId: string | null;
  quantity: string;
  baseQuantity: string;
  conversionFactor: string;
  unitCost: string;
  product: Product;
  unit: Unit;
  batch: Batch | null;
};

export type GoodsReceipt = {
  id: string;
  receiptNumber: string;
  status: 'DRAFT' | 'POSTED' | 'VOIDED';
  orderId: string;
  supplierId: string;
  warehouseId: string;
  receivedAt: string;
  notes: string | null;
  createdById: string;
  supplier: Supplier;
  warehouse?: Warehouse;
  items?: GoodsReceiptLine[];
  _count?: { items: number };
};

export type InvoiceStatus = 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED';
export type PurchaseInvoiceLine = {
  id: string;
  productId: string;
  unitId: string;
  receiptItemId: string | null;
  quantity: string;
  baseQuantity: string;
  conversionFactor: string;
  unitCost: string;
  discount: string;
  tax: string;
  lineTotal: string;
  product: Pick<Product, 'id' | 'sku' | 'name'>;
  unit: Unit;
};

export type PurchaseInvoice = {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNumber: string | null;
  status: InvoiceStatus;
  supplierId: string;
  orderId: string | null;
  receiptId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  currencyCode: string;
  subtotal: string;
  discount: string;
  tax: string;
  freight: string;
  additionalCost: string;
  total: string;
  notes: string | null;
  supplier: Supplier;
  items?: PurchaseInvoiceLine[];
  paymentAllocations?: Array<{ amount: string; payment?: SupplierPayment }>;
  returns?: Array<{ id?: string; returnNumber?: string; financialTotal: string }>;
};

export type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  isCash: boolean;
};
export type Register = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
};
export type SupplierPayment = {
  id: string;
  paymentNumber: string;
  supplierId: string;
  amount: string;
  paidAt: string;
  reference: string | null;
  notes: string | null;
  supplier: Supplier;
  method: PaymentMethod;
  purchaseAllocations: Array<{ invoiceId: string; amount: string }>;
};

export type PurchaseReturn = {
  id: string;
  returnNumber: string;
  status: 'DRAFT' | 'POSTED' | 'VOIDED';
  supplierId: string;
  warehouseId: string;
  receiptId: string;
  invoiceId: string | null;
  returnedAt: string;
  financialTotal: string;
  reason: string;
  notes: string | null;
  supplier: Supplier;
  _count?: { items: number };
};

export type SupplierDue = {
  balance: string;
  position: 'PAYABLE' | 'ADVANCE';
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    total: string;
    paid: string;
    credited: string;
    outstanding: string;
    dueDate: string | null;
    overdue: boolean;
  }>;
};

export type Api = <T>(path: string, init?: RequestInit, branchId?: string) => Promise<T>;

export type PurchaseLineDraft = {
  key: string;
  productId: string;
  unitId: string;
  quantity: string;
  unitCost: string;
  discount: string;
  tax: string;
};
