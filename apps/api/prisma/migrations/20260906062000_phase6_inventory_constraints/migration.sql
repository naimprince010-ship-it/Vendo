-- Restore the null-safe batch identity invariant intentionally implemented outside Prisma DSL.
CREATE UNIQUE INDEX "ProductBatch_identity_key"
ON "ProductBatch" ("companyId", "productId", "batchNumber", "lotNumber", "shade") NULLS NOT DISTINCT;

-- A physical count cannot contain duplicate unbatched positions.
DROP INDEX "PhysicalCountItem_countId_productId_batchId_key";
CREATE UNIQUE INDEX "PhysicalCountItem_position_key"
ON "PhysicalCountItem" ("countId", "productId", "batchId") NULLS NOT DISTINCT;

ALTER TABLE "PhysicalCountItem"
  ADD CONSTRAINT "PhysicalCountItem_values_check" CHECK (
    "countedQuantity" >= 0
    AND "snapshotVersion" >= 0
    AND "conversionFactor" > 0
    AND "transactionQuantity" > 0
  );

ALTER TABLE "PhysicalCount"
  ADD CONSTRAINT "PhysicalCount_state_check" CHECK (
    ("status" = 'DRAFT' AND "reviewedById" IS NULL AND "reviewedAt" IS NULL AND "postedById" IS NULL AND "postedAt" IS NULL)
    OR ("status" = 'IN_REVIEW' AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "postedById" IS NULL AND "postedAt" IS NULL)
    OR ("status" = 'POSTED' AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "postedById" IS NOT NULL AND "postedAt" IS NOT NULL)
    OR ("status" = 'CANCELLED' AND "postedById" IS NULL AND "postedAt" IS NULL)
  );

ALTER TABLE "InventoryOperation"
  ADD CONSTRAINT "InventoryOperation_hash_check" CHECK ("requestHash" ~ '^[0-9a-f]{64}$');
