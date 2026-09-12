import type { ProductListItem, ProductType } from './types';

export type CatalogStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function productTypeTone(type: ProductType): CatalogStatusTone {
  if (type === 'TILE') return 'info';
  if (type === 'SANITARY') return 'success';
  return 'neutral';
}

export function baseUnitLabel(unit: Pick<ProductListItem['baseUnit'], 'code' | 'name'>) {
  return unit.code ?? unit.name;
}

export function productSubtitle(product: Pick<ProductListItem, 'sku' | 'model' | 'tileProfile'>) {
  return [product.sku, product.tileProfile?.displaySize, product.model].filter(Boolean).join(' · ');
}
