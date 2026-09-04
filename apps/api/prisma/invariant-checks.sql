\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  company_id uuid := gen_random_uuid();
  branch_id uuid := gen_random_uuid();
  warehouse_id uuid := gen_random_uuid();
  unit_id uuid := gen_random_uuid();
  user_id uuid := gen_random_uuid();
  product_id uuid := gen_random_uuid();
  other_product_id uuid := gen_random_uuid();
  batch_id uuid := gen_random_uuid();
  movement_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO "Company" ("id", "code", "name", "createdAt", "updatedAt")
  VALUES (company_id, 'VERIFY', 'Verification Company', now(), now());

  INSERT INTO "Branch" ("id", "companyId", "code", "name", "createdAt", "updatedAt")
  VALUES (branch_id, company_id, 'MAIN', 'Main', now(), now());

  INSERT INTO "Warehouse" ("id", "companyId", "branchId", "code", "name", "createdAt", "updatedAt")
  VALUES (warehouse_id, company_id, branch_id, 'MAIN', 'Main', now(), now());

  INSERT INTO "Unit" ("id", "companyId", "code", "name", "createdAt", "updatedAt")
  VALUES (unit_id, company_id, 'PCS', 'Piece', now(), now());

  INSERT INTO "User" ("id", "companyId", "email", "passwordHash", "firstName", "createdAt", "updatedAt")
  VALUES (user_id, company_id, 'verify@example.invalid', 'not-a-real-password-hash', 'Verify', now(), now());

  INSERT INTO "Product" ("id", "companyId", "baseUnitId", "type", "sku", "name", "createdAt", "updatedAt")
  VALUES
    (product_id, company_id, unit_id, 'TILE', 'VERIFY-1', 'Verification Tile', now(), now()),
    (other_product_id, company_id, unit_id, 'GENERAL', 'VERIFY-2', 'Other Product', now(), now());

  INSERT INTO "ProductBatch" ("id", "companyId", "productId", "batchNumber", "createdAt", "updatedAt")
  VALUES (batch_id, company_id, product_id, 'BATCH-A', now(), now());

  BEGIN
    INSERT INTO "UnitConversion" ("id", "companyId", "productId", "fromUnitId", "factorToBase", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), company_id, product_id, unit_id, 0, now(), now());
    RAISE EXCEPTION 'zero conversion factor was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO "InventoryBalance" ("id", "companyId", "branchId", "warehouseId", "productId", "baseQuantity", "updatedAt")
  VALUES (gen_random_uuid(), company_id, branch_id, warehouse_id, product_id, 10, now());

  BEGIN
    INSERT INTO "InventoryBalance" ("id", "companyId", "branchId", "warehouseId", "productId", "baseQuantity", "updatedAt")
    VALUES (gen_random_uuid(), company_id, branch_id, warehouse_id, product_id, 5, now());
    RAISE EXCEPTION 'duplicate unbatched balance was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "InventoryBalance" ("id", "companyId", "branchId", "warehouseId", "productId", "batchId", "baseQuantity", "updatedAt")
    VALUES (gen_random_uuid(), company_id, branch_id, warehouse_id, other_product_id, batch_id, 1, now());
    RAISE EXCEPTION 'batch from another product was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  INSERT INTO "InventoryMovement" (
    "id", "companyId", "branchId", "warehouseId", "productId", "unitId", "createdById", "type",
    "baseQuantity", "transactionQuantity", "conversionFactor", "referenceType", "referenceId", "occurredAt", "createdAt"
  ) VALUES (
    movement_id, company_id, branch_id, warehouse_id, product_id, unit_id, user_id, 'OPENING',
    10, 10, 1, 'VERIFICATION', gen_random_uuid(), now(), now()
  );

  BEGIN
    UPDATE "InventoryMovement" SET "baseQuantity" = 11 WHERE "id" = movement_id;
    RAISE EXCEPTION 'inventory movement update was accepted';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;

  BEGIN
    DELETE FROM "InventoryMovement" WHERE "id" = movement_id;
    RAISE EXCEPTION 'inventory movement delete was accepted';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
END $$;

ROLLBACK;
