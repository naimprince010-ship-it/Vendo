-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('RETAIL', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "SalesOperationType" AS ENUM ('COMPLETE_SALE');

-- CreateEnum
CREATE TYPE "SalesDocumentType" AS ENUM ('SALE_INVOICE', 'SALE_PAYMENT');

-- DropIndex
DROP INDEX "PhysicalCountItem_position_key";

-- DropIndex
DROP INDEX "ProductBatch_identity_key";

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "pricingMode" "PricingMode" NOT NULL DEFAULT 'RETAIL',
ADD COLUMN     "salespersonId" UUID;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "configuredPrice" DECIMAL(19,4),
ADD COLUMN     "priceOverrideReason" VARCHAR(500);

-- Preserve any pre-Phase-9 draft/foundation rows before enforcing the snapshot.
UPDATE "SaleItem" SET "configuredPrice" = "unitPrice" WHERE "configuredPrice" IS NULL;
ALTER TABLE "SaleItem" ALTER COLUMN "configuredPrice" SET NOT NULL;

-- CreateTable
CREATE TABLE "SalesDocumentSequence" (
    "companyId" UUID NOT NULL,
    "type" "SalesDocumentType" NOT NULL,
    "nextNumber" BIGINT NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SalesDocumentSequence_pkey" PRIMARY KEY ("companyId","type")
);

-- CreateTable
CREATE TABLE "SalesOperation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "type" "SalesOperationType" NOT NULL,
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesOperation_companyId_type_createdAt_idx" ON "SalesOperation"("companyId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOperation_companyId_idempotencyKey_key" ON "SalesOperation"("companyId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Sale_companyId_registerId_saleDate_idx" ON "Sale"("companyId", "registerId", "saleDate");

-- CreateIndex
CREATE INDEX "Sale_companyId_createdById_saleDate_idx" ON "Sale"("companyId", "createdById", "saleDate");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_salespersonId_companyId_fkey" FOREIGN KEY ("salespersonId", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDocumentSequence" ADD CONSTRAINT "SalesDocumentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOperation" ADD CONSTRAINT "SalesOperation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOperation" ADD CONSTRAINT "SalesOperation_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restore PostgreSQL null-safe identities intentionally not expressible by Prisma.
CREATE UNIQUE INDEX "ProductBatch_identity_key"
ON "ProductBatch" ("companyId", "productId", "batchNumber", "lotNumber", "shade") NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "PhysicalCountItem_position_key"
ON "PhysicalCountItem" ("companyId", "countId", "productId", "batchId") NULLS NOT DISTINCT;

ALTER TABLE "SalesDocumentSequence"
  ADD CONSTRAINT "SalesDocumentSequence_nextNumber_check" CHECK ("nextNumber" > 0);
ALTER TABLE "SalesOperation"
  ADD CONSTRAINT "SalesOperation_requestHash_check" CHECK ("requestHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "Sale"
  DROP CONSTRAINT "Sale_totals_check",
  ADD CONSTRAINT "Sale_totals_check" CHECK (
    "subtotal" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "total" >= 0
    AND "paid" >= 0 AND "paid" <= "total" AND "due" >= 0 AND "change" >= 0
    AND "total" = "subtotal" - "discount" + "tax"
    AND "due" = "total" - "paid"
  ),
  ADD CONSTRAINT "Sale_completion_check" CHECK (
    ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL)
    OR ("status" <> 'COMPLETED' AND "completedAt" IS NULL)
  );
ALTER TABLE "SaleItem"
  DROP CONSTRAINT "SaleItem_values_check",
  ADD CONSTRAINT "SaleItem_values_check" CHECK (
    "quantity" > 0 AND "baseQuantity" > 0 AND "conversionFactor" > 0
    AND "configuredPrice" >= 0 AND "unitPrice" >= 0 AND "unitCost" >= 0
    AND "discount" >= 0 AND "tax" >= 0 AND "lineTotal" >= 0
  );

CREATE OR REPLACE FUNCTION reject_completed_sale_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'completed sales are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Sale_completed_immutable"
BEFORE UPDATE OR DELETE ON "Sale"
FOR EACH ROW WHEN (OLD."status" = 'COMPLETED')
EXECUTE FUNCTION reject_completed_sale_mutation();

CREATE OR REPLACE FUNCTION reject_completed_sale_item_mutation()
RETURNS trigger AS $$
DECLARE parent_status "SaleStatus";
BEGIN
  SELECT "status" INTO parent_status FROM "Sale" WHERE "id" = OLD."saleId";
  IF parent_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'completed sale items are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SaleItem_completed_immutable"
BEFORE UPDATE OR DELETE ON "SaleItem"
FOR EACH ROW EXECUTE FUNCTION reject_completed_sale_item_mutation();
