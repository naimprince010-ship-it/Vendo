# Current Phase

Phase 9 — POS and Sales

# Current Task

Implement and verify cashier POS search/cart, draft/hold/resume, and atomic sale completion through inventory, payment, customer receivable, invoice, and audit journals.

# Objective

Deliver a production-grade cashier workflow with fast indexed product/barcode search, explicit tile unit/batch selection, retail/wholesale pricing, permissioned fixed discounts and price overrides, safe customer credit, minimal sale-time settlement, and all-or-nothing stock/payment/receivable posting. Do not start due collection, returns/refunds/exchanges, cash shifts, expenses, dashboard, reports, or later phases.

# Dependencies

- Verified Phase 5 indexed catalog, direct unit conversions, barcodes, and unit pricing
- Verified Phase 6 stock movement, balance, batch, negative-stock, idempotency, and locking primitives
- Verified Phase 7 customers, walk-in policy, credit limits, and immutable customer ledger
- Verified Phase 8 transaction-owned inventory integration, document sequencing, and idempotency patterns
- Existing Sale, SaleItem, SalePayment, Payment, Register, Warehouse, and active-branch foundations
- PostgreSQL 17 development service

# Expected Files To Change

- Additive Phase 9 Prisma migration and sale lifecycle/snapshot/idempotency constraints
- Sales/POS API module, DTOs, service, controller, and critical integration tests
- Reusable inventory transaction boundary for sale deduction
- Central permission catalog and idempotent seed
- Desktop-first authenticated POS and sales-history UI under `apps/web/src/**`
- Sales, database, inventory, permissions, decisions, and governance documentation

# Acceptance Criteria

- Draft/held sales have no physical or financial effects and are revalidated at completion.
- Completed sales bind an active company branch, register, warehouse, customer, products, units, and explicit batch positions.
- Backend-authoritative Decimal pricing, fixed discounts, tax, minimum price, settlement, change, and credit limits are enforced.
- One transaction creates the immutable completed sale/items, inbound payment/allocation, unpaid customer receivable, inventory movements/balances, and audit history.
- Duplicate completion and simultaneous overselling are safe; walk-in due is rejected and fully paid sales create no receivable.
- POS search, barcode handling, hold/resume, receipt-ready detail, and sales history are real, paginated, secured workflows.

# Verification Required

- Phase 9 integration tests for POS search, pricing, conversion, batch, discounts/override, credit, settlement, atomicity, idempotency, overselling, isolation, permissions, and immutability
- Migration SQL inspection/application/status plus clean replay and zero drift
- Permission seed idempotency, Swagger, and live browser workflows
- Prisma checks, repository lint/typecheck/tests/builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — Phase 9 implementation, 11-migration replay/parity, 66 API tests, 20/20 uncached repository tasks, production builds, Swagger, bootstrap idempotency, secret scan, live production API verification, and the complete production browser workflow all pass. The browser verified tile and sanitary barcode entry, BOX unit conversion, exact batch/shade, hold/resume, BDT 150 cash change, invoice/history, stock deduction, and a named-customer BDT 300 credit receivable with a clean console.

# Blockers

None for Phase 9. `BUG-019` is resolved after the Codex browser-control runtime initialized successfully and the required workflow passed. `BUG-008` remains a low-severity deferred pg@9 compatibility warning on the pinned pg 8 runtime.

# Next Approved Task

Phase 10 — implement split payments, customer due collection, full and partial sale returns, refunds, and exchange workflows using immutable reversals and the verified Phase 9 sale foundation. Phase 10 has not started.
