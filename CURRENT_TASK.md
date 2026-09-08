# Current Phase

Phase 12 — Dashboard, Reports, and Receipts

# Current Task

Phase 12 gate is complete. Prepare to begin the Phase 13 audit, security, critical testing, and production-readiness review without changing Phase 12 financial definitions.

# Objective

Build accurate company/branch-scoped reporting from the immutable sales, returns, inventory, purchasing, party-ledger, expense, and cash records delivered in Phases 6–11. Add thermal receipt and A4 invoice views that preserve historical sale snapshots. Do not start Phase 13 production-hardening work.

# Dependencies

- Verified Phase 6 inventory ledger and authoritative base-quantity architecture
- Verified Phase 8 supplier payment and configured payment-method workflows
- Verified Phase 9 atomic sales and payment snapshots
- Verified Phase 10 returns, refunds, customer collections, and invoice-outstanding logic
- Verified Phase 11 cash shifts, immutable cash movements, and expenses
- Existing authenticated company, branch, permission, audit, and Decimal foundations

# Expected Files To Change

- Additive Prisma migration for any required immutable sale-line display snapshots
- Reporting API module, DTOs, services, controllers, exports, permissions, and tests
- Real dashboard and report frontend consoles
- Thermal receipt and A4 invoice presentation and print styling
- Database, architecture, permissions, API, decisions, and governance documentation

# Acceptance Criteria

- Dashboard and reports use only real database records and enforce tenant, branch, permission, date, timezone, pagination, and Decimal rules.
- Sales metrics distinguish gross sales, return/void credits, net sales, collections, refunds, tax, cost, and gross profit without double counting.
- Inventory, purchasing, customer, supplier, expense, cash, and financial summaries reconcile with their authoritative ledgers.
- Tile reports display useful Box/PCS/Sq.ft/Sq.m equivalents without creating independent inventory quantities.
- Thermal and A4 documents use immutable transaction snapshots, expose payment/due/return state, and print cleanly.
- Relevant CSV exports, audit/security boundaries, automated checks, browser workflows, and production builds pass.

# Verification Required

- Phase 12 API/integration tests for financial definitions, return/void treatment, timezone boundaries, permissions, tenant isolation, exports, and invoice snapshots
- Migration SQL inspection/application/status plus clean replay and zero drift if a migration is added
- Inventory, customer/supplier ledger, and cash reconciliation checks
- Permission/bootstrap idempotency, Swagger, production browser dashboards/reports/print views, and clean console
- Prisma checks, repository lint/typecheck/tests/builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — Phase 12 implementation, migration, automated checks, production builds, report reconciliation, printable-document inspection, production browser workflows, and clean-console verification all pass.

# Blockers

None. `BUG-008` remains a low-severity deferred pg@9 compatibility warning on the pinned pg 8 runtime.

# Next Approved Task

Phase 13 — begin with the module-by-module audit-trail and security threat review, then define the remaining critical end-to-end and production-readiness gaps before making implementation changes.
