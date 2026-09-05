BEGIN;

DO $$
DECLARE
  company_id uuid := gen_random_uuid();
  other_company_id uuid := gen_random_uuid();
  user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO "Company" ("id", "code", "name", "createdAt", "updatedAt") VALUES
    (company_id, 'AUTHVERIFY', 'Auth Verification', now(), now()),
    (other_company_id, 'AUTHOTHER', 'Auth Other', now(), now());
  INSERT INTO "User" ("id", "companyId", "email", "passwordHash", "firstName", "createdAt", "updatedAt")
    VALUES (user_id, company_id, 'auth-verify@example.invalid', 'argon2-hash-placeholder', 'Verify', now(), now());

  BEGIN
    UPDATE "User" SET "failedLoginCount" = -1 WHERE "id" = user_id;
    RAISE EXCEPTION 'negative failed-login count was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "AuthSession" (
      "id", "companyId", "userId", "familyId", "refreshTokenHash", "expiresAt", "createdAt"
    ) VALUES (
      gen_random_uuid(), company_id, user_id, gen_random_uuid(), repeat('a', 64), now() - interval '1 minute', now()
    );
    RAISE EXCEPTION 'expired-at-creation session was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "AuthSession" (
      "id", "companyId", "userId", "familyId", "refreshTokenHash", "expiresAt", "createdAt"
    ) VALUES (
      gen_random_uuid(), other_company_id, user_id, gen_random_uuid(), repeat('b', 64), now() + interval '1 day', now()
    );
    RAISE EXCEPTION 'cross-company session ownership was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;

ROLLBACK;
