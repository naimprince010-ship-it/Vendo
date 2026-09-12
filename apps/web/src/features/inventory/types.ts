export type Page<T> = { items: T[]; total: number; page?: number; limit?: number };

export type Unit = {
  id: string;
  code: string;
  name: string;
  decimalScale?: number;
};

export type Warehouse = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  type: 'TILE' | 'SANITARY' | 'ACCESSORY' | 'GENERAL';
  model: string | null;
  isActive: boolean;
  trackInventory: boolean;
  batchTracking: boolean;
  baseUnit: Unit;
  tileProfile: { displaySize: string | null } | null;
};

export type ProductDetail = Product & {
  reorderLevel: string | null;
  conversions: Array<{ id: string; factorToBase: string; fromUnit: Unit }>;
};

export type Batch = {
  id: string;
  productId: string;
  batchNumber: string;
  lotNumber: string | null;
  shade: string | null;
  receivedAt?: string | null;
  isActive: boolean;
  product: Pick<Product, 'id' | 'sku' | 'name'>;
};

export type Balance = {
  id: string;
  productId: string;
  baseQuantity: string;
  version: number;
  updatedAt: string;
  warehouse: Pick<Warehouse, 'id' | 'code' | 'name'>;
  product: Pick<Product, 'id' | 'sku' | 'name' | 'baseUnit'> & {
    reorderLevel: string | null;
  };
  batch: Pick<Batch, 'id' | 'batchNumber' | 'lotNumber' | 'shade'> | null;
  equivalents: Array<{ unit: Unit; quantity: string }>;
};

export type Movement = {
  id: string;
  type: string;
  baseQuantity: string;
  transactionQuantity: string;
  conversionFactor: string;
  referenceType: string;
  referenceId: string;
  correlationId: string | null;
  occurredAt: string;
  reason: string | null;
  product: Pick<Product, 'id' | 'sku' | 'name'>;
  warehouse: Pick<Warehouse, 'id' | 'code' | 'name'>;
  unit: Unit;
  batch: Pick<Batch, 'id' | 'batchNumber' | 'lotNumber' | 'shade'> | null;
  createdBy: { id: string; firstName: string; lastName: string };
};

export type CountSummary = {
  id: string;
  countNumber: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'POSTED';
  warehouse: Warehouse;
  notes: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  postedAt?: string | null;
  _count: { items: number };
};

export type CountDetail = Omit<CountSummary, '_count'> & {
  items: Array<{
    id: string;
    productId: string;
    batchId: string | null;
    countedQuantity: string;
    snapshotQuantity: string;
    snapshotVersion: number;
    conversionFactor: string;
    transactionQuantity: string;
    product: Product;
    batch: Batch | null;
    unit: Unit;
  }>;
};

export type Api = <T>(path: string, init?: RequestInit, branchId?: string) => Promise<T>;

export type StockLineDraft = {
  key: string;
  productId: string;
  unitId: string;
  batchId: string;
  quantity: string;
};
