ALTER TABLE "SaleItem"
ADD COLUMN "productNameSnapshot" VARCHAR(200),
ADD COLUMN "skuSnapshot" VARCHAR(80),
ADD COLUMN "unitCodeSnapshot" VARCHAR(24),
ADD COLUMN "tileSizeSnapshot" VARCHAR(120),
ADD COLUMN "batchNumberSnapshot" VARCHAR(120),
ADD COLUMN "lotNumberSnapshot" VARCHAR(120),
ADD COLUMN "shadeSnapshot" VARCHAR(80);

ALTER TABLE "SaleItem" DISABLE TRIGGER "SaleItem_completed_immutable";

UPDATE "SaleItem" AS si
SET
  "productNameSnapshot" = p."name",
  "skuSnapshot" = p."sku",
  "unitCodeSnapshot" = u."code",
  "tileSizeSnapshot" = (SELECT tp."displaySize" FROM "ProductTileProfile" AS tp WHERE tp."productId" = si."productId" AND tp."companyId" = si."companyId"),
  "batchNumberSnapshot" = (SELECT pb."batchNumber" FROM "ProductBatch" AS pb WHERE pb."id" = si."batchId" AND pb."productId" = si."productId" AND pb."companyId" = si."companyId"),
  "lotNumberSnapshot" = (SELECT pb."lotNumber" FROM "ProductBatch" AS pb WHERE pb."id" = si."batchId" AND pb."productId" = si."productId" AND pb."companyId" = si."companyId"),
  "shadeSnapshot" = (SELECT pb."shade" FROM "ProductBatch" AS pb WHERE pb."id" = si."batchId" AND pb."productId" = si."productId" AND pb."companyId" = si."companyId")
FROM "Product" AS p, "Unit" AS u
WHERE p."id" = si."productId" AND p."companyId" = si."companyId"
  AND u."id" = si."unitId" AND u."companyId" = si."companyId";

ALTER TABLE "SaleItem" ENABLE TRIGGER "SaleItem_completed_immutable";

ALTER TABLE "SaleItem"
ALTER COLUMN "productNameSnapshot" SET NOT NULL,
ALTER COLUMN "skuSnapshot" SET NOT NULL,
ALTER COLUMN "unitCodeSnapshot" SET NOT NULL;
