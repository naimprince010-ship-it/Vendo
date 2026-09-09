\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() <> 'vendo_phase13_replay' THEN
    RAISE EXCEPTION 'This destructive fixture is restricted to vendo_phase13_replay';
  END IF;
END $$;

INSERT INTO "Branch" (id, "companyId", code, name, "updatedAt")
SELECT '13000000-0000-4000-8000-000000000001'::uuid, id, 'P13', 'Phase 13 Performance', now()
FROM "Company" ORDER BY "createdAt" LIMIT 1
ON CONFLICT ("companyId", code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = now();

INSERT INTO "Warehouse" (id, "companyId", "branchId", code, name, "updatedAt")
SELECT '13000000-0000-4000-8000-000000000002'::uuid, "companyId", id, 'P13-WH', 'Phase 13 Warehouse', now()
FROM "Branch" WHERE id = '13000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT ("companyId", code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = now();

INSERT INTO "Unit" (id, "companyId", code, name, "decimalScale", "updatedAt")
SELECT '13000000-0000-4000-8000-000000000003'::uuid, id, 'P13-PCS', 'Pieces', 6, now()
FROM "Company" ORDER BY "createdAt" LIMIT 1
ON CONFLICT ("companyId", code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = now();

INSERT INTO "Category" (id, "companyId", name, slug, "updatedAt")
SELECT '13000000-0000-4000-8000-000000000004'::uuid, id, 'Performance Catalog', 'performance-catalog', now()
FROM "Company" ORDER BY "createdAt" LIMIT 1
ON CONFLICT ("companyId", slug) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = now();

INSERT INTO "Product" (
  id, "companyId", "categoryId", "baseUnitId", type, sku, name, model,
  "standardCost", "reorderLevel", "updatedAt"
)
SELECT
  (substr(md5('phase13-product-' || n), 1, 8) || '-' || substr(md5('phase13-product-' || n), 9, 4) ||
   '-4' || substr(md5('phase13-product-' || n), 14, 3) || '-8' || substr(md5('phase13-product-' || n), 18, 3) ||
   '-' || substr(md5('phase13-product-' || n), 21, 12))::uuid,
  c.id,
  '13000000-0000-4000-8000-000000000004'::uuid,
  '13000000-0000-4000-8000-000000000003'::uuid,
  'GENERAL'::"ProductType",
  'P13-SKU-' || lpad(n::text, 5, '0'),
  CASE WHEN n = 9876 THEN 'Premium Performance Search Target' ELSE 'Performance Product ' || lpad(n::text, 5, '0') END,
  'MODEL-' || (n % 250)::text,
  100.0000,
  5.000000,
  now()
FROM generate_series(1, 10000) AS n
CROSS JOIN LATERAL (SELECT id FROM "Company" ORDER BY "createdAt" LIMIT 1) AS c
ON CONFLICT ("companyId", sku) DO NOTHING;

INSERT INTO "ProductBarcode" (id, "companyId", "productId", "unitId", barcode, "isPrimary")
SELECT gen_random_uuid(), p."companyId", p.id, p."baseUnitId", 'P13-BC-' || right(p.sku, 5), true
FROM "Product" p
WHERE p.sku LIKE 'P13-SKU-%'
ON CONFLICT ("companyId", barcode) DO NOTHING;

INSERT INTO "ProductPrice" (id, "companyId", "productId", "unitId", type, amount, "updatedAt")
SELECT gen_random_uuid(), p."companyId", p.id, p."baseUnitId", 'RETAIL'::"PriceType", 150.0000, now()
FROM "Product" p
WHERE p.sku LIKE 'P13-SKU-%'
ON CONFLICT ("companyId", "productId", "unitId", type) DO NOTHING;

INSERT INTO "InventoryBalance" (
  id, "companyId", "branchId", "warehouseId", "productId", "baseQuantity", version, "updatedAt"
)
SELECT gen_random_uuid(), p."companyId",
  '13000000-0000-4000-8000-000000000001'::uuid,
  '13000000-0000-4000-8000-000000000002'::uuid,
  p.id, 1000.000000, 1, now()
FROM "Product" p
WHERE p.sku LIKE 'P13-SKU-%'
  AND NOT EXISTS (
    SELECT 1 FROM "InventoryBalance" b
    WHERE b."companyId" = p."companyId"
      AND b."warehouseId" = '13000000-0000-4000-8000-000000000002'::uuid
      AND b."productId" = p.id
      AND b."batchId" IS NULL
  );

ANALYZE "Product";
ANALYZE "ProductBarcode";
ANALYZE "ProductPrice";
ANALYZE "InventoryBalance";
