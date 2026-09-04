# Current Phase

Phase 2 — Database Foundation

# Current Task

Phase 2 database foundation gate completed; retain the verified schema and migration as the baseline for the next approved phase.

# Objective

Maintain the verified PostgreSQL/Prisma baseline without starting Phase 3 implementation in this task.

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

COMPLETE — Phase 2 gate passed on 2026-09-04.

# Blockers

None.

# Next Approved Task

Phase 3 — Authentication, users, roles, and permissions after the Phase 2 gate passes.
