# Current Phase

Approved V1 UI Redesign — Stage 10 Dashboard and Reports

# Current Task

Redesign the verified Phase 12 Dashboard and Reports frontend into route-addressable, light-first operational reporting workspaces while preserving all existing reporting definitions and permissions.

# Objective

Deliver an operational Dashboard plus Sales, Products/Tiles, Inventory, Purchasing, Customer, Supplier, Expense, Cash, and Financial Summary reports using real APIs and backend-authoritative Decimal values.

# Dependencies

- Verified Stage 9 commit `861c27f22cdccaf1c098f752c32515844d4f4b55`
- Approved Stage 1 light design system and Stage 2 route-addressable application shell
- Stage 3 POS, Stage 4 Sale Detail, Stage 6 Inventory, Stage 7 Purchasing, Stage 8 Parties, and Stage 9 Cash/Expense patterns
- Verified Phase 12 reporting, timezone, export, permission, and tenant/branch-isolation behavior
- Existing Phase 6–11 transaction sources and historical snapshots
- Existing production-rollout and UI-audit artifacts remain preserved

# Expected Files To Change

- `apps/web/src/app/app/dashboard/*`
- `apps/web/src/app/app/reports/*`
- `apps/web/src/features/reporting/*`
- Focused reporting presentation and route tests
- Governance documentation

# Acceptance Criteria

- Dashboard and every approved report are route-addressable, permission-aware, bounded, responsive, and backed by real APIs.
- KPI, sales, return/void, cost/profit, inventory, purchasing, party-ledger, expense, cash, and financial-summary semantics remain backend authoritative.
- Profit values and navigation are absent for users without `report.view_profit`.
- Date filters preserve company-timezone behavior and the server's 366-day limit; branch context remains enforced.
- Server CSV export preserves active filters and permissions.
- No backend report definition, Prisma schema, migration, API contract, authentication, RBAC, or transaction behavior is changed.

# Verification Required

- Web and shared UI tests
- Monorepo lint and strict TypeScript
- Prettier and `git diff --check`
- API and Next.js production builds
- Phase 12 reporting regression including timezone, permissions, and CSV exports
- Relevant Phase 6–11 source-data regression and API/database reconciliation
- Production-browser dashboard/report, permission, export, responsive, and clean-console workflows
- Secret scan and forbidden backend/schema/migration/API-contract diff review

# Status

PASS (2026-09-13). The Dashboard and nine route-addressable report workspaces use the verified Phase 12 APIs, explicit domain columns, backend-authoritative Decimal values, bounded pagination, company-timezone/date filters, server CSV exports, and permission-aware navigation. Production-browser acceptance, responsive checks, clean-console inspection, database reconciliation, reporting/source-data regressions, builds, lint, typecheck, formatting, and security checks pass. No backend report definition, API contract, Prisma schema, migration, authentication, RBAC, or transaction behavior changed.

# Blockers

- No Critical/High blocker invalidates Stage 10.
- `BUG-039` remains a separately documented Medium pre-existing Purchasing payment-list issue. It did not block the Stage 10 purchasing report and received no out-of-scope change.
- Pre-existing untracked production-rollout and UI-audit artifacts remain untouched.

# Next Approved Task

Stage 11 — Administration and Settings. Not started; explicit approval is required.
