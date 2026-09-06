-- Phase 7 keeps customer and supplier master records company-scoped while
-- recording monetary positions in immutable, signed ledgers.
CREATE TYPE "CustomerLedgerEntryType" AS ENUM (
  'OPENING_BALANCE', 'OPENING_CORRECTION', 'ADJUSTMENT',
  'SALE_INVOICE', 'PAYMENT', 'SALE_RETURN', 'CREDIT_NOTE'
);

CREATE TYPE "SupplierLedgerEntryType" AS ENUM (
  'OPENING_BALANCE', 'OPENING_CORRECTION', 'ADJUSTMENT',
  'PURCHASE_INVOICE', 'PAYMENT', 'PURCHASE_RETURN'
);

DROP INDEX "CustomerGroup_companyId_name_key";
ALTER TABLE "CustomerGroup"
  ADD COLUMN "code" VARCHAR(40),
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "CustomerGroup"
SET "code" = 'GROUP-' || upper(substr(replace("id"::text, '-', ''), 1, 8));

ALTER TABLE "CustomerGroup" ALTER COLUMN "code" SET NOT NULL;

ALTER TABLE "Customer"
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "taxIdentifier" VARCHAR(80);

ALTER TABLE "Supplier"
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "taxIdentifier" VARCHAR(80);

CREATE TABLE "CustomerLedgerEntry" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "branchId" UUID,
  "customerId" UUID NOT NULL,
  "createdById" UUID,
  "type" "CustomerLedgerEntryType" NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "effectiveAt" TIMESTAMPTZ(3) NOT NULL,
  "referenceType" VARCHAR(60),
  "referenceId" UUID,
  "description" VARCHAR(1000) NOT NULL,
  "idempotencyKey" VARCHAR(100) NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerLedgerEntry_amount_check" CHECK ("amount" <> 0),
  CONSTRAINT "CustomerLedgerEntry_hash_check" CHECK ("requestHash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "SupplierLedgerEntry" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "branchId" UUID,
  "supplierId" UUID NOT NULL,
  "createdById" UUID,
  "type" "SupplierLedgerEntryType" NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "effectiveAt" TIMESTAMPTZ(3) NOT NULL,
  "referenceType" VARCHAR(60),
  "referenceId" UUID,
  "description" VARCHAR(1000) NOT NULL,
  "idempotencyKey" VARCHAR(100) NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierLedgerEntry_amount_check" CHECK ("amount" <> 0),
  CONSTRAINT "SupplierLedgerEntry_hash_check" CHECK ("requestHash" ~ '^[0-9a-f]{64}$')
);

-- Preserve any pre-Phase-7 opening values as auditable system-origin entries.
INSERT INTO "CustomerLedgerEntry" (
  "id", "companyId", "customerId", "type", "amount", "effectiveAt",
  "description", "idempotencyKey", "requestHash"
)
SELECT gen_random_uuid(), "companyId", "id", 'OPENING_BALANCE', "openingBalance",
       "createdAt", 'Migrated opening balance', 'migration-opening-' || "id"::text,
       repeat('0', 64)
FROM "Customer"
WHERE "openingBalance" <> 0;

INSERT INTO "SupplierLedgerEntry" (
  "id", "companyId", "supplierId", "type", "amount", "effectiveAt",
  "description", "idempotencyKey", "requestHash"
)
SELECT gen_random_uuid(), "companyId", "id", 'OPENING_BALANCE', "openingBalance",
       "createdAt", 'Migrated opening balance', 'migration-opening-' || "id"::text,
       repeat('0', 64)
FROM "Supplier"
WHERE "openingBalance" <> 0;

ALTER TABLE "Customer" DROP COLUMN "openingBalance";
ALTER TABLE "Supplier" DROP COLUMN "openingBalance";

-- Every company receives one local walk-in customer. Existing company/code
-- collisions retain a deterministic company-specific reserved alternative.
INSERT INTO "Customer" (
  "id", "companyId", "code", "name", "creditLimit", "isWalkIn", "isActive"
)
SELECT gen_random_uuid(), c."id",
       CASE WHEN EXISTS (
         SELECT 1 FROM "Customer" existing
         WHERE existing."companyId" = c."id" AND existing."code" = 'WALK-IN'
       ) THEN 'WALK-IN-' || upper(substr(replace(c."id"::text, '-', ''), 1, 8))
       ELSE 'WALK-IN' END,
       'Walk-in Customer', 0, true, true
FROM "Company" c
WHERE NOT EXISTS (
  SELECT 1 FROM "Customer" existing
  WHERE existing."companyId" = c."id" AND existing."isWalkIn" = true
);

CREATE INDEX "CustomerLedgerEntry_companyId_customerId_effectiveAt_id_idx"
  ON "CustomerLedgerEntry"("companyId", "customerId", "effectiveAt", "id");
CREATE INDEX "CustomerLedgerEntry_companyId_customerId_type_idx"
  ON "CustomerLedgerEntry"("companyId", "customerId", "type");
CREATE INDEX "CustomerLedgerEntry_companyId_branchId_effectiveAt_idx"
  ON "CustomerLedgerEntry"("companyId", "branchId", "effectiveAt");
CREATE UNIQUE INDEX "CustomerLedgerEntry_companyId_idempotencyKey_key"
  ON "CustomerLedgerEntry"("companyId", "idempotencyKey");
CREATE UNIQUE INDEX "CustomerLedgerEntry_one_opening_key"
  ON "CustomerLedgerEntry"("companyId", "customerId") WHERE "type" = 'OPENING_BALANCE';

CREATE INDEX "SupplierLedgerEntry_companyId_supplierId_effectiveAt_id_idx"
  ON "SupplierLedgerEntry"("companyId", "supplierId", "effectiveAt", "id");
CREATE INDEX "SupplierLedgerEntry_companyId_supplierId_type_idx"
  ON "SupplierLedgerEntry"("companyId", "supplierId", "type");
CREATE INDEX "SupplierLedgerEntry_companyId_branchId_effectiveAt_idx"
  ON "SupplierLedgerEntry"("companyId", "branchId", "effectiveAt");
CREATE UNIQUE INDEX "SupplierLedgerEntry_companyId_idempotencyKey_key"
  ON "SupplierLedgerEntry"("companyId", "idempotencyKey");
CREATE UNIQUE INDEX "SupplierLedgerEntry_one_opening_key"
  ON "SupplierLedgerEntry"("companyId", "supplierId") WHERE "type" = 'OPENING_BALANCE';

CREATE INDEX "Customer_companyId_email_idx" ON "Customer"("companyId", "email");
CREATE INDEX "Customer_companyId_isActive_idx" ON "Customer"("companyId", "isActive");
CREATE INDEX "CustomerGroup_companyId_name_idx" ON "CustomerGroup"("companyId", "name");
CREATE INDEX "CustomerGroup_companyId_isActive_idx" ON "CustomerGroup"("companyId", "isActive");
CREATE UNIQUE INDEX "CustomerGroup_companyId_code_key" ON "CustomerGroup"("companyId", "code");
CREATE INDEX "Supplier_companyId_email_idx" ON "Supplier"("companyId", "email");
CREATE INDEX "Supplier_companyId_contactName_idx" ON "Supplier"("companyId", "contactName");
CREATE INDEX "Supplier_companyId_isActive_idx" ON "Supplier"("companyId", "isActive");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_creditLimit_check" CHECK ("creditLimit" >= 0);

ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_branchId_companyId_fkey"
  FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_customerId_companyId_fkey"
  FOREIGN KEY ("customerId", "companyId") REFERENCES "Customer"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_createdById_companyId_fkey"
  FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_branchId_companyId_fkey"
  FOREIGN KEY ("branchId", "companyId") REFERENCES "Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_supplierId_companyId_fkey"
  FOREIGN KEY ("supplierId", "companyId") REFERENCES "Supplier"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_createdById_companyId_fkey"
  FOREIGN KEY ("createdById", "companyId") REFERENCES "User"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_party_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Party ledger entries are immutable; create a correction entry';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CustomerLedgerEntry_immutable_update" BEFORE UPDATE ON "CustomerLedgerEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_party_ledger_mutation();
CREATE TRIGGER "CustomerLedgerEntry_immutable_delete" BEFORE DELETE ON "CustomerLedgerEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_party_ledger_mutation();
CREATE TRIGGER "SupplierLedgerEntry_immutable_update" BEFORE UPDATE ON "SupplierLedgerEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_party_ledger_mutation();
CREATE TRIGGER "SupplierLedgerEntry_immutable_delete" BEFORE DELETE ON "SupplierLedgerEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_party_ledger_mutation();
