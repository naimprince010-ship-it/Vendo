-- DropForeignKey
ALTER TYPE "PurchaseReturnStatus" ADD VALUE 'DRAFT' BEFORE 'POSTED';
ALTER TABLE "PurchaseReturn" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- DropForeignKey
ALTER TABLE "PurchaseReturnItem" DROP CONSTRAINT "PurchaseReturnItem_invoiceItemId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseReturnItem" DROP CONSTRAINT "PurchaseReturnItem_purchaseInvoiceId_fkey";

-- AlterTable
ALTER TABLE "PurchaseReturnItem" DROP COLUMN "purchaseInvoiceId";

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoiceItem_id_companyId_key" ON "PurchaseInvoiceItem"("id", "companyId");

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_invoiceItemId_companyId_fkey" FOREIGN KEY ("invoiceItemId", "companyId") REFERENCES "PurchaseInvoiceItem"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restore PostgreSQL null-safe identities intentionally not expressible by Prisma.
CREATE UNIQUE INDEX "ProductBatch_identity_key"
ON "ProductBatch" ("companyId", "productId", "batchNumber", "lotNumber", "shade") NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "PhysicalCountItem_position_key"
ON "PhysicalCountItem" ("companyId", "countId", "productId", "batchId") NULLS NOT DISTINCT;

-- One supplier reference may identify only one non-void invoice per company/supplier.
CREATE UNIQUE INDEX "PurchaseInvoice_supplier_reference_key"
ON "PurchaseInvoice" ("companyId", "supplierId", "supplierInvoiceNumber")
WHERE "supplierInvoiceNumber" IS NOT NULL AND "status" <> 'VOIDED';

ALTER TABLE "PurchaseDocumentSequence"
  ADD CONSTRAINT "PurchaseDocumentSequence_nextNumber_check" CHECK ("nextNumber" > 0);
ALTER TABLE "PurchaseOperation"
  ADD CONSTRAINT "PurchaseOperation_requestHash_check" CHECK ("requestHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "PurchaseInvoiceItem"
  ADD CONSTRAINT "PurchaseInvoiceItem_conversionFactor_check" CHECK ("conversionFactor" > 0);
ALTER TABLE "PurchaseReturn"
  ADD CONSTRAINT "PurchaseReturn_financialTotal_check"
  CHECK ("financialTotal" >= 0 AND ("invoiceId" IS NOT NULL OR "financialTotal" = 0));
ALTER TABLE "PurchaseReturnItem"
  ADD CONSTRAINT "PurchaseReturnItem_values_check"
  CHECK (
    "quantity" > 0 AND "baseQuantity" > 0 AND "conversionFactor" > 0
    AND "unitCost" >= 0 AND "financialAmount" >= 0
    AND (("invoiceItemId" IS NULL AND "financialAmount" = 0)
      OR ("invoiceItemId" IS NOT NULL))
  );

CREATE OR REPLACE FUNCTION reject_posted_purchase_document_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'posted purchase documents are immutable';
  END IF;
  IF OLD."status" <> 'DRAFT'
     AND (to_jsonb(NEW) - 'status' - 'updatedAt') <> (to_jsonb(OLD) - 'status' - 'updatedAt') THEN
    RAISE EXCEPTION 'posted purchase documents are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PurchaseInvoice_posted_immutable"
BEFORE UPDATE OR DELETE ON "PurchaseInvoice"
FOR EACH ROW EXECUTE FUNCTION reject_posted_purchase_document_mutation();

CREATE OR REPLACE FUNCTION reject_posted_purchase_line_mutation()
RETURNS trigger AS $$
DECLARE parent_status "InvoiceStatus";
BEGIN
  SELECT "status" INTO parent_status
  FROM "PurchaseInvoice" WHERE "id" = OLD."invoiceId";
  IF parent_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'posted purchase invoice lines are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PurchaseInvoiceItem_posted_immutable"
BEFORE UPDATE OR DELETE ON "PurchaseInvoiceItem"
FOR EACH ROW EXECUTE FUNCTION reject_posted_purchase_line_mutation();

CREATE OR REPLACE FUNCTION reject_posted_receipt_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'posted goods receipts and lines are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GoodsReceipt_posted_immutable"
BEFORE UPDATE OR DELETE ON "GoodsReceipt"
FOR EACH ROW WHEN (OLD."status" = 'POSTED')
EXECUTE FUNCTION reject_posted_receipt_mutation();

CREATE OR REPLACE FUNCTION reject_posted_receipt_line_mutation()
RETURNS trigger AS $$
DECLARE parent_status "ReceiptStatus";
BEGIN
  SELECT "status" INTO parent_status
  FROM "GoodsReceipt" WHERE "id" = OLD."receiptId";
  IF parent_status = 'POSTED' THEN
    RAISE EXCEPTION 'posted goods receipts and lines are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GoodsReceiptItem_posted_immutable"
BEFORE UPDATE OR DELETE ON "GoodsReceiptItem"
FOR EACH ROW EXECUTE FUNCTION reject_posted_receipt_line_mutation();

CREATE TRIGGER "PurchaseReturn_immutable"
BEFORE UPDATE OR DELETE ON "PurchaseReturn"
FOR EACH ROW WHEN (OLD."status" = 'POSTED')
EXECUTE FUNCTION reject_posted_receipt_mutation();

CREATE TRIGGER "PurchaseReturnItem_immutable"
BEFORE UPDATE OR DELETE ON "PurchaseReturnItem"
FOR EACH ROW EXECUTE FUNCTION reject_posted_receipt_mutation();
