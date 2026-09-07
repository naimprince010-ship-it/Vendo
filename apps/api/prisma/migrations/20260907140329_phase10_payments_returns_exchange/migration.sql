-- CreateEnum
CREATE TYPE "SaleReturnKind" AS ENUM ('RETURN', 'VOID');

-- CreateEnum
CREATE TYPE "ReturnDisposition" AS ENUM ('RESTOCK', 'NON_RESELLABLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SalesDocumentType" ADD VALUE 'CUSTOMER_COLLECTION';
ALTER TYPE "SalesDocumentType" ADD VALUE 'SALE_RETURN';
ALTER TYPE "SalesDocumentType" ADD VALUE 'SALE_REFUND';
ALTER TYPE "SalesDocumentType" ADD VALUE 'EXCHANGE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SalesOperationType" ADD VALUE 'CUSTOMER_COLLECTION';
ALTER TYPE "SalesOperationType" ADD VALUE 'SALE_RETURN';
ALTER TYPE "SalesOperationType" ADD VALUE 'SALE_REFUND';
ALTER TYPE "SalesOperationType" ADD VALUE 'EXCHANGE';
ALTER TYPE "SalesOperationType" ADD VALUE 'VOID_SALE';

-- DropIndex
DROP INDEX "PhysicalCountItem_position_key";

-- DropIndex
DROP INDEX "ProductBatch_identity_key";

-- CreateTable
CREATE TABLE "SaleReturn" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "returnNumber" VARCHAR(60) NOT NULL,
    "kind" "SaleReturnKind" NOT NULL DEFAULT 'RETURN',
    "totalCredit" DECIMAL(19,4) NOT NULL,
    "receivableApplied" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reason" VARCHAR(1000) NOT NULL,
    "returnedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleReturnItem" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "returnId" UUID NOT NULL,
    "saleItemId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "batchId" UUID,
    "quantity" DECIMAL(20,6) NOT NULL,
    "baseQuantity" DECIMAL(20,6) NOT NULL,
    "conversionFactor" DECIMAL(24,10) NOT NULL,
    "creditAmount" DECIMAL(19,4) NOT NULL,
    "disposition" "ReturnDisposition" NOT NULL DEFAULT 'RESTOCK',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleRefund" (
    "companyId" UUID NOT NULL,
    "returnId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleRefund_pkey" PRIMARY KEY ("returnId","paymentId")
);

-- CreateTable
CREATE TABLE "SaleExchange" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "originalSaleId" UUID NOT NULL,
    "returnId" UUID NOT NULL,
    "replacementSaleId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "exchangeNumber" VARCHAR(60) NOT NULL,
    "creditApplied" DECIMAL(19,4) NOT NULL,
    "difference" DECIMAL(19,4) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleExchange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaleReturn_companyId_branchId_returnedAt_idx" ON "SaleReturn"("companyId", "branchId", "returnedAt");

-- CreateIndex
CREATE INDEX "SaleReturn_companyId_saleId_returnedAt_idx" ON "SaleReturn"("companyId", "saleId", "returnedAt");

-- CreateIndex
CREATE INDEX "SaleReturn_companyId_customerId_returnedAt_idx" ON "SaleReturn"("companyId", "customerId", "returnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SaleReturn_companyId_returnNumber_key" ON "SaleReturn"("companyId", "returnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SaleReturn_id_companyId_key" ON "SaleReturn"("id", "companyId");

-- CreateIndex
CREATE INDEX "SaleReturnItem_companyId_returnId_idx" ON "SaleReturnItem"("companyId", "returnId");

-- CreateIndex
CREATE INDEX "SaleReturnItem_companyId_saleItemId_idx" ON "SaleReturnItem"("companyId", "saleItemId");

-- CreateIndex
CREATE INDEX "SaleReturnItem_companyId_productId_batchId_idx" ON "SaleReturnItem"("companyId", "productId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleReturnItem_id_companyId_key" ON "SaleReturnItem"("id", "companyId");

-- CreateIndex
CREATE INDEX "SaleRefund_companyId_paymentId_idx" ON "SaleRefund"("companyId", "paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleExchange_returnId_key" ON "SaleExchange"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleExchange_replacementSaleId_key" ON "SaleExchange"("replacementSaleId");

-- CreateIndex
CREATE INDEX "SaleExchange_companyId_branchId_createdAt_idx" ON "SaleExchange"("companyId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "SaleExchange_companyId_originalSaleId_idx" ON "SaleExchange"("companyId", "originalSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleExchange_companyId_exchangeNumber_key" ON "SaleExchange"("companyId", "exchangeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SaleExchange_id_companyId_key" ON "SaleExchange"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleExchange_returnId_companyId_key" ON "SaleExchange"("returnId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleExchange_replacementSaleId_companyId_key" ON "SaleExchange"("replacementSaleId", "companyId");

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_warehouseId_branchId_companyId_fkey" FOREIGN KEY ("warehouseId", "branchId", "companyId") REFERENCES "Warehouse"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_saleId_companyId_fkey" FOREIGN KEY ("saleId", "companyId") REFERENCES "Sale"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_customerId_companyId_fkey" FOREIGN KEY ("customerId", "companyId") REFERENCES "Customer"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_returnId_companyId_fkey" FOREIGN KEY ("returnId", "companyId") REFERENCES "SaleReturn"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_saleItemId_companyId_fkey" FOREIGN KEY ("saleItemId", "companyId") REFERENCES "SaleItem"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_unitId_companyId_fkey" FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_batchId_productId_companyId_fkey" FOREIGN KEY ("batchId", "productId", "companyId") REFERENCES "ProductBatch"("id", "productId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefund" ADD CONSTRAINT "SaleRefund_returnId_companyId_fkey" FOREIGN KEY ("returnId", "companyId") REFERENCES "SaleReturn"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefund" ADD CONSTRAINT "SaleRefund_paymentId_companyId_fkey" FOREIGN KEY ("paymentId", "companyId") REFERENCES "Payment"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleExchange" ADD CONSTRAINT "SaleExchange_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleExchange" ADD CONSTRAINT "SaleExchange_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleExchange" ADD CONSTRAINT "SaleExchange_originalSaleId_companyId_fkey" FOREIGN KEY ("originalSaleId", "companyId") REFERENCES "Sale"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleExchange" ADD CONSTRAINT "SaleExchange_returnId_companyId_fkey" FOREIGN KEY ("returnId", "companyId") REFERENCES "SaleReturn"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleExchange" ADD CONSTRAINT "SaleExchange_replacementSaleId_companyId_fkey" FOREIGN KEY ("replacementSaleId", "companyId") REFERENCES "Sale"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleExchange" ADD CONSTRAINT "SaleExchange_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the PostgreSQL null-safe identities that Prisma cannot express.
CREATE UNIQUE INDEX "ProductBatch_identity_key"
ON "ProductBatch" ("companyId", "productId", "batchNumber", "lotNumber", "shade") NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "PhysicalCountItem_position_key"
ON "PhysicalCountItem" ("countId", "productId", "batchId") NULLS NOT DISTINCT;

ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_amounts_check"
CHECK ("totalCredit" >= 0 AND "receivableApplied" >= 0 AND "receivableApplied" <= "totalCredit");

ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_values_check"
CHECK ("quantity" > 0 AND "baseQuantity" > 0 AND "conversionFactor" > 0 AND "creditAmount" >= 0);

ALTER TABLE "SaleRefund" ADD CONSTRAINT "SaleRefund_amount_check" CHECK ("amount" > 0);

ALTER TABLE "SaleExchange" ADD CONSTRAINT "SaleExchange_credit_check" CHECK ("creditApplied" >= 0);

CREATE FUNCTION reject_sale_adjustment_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'posted sale adjustment history is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SaleReturn_immutable" BEFORE UPDATE OR DELETE ON "SaleReturn"
FOR EACH ROW EXECUTE FUNCTION reject_sale_adjustment_mutation();
CREATE TRIGGER "SaleReturnItem_immutable" BEFORE UPDATE OR DELETE ON "SaleReturnItem"
FOR EACH ROW EXECUTE FUNCTION reject_sale_adjustment_mutation();
CREATE TRIGGER "SaleRefund_immutable" BEFORE UPDATE OR DELETE ON "SaleRefund"
FOR EACH ROW EXECUTE FUNCTION reject_sale_adjustment_mutation();
CREATE TRIGGER "SaleExchange_immutable" BEFORE UPDATE OR DELETE ON "SaleExchange"
FOR EACH ROW EXECUTE FUNCTION reject_sale_adjustment_mutation();
CREATE TRIGGER "SalePayment_immutable" BEFORE UPDATE OR DELETE ON "SalePayment"
FOR EACH ROW EXECUTE FUNCTION reject_sale_adjustment_mutation();

CREATE FUNCTION reject_completed_payment_mutation() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'COMPLETED' THEN
    RAISE EXCEPTION 'completed payment history is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Payment_completed_immutable" BEFORE UPDATE OR DELETE ON "Payment"
FOR EACH ROW EXECUTE FUNCTION reject_completed_payment_mutation();
