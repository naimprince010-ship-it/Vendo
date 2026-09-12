-- A counted quantity of zero is valid for physical reconciliation. Other stock
-- transaction quantities remain protected by their positive-only API/domain rules.
ALTER TABLE "PhysicalCountItem"
  DROP CONSTRAINT "PhysicalCountItem_values_check";

ALTER TABLE "PhysicalCountItem"
  ADD CONSTRAINT "PhysicalCountItem_values_check" CHECK (
    "countedQuantity" >= 0
    AND "snapshotVersion" >= 0
    AND "conversionFactor" > 0
    AND "transactionQuantity" >= 0
  );
