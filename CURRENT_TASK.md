# Current Phase

Phase 8 — Purchasing and Supplier Dues

# Current Task

Implement and verify Purchase Order → Goods Receipt → Supplier Invoice → Supplier Payment → Purchase Return as separate, transactional workflows.

# Objective

Deliver production-grade purchasing with Decimal totals, partial receiving/invoicing, inventory and tile batch integration, immutable supplier payable effects, allocation-safe payments, auditable returns, idempotency, concurrency protection, and real management UI. Do not start sales/POS, customer payments, cash shifts, dashboard, reports, or later phases.

# Dependencies

- Verified Phase 6 inventory movement, balance, batch, idempotency, and concurrency primitives
- Verified Phase 7 supplier master and immutable signed supplier ledger
- Existing Phase 2 purchase, payment, and location relational foundations
- Authenticated company and active-branch authorization context
- PostgreSQL 17 development service

# Expected Files To Change

- Additive Phase 8 Prisma migration and purchase-domain relations/constraints
- Purchasing API module, DTOs, services, controllers, and integration tests
- Reusable inventory transaction boundary for purchase receipt/return posting
- Permission catalog and idempotent seed
- Real purchasing management UI under `apps/web/src/**`
- Database, inventory, permissions, decisions, and governance documentation

# Acceptance Criteria

- PO lifecycle and concurrency-safe company numbering work without stock/payable effects.
- Posted receipts atomically create receipt lines, batch identities, inventory movements/balances, and audit records; partial and over-receipt rules are enforced.
- Posted supplier invoices use backend Decimal totals and atomically increase the immutable supplier ledger.
- Supplier payments and allocations atomically reduce payable; over-allocation is rejected and unapplied advance is explicit.
- Purchase returns atomically reverse correct receipt inventory/batch and create a financial ledger reduction only for legitimately invoiced goods.
- Critical posts are idempotent, concurrency-safe, tenant/location/permission scoped, searchable, and exposed through real UI.

# Verification Required

- Phase 8 integration tests for lifecycle, partials, conversion, batch, inventory/ledger invariants, returns, idempotency, concurrency, isolation, permissions, and Decimal precision
- Migration SQL inspection/application/status plus clean replay and zero drift
- Permission seed idempotency, Swagger, and live browser workflows
- Prisma checks, repository lint/typecheck/tests/builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — Phase 8 is implemented, migration-replayed, database/API/browser verified, and all repository gates pass. No Critical/High purchasing blocker remains.

# Blockers

None. `BUG-008` remains a low-severity deferred pg@9 compatibility warning on the pinned pg 8 runtime.

# Next Approved Task

Phase 9 — implement the cashier-optimized POS and sales workflow: product search/cart, draft/hold/resume, atomic sale completion, authoritative pricing/discount/tax calculation, stock deduction, invoice creation, and concurrent overselling protection. Phase 10 payment/return scope remains deferred.
