/*
  Warnings:

  - Added the required column `supplierId` to the `GoodsReceipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `PurchaseInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversionFactor` to the `PurchaseInvoiceItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PurchaseReturnStatus" AS ENUM ('POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PurchaseOperationType" AS ENUM ('GOODS_RECEIPT', 'SUPPLIER_INVOICE', 'SUPPLIER_PAYMENT', 'PURCHASE_RETURN');

-- CreateEnum
CREATE TYPE "PurchaseDocumentType" AS ENUM ('PURCHASE_ORDER', 'GOODS_RECEIPT', 'SUPPLIER_INVOICE', 'SUPPLIER_PAYMENT', 'PURCHASE_RETURN');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CLOSED';

-- DropIndex
DROP INDEX "PhysicalCountItem_position_key";

-- DropIndex
DROP INDEX "ProductBatch_identity_key";

-- AlterTable
ALTER TABLE "GoodsReceipt" ADD COLUMN     "supplierId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "createdById" UUID NOT NULL,
ADD COLUMN     "currencyCode" CHAR(3) NOT NULL DEFAULT 'BDT',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "orderId" UUID;

-- AlterTable
ALTER TABLE "PurchaseInvoiceItem" ADD COLUMN     "conversionFactor" DECIMAL(24,10) NOT NULL;

-- CreateTable
CREATE TABLE "PurchaseDocumentSequence" (
    "companyId" UUID NOT NULL,
    "type" "PurchaseDocumentType" NOT NULL,
    "nextNumber" BIGINT NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PurchaseDocumentSequence_pkey" PRIMARY KEY ("companyId","type")
);

-- CreateTable
CREATE TABLE "PurchaseOperation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "type" "PurchaseOperationType" NOT NULL,
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReturn" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "orderId" UUID,
    "receiptId" UUID NOT NULL,
    "invoiceId" UUID,
    "createdById" UUID NOT NULL,
    "returnNumber" VARCHAR(60) NOT NULL,
    "status" "PurchaseReturnStatus" NOT NULL DEFAULT 'POSTED',
    "returnedAt" TIMESTAMPTZ(3) NOT NULL,
    "financialTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reason" VARCHAR(1000) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReturnItem" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "returnId" UUID NOT NULL,
    "receiptItemId" UUID NOT NULL,
    "invoiceItemId" UUID,
    "productId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "batchId" UUID,
    "quantity" DECIMAL(20,6) NOT NULL,
    "baseQuantity" DECIMAL(20,6) NOT NULL,
    "conversionFactor" DECIMAL(24,10) NOT NULL,
    "unitCost" DECIMAL(19,4) NOT NULL,
    "financialAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchaseInvoiceId" UUID,

    CONSTRAINT "PurchaseReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOperation_companyId_type_createdAt_idx" ON "PurchaseOperation"("companyId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOperation_companyId_idempotencyKey_key" ON "PurchaseOperation"("companyId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOperation_id_companyId_key" ON "PurchaseOperation"("id", "companyId");

-- CreateIndex
CREATE INDEX "PurchaseReturn_companyId_supplierId_returnedAt_idx" ON "PurchaseReturn"("companyId", "supplierId", "returnedAt");

-- CreateIndex
CREATE INDEX "PurchaseReturn_companyId_receiptId_idx" ON "PurchaseReturn"("companyId", "receiptId");

-- CreateIndex
CREATE INDEX "PurchaseReturn_companyId_invoiceId_idx" ON "PurchaseReturn"("companyId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReturn_companyId_returnNumber_key" ON "PurchaseReturn"("companyId", "returnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReturn_id_companyId_key" ON "PurchaseReturn"("id", "companyId");

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_companyId_returnId_idx" ON "PurchaseReturnItem"("companyId", "returnId");

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_companyId_receiptItemId_idx" ON "PurchaseReturnItem"("companyId", "receiptItemId");

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_companyId_invoiceItemId_idx" ON "PurchaseReturnItem"("companyId", "invoiceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReturnItem_id_companyId_key" ON "PurchaseReturnItem"("id", "companyId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_companyId_supplierId_receivedAt_idx" ON "GoodsReceipt"("companyId", "supplierId", "receivedAt");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_companyId_orderId_idx" ON "PurchaseInvoice"("companyId", "orderId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_companyId_receiptId_idx" ON "PurchaseInvoice"("companyId", "receiptId");

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_supplierId_companyId_fkey" FOREIGN KEY ("supplierId", "companyId") REFERENCES "Supplier"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_orderId_companyId_fkey" FOREIGN KEY ("orderId", "companyId") REFERENCES "PurchaseOrder"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDocumentSequence" ADD CONSTRAINT "PurchaseDocumentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOperation" ADD CONSTRAINT "PurchaseOperation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOperation" ADD CONSTRAINT "PurchaseOperation_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_warehouseId_branchId_companyId_fkey" FOREIGN KEY ("warehouseId", "branchId", "companyId") REFERENCES "Warehouse"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_supplierId_companyId_fkey" FOREIGN KEY ("supplierId", "companyId") REFERENCES "Supplier"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_orderId_companyId_fkey" FOREIGN KEY ("orderId", "companyId") REFERENCES "PurchaseOrder"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_receiptId_companyId_fkey" FOREIGN KEY ("receiptId", "companyId") REFERENCES "GoodsReceipt"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_invoiceId_companyId_fkey" FOREIGN KEY ("invoiceId", "companyId") REFERENCES "PurchaseInvoice"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_returnId_companyId_fkey" FOREIGN KEY ("returnId", "companyId") REFERENCES "PurchaseReturn"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_receiptItemId_companyId_fkey" FOREIGN KEY ("receiptItemId", "companyId") REFERENCES "GoodsReceiptItem"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "PurchaseInvoiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_unitId_companyId_fkey" FOREIGN KEY ("unitId", "companyId") REFERENCES "Unit"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_batchId_productId_companyId_fkey" FOREIGN KEY ("batchId", "productId", "companyId") REFERENCES "ProductBatch"("id", "productId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
