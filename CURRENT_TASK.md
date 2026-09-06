# Current Phase

Phase 6 — Inventory and Batch/Lot/Shade

# Current Task

Complete and verify the transactional inventory engine, optional batches, physical counts, transfers, stock queries, permissions, audit, and management UI.

# Objective

Deliver auditable, company- and location-safe inventory operations while preserving one authoritative product base quantity and preventing concurrent overselling. Do not start parties, purchasing, sales/POS, payments, cash, or reports.

# Dependencies

- Verified Phase 5 catalog, product conversion, and pricing foundation
- Phase 2 immutable inventory movement and balance models
- Phase 4 active-branch authorization and warehouse ownership
- PostgreSQL 17 development service

# Expected Files To Change

- Inventory domain/API module under `apps/api/src/inventory/**`
- Additive Prisma migrations for idempotent operations and physical counts
- Central permission catalog and API module wiring
- Real Phase 6 inventory UI under `apps/web/src/**`
- Inventory/database/permission/decision documentation and project-control files

# Acceptance Criteria

- Every stock mutation atomically writes immutable movement history and updates one base-unit balance projection.
- Decimal product conversions are snapshotted; batch-required products cannot bypass batch allocation.
- Tenant, branch, warehouse, product, unit, and batch ownership are enforced by API and database relationships.
- Idempotency, negative-stock policy, deterministic locking, and stale physical-count protection prevent duplicate or unsafe stock changes.
- Opening, adjustment, damage, loss, count/reconciliation, transfer, balance, low-stock, batch, and history workflows use real APIs and UI.

# Verification Required

- Inventory integration tests including concurrency, rollback, idempotency, tenant/branch isolation, negative policy, batches, counts, and transfers
- Migration inspection/application/status and clean replay/drift verification
- Permission seed idempotency, Swagger, and live browser workflows
- Prisma checks, repository lint/typecheck/tests/builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — Phase 6 gate passed on 2026-09-06. Transactional inventory, optional batch/lot/shade, count reconciliation, transfers, queries, permissions, audit, migrations, concurrency tests, production builds, Swagger, and live browser workflows are verified.

# Blockers

None. `BUG-008` remains a low-severity deferred pg@9 compatibility warning on the pinned pg 8 runtime and does not block Phase 6.

# Next Approved Task

Phase 7 — Customers and Suppliers. Begin by rereading governance, database, permission, and relevant financial-foundation documentation; do not start purchasing or sales workflows.
