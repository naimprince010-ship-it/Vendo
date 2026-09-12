export type ProductType = 'TILE' | 'SANITARY' | 'ACCESSORY' | 'GENERAL';
export type Master = {
  id: string;
  code?: string;
  name: string;
  slug?: string;
  decimalScale?: number;
  isActive: boolean;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
};
export type Page<T> = { items: T[]; total: number; page: number; limit: number };
export type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  type: ProductType;
  model: string | null;
  isActive: boolean;
  trackInventory: boolean;
  batchTracking: boolean;
  category: Pick<Master, 'id' | 'name'> | null;
  brand: Pick<Master, 'id' | 'name'> | null;
  manufacturer: Pick<Master, 'id' | 'name'> | null;
  baseUnit: Pick<Master, 'id' | 'code' | 'name'>;
  tileProfile: { displaySize: string | null } | null;
  barcodes: Array<{ barcode: string }>;
};
export type ProductDetail = Omit<ProductListItem, 'barcodes' | 'tileProfile'> & {
  description: string | null;
  standardCost?: string | null;
  reorderLevel: string | null;
  tileProfile: null | {
    widthMm: string;
    heightMm: string;
    thicknessMm: string | null;
    displaySize: string | null;
    series: string | null;
    finish: string | null;
    surface: string | null;
    color: string | null;
    grade: string | null;
    countryOfOrigin: string | null;
    nominalCoverage: {
      squareFeetPerPiece: string;
      squareMetersPerPiece: string;
      informationalOnly: true;
    };
  };
  sanitaryProfile: null | {
    size: string | null;
    color: string | null;
    material: string | null;
    finish: string | null;
    warrantyMonths: number | null;
    warrantyDetails: string | null;
  };
  conversions: Array<{ id: string; factorToBase: string; fromUnit: Master }>;
  barcodes: Array<{ id: string; barcode: string; isPrimary: boolean; unit: Master | null }>;
  prices: Array<{
    id: string;
    type: 'RETAIL' | 'WHOLESALE' | 'MINIMUM';
    amount: string;
    unit: Master;
  }>;
};
export type References = {
  units: Master[];
  categories: Master[];
  brands: Master[];
  manufacturers: Master[];
};
