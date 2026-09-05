DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM (VALUES
    ('AuthSession'),
    ('PasswordResetToken')
  ) AS expected(table_name)
  WHERE to_regclass(format('public.%I', table_name)) IS NULL;
  IF missing_count <> 0 THEN
    RAISE EXCEPTION 'Phase 3 auth tables are missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuthSession_lifecycle_check') THEN
    RAISE EXCEPTION 'AuthSession lifecycle constraint is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_lifecycle_check') THEN
    RAISE EXCEPTION 'PasswordResetToken lifecycle constraint is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_security_counters_check') THEN
    RAISE EXCEPTION 'User security counter constraint is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuthSession_replacedById_companyId_fkey') THEN
    RAISE EXCEPTION 'Tenant-safe session rotation foreign key is missing';
  END IF;
  SELECT count(*) INTO missing_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN ('ProductBatch_identity_key', 'InventoryBalance_location_product_batch_key', 'Setting_scope_key');
  IF missing_count <> 3 THEN
    RAISE EXCEPTION 'Phase 2 custom indexes were not preserved';
  END IF;
END $$;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'AuthSession_refreshTokenHash_key',
    'AuthSession_replacedById_companyId_key',
    'AuthSession_companyId_userId_revokedAt_expiresAt_idx',
    'PasswordResetToken_tokenHash_key'
  )
ORDER BY indexname;
