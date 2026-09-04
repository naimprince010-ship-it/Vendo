# Current Phase

Phase 2 — Database Foundation

# Current Task

Finalize the relational model and inventory/financial invariants before implementing the Prisma schema.

# Objective

Translate the approved modular-monolith, reusable-core, tile-profile, movement-ledger, base-quantity, conversion, batch, and Decimal decisions into a documented PostgreSQL/Prisma model with enforceable relations, constraints, indexes, and migration safety.

# Dependencies

- Verified Phase 1 foundation
- PostgreSQL 17 development service
- ADR-001 through ADR-008
- Tile, inventory, and unit conversion design documents

# Expected Files To Change

- `apps/api/prisma/**`
- `apps/api/src/database/**`
- API package scripts and dependencies
- `docs/DATABASE_DESIGN.md`
- Relevant project-control files

# Acceptance Criteria

- Prisma schema models the approved organization, identity, catalog, tile, inventory, party, purchasing, sales, payments, cash, expense, audit, and settings foundations without fake workflows.
- Money and authoritative quantities use Decimal-compatible database types.
- Core product records do not require tile-specific fields.
- Inventory has one base quantity and an auditable movement ledger.
- Batch/lot/shade is optional per product.
- Tenant/location foreign keys, uniqueness, search indexes, and key database constraints are documented and implemented where appropriate.

# Verification Required

- PostgreSQL container health
- Prisma format and validation
- Prisma client generation
- Initial migration creation and clean application
- Migration status verification
- Database constraint/invariant integration checks
- Repository lint, typecheck, tests, and builds

# Status

IN PROGRESS

# Blockers

None.

# Next Approved Task

Phase 3 — Authentication, users, roles, and permissions after the Phase 2 gate passes.
