# Current Phase

Phase 10 — Payments, Dues, Returns, Refunds, and Exchange

# Current Task

Implement and verify split sale settlement, customer receivable collection/allocation, immutable sale returns, refunds, exchange composition, and controlled completed-sale reversal.

# Objective

Extend the verified Phase 9 sale aggregate without mutating completed history. All collection, return, refund, exchange, inventory, customer-ledger, payment, allocation, audit, idempotency, and concurrency effects must post atomically through the existing journals and company/branch authorization boundaries. Do not start Phase 11 cash shifts/expenses or later work.

# Dependencies

- Verified Phase 7 signed immutable customer ledger and credit-limit rules
- Verified Phase 8 payment/allocation, numbering, idempotency, and locking patterns
- Verified Phase 9 Decimal pricing snapshots, sale completion, inventory deduction, and immutable completed invoices
- Existing Payment, PaymentMethod, SalePayment, inventory movement/balance, audit, and active-branch foundations
- PostgreSQL 17 development service

# Expected Files To Change

- Additive Phase 10 Prisma migration and generated return/refund/exchange constraints
- Sales DTOs, controller/service workflows, critical integration tests, and permission catalog
- Phase 10 sales/customer UI using real APIs
- Sales, database, inventory, permissions, decisions, security, API, and governance documentation

# Acceptance Criteria

- Split configured-method payments settle a sale deterministically while due remains a receivable, never a fake payment method.
- Customer collections allocate safely to invoice outstanding and may leave an explicit customer advance; customer balance remains the sum of immutable ledger entries.
- Full/partial returns reference original sale items, use original conversion and financial snapshots, restore only the exact batch when restockable, and cannot exceed sold quantity.
- Return credits reduce customer receivable before producing refundable/advance value; refunds cannot exceed unrefunded credit and remain separate outbound payments.
- Exchange atomically links a return and a new sale, reuses the existing sale engine, settles the difference, and never rewrites the original invoice.
- Critical posts are company-scoped, permission-protected, idempotent, concurrency-safe, audited, and exposed through real paginated/detail UI.

# Verification Required

- Phase 10 integration tests for split settlement, collections/allocation/advance, full/partial/batch returns, refund limits, exchanges/reversal, immutability, tenant isolation, permissions, idempotency, and concurrency
- Migration SQL inspection/application/status plus clean replay and zero drift
- Inventory and customer-ledger reconciliation invariants
- Permission/bootstrap idempotency, Swagger, and required production browser workflows with a clean console
- Prisma checks, repository lint/typecheck/tests/builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — Phase 10 is implemented and verified. All required database, API, security, concurrency, financial/inventory invariant, UI, production build, migration replay/drift, seed, Swagger, and production browser gates pass. No Phase 11 work has started.

# Blockers

None. `BUG-008` remains a low-severity deferred pg@9 compatibility warning on the pinned pg 8 runtime.

# Next Approved Task

Phase 11 — implement cash-shift open/close and reconciliation, cash movement integration for sale/refund/supplier-payment events, and expense categories/expenses according to `PROJECT_PLAN.md`. Read governance and relevant cash/payment models before changing code.
