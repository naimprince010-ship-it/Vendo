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
