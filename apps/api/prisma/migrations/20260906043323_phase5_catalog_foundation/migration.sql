-- Phase 5 catalog foundation. Existing free-text manufacturers are normalized
-- before the legacy column is removed so this migration preserves product data.

CREATE TABLE "Manufacturer" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Manufacturer_companyId_name_isActive_idx" ON "Manufacturer"("companyId", "name", "isActive");
CREATE UNIQUE INDEX "Manufacturer_companyId_slug_key" ON "Manufacturer"("companyId", "slug");
CREATE UNIQUE INDEX "Manufacturer_id_companyId_key" ON "Manufacturer"("id", "companyId");
ALTER TABLE "Manufacturer" ADD CONSTRAINT "Manufacturer_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Manufacturer" ("id", "companyId", "name", "slug", "updatedAt")
SELECT gen_random_uuid(), p."companyId", btrim(p."manufacturer"),
       left(regexp_replace(lower(btrim(p."manufacturer")), '[^a-z0-9]+', '-', 'g'), 160)
         || '-' || substr(md5(btrim(p."manufacturer")), 1, 8), CURRENT_TIMESTAMP
FROM "Product" p
WHERE p."manufacturer" IS NOT NULL AND btrim(p."manufacturer") <> ''
GROUP BY p."companyId", btrim(p."manufacturer");

ALTER TABLE "Product" ADD COLUMN "manufacturerId" UUID;
UPDATE "Product" p SET "manufacturerId" = m."id"
FROM "Manufacturer" m
WHERE m."companyId" = p."companyId" AND m."name" = btrim(p."manufacturer");
ALTER TABLE "Product" ADD CONSTRAINT "Product_manufacturerId_companyId_fkey"
    FOREIGN KEY ("manufacturerId", "companyId") REFERENCES "Manufacturer"("id", "companyId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" DROP COLUMN "manufacturer";
CREATE INDEX "Product_companyId_manufacturerId_isActive_idx" ON "Product"("companyId", "manufacturerId", "isActive");
CREATE INDEX "Brand_companyId_name_isActive_idx" ON "Brand"("companyId", "name", "isActive");

CREATE TABLE "ProductSanitaryProfile" (
    "productId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "size" VARCHAR(100),
    "color" VARCHAR(80),
    "material" VARCHAR(100),
    "finish" VARCHAR(80),
    "warrantyMonths" INTEGER,
    "warrantyDetails" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ProductSanitaryProfile_pkey" PRIMARY KEY ("productId"),
    CONSTRAINT "ProductSanitaryProfile_warranty_check" CHECK ("warrantyMonths" IS NULL OR "warrantyMonths" >= 0)
);
CREATE INDEX "ProductSanitaryProfile_companyId_material_idx" ON "ProductSanitaryProfile"("companyId", "material");
CREATE UNIQUE INDEX "ProductSanitaryProfile_productId_companyId_key" ON "ProductSanitaryProfile"("productId", "companyId");
ALTER TABLE "ProductSanitaryProfile" ADD CONSTRAINT "ProductSanitaryProfile_productId_companyId_fkey"
    FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductBarcode" ADD COLUMN "unitId" UUID;
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_unitId_companyId_fkey"
    FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId")
    ON DELETE RESTRICT ON UPDATE CASCADE;

WITH ranked AS (
    SELECT "id", row_number() OVER (
        PARTITION BY "companyId", "productId", "fromUnitId"
        ORDER BY "version" DESC, "createdAt" DESC, "id" DESC
    ) AS position
    FROM "UnitConversion" WHERE "isActive" = true
)
UPDATE "UnitConversion" conversion SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
FROM ranked WHERE conversion."id" = ranked."id" AND ranked.position > 1;

CREATE UNIQUE INDEX "UnitConversion_one_active_key"
    ON "UnitConversion" ("companyId", "productId", "fromUnitId") WHERE "isActive" = true;
