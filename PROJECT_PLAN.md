# Vendo — Tiles + Sanitary POS Project Plan

Checkboxes are marked complete only after implementation and verification. Phase gates record the exact evidence used.

## Phase 1 — Repository, Architecture, and Foundation

- [x] Inspect local and remote repositories
- [x] Connect GitHub remote
- [x] Establish governed monorepo
- [x] Scaffold Next.js frontend
- [x] Scaffold NestJS REST API with Swagger
- [x] Add shared TypeScript packages
- [x] Add PostgreSQL and Docker Compose development environment
- [x] Add lint, format, typecheck, test, and build workflows
- [x] Add CI and environment templates
- [x] Complete Phase 1 gate

## Phase 2 — Database Foundation

- [x] Finalize relational model and invariants
- [x] Configure Prisma and PostgreSQL
- [x] Create initial migration
- [x] Add seed architecture for development/test only
- [x] Verify constraints, indexes, migration, and client generation
- [x] Complete Phase 2 gate

## Phase 3 — Authentication, Users, Roles, and Permissions

- [x] Authentication and secure session lifecycle
- [x] Password reset architecture and abuse controls
- [x] Users and employees
- [x] Permission-based RBAC enforced by API
- [x] Authentication and authorization tests
- [x] Complete Phase 3 gate

## Phase 4 — Company, Branch, Warehouse, and Register

- [x] Company profile and settings
- [x] Branches and user branch access
- [x] Warehouses
- [x] POS register foundation (cash shifts and cash movements remain Phase 11)
- [x] Location-context authorization tests
- [x] Complete Phase 4 gate

## Phase 5 — Catalog, Units, Tile Domain, and Pricing

- [x] Categories, subcategories, brands, and manufacturers
- [x] Reusable product catalog and searchable barcodes
- [x] Units and backend-validated conversions
- [x] Tile and sanitary profiles
- [x] Unit-specific product pricing
- [x] Catalog, conversion, and pricing tests
- [x] Complete Phase 5 gate

## Phase 6 — Inventory and Batch/Lot/Shade

- [x] Auditable inventory movement ledger
- [x] Transactional inventory balances and stock policy
- [x] Optional product batch, lot, and shade tracking
- [x] Adjustments, damage, loss, counts, and reconciliation
- [x] Warehouse and branch transfers
- [x] Concurrency and inventory invariant tests
- [x] Complete Phase 6 gate

## Phase 7 — Customers and Suppliers

- [x] Customers, groups, walk-in customer, credit limits
- [x] Suppliers
- [x] Customer and supplier ledger foundation
- [x] Complete Phase 7 gate

## Phase 8 — Purchasing and Supplier Dues

- [x] Purchase orders and partial receiving
- [x] Goods receipts with tile batch/shade
- [x] Supplier invoices and additional costs
- [x] Supplier payments, dues, and returns
- [x] Purchasing workflow tests
- [x] Complete Phase 8 gate

## Phase 9 — POS and Sales

- [x] Cashier-optimized product search and cart
- [x] Draft, hold, and resume sales
- [x] Atomic sale completion workflow
- [x] Stock deduction, pricing, discounts, tax, and invoice
- [x] Critical sale and concurrent overselling tests
- [x] Complete Phase 9 gate

## Phase 10 — Payments, Dues, Returns, Refunds, and Exchange

- [x] Split payments and change calculation
- [x] Customer credit and due collection
- [x] Full and partial returns
- [x] Refund and exchange workflows
- [x] Reversal and ledger tests
- [x] Complete Phase 10 gate

Gate evidence: 12-migration clean replay with normalized live/replay schema equality, 88-permission seed idempotency, 119-path Swagger verification, 12 API suites/75 tests, uncached 5-package lint/typecheck/build gates, Prisma/format/Compose/security/Git checks, and production browser collection/partial exact-batch return/fully-paid refund/exchange/inventory/ledger/clean-console workflows.

## Phase 11 — Cash Shifts and Expenses

- [x] Shift open/close and reconciliation
- [x] Cash movements
- [x] Expense categories and expenses
- [x] Complete Phase 11 gate

Gate evidence: additive 13th migration with clean replay/live schema equality, 98-permission seed idempotency, 132-path Swagger verification, 13 API suites/80 tests, uncached 5-package lint/typecheck/test/build gates, Prisma/format/Compose/security/Git checks, and production browser shift/sale/collection/expense/refund/close/variance/clean-console workflows.

## Phase 12 — Dashboard, Reports, and Receipts

- [x] Real-data operational dashboard
- [x] Sales, tile, inventory, purchasing, customer, and finance reports
- [x] Thermal and full-page printable receipts/invoices
- [x] Accuracy and query-performance verification
- [x] Complete Phase 12 gate

## Phase 13 — Audit, Security, Testing, and Production Readiness

- [x] Critical action audit trail
- [x] Security hardening and threat review
- [x] File and input validation
- [x] End-to-end critical workflow suite
- [x] Production Docker and deployment documentation
- [x] Final migration and backup/restore verification
- [x] Final module-by-module production review
- [x] Complete Phase 13 gate

## Approved V1 UI Redesign — Stage 1 Foundation

- [x] Establish approved light-first semantic tokens and Geist typography
- [x] Add source-owned reusable UI primitives in `packages/ui`
- [x] Add focused component tests and preserve the legacy `StatusBadge` import
- [x] Pass frozen install, formatting, lint, strict TypeScript, UI build, and Next.js production build
- [x] Pass interactive production-browser smoke and clean-console verification
- [x] Conditionally accept Stage 1 on the complete non-browser gate

Current gate status: **PASS (2026-09-10)** — the previously deferred interactive production-browser smoke now passes with authenticated rendering, Geist/light semantic styling, responsive shell behavior, visible focus treatment, representative primitives, and a clean browser console. `BUG-029` is resolved.

## Approved V1 UI Redesign — Stage 2 Application Shell and Routing

- [x] Add authenticated light-first application shell
- [x] Add scalable, permission-aware sidebar and header
- [x] Centralize company/branch context without weakening API authorization
- [x] Add route-addressable module navigation while preserving `/app`
- [x] Pass available Stage 2 automated and HTTP gates
- [x] Pass interactive browser acceptance after `BUG-029` recovery
- [x] Complete Stage 2 gate

Current gate status: **PASS (2026-09-10)**. Authenticated route navigation, `/app` compatibility, permission-aware navigation, branch context, 1440/1280/mobile responsive behavior, representative existing modules, session restoration/sign-out, API readiness, HTTP routes, and the clean-console gate pass. Browser acceptance found and resolved the expanded-label, Suppliers default-tab, mobile drawer lifecycle, and compact-link accessibility defects recorded in `BUG-030`.

## Approved V1 UI Redesign — Stage 3 POS Cashier Workspace

- [x] Add characterization coverage for POS display helpers and preserve request payloads
- [x] Refactor the cashier workspace into focused product, cart, context, payment, and held-sale presentation components
- [x] Implement approved light-first 1440 × 900 and compact 1280 × 720 layouts
- [x] Preserve scanner focus, tile conversion, exact batch/shade, pricing, discounts, hold/resume, split payment, tender/change, due, and idempotent completion behavior
- [x] Pass affected Phase 9/10 regressions, frontend gates, production browser workflow, clean console, and Figma comparison
- [x] Complete Stage 3 gate

Current gate status: **PASS (2026-09-10)**. Stage 3 is complete within the approved POS cashier scope; backend/API/database behavior was not redesigned, and Stage 4 sale-detail redesign has not started.

### Stage 3 Gate — PASS (2026-09-10)

- Decimal-safe POS display helpers and focused web tests: PASS (5/5 web tests, including tile conversion and split-payment preview)
- Existing Phase 9 and Phase 10 API regression suites: PASS (2 suites, 14/14 tests)
- Web formatting, ESLint, strict TypeScript, production build, route generation, and Git whitespace checks: PASS
- Production API readiness and `/login`/`/app` HTTP smoke: PASS
- Interactive production workflow: PASS (exact tile and sanitary barcodes, BOX/PCS/SQFT, exact batch/shade, named customer, pricing, invoice discount, hold/resume, split payment, cash tender/change, due, completion, invoice history, and inventory deduction)
- Approved 1440 × 900 expanded-shell and 1280 × 720 compact-shell layouts: PASS with no horizontal page overflow
- Browser console: PASS (no errors, warnings, hydration failures, React errors, or missing asset/style reports)
- Backend, Prisma schema, and API contract diff: PASS (no changes)
- Browser-discovered `BUG-031` and `BUG-032`: resolved before the final gate

## Approved V1 UI Redesign — Stage 4 Sale Detail and Post-Sale Workflows

- [x] Add route-addressable sale history and sale-detail workspaces
- [x] Present immutable sale, tile, batch/shade, price, discount, tax, and payment snapshots
- [x] Present backend-derived outstanding, financial summary, and chronological transaction history
- [x] Move collection, return, refund, exchange, and void workflows out of POS into deliberate dialogs
- [x] Preserve permission visibility, idempotency, inventory restoration, customer-ledger, and immutable-sale behavior
- [x] Preserve thermal/A4 print access and add bidirectional linked-exchange navigation
- [x] Pass affected Phase 9/10 regressions, frontend gates, production browser workflows, responsive review, and clean console
- [x] Complete Stage 4 gate

Current gate status: **PASS (2026-09-11)**. Stage 4 is complete within the approved sale-detail and post-sale scope; backend/API/database behavior was not redesigned, and Stage 5 catalog redesign has not started.

### Stage 4 Gate — PASS (2026-09-11)

- Decimal-safe sale finance presentation helpers and focused web tests: PASS (8/8 web tests overall)
- Existing Phase 9 and Phase 10 API regression suites: PASS (2 suites, 14/14 tests)
- Web formatting, warning-free ESLint, strict TypeScript, production build, 18-route generation, and Git whitespace checks: PASS
- Interactive production workflows: PASS (partial collection, persisted ledger/outstanding, exact-batch tile return, paid return/refund, atomic exchange with linked invoices and settlement difference, compensating void, and print/reprint access)
- Inventory and customer-ledger checks: PASS (exact UAT batch/shade reconciled; immutable collection/return/refund/exchange/void ledger entries visible)
- Approved 1440 × 900 and 1280 × 720 layouts: PASS with readable stacked content and no observed whole-page horizontal overflow
- Browser console: PASS (no errors, warnings, hydration failures, React errors, or missing asset/style reports)
- Backend, Prisma schema, migration, and API contract diff: PASS (no changes)
- Browser-discovered `BUG-033`: resolved before the final gate

## Approved V1 UI Redesign — Stage 5 Catalog

- [x] Split catalog navigation into route-addressable product and master-data workspaces
- [x] Build server-side product search, filters, pagination, and barcode lookup
- [x] Build adaptive TILE, SANITARY, ACCESSORY, and GENERAL product creation/editing
- [x] Present tile dimensions, commercial coverage, direct-to-base conversions, prices, and barcodes coherently
- [x] Preserve product lifecycle, permissions, tenant isolation, and unsaved-change protection
- [x] Preserve backend/API/database contracts and avoid fake inventory state
- [x] Pass full regressions, frontend gates, production browser workflows, responsive review, and clean console
- [x] Complete Stage 5 gate

Current gate status: **PASS (2026-09-12)**. Stage 5 is complete within the approved catalog scope; backend/API/database behavior was not redesigned, and Stage 6 inventory redesign has not started.

### Stage 5 Gate — PASS (2026-09-12)

- Catalog presentation helpers and focused web tests: PASS (11/11 web tests overall)
- Full API regression suite: PASS (15 suites, 92/92 tests), including Phase 5 catalog integration
- Shared UI regression suite: PASS (5/5 tests)
- Monorepo formatting, lint, strict TypeScript, production builds, and Git whitespace checks: PASS
- Interactive production workflows: PASS (product list/search/filter, adaptive create/edit, tile and general detail, conversion/price/barcode management, and master-data lifecycle)
- Approved 1440 × 900 and 1280 × 720 layouts: PASS with no observed whole-page horizontal overflow
- Browser console: PASS (no errors, warnings, hydration failures, React errors, or missing asset/style reports)
- Backend, Prisma schema, migration, and API contract diff: PASS (no changes)
- Secret scan: PASS for the Stage 5 change set
- No new Critical/High blocker remains; existing Low deferred `BUG-008` is unchanged

## Approved V1 UI Redesign — Stage 6 Inventory

- [x] Split Inventory into route-addressable overview, stock/detail, low-stock, batches, counts, transfers, and movements
- [x] Present one authoritative base quantity with backend-provided derived equivalents and exact batch/shade context
- [x] Build deliberate opening, adjustment, damage/loss, transfer, and reconciliation workflows against existing APIs
- [x] Preserve permission-aware actions, bounded queries, idempotency keys, Decimal-safe presentation, and backend authority
- [x] Pass web/UI tests, lint, strict TypeScript, formatting, production build, HTTP smoke, and affected Phase 6/8/9/10 regressions
- [x] Pass interactive production browser workflows, responsive checks, and clean-console inspection
- [x] Complete Stage 6 gate

Current gate status: **PASS (2026-09-12)**. Database reconciliation identified frontend form-state defect `BUG-035`, and follow-up acceptance identified physical-count zero-quantity defect `BUG-036`; both are resolved and covered by focused tests. Human Chrome acceptance completed every required Inventory workflow at 1440 × 900 and 1280 × 720 with a clean console. API/database reconciliation confirms the zero-count 1→0 result, exact movement history, and transfer pair. Codex browser automation remained unavailable under external tooling issue `BUG-034`, so the gate records human Chrome acceptance rather than a false automated-browser PASS. Stage 7 has not started.

### Stage 6 Gate — PASS (2026-09-12)

- Web tests: PASS (17/17, including synchronous base-unit form state, non-negative count validation, and friendly count errors)
- Shared UI tests: PASS (5/5)
- Phase 6 plus affected Phase 8/9/10 API regression: PASS (4 suites, 28/28 tests, including 9/9 Phase 6 tests)
- Monorepo lint and strict TypeScript: PASS (5/5 packages)
- Next.js production build: PASS (18 routes, including dynamic Inventory subroutes)
- API and Next.js production builds, Prisma validation/status, clean 16-migration replay, Prettier, Git whitespace, scoped secret scan, API health and Inventory HTTP route smoke: PASS
- Active environment identity/direct API/database reconciliation: PASS (one intended API/database; exact opening, adjustments, damage, count variance, transfer pair, conversion snapshots, actor/timestamps, and final balances verified)
- Zero-count validation/migration/UAT control: PASS (normal stock operations remain positive-only; count snapshot 1, counted 0, one −1 PCS reconciliation movement, final balance 0, idempotent retry, and clean 16-migration replay)
- Human Chrome Inventory workflows, responsive checks at 1440 × 900 and 1280 × 720, and console inspection: PASS
- Codex automated browser control: unavailable under external tooling issue `BUG-034`; not recorded as an application/browser PASS and does not invalidate the completed human acceptance

## Approved V1 UI Redesign — Stage 7 Purchasing

- [x] Split Purchasing into route-addressable Purchase Order, Goods Receipt, Supplier Invoice, Supplier Payment, and Purchase Return workspaces
- [x] Preserve backend-owned lifecycle, document numbering, Decimal totals, idempotency, concurrency, permissions, and company/branch isolation
- [x] Present partial receiving, explicit warehouse selection, direct conversion snapshots, and tile batch/lot/shade context
- [x] Present invoice draft/post, supplier allocation/advance, payable, and received-only versus invoiced return effects from real APIs
- [x] Add consistent document details, related-document navigation, reviewed high-risk dialogs, bounded search, and permission-aware actions
- [x] Pass web/UI tests, lint, strict TypeScript, formatting, production build, Phase 8 and Phase 6 regressions, secret scan, and Git whitespace checks
- [x] Pass production-browser purchasing workflows, responsive checks, clean-console inspection, and scoped API/database reconciliation
- [x] Complete Stage 7 gate

Current gate status: **PASS (2026-09-12)**. Stage 7 is complete within the approved Purchasing UI scope. The browser completed PO confirmation, two partial receipts with exact tile batch/shade, supplier invoice posting, partial allocation, received-only and invoiced returns, and related-document navigation. Scoped database reconciliation confirms the document, inventory, conversion, supplier-credit, and outstanding results. Backend APIs, Prisma schema, migrations, and business rules were not changed. Stage 8 has not started.

### Stage 7 Gate — PASS (2026-09-12)

- Web presentation tests and shared UI tests: PASS
- Phase 8 purchasing and Phase 6 inventory integration regressions: PASS
- Monorepo lint, strict TypeScript, formatting, Next.js production build, secret scan, and Git whitespace: PASS
- Production browser UAT: PASS (PO-000001, GR-000001/000002, PI-000001, SP-000001, PR-000001/000002)
- Partial receiving and exact tile conversion/batch/shade: PASS (4 BOX ordered, two 2 BOX receipts, factor 4, 16 PCS received)
- Received-only versus invoiced return semantics: PASS (zero financial credit versus BDT 1,250 supplier credit)
- Scoped inventory reconciliation: PASS (two +8 PCS receipts, two −4 PCS returns, final Stage 7 batch balance 8 PCS)
- Supplier invoice reconciliation: PASS (BDT 2,600 total, BDT 1,000 paid, BDT 1,250 credited, BDT 350 outstanding)
- Approved 1440 × 900 and 1280 × 720 layouts: PASS with no whole-page horizontal overflow
- Browser console: PASS; browser-discovered `BUG-037` resolved before the final gate
- Backend, Prisma schema, migration, and API contract diff: PASS (no changes)

## Approved V1 UI Redesign — Stage 8 Customers and Suppliers

- [x] Split Customers, Customer Groups, Customer Detail, Suppliers, and Supplier Detail into route-addressable workspaces
- [x] Preserve company-scoped lifecycle, Walk-in protection, Decimal balances, immutable ledgers, idempotency, permissions, and tenant isolation
- [x] Present customer receivable/advance and supplier payable/advance semantics from backend-authoritative balances
- [x] Add deliberate credit-limit, opening-balance, correction, adjustment, and lifecycle workflows with related Sales/Purchasing navigation
- [x] Add bounded server-side search, active-state filtering, pagination, permission-aware controls, responsive layouts, and clean-console browser acceptance
- [x] Resolve `BUG-038` with deterministic same-effective-date ledger ordering and focused customer/supplier regression coverage
- [x] Pass web/UI tests, full API and Phase 7/8/9/10 regressions, lint, strict TypeScript, formatting, production builds, Prisma validation/status, secret scan, and Git whitespace checks
- [x] Complete Stage 8 gate

Current gate status: **PASS (2026-09-13)**. Stage 8 is complete within the approved Customers and Suppliers UI scope. Production-browser acceptance verifies company-scoped list/detail/lifecycle workflows, protected Walk-in behavior, credit-limit review, opening/correction/adjustment history, signed customer/supplier balances, related Sales/Purchasing context, deterministic same-effective-date ledger ordering after reload, 1440 × 900 and 1280 × 720 layouts, and a clean console. `BUG-038` changed query ordering only; Prisma schema, migrations, API response shapes, ledger amounts, sign conventions, posting logic, idempotency, and immutability remain unchanged. Stage 9 has not started.

### Stage 8 Gate — PASS (2026-09-13)

- Web presentation tests and shared UI tests: PASS (25/25 and 5/5)
- Focused Phase 7/8/9/10 regressions: PASS (26/26); complete API regression: PASS (15 suites, 95 tests)
- BUG-038 same-effective-date order, running balance, final balance, immutability, and pagination stability: PASS
- Monorepo lint, strict TypeScript, API/Next.js production builds, Prisma validation/status, formatting, secret scan, and Git whitespace: PASS
- Production browser Customer/Walk-in/Supplier/lifecycle/ledger/related-document UAT: PASS
- Approved 1440 × 900 and 1280 × 720 layouts: PASS with no whole-page horizontal overflow
- Browser console: PASS; zero application errors or warnings
- Backend scope review: PASS (only approved ledger ordering changed; no schema, migration, API-shape, or financial-rule change)

## Approved V1 UI Redesign — Stage 9 Cash and Expenses

- [x] Split Current Shift, Shift History/Detail, Cash Movements, Expenses, and Expense Categories into route-addressable workspaces
- [x] Preserve one-open-shift, immutable movement, expected-cash, source uniqueness, idempotency, concurrency, permission, and branch/register rules
- [x] Present opening cash as starting float and backend-derived Expected Cash without treating tender/change or non-cash methods as drawer activity
- [x] Add reviewed Open/Close Shift, Cash In/Out, Expense posting, Expense reversal, and category lifecycle workflows
- [x] Verify cash/non-cash sale, collection, supplier-payment, refund, and expense mappings against the same local API/database
- [x] Verify closed-shift blocking, historical close snapshots, Actual minus Expected variance, bounded history, and immutable source references
- [x] Pass responsive production-browser acceptance and clean-console inspection for all Stage 9 routes
- [x] Pass web/UI tests, Phase 11/9/10/8 regressions, monorepo lint/typecheck, production builds, formatting, secret scan, and Git whitespace checks
- [x] Complete Stage 9 gate

Current gate status: **PASS (2026-09-13)**. Stage 9 is complete within the approved Cash and Expenses UI scope. The accepted browser sequence opened a BDT 5,000 shift and reconciled BDT 399.98 cash sales, BDT 100 cash collection, BDT 10 supplier cash payment, and BDT 199.99 cash refund to BDT 5,289.99 Expected Cash. Closing stored BDT 5,250 Actual Cash and a −BDT 39.99 shortage. Cash/non-cash expenses and controlled reversal were verified on the preceding shift. Backend cash/accounting rules, Prisma, migrations, and API contracts are unchanged. Stage 10 has not started.

### Stage 9 Gate — PASS (2026-09-13)

- Web presentation tests and shared UI tests: PASS (29/29 and 5/5)
- Focused Phase 11/9/10/8 integration regressions: PASS (23/23)
- Production-browser shift, sale cash/change, customer collection, supplier payment, refund, expense, reversal, close, history, and closed-drawer UAT: PASS
- PostgreSQL reconciliation: PASS (both tested shift snapshots equal signed movement sums; no duplicate source identities)
- Approved 1440 × 900 and 1280 × 720 layouts: PASS with no whole-page horizontal overflow
- Stage 9 browser console: PASS; zero application errors or warnings in a fresh acceptance tab
- Monorepo lint, strict TypeScript, API/Next.js production builds, formatting, secret scan, and Git whitespace: PASS
- Scope review: PASS (no backend cash/accounting, schema, migration, API-contract, auth/RBAC, inventory, sales, purchasing, or reporting change)

## Approved V1 UI Redesign — Stage 10 Dashboard and Reports

- [x] Implement the operational Dashboard and route-addressable Sales, Products/Tiles, Inventory, Purchasing, Customer, Supplier, Expense, Cash, and Financial Summary reports
- [x] Preserve Phase 12 report definitions, Decimal precision, event-date, timezone, collection, refund, historical-cost, inventory, party-ledger, expense, and cash semantics
- [x] Enforce report and profit permissions across navigation, cards, tables, direct routes, and server exports
- [x] Add bounded filters, pagination, domain-specific tables, real empty/loading/error states, related navigation, and server CSV export access
- [x] Reconcile representative Dashboard/report values against the same local API/PostgreSQL source data
- [x] Pass 1440 × 900 and 1280 × 720 production-browser acceptance with no whole-page overflow and clean consoles
- [x] Pass web/UI tests, Phase 12 and cross-stage regressions, lint, typecheck, production builds, formatting, secret scan, and Git whitespace checks
- [x] Complete Stage 10 gate

Current gate status: **PASS (2026-09-13)**. Browser results reconcile to database/API evidence for sales, inventory, customer/supplier positions, expenses, and cash/report definitions. Profit data and financial-report navigation are absent for a restricted reporting user. Server CSV export responses pass; the in-app browser did not expose a blob download event, so that browser event is recorded as unavailable rather than falsely passed. No backend report definition, Prisma schema, migration, API contract, authentication, RBAC, or transaction behavior changed. `BUG-039` remains a separate Medium pre-existing Purchasing-list defect. Stage 11 has not started.

### Stage 10 Gate — PASS (2026-09-13)

- Web presentation tests and shared UI tests: PASS (32/32 and 5/5)
- Phase 12 reporting regression: PASS (5/5)
- Phase 6–11 source-data integration regressions: PASS (39/39 across six suites)
- Production-browser Dashboard, reports, restricted-profit, responsive, navigation, and console acceptance: PASS
- PostgreSQL/API reconciliation: PASS for controlled sales, inventory, party-ledger, expense, and cash/report samples
- Server CSV export content, filters, and permissions: PASS; browser blob-download event unavailable in the in-app runtime
- Approved 1440 × 900 and 1280 × 720 layouts: PASS with no whole-page horizontal overflow
- Monorepo lint, strict TypeScript, API/Next.js production builds, formatting, secret scan, and Git whitespace: PASS
- Scope review: PASS (frontend-only; no report definition, schema, migration, API-contract, auth/RBAC, or transaction change)

## Phase Gate Log

### Phase 1 — PASS (2026-09-04)

- Clean frozen dependency install: PASS
- Repository lint across 5 packages: PASS
- Strict TypeScript checks across 5 packages: PASS
- Automated tests: PASS (API health test 1/1; packages with no runtime tests report zero failures)
- NestJS API production build: PASS
- Next.js production build and static generation: PASS
- Prettier check: PASS
- Docker Compose configuration: PASS
- Live API health endpoint: PASS (`200`, validated payload)
- Live production web server: PASS (`200`, expected page content)
- Secret scan: PASS (no matches)
- Git diff check and repository integrity: PASS
- Blocking Critical/High bugs: none open

### Phase 2 — PASS (2026-09-04)

- PostgreSQL 17 container health: PASS
- Prisma 7.10 format, schema validation, and client generation: PASS
- Initial migration `20260904143000_initial_foundation` application: PASS
- Migration status and clean replay/drift comparison: PASS (one migration applied; no difference detected)
- Live PostgreSQL catalog verification: PASS (43 public tables including `_prisma_migrations`, 99 foreign keys, 23 custom check constraints, and 164 total indexes)
- Required null-safe and partial unique indexes: PASS (6/6 present)
- Inventory, conversion, batch ownership, balance uniqueness, and immutable-ledger integration checks: PASS with transaction rollback confirmed
- Guarded development seed: PASS and idempotent (24 permissions after two executions)
- Repository lint, strict TypeScript checks, tests, production builds, and Prettier check: PASS
- Docker Compose configuration, live database-backed API health, secret scan, and Git diff check: PASS
- Blocking Critical/High bugs: none open

### Phase 3 — PASS (2026-09-05)

- Additive migration `20260904160000_phase3_auth_identity`: PASS (two migrations applied; status current; no drift)
- Authentication/session database constraints and tenant ownership checks: PASS
- Argon2id login, short-lived JWT access, opaque rotating refresh credentials, reuse detection, and revocation: PASS
- Password change/reset architecture, inactive-account enforcement, failed-login lockout, and endpoint throttling: PASS
- Company-scoped user/role administration and server-loaded permission enforcement: PASS
- Permission catalog seed and explicit Owner bootstrap: PASS and idempotent (35 permissions; one company/user/role on two bootstrap runs)
- API integration and regression tests: PASS (5 suites, 23 tests)
- Repository lint and strict TypeScript checks: PASS (5/5 packages)
- NestJS and Next.js production builds: PASS (5/5 packages); repeated API builds emit the correct runnable artifact
- Swagger/OpenAPI authentication metadata: PASS (19 paths; bearer and refresh-cookie schemes)
- Live browser login, protected route, refresh-on-reload, logout, and anonymous redirect: PASS
- Prisma format/validation/generation, Prettier, Compose configuration, secret scan, Git diff check, and repository integrity: PASS
- Blocking Critical/High bugs: none open

### Phase 4 — PASS (2026-09-06)

- Company profile, branch, user branch-access, warehouse, and POS register APIs: PASS
- Permission-based active branch context: PASS (company ownership, user access, and active-state enforcement verified)
- Tenant and branch isolation, permission enforcement, deactivation behavior, and audit creation: PASS
- Phase 4 API integration and regression tests: PASS (6 suites, 32 tests)
- Central permission seed: PASS and idempotent (48 permissions after two executions)
- Prisma format, schema validation, client generation, migration status, and drift comparison: PASS (two migrations current; no difference detected; no Phase 4 migration required)
- Repository lint and strict TypeScript checks: PASS (5/5 packages, uncached and sequential)
- NestJS and Next.js production builds: PASS (5/5 packages; `/`, `/app`, and `/login` generated)
- Swagger/OpenAPI Phase 4 routes and bearer/cookie security metadata: PASS (32 paths)
- Live browser company update, branch creation and active-context selection, branch access, warehouse creation, register creation, and register deactivation: PASS
- Prettier, Compose configuration, secret scan, API artifact, Git diff check, repository integrity, and destination free-space checks: PASS
- Blocking Critical/High bugs: none open

### Phase 5 — PASS (2026-09-06)

- Categories, hierarchy-cycle protection, brands, normalized manufacturers, and units: PASS
- Reusable Product core plus separate tile and sanitary profiles: PASS
- Direct Decimal factor-to-base conversions and one authoritative base quantity: PASS
- 24×24 inch nominal area, commercial Box/PCS/Sq.ft/Sq.m equivalence, and precision checks: PASS
- Company-unique unit barcodes, deterministic unit prices, and paginated indexed product search: PASS
- Tenant isolation, inactive-reference rejection, permission enforcement, and audit behavior: PASS
- Migration `20260906043323_phase5_catalog_foundation`: PASS (three migrations current; clean replay/drift reports no difference)
- PostgreSQL catalog constraints/indexes: PASS (manufacturer ownership, sanitary warranty, barcode unit ownership, one primary barcode, and one active conversion verified)
- Central permission seed: PASS and idempotent (62 permissions after two executions)
- API integration/regression tests: PASS (7 suites, 40 tests)
- Repository lint, strict TypeScript, and production builds: PASS (5/5 packages, uncached and sequential)
- Swagger/OpenAPI: PASS (55 paths; Phase 5 route groups present; bearer and cookie schemes)
- Live browser master-data, tile, conversion, barcode, pricing, search, and sanitary workflows: PASS
- Prettier, Compose, API artifact, secret scan, Git diff, and repository integrity: PASS
- Blocking Critical/High bugs: none open

### Phase 6 — PASS (2026-09-06)

- Opening, adjustment, damage, loss, transfer, batch/shade, balance, low-stock, count, and immutable-history APIs/UI: PASS
- One authoritative Decimal base quantity plus snapshotted transaction quantity/unit/factor and derived equivalents: PASS
- Atomic movement/balance/audit transactions, company negative-stock policy, idempotent retry, advisory position locks, version CAS, and deterministic transfer locks: PASS
- Optional company/product batch enforcement and PostgreSQL null-safe batch/balance/count identities: PASS
- Physical count draft, edit API, review, reopen API, stale-snapshot rejection, variance reconciliation, and posted immutability foundation: PASS
- Migrations `20260906060435_phase6_inventory_engine` and `20260906062000_phase6_inventory_constraints`: PASS (five migrations current; clean replay and live database report no difference)
- PostgreSQL catalog verification: PASS (50 public tables; 3 Phase 6 checks; 3 required null-safe indexes; 2 immutable movement triggers)
- Central permission seed: PASS and idempotent (69 permissions after two executions)
- API integration/regression tests: PASS (8 suites, 48 tests; concurrent deduction permits one commit and rejects one oversell)
- Repository uncached sequential lint, strict TypeScript, tests, and production builds: PASS (20/20 tasks across 5 packages)
- Swagger/OpenAPI: PASS (71 paths; 16 inventory paths; bearer and refresh-cookie schemes; critical idempotency headers declared)
- Live production browser batch/shade, opening, derived quantity, adjustment, count reconciliation, balance, and history workflows: PASS; console clean
- Prettier, Compose, Prisma format/validation/generation/status, drift, secret scan, Git diff/integrity, and 68.41 GiB destination free space: PASS
- Blocking Critical/High bugs: none open; browser-discovered `BUG-009` resolved

### Phase 7 — PASS (2026-09-06)

- Customer groups, customers, suppliers, lifecycle, indexed paginated search, and company sharing across authorized branches: PASS
- Exactly one database-provisioned company-local walk-in customer with protected identity and idempotent bootstrap: PASS
- Decimal credit-limit foundation and dedicated credit administration permission/audit: PASS
- Separate immutable customer receivable and supplier payable ledgers with signed opening, correction, adjustment, history, and derived balances: PASS
- Transactional idempotency, request-hash conflict detection, one-opening constraints, advisory party locks, and concurrent posting: PASS
- Tenant ownership, inactive-group rejection, permission enforcement, audit behavior, and no fake sale/purchase/payment entries: PASS
- Migrations `20260906153000_phase7_parties_ledgers`, `20260906154500_phase7_walkin_provision`, and `20260906155500_phase7_walkin_timestamp_fix`: PASS (eight migrations current; clean replay and live database report no difference)
- PostgreSQL verification: PASS (4 composite foreign keys per ledger, 6 ledger unique indexes, 4 immutability triggers, and zero companies missing a walk-in)
- Central permission seed and Owner bootstrap: PASS and idempotent (78 permissions; one company/walk-in/owner on two bootstrap runs)
- API integration/regression tests: PASS (9 suites, 55 tests; Phase 7 suite 6/6 including concurrent opening)
- Repository sequential lint, strict TypeScript, tests, and production builds: PASS across 5 packages
- Swagger/OpenAPI: PASS (89 paths; 18 Phase 7 paths; bearer/cookie schemes; 6 idempotency-declared ledger operations)
- Live production browser customer group, customer, walk-in, supplier, opening, correction, ledger, signed balance, and honest empty-history workflows: PASS; console clean
- Prettier, Compose, Prisma format/validation/generation/status, replay/drift, secret scan, Git whitespace/integrity, and 68.38 GiB destination free space: PASS
- Blocking Critical/High bugs: none open; `BUG-010` and `BUG-011` found and resolved during verification

### Phase 8 — PASS (2026-09-06)

- Separate PO, receipt, supplier invoice, outbound payment/allocation, and purchase-return workflows: PASS
- Backend-owned PO lifecycle, atomic company/document sequences, Decimal totals, partial receiving/invoicing, and capacity protection: PASS
- Phase 6 inventory reuse, base-unit conversion snapshots, batch/lot/shade receipt and exact-batch return reconciliation: PASS
- Immutable supplier-ledger invoice/payment/advance/financial-return effects and ledger-derived supplier dues: PASS
- Critical-command request-hash idempotency and concurrent receipt/payment/return protection: PASS
- Migrations `20260906170000_phase8_purchasing_workflow` and `20260906171000_phase8_purchasing_constraints`: PASS (10 migrations current; clean replay/live catalog parity at 1,109 objects and matching hash)
- PostgreSQL verification: PASS (56 tables, 236 indexes, 13 custom triggers, and required Phase 6 null-safe identities retained)
- Central permission seed: PASS and idempotent (84 permissions after two executions); default payment-method bootstrap remains idempotent
- API integration/regression tests: PASS (10 suites, 60 tests; Phase 8 suite 5/5 including concurrency, idempotency, Decimal, inventory, and ledger invariants)
- Repository sequential lint, strict TypeScript, tests, and production builds: PASS across 5 packages; Next.js generated `/`, `/app`, and `/login`
- Swagger/OpenAPI: PASS (104 paths; 15 purchasing paths; bearer and refresh-cookie schemes)
- Live production browser PO, partial batch/shade receipt, invoice, partial payment, financial return, inventory, and supplier-ledger workflows: PASS; console clean
- Prisma format/validation/generation/status, Prettier, Compose, API artifact, secret scan, Git whitespace/integrity, and destination free-space checks: PASS
- Blocking Critical/High bugs: none open; `BUG-012`, `BUG-013`, and `BUG-014` found and resolved before the final gate

### Phase 9 — PASS (2026-09-07)

- POS/sales implementation, migration, database parity, backend workflows, tests, production builds, Swagger, permission/bootstrap idempotency, secret scan, and live production API verification: PASS
- API integration/regression tests: PASS (11 suites, 66 tests; Phase 9 suite 6/6 including pricing, conversion, batch, credit, idempotency, immutability, isolation, permissions, and concurrent overselling)
- Repository uncached sequential lint, strict TypeScript, tests, and production builds: PASS (20/20 tasks across 5 packages)
- Interactive production browser login/context, barcode tile and sanitary cart, BOX unit, batch/shade, hold/resume, cash payment/change, completion, invoice/history, inventory deduction, and named-customer credit ledger workflow: PASS; browser console clean
- Eleven-migration clean replay and normalized live/replay schema equality, Prisma validation/generation/status, formatting, Compose, Git integrity, and remote integrity: PASS
- Blocking Critical/High bugs: none open; browser-runtime gate blocker `BUG-019` resolved on retry

### Phase 11 — PASS (2026-09-08)

- One OPEN shift per register, opening float, immutable movement journal, deterministic register locks, and closed-shift immutability: PASS
- Automatic cash effects for applied sale cash, customer collection, supplier payment, and refund; non-cash methods and tendered change excluded: PASS
- Manual cash in/out, company-scoped expense categories, atomic cash/non-cash expenses, controlled reversal, and auditability: PASS
- Ledger-derived expected cash with stored actual and variance snapshots: PASS (browser evidence 4,850 expected, 4,800 actual, -50 variance)
- Migration `20260907180000_phase11_cash_shifts_expenses`: PASS (13 migrations current; clean replay and normalized live/replay schema hashes match)
- PostgreSQL catalog verification: PASS (4 required Phase 11 indexes, 3 guard/immutability triggers, 4 checks, no duplicate open browser shift)
- Central permission seed: PASS and idempotent (98 permissions after two executions)
- API integration/regression tests: PASS (13 suites, 80 tests; Phase 11 suite 4/4 including open/close, automatic sources, idempotency, security, and close-vs-post concurrency)
- Repository uncached lint, strict TypeScript, tests, and production builds: PASS (20/20 tasks across 5 packages; zero cached)
- Swagger/OpenAPI: PASS (132 paths; 13 cash/expense paths; bearer and refresh-cookie schemes)
- Live production browser opening, cash sale/change exclusion, named-customer invoice due collection (1,850 to 1,750 outstanding), cash expense, cash refund, derived total, close/variance, disabled closed-drawer actions, and history: PASS; console clean
- Prisma format/validation/generation/status, Prettier, Compose, secret scan, Git whitespace/integrity, and 67.82 GiB destination free space: PASS
- Blocking Critical/High bugs: none open; browser-discovered `BUG-021` and `BUG-022` resolved before final verification

### Phase 12 — PASS (2026-09-08)

- Real-data company-timezone dashboard and permission-scoped sales, product/tile, inventory, purchase, customer, supplier, expense, cash, and financial reports: PASS
- Return-aware event-period revenue, historical-cost gross profit, ledger-derived receivable/payable, and cash-flow definitions: PASS
- Authoritative base inventory quantities with derived Box/PCS/Sq.ft/Sq.m presentation and low-stock evaluation: PASS
- Historical sale-line product/SKU/unit/tile/batch/lot/shade snapshots plus shared thermal and A4 invoice projection: PASS
- Permission-matched CSV exports, paginated/filterable report queries, date-range bounds, and deterministic Decimal calculations: PASS
- Migration `20260908120000_phase12_sale_display_snapshots`: PASS (14 migrations current; clean replay normalized schema hash equals live database)
- Central permission seed: PASS and idempotent (104 permissions after two executions); existing system Owner roles receive the synchronized catalog
- API integration/regression tests: PASS (14 suites, 85 tests; Phase 12 suite 5/5)
- Repository lint, strict TypeScript checks, tests, production builds, Prisma validation/generation/status, formatting, Compose, secret scan, and Git integrity: PASS
- Swagger/OpenAPI: PASS (144 paths; 12 report paths)
- Production browser dashboard, all report domains, historical invoice lookup, thermal/A4 print styles, database reconciliation, and clean console: PASS
- Blocking Critical/High bugs: none open; migration defect `BUG-023` resolved before the final gate

### Phase 13 — PASS (2026-09-09)

- Permissioned company-scoped audit retrieval, critical-action coverage inventory, route authorization audit, structured correlation logging, redacted failures, bounded requests, strict production environment validation, and separate liveness/readiness: PASS
- Migration `20260908180000_phase13_search_performance`: PASS (15 migrations current; clean replay and normalized live/replay schema hash `a3a9f37632eb36669f9181076c635df3f1d22a095e65627b4326d64804eb51e9`)
- Backup/restore drill: PASS (custom-format backup SHA-256 `42BA31FE7883226BB40CC3703D372C67D0ADA59C291D4106F436A4E83555E85A`; 64 tables, 291 indexes, 178 foreign keys, 24 triggers, 15 migrations, and all checked inventory/return/refund/shift invariants match live)
- Permission/bootstrap seeds: PASS and idempotent (105 permissions; one company-local walk-in, owner role, and 105 owner grants after two executions)
- API integration/regression tests: PASS (15 suites, 92 tests, zero failures/skips/snapshots)
- Repository uncached sequential lint, strict TypeScript, tests, and production builds: PASS across all five packages; Next.js generated `/`, `/app`, and `/login`
- Production API and standalone web container builds and non-root runtime smoke checks: PASS; API readiness/liveness/request-ID/404/production-Swagger behavior and web login response verified
- PostgreSQL 17 SME performance fixture: PASS (10,000 products; warm product substring 1.278 ms, exact barcode 0.332 ms, 50-row stock page 0.625 ms)
- Swagger/OpenAPI: PASS (146 paths; bearer and refresh-cookie schemes; permissioned audit path present)
- Representative production browser workflow: PASS (login/branch context, POS search and tile unit/batch/shade, inventory, purchasing, parties, cash, reports, catalog, organization, historical invoice and print CSS); console clean
- Frozen offline install, Prisma format/validation/generation/status, dependency audit, Compose/CI configuration, secret/history scan, Git whitespace/integrity, and destination capacity: PASS
- Final 44-module review: 43 PASS, Settings PARTIAL by explicit accepted Version 1 scope; no Critical/High blocker remains. `BUG-024` through `BUG-028` resolved; `BUG-008` remains Low/deferred on pinned pg 8.23.
