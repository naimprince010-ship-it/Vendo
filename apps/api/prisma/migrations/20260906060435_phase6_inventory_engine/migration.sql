-- CreateEnum
CREATE TYPE "InventoryOperationType" AS ENUM ('OPENING', 'ADJUSTMENT', 'DAMAGE', 'LOSS', 'TRANSFER', 'COUNT_RECONCILIATION');

-- CreateEnum
CREATE TYPE "PhysicalCountStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'POSTED', 'CANCELLED');

-- DropIndex
DROP INDEX "ProductBatch_identity_key";

-- CreateTable
CREATE TABLE "InventoryOperation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "type" "InventoryOperationType" NOT NULL,
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalCount" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "countNumber" VARCHAR(60) NOT NULL,
    "status" "PhysicalCountStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "reviewedById" UUID,
    "postedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "postedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PhysicalCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalCountItem" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "countId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "batchId" UUID,
    "countedQuantity" DECIMAL(20,6) NOT NULL,
    "snapshotQuantity" DECIMAL(20,6) NOT NULL,
    "snapshotVersion" INTEGER NOT NULL,
    "conversionFactor" DECIMAL(24,10) NOT NULL,
    "transactionQuantity" DECIMAL(20,6) NOT NULL,
    "unitId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PhysicalCountItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryOperation_companyId_type_createdAt_idx" ON "InventoryOperation"("companyId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryOperation_companyId_idempotencyKey_key" ON "InventoryOperation"("companyId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryOperation_id_companyId_key" ON "InventoryOperation"("id", "companyId");

-- CreateIndex
CREATE INDEX "PhysicalCount_companyId_branchId_warehouseId_status_created_idx" ON "PhysicalCount"("companyId", "branchId", "warehouseId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalCount_companyId_countNumber_key" ON "PhysicalCount"("companyId", "countNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalCount_id_companyId_key" ON "PhysicalCount"("id", "companyId");

-- CreateIndex
CREATE INDEX "PhysicalCountItem_companyId_productId_batchId_idx" ON "PhysicalCountItem"("companyId", "productId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalCountItem_countId_productId_batchId_key" ON "PhysicalCountItem"("countId", "productId", "batchId");

-- AddForeignKey
ALTER TABLE "InventoryOperation" ADD CONSTRAINT "InventoryOperation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryOperation" ADD CONSTRAINT "InventoryOperation_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCount" ADD CONSTRAINT "PhysicalCount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCount" ADD CONSTRAINT "PhysicalCount_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCount" ADD CONSTRAINT "PhysicalCount_warehouseId_branchId_companyId_fkey" FOREIGN KEY ("warehouseId", "branchId", "companyId") REFERENCES "Warehouse"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCount" ADD CONSTRAINT "PhysicalCount_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCount" ADD CONSTRAINT "PhysicalCount_reviewedById_companyId_fkey" FOREIGN KEY ("reviewedById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCount" ADD CONSTRAINT "PhysicalCount_postedById_companyId_fkey" FOREIGN KEY ("postedById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCountItem" ADD CONSTRAINT "PhysicalCountItem_countId_companyId_fkey" FOREIGN KEY ("countId", "companyId") REFERENCES "PhysicalCount"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCountItem" ADD CONSTRAINT "PhysicalCountItem_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCountItem" ADD CONSTRAINT "PhysicalCountItem_batchId_productId_companyId_fkey" FOREIGN KEY ("batchId", "productId", "companyId") REFERENCES "ProductBatch"("id", "productId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCountItem" ADD CONSTRAINT "PhysicalCountItem_unitId_companyId_fkey" FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "InventoryBalance_location_product_batch_key" RENAME TO "InventoryBalance_companyId_warehouseId_productId_batchId_key";

-- RenameIndex
ALTER INDEX "Setting_scope_key" RENAME TO "Setting_companyId_branchId_key_key";
