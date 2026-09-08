# Current Phase

Phase 11 — Cash Shifts and Expenses

# Current Task

Phase 11 gate completed: register cash shifts, drawer movements, transaction integrations, expenses, reconciliation, browser workflows, and production verification are implemented and verified.

# Objective

Extend the verified Phase 8–10 payment workflows with one auditable physical drawer authority. Require an active register shift for drawer-based cash events, derive expected cash from immutable signed movements, close shifts with preserved actual/variance snapshots, and keep non-cash transactions outside the drawer ledger. Do not start Phase 12 dashboard, reports, or receipt work.

# Dependencies

- Verified Phase 4 company, branch, register, access, and audit foundations
- Verified Phase 8 supplier payment and configured payment-method workflows
- Verified Phase 9 split settlement, cash tender/change, and atomic sale completion
- Verified Phase 10 customer collection and refund workflows
- Existing Decimal `CashShift`, `CashMovement`, `ExpenseCategory`, and `Expense` database foundations
- PostgreSQL 17 development service

# Expected Files To Change

- Additive Phase 11 Prisma migration and generated cash/expense constraints
- Cash/expense module, DTOs, controller/service, integrations, permission catalog, and critical tests
- Sale and purchasing DTO/service integration for register-bound cash movements
- Real Phase 11 cash-shift and expense UI plus POS shift status integration
- Cash/database/permissions/decisions/security/API and governance documentation

# Acceptance Criteria

- Exactly one open shift exists per active register; concurrent opens and close-vs-post races are deterministic.
- Opening cash and every eligible business/manual drawer event produce one immutable Decimal movement; non-cash events produce none.
- Cash sale movement uses the applied cash amount, never tendered cash or change as revenue.
- Cash collections, supplier payments, refunds, and expenses require an active shift and post their business and drawer records atomically.
- Expected cash is derived from opening plus signed movement categories; close stores actual and variance without falsifying history.
- Posted expenses and closed shifts are immutable; company/branch/register/permission boundaries, idempotency, source uniqueness, audit, history, and real UI are verified.

# Verification Required

- Phase 11 API/integration/concurrency tests and cash/source invariants
- Migration SQL inspection/application/status plus clean replay and zero drift
- Inventory and customer-ledger reconciliation invariants
- Permission/bootstrap idempotency, Swagger, and required production browser workflows with a clean console
- Prisma checks, repository lint/typecheck/tests/builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — the Phase 11 migration, API, permissions, frontend, integrations, automated tests, database replay/catalog checks, production builds, and interactive production browser gate all pass. Phase 12 has not started.

# Blockers

None. `BUG-008` remains a low-severity deferred pg@9 compatibility warning on the pinned pg 8 runtime.

# Next Approved Task

Phase 12 — build the real-data operational dashboard, accurate sales/tile/inventory/purchasing/customer/finance reports, and printable thermal/full-page receipts using implemented transaction data; begin by rereading governance and the relevant reporting/financial designs.
