# Current Phase

Phase 7 — Customers and Suppliers

# Current Task

Implement and verify company-scoped customer groups, customers, the protected walk-in customer, suppliers, and immutable opening-balance/ledger foundations.

# Objective

Deliver production-grade customer and supplier master data with permission enforcement, tenant isolation, search, lifecycle controls, deterministic ledger-derived balances, audited opening-balance correction, and real management UI. Do not start purchasing, sales/POS, payments, returns, cash, reports, or later phases.

# Dependencies

- Verified Phase 6 inventory and batch/lot/shade foundation
- Phase 2 customer, supplier, payment, audit, and monetary schema foundation
- Phase 3 authenticated company context and permission enforcement
- Phase 4 branch context for optional future transaction-origin attribution
- PostgreSQL 17 development service

# Expected Files To Change

- Additive Phase 7 Prisma migration and schema relations
- Customer/supplier API modules, DTOs, services, controllers, and tests
- Central permission catalog and bootstrap behavior
- Real customer/supplier management UI under `apps/web/src/**`
- Database, permissions, decisions, security, and governance documentation

# Acceptance Criteria

- Customer groups, customers, and suppliers provide company-scoped CRUD lifecycle and paginated search.
- Every company has exactly one protected, idempotently provisioned walk-in customer.
- Credit limits use Decimal and changes require the dedicated permission and audit trail.
- Customer and supplier opening balances and corrections post immutable, idempotent ledger entries transactionally.
- Current balances and history are derived from ledger entries with documented signed conventions; no editable balance counter is authoritative.
- Tenant isolation, permission enforcement, audit behavior, Decimal precision, and honest Phase 7 UI are verified.

# Verification Required

- Phase 7 API/integration tests including lifecycle, search, walk-in, idempotency, correction, precision, isolation, and permissions
- Migration SQL inspection/application/status plus clean replay and zero drift
- Permission seed idempotency, Swagger, and live browser workflows
- Prisma checks, repository lint/typecheck/tests/builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — Phase 7 gate passed on 2026-09-06. Customer groups, protected company-local walk-in customers, customer/supplier masters, Decimal credit foundation, immutable signed ledgers, idempotent opening/correction/adjustment posting, secured APIs, real UI, migrations, concurrency, builds, and browser workflows are verified.

# Blockers

None. `BUG-010` and `BUG-011` were resolved before the gate. `BUG-008` remains a low-severity deferred pg@9 compatibility warning on the pinned pg 8 runtime.

# Next Approved Task

Phase 8 — Purchasing and Supplier Dues. Begin by rereading governance, database, inventory, unit-conversion, permission, and Phase 7 supplier-ledger documentation; implement purchase order → goods receipt → supplier invoice → payment/return only according to the approved Phase 8 plan.
