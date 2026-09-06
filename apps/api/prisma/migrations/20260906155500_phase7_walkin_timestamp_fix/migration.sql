CREATE OR REPLACE FUNCTION provision_company_walk_in_customer() RETURNS trigger AS $$
BEGIN
  INSERT INTO "Customer" (
    "id", "companyId", "code", "name", "creditLimit", "isWalkIn", "isActive", "updatedAt"
  ) VALUES (
    gen_random_uuid(), NEW."id", 'WALK-IN', 'Walk-in Customer', 0, true, true, CURRENT_TIMESTAMP
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The initial foundation already enforced this invariant under its original name.
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_creditLimit_check";
