# Current Phase

Approved V1 UI Redesign — Stage 8 Customers and Suppliers

# Current Task

Redesign the verified Phase 7 Customers and Suppliers frontend into route-addressable, light-first party and immutable-ledger workspaces while preserving every existing party, ledger, sales, and purchasing contract.

# Objective

Deliver Customer Groups, Customers, Walk-in protection, credit limits, opening/correction workflows, customer receivable/advance context, Suppliers, supplier payable/advance context, immutable ledgers, and related Sales/Purchasing navigation using real APIs and backend-authoritative Decimal balances.

# Dependencies

- Verified Stage 7 commit `f24ce190b4ab8012b3599962cd0c4e629a869f87`
- Approved Stage 1 light design system and Stage 2 route-addressable application shell
- Stage 4 Sale Detail and Stage 7 Purchasing document/navigation patterns
- Verified Phase 7 party lifecycle, walk-in, immutable ledgers, idempotency, concurrency, permissions, and tenant isolation
- Existing Phase 8 supplier and Phase 9/10 customer transaction integrations
- Existing production-rollout and UI-audit artifacts remain preserved

# Expected Files To Change

- `apps/web/src/app/app/parties-console.tsx`
- `apps/web/src/features/parties/*`
- Focused party/ledger presentation tests
- Governance documentation

# Acceptance Criteria

- Customers, Customer Groups, Customer Detail, Suppliers, and Supplier Detail are route-addressable and bounded.
- Customer and supplier lists use real server-side search, active-state filtering, and pagination.
- Walk-in is unmistakably identified and exposes no misleading identity/status actions.
- Positive customer balance is presented as receivable; negative as customer advance. Positive supplier balance is payable; negative as supplier advance.
- Credit-limit, opening-balance, correction, adjustment, and lifecycle actions are permission-aware and deliberately reviewed.
- Immutable ledger history presents backend debit/credit/running-balance values without edit/delete controls.
- Related sales and purchasing navigation reuses existing routes without duplicating those modules.
- No backend party/ledger rule, Prisma schema, migration, API contract, authentication, RBAC, sales, purchasing, inventory, cash, or reporting behavior is changed.

# Verification Required

- Web and shared UI tests
- Monorepo lint and strict TypeScript
- Prettier and `git diff --check`
- Next.js production build
- Phase 7 party/ledger regression including walk-in, permissions, idempotency, and concurrency
- Phase 9/10 customer integration and Phase 8 supplier integration regressions
- Production-browser customer, walk-in, opening/correction, credit-limit, supplier, ledger, responsive, and clean-console workflows
- API/database reconciliation, secret scan, and forbidden backend/schema/migration/API-contract diff review

# Status

PASS (2026-09-13). The Stage 8 route-addressable party workspace, exact Decimal presentation helpers, permission-aware lifecycle and financial actions, focused tests, production-browser workflows, and API/database reconciliation are complete. `BUG-038` is resolved by deterministic `effectiveAt DESC, createdAt DESC, id DESC` ledger ordering with no schema, migration, API-shape, sign-convention, posting, idempotency, or immutability change.

# Blockers

- No Critical/High application blocker remains for Stage 8. `BUG-038` is resolved and covered by same-effective-date customer/supplier ordering, running-balance, pagination-stability, final-balance, and immutability regression checks.
- The approved Figma file currently exposes only the shared design-system cover and no dedicated Customers/Suppliers frames, so the accepted light-first system and established list/detail patterns govern this stage.
- Pre-existing untracked production-rollout and UI-audit artifacts must remain untouched.

# Next Approved Task

STOP after the verified Stage 8 commit and push. Stage 9 Cash and Expenses requires explicit approval and has not started.
