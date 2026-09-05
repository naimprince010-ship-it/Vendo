import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260904160000_phase3_auth_identity',
    'migration.sql',
  ),
  'utf8',
);

describe('Phase 3 authentication migration', () => {
  it('adds hashed session and reset credential storage with lifecycle constraints', () => {
    expect(migration).toContain('"refreshTokenHash" CHAR(64)');
    expect(migration).toContain('"tokenHash" CHAR(64)');
    expect(migration).toContain('AuthSession_lifecycle_check');
    expect(migration).toContain('PasswordResetToken_lifecycle_check');
  });

  it('preserves tenant-safe session ownership and the Phase 2 custom indexes', () => {
    expect(migration).toContain('AuthSession_userId_companyId_fkey');
    expect(migration).toContain('AuthSession_replacedById_companyId_fkey');
    expect(migration).not.toContain('DROP INDEX "ProductBatch_identity_key"');
    expect(migration).not.toContain('ALTER INDEX "InventoryBalance_location_product_batch_key"');
  });
});
