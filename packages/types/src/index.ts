export interface HealthResponse {
  status: 'ok';
  service: 'vendo-api';
}
export const PRODUCT_TYPES = ['TILE', 'SANITARY', 'ACCESSORY', 'GENERAL'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
