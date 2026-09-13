# Current Phase

Approved V1 UI Redesign — Stage 9 Cash and Expenses

# Current Task

Redesign the verified Phase 11 Cash and Expenses frontend into route-addressable, light-first operational and historical workspaces while preserving all existing cash-journal and expense rules.

# Objective

Deliver Current Shift, Shift History and Detail, immutable Cash Movements, Cash In/Out, Expense Categories, Expenses, controlled Expense Reversal, and clear cash-versus-non-cash semantics using real APIs and backend-authoritative Decimal values.

# Dependencies

- Verified Stage 8 commit `70de821cc0fbb3645e2dbd5b78dcd8ceceda40bb`
- Approved Stage 1 light design system and Stage 2 route-addressable application shell
- Stage 3 POS context, Stage 4 Sale Detail patterns, and Stage 7/8 financial-document patterns
- Verified Phase 11 cash-shift, movement, expense, reversal, idempotency, concurrency, permission, and isolation behavior
- Existing Phase 8 supplier-payment and Phase 9/10 sales, collection, and refund integrations
- Existing production-rollout and UI-audit artifacts remain preserved

# Expected Files To Change

- `apps/web/src/app/app/cash/*`
- `apps/web/src/app/app/expenses/*`
- `apps/web/src/features/cash/*`
- `apps/web/src/features/expenses/*`
- Focused cash/expense presentation and interaction tests
- Governance documentation

# Acceptance Criteria

- Current Shift, Shift History/Detail, Cash Movements, Expenses, and Expense Categories are route-addressable and bounded.
- Opening cash is clearly starting drawer balance, not income, and Expected Cash is presented from backend-authoritative summaries.
- Actual Cash and `Actual - Expected` variance are handled only through deliberate close-shift review.
- Cash In/Out, expense posting, expense reversal, and shift lifecycle actions are permission-aware, idempotent, and deliberately confirmed.
- Cash versus non-cash sale, collection, supplier-payment, refund, and expense effects remain truthful and traceable.
- Immutable movement and posted-expense history exposes no edit/delete controls.
- No backend cash/accounting rule, Prisma schema, migration, API contract, authentication, RBAC, sales, purchasing, inventory, or reporting behavior is changed.

# Verification Required

- Web and shared UI tests
- Monorepo lint and strict TypeScript
- Prettier and `git diff --check`
- API and Next.js production builds
- Phase 11 cash/expense regression including concurrency, idempotency, permissions, and source uniqueness
- Relevant Phase 9/10 cash integration and Phase 8 supplier-payment regression
- Production-browser shift, cash integration, expense, reversal, close, responsive, and clean-console workflows
- API/database reconciliation, secret scan, and forbidden backend/schema/migration/API-contract diff review

# Status

PASS (2026-09-13). Stage 9 Cash and Expenses is implemented, browser-accepted, reconciled against PostgreSQL, regression-tested, and production-built without changing backend cash/accounting rules, Prisma, migrations, or API contracts.

# Blockers

- No Stage 9 blocker remains.
- `BUG-039` is a separately documented pre-existing Purchasing payment-list query/projection issue. It does not affect the verified Cash/Expenses routes or authoritative cash integrations and was not changed in this stage.
- Pre-existing untracked production-rollout and UI-audit artifacts remain untouched.

# Next Approved Task

Stage 10 Dashboard and Reports is the next planned task, but it is not approved and must not start until explicitly authorized.
