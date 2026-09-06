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

- [ ] Purchase orders and partial receiving
- [ ] Goods receipts with tile batch/shade
- [ ] Supplier invoices and additional costs
- [ ] Supplier payments, dues, and returns
- [ ] Purchasing workflow tests
- [ ] Complete Phase 8 gate

## Phase 9 — POS and Sales

- [ ] Cashier-optimized product search and cart
- [ ] Draft, hold, and resume sales
- [ ] Atomic sale completion workflow
- [ ] Stock deduction, pricing, discounts, tax, and invoice
- [ ] Critical sale and concurrent overselling tests
- [ ] Complete Phase 9 gate

## Phase 10 — Payments, Dues, Returns, Refunds, and Exchange

- [ ] Split payments and change calculation
- [ ] Customer credit and due collection
- [ ] Full and partial returns
- [ ] Refund and exchange workflows
- [ ] Reversal and ledger tests
- [ ] Complete Phase 10 gate

## Phase 11 — Cash Shifts and Expenses

- [ ] Shift open/close and reconciliation
- [ ] Cash movements
- [ ] Expense categories and expenses
- [ ] Complete Phase 11 gate

## Phase 12 — Dashboard, Reports, and Receipts

- [ ] Real-data operational dashboard
- [ ] Sales, tile, inventory, purchasing, customer, and finance reports
- [ ] Thermal and full-page printable receipts/invoices
- [ ] Accuracy and query-performance verification
- [ ] Complete Phase 12 gate

## Phase 13 — Audit, Security, Testing, and Production Readiness

- [ ] Critical action audit trail
- [ ] Security hardening and threat review
- [ ] File and input validation
- [ ] End-to-end critical workflow suite
- [ ] Production Docker and deployment documentation
- [ ] Final migration and backup/restore verification
- [ ] Final module-by-module production review
- [ ] Complete Phase 13 gate

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
