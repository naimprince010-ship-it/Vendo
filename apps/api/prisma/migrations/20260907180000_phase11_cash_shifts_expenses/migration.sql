-- Phase 11: register cash shifts, immutable drawer movements, and expenses.

CREATE TYPE "CashOperationType" AS ENUM ('OPEN_SHIFT', 'CASH_IN', 'CASH_OUT', 'POST_EXPENSE', 'REVERSE_EXPENSE', 'CLOSE_SHIFT');
CREATE TYPE "CashDocumentType" AS ENUM ('EXPENSE');
CREATE TYPE "ExpenseStatus" AS ENUM ('POSTED', 'REVERSED');

ALTER TYPE "CashMovementType" ADD VALUE 'CUSTOMER_COLLECTION';
ALTER TYPE "CashMovementType" ADD VALUE 'SUPPLIER_PAYMENT';

ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_shiftId_companyId_fkey";
ALTER TABLE "CashMovement" ADD COLUMN "registerId" UUID;
UPDATE "CashMovement" movement
SET "registerId" = shift."registerId"
FROM "CashShift" shift
WHERE shift."id" = movement."shiftId" AND shift."companyId" = movement."companyId";
ALTER TABLE "CashMovement" ALTER COLUMN "registerId" SET NOT NULL;

ALTER TABLE "Expense"
  ADD COLUMN "reference" VARCHAR(160),
  ADD COLUMN "reversalReason" TEXT,
  ADD COLUMN "reversedAt" TIMESTAMPTZ(3),
  ADD COLUMN "reversedById" UUID,
  ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'POSTED',
  ALTER COLUMN "expenseDate" SET DATA TYPE TIMESTAMPTZ(3) USING "expenseDate"::TIMESTAMPTZ;

ALTER TABLE "ExpenseCategory" ADD COLUMN "code" VARCHAR(40), ADD COLUMN "description" TEXT;
UPDATE "ExpenseCategory"
SET "code" = 'LEGACY-' || upper(substr(replace("id"::text, '-', ''), 1, 12))
WHERE "code" IS NULL;
ALTER TABLE "ExpenseCategory" ALTER COLUMN "code" SET NOT NULL;

CREATE TABLE "CashOperation" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "shiftId" UUID,
  "createdById" UUID NOT NULL,
  "type" "CashOperationType" NOT NULL,
  "idempotencyKey" VARCHAR(120) NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "result" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashOperation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashDocumentSequence" (
  "companyId" UUID NOT NULL,
  "type" "CashDocumentType" NOT NULL,
  "nextValue" BIGINT NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CashDocumentSequence_pkey" PRIMARY KEY ("companyId", "type")
);

CREATE INDEX "CashOperation_companyId_type_createdAt_idx" ON "CashOperation"("companyId", "type", "createdAt");
CREATE UNIQUE INDEX "CashOperation_companyId_idempotencyKey_key" ON "CashOperation"("companyId", "idempotencyKey");
CREATE INDEX "CashMovement_companyId_registerId_occurredAt_idx" ON "CashMovement"("companyId", "registerId", "occurredAt");
CREATE UNIQUE INDEX "CashMovement_companyId_referenceType_referenceId_type_key" ON "CashMovement"("companyId", "referenceType", "referenceId", "type");
CREATE UNIQUE INDEX "CashShift_id_registerId_branchId_companyId_key" ON "CashShift"("id", "registerId", "branchId", "companyId");
CREATE INDEX "Expense_companyId_status_expenseDate_idx" ON "Expense"("companyId", "status", "expenseDate");
CREATE UNIQUE INDEX "ExpenseCategory_companyId_code_key" ON "ExpenseCategory"("companyId", "code");

ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_shiftId_registerId_branchId_companyId_fkey"
  FOREIGN KEY ("shiftId", "registerId", "branchId", "companyId") REFERENCES "CashShift"("id", "registerId", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_registerId_branchId_companyId_fkey"
  FOREIGN KEY ("registerId", "branchId", "companyId") REFERENCES "Register"("id", "branchId", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashOperation" ADD CONSTRAINT "CashOperation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashOperation" ADD CONSTRAINT "CashOperation_shiftId_companyId_fkey" FOREIGN KEY ("shiftId", "companyId") REFERENCES "CashShift"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashOperation" ADD CONSTRAINT "CashOperation_createdById_companyId_fkey" FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashDocumentSequence" ADD CONSTRAINT "CashDocumentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reversedById_companyId_fkey" FOREIGN KEY ("reversedById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_amount_check";
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_amount_check" CHECK (
  ("type" = 'OPENING' AND "amount" >= 0) OR ("type" <> 'OPENING' AND "amount" > 0)
);
ALTER TABLE "CashOperation" ADD CONSTRAINT "CashOperation_request_hash_check" CHECK ("requestHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "CashDocumentSequence" ADD CONSTRAINT "CashDocumentSequence_next_value_check" CHECK ("nextValue" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_phase11_values_check" CHECK (
  "amount" > 0 AND
  (("status" = 'POSTED' AND "reversedAt" IS NULL AND "reversedById" IS NULL AND "reversalReason" IS NULL) OR
   ("status" = 'REVERSED' AND "reversedAt" IS NOT NULL AND "reversedById" IS NOT NULL AND length(trim("reversalReason")) >= 3))
);

CREATE OR REPLACE FUNCTION phase11_reject_cash_movement_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Cash movements are immutable';
END;
$$;
CREATE TRIGGER "CashMovement_immutable" BEFORE UPDATE OR DELETE ON "CashMovement"
FOR EACH ROW EXECUTE FUNCTION phase11_reject_cash_movement_mutation();

CREATE OR REPLACE FUNCTION phase11_guard_cash_shift_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Cash shifts cannot be deleted'; END IF;
  IF OLD."status" = 'CLOSED' THEN RAISE EXCEPTION 'Closed cash shifts are immutable'; END IF;
  IF NEW."companyId" <> OLD."companyId" OR NEW."branchId" <> OLD."branchId" OR
     NEW."registerId" <> OLD."registerId" OR NEW."cashierId" <> OLD."cashierId" OR
     NEW."openedAt" <> OLD."openedAt" OR NEW."openingCash" <> OLD."openingCash" OR
     NEW."status" <> 'CLOSED' OR NEW."closedAt" IS NULL OR NEW."expectedCash" IS NULL OR
     NEW."actualCash" IS NULL OR NEW."variance" IS NULL THEN
    RAISE EXCEPTION 'Only a complete OPEN to CLOSED cash-shift transition is allowed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "CashShift_guard" BEFORE UPDATE OR DELETE ON "CashShift"
FOR EACH ROW EXECUTE FUNCTION phase11_guard_cash_shift_mutation();

CREATE OR REPLACE FUNCTION phase11_guard_expense_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Posted expenses cannot be deleted'; END IF;
  IF OLD."status" <> 'POSTED' OR NEW."status" <> 'REVERSED' OR
     NEW."companyId" <> OLD."companyId" OR NEW."branchId" <> OLD."branchId" OR
     NEW."categoryId" <> OLD."categoryId" OR NEW."paymentMethodId" <> OLD."paymentMethodId" OR
     NEW."createdById" <> OLD."createdById" OR NEW."expenseNumber" <> OLD."expenseNumber" OR
     NEW."amount" <> OLD."amount" OR NEW."expenseDate" <> OLD."expenseDate" OR
     NEW."description" IS DISTINCT FROM OLD."description" OR NEW."reference" IS DISTINCT FROM OLD."reference" OR
     NEW."reversedAt" IS NULL OR NEW."reversedById" IS NULL OR NEW."reversalReason" IS NULL THEN
    RAISE EXCEPTION 'Posted expenses are immutable except controlled reversal';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Expense_guard" BEFORE UPDATE OR DELETE ON "Expense"
FOR EACH ROW EXECUTE FUNCTION phase11_guard_expense_mutation();

-- Preserve Prisma-unrepresentable Phase 6 null-safe identities.
CREATE UNIQUE INDEX IF NOT EXISTS "ProductBatch_identity_key"
  ON "ProductBatch" ("companyId", "productId", "batchNumber", "lotNumber", "shade") NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS "PhysicalCountItem_position_key"
  ON "PhysicalCountItem" ("companyId", "countId", "productId", "batchId") NULLS NOT DISTINCT;
