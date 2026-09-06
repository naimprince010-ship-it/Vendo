-- Company creation must always provision a local default walk-in customer,
-- including companies created outside the development bootstrap command.
CREATE FUNCTION provision_company_walk_in_customer() RETURNS trigger AS $$
BEGIN
  INSERT INTO "Customer" (
    "id", "companyId", "code", "name", "creditLimit", "isWalkIn", "isActive"
  ) VALUES (
    gen_random_uuid(), NEW."id", 'WALK-IN', 'Walk-in Customer', 0, true, true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Company_provision_walk_in_customer"
AFTER INSERT ON "Company"
FOR EACH ROW EXECUTE FUNCTION provision_company_walk_in_customer();
