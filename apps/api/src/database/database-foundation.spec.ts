import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
const migration = readFileSync(
  join(process.cwd(), 'prisma', 'migrations', '20260904143000_initial_foundation', 'migration.sql'),
  'utf8',
);
const phase6Migration = readFileSync(
  join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260906060435_phase6_inventory_engine',
    'migration.sql',
  ),
  'utf8',
);
const phase6Constraints = readFileSync(
  join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260906062000_phase6_inventory_constraints',
    'migration.sql',
  ),
  'utf8',
);
const phase7Migration = readFileSync(
  join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260906153000_phase7_parties_ledgers',
    'migration.sql',
  ),
  'utf8',
);
const phase7WalkIn = readFileSync(
  join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260906154500_phase7_walkin_provision',
    'migration.sql',
  ),
  'utf8',
);

describe('database foundation', () => {
  it('uses Decimal database fields rather than unsafe floating point fields', () => {
    expect(schema).not.toMatch(/\bFloat\b/);
    expect(schema).toContain('@db.Decimal(19, 4)');
    expect(schema).toContain('@db.Decimal(20, 6)');
    expect(schema).toContain('@db.Decimal(24, 10)');
  });

  it('stores one authoritative inventory base quantity', () => {
    const balanceModel = schema.match(/model InventoryBalance \{[\s\S]*?\n\}/)?.[0];
    expect(balanceModel).toBeDefined();
    expect(balanceModel).toContain('baseQuantity');
    expect(balanceModel).not.toMatch(/boxQuantity|pieceQuantity|sqftQuantity|sqmQuantity/i);
  });

  it('hardens nullable operational identities and movement immutability in PostgreSQL', () => {
    expect(migration).toContain('InventoryBalance_location_product_batch_key');
    expect(migration).toContain('ProductBatch_identity_key');
    expect(migration).toContain('NULLS NOT DISTINCT');
    expect(migration).toContain('InventoryMovement_values_check');
    expect(migration).toContain('InventoryMovement_immutable_update');
    expect(migration).toContain('InventoryMovement_immutable_delete');
  });

  it('contains a tenant-aware relational foundation', () => {
    expect(migration.match(/CREATE TABLE/g) ?? []).toHaveLength(42);
    expect((migration.match(/FOREIGN KEY/g) ?? []).length).toBeGreaterThanOrEqual(90);
    expect((migration.match(/ ADD CONSTRAINT .* CHECK/g) ?? []).length).toBeGreaterThanOrEqual(20);
  });

  it('adds idempotent inventory operations and stale-safe physical counts', () => {
    expect(phase6Migration).toContain('InventoryOperation_companyId_idempotencyKey_key');
    expect(phase6Migration).toContain('PhysicalCount_warehouseId_branchId_companyId_fkey');
    expect(phase6Migration).toContain('PhysicalCountItem_batchId_productId_companyId_fkey');
    expect(phase6Constraints).toContain('PhysicalCountItem_position_key');
    expect(phase6Constraints).toContain('NULLS NOT DISTINCT');
    expect(phase6Constraints).toContain('PhysicalCountItem_values_check');
    expect(phase6Constraints).toContain('PhysicalCount_state_check');
    expect(phase6Constraints).toContain('ProductBatch_identity_key');
  });

  it('adds immutable party ledgers and company-local walk-in provisioning', () => {
    expect(phase7Migration).toContain('CustomerLedgerEntry_one_opening_key');
    expect(phase7Migration).toContain('SupplierLedgerEntry_one_opening_key');
    expect(phase7Migration).toContain('CustomerLedgerEntry_amount_check');
    expect(phase7Migration).toContain('SupplierLedgerEntry_amount_check');
    expect(phase7Migration).toContain('CustomerLedgerEntry_immutable_update');
    expect(phase7Migration).toContain('SupplierLedgerEntry_immutable_delete');
    expect(phase7Migration).toContain('Migrated opening balance');
    expect(phase7WalkIn).toContain('Company_provision_walk_in_customer');
  });
});
