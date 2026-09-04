\set ON_ERROR_STOP on

DO $$
DECLARE
  table_count integer;
  decimal_count integer;
  fk_count integer;
  check_count integer;
BEGIN
  SELECT count(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  IF table_count < 35 THEN RAISE EXCEPTION 'Expected at least 35 application tables, found %', table_count; END IF;

  SELECT count(*) INTO decimal_count FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'numeric';
  IF decimal_count < 35 THEN RAISE EXCEPTION 'Expected Decimal-backed columns, found %', decimal_count; END IF;

  SELECT count(*) INTO fk_count FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY';
  IF fk_count < 60 THEN RAISE EXCEPTION 'Expected tenant-aware foreign keys, found %', fk_count; END IF;

  SELECT count(*) INTO check_count FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_type = 'CHECK';
  IF check_count < 20 THEN RAISE EXCEPTION 'Expected business check constraints, found %', check_count; END IF;
END $$;

SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
  'InventoryBalance_location_product_batch_key',
  'ProductBatch_identity_key',
  'Setting_scope_key',
  'CashShift_one_open_per_register_key',
  'Customer_one_walk_in_key',
  'ProductBarcode_one_primary_key'
) ORDER BY indexname;
