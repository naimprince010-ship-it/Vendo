# Changelog

All meaningful project changes are recorded here. This project follows a phase-oriented development history rather than release claims based on file presence.

## Unreleased

### V1 UI redesign — Stage 6 Inventory

- Replaced the legacy tabbed Inventory console with route-addressable Overview, Stock, Product Stock Detail, Low Stock, Batches, Counts, Transfers, and immutable Movement History workspaces.
- Added light-first, permission-aware stock operations for opening, explicit add/remove adjustment, damage/loss, and atomic warehouse transfer with multi-line entry, exact batch/shade selection, backend conversion previews, stable idempotency keys, and reviewed high-impact confirmation dialogs.
- Added physical-count creation, draft entry editing, review/reopen/post reconciliation, expected/counted/variance presentation, and a human-readable stale-snapshot failure while retaining backend authority.
- Found and fixed `BUG-035`: the shared Inventory stock-line editor visually showed a base unit while controlled state retained an empty `unitId`, so mutation review/create actions could remain silently blocked before any API request. Product selection now synchronously assigns the known base unit and all required-field failures are explicitly displayed.
- Verified the active local environment identity and a direct authenticated control request, then reconciled opening stock, add/remove adjustment, rejected negative stock without mutation, exact-batch damage, physical-count variance reconciliation, and the correlated atomic BOX transfer through the same API/database. Final UAT balances and immutable movements match the accepted human workflows.
- Post-fix human Chrome acceptance passes all required Inventory workflows, responsive checks at 1440 × 900 and 1280 × 720, reload persistence, and clean-console inspection. `BUG-034` remains separately documented as an external Codex browser-control issue; no automated-browser PASS is claimed.
- Resolved `BUG-036` without relaxing normal stock operations: Physical Count uses a dedicated non-negative quantity DTO/domain path, raw nested regex failures are mapped to a human-readable message, and migration `20260912064000_phase6_zero_physical_count` permits zero only in count-item entered quantity. An isolated 16-migration replay and live UAT 1→0 count both pass; the latter produced exactly one −1 PCS reconciliation movement and no idempotent retry duplicate.
- Final Stage 6 gate passes with 17/17 web tests, 5/5 shared UI tests, 9/9 focused Phase 6 tests, 28/28 combined Phase 6/8/9/10 tests, monorepo lint/typecheck, API and Next.js production builds, Prisma validation/status, clean migration replay, formatting, secret scan, Git whitespace, human Chrome acceptance, and API/database reconciliation.

### V1 UI redesign — Stage 5 catalog and product management

- Replaced the monolithic catalog console with route-addressable product list, create/edit, detail, category, brand, manufacturer, and unit workspaces inside the approved light-first shell.
- Added real server-side search, filters, pagination, barcode lookup, lifecycle controls, and adaptive product forms for TILE, SANITARY, ACCESSORY, and GENERAL products.
- Presented tile dimensions and nominal coverage as informational metadata while retaining configured commercial coverage and direct-to-base conversions as authoritative; independent unit-specific prices remain unchanged.
- Added product-detail management for conversions, retail/wholesale/minimum prices, and multiple unit barcodes, with existing permission-aware cost visibility and backend validation preserved.
- Added unsaved-change protection and focused deterministic catalog presentation tests without changing backend logic, Prisma schema, migrations, or API contracts.
- Verified production browser workflows at 1440 × 900 and 1280 × 720 with a clean console, full API regression (15 suites/92 tests), 11/11 web tests, 5/5 UI tests, monorepo lint/typecheck/build, formatting, Git whitespace, and secret checks. Stage 5 is PASS; Stage 6 has not started.

### V1 UI redesign — Stage 4 sale detail and post-sale workflows

- Added route-addressable sales history and sale detail with immutable invoice-line snapshots, tile size, conversion, exact batch/lot/shade, pricing mode, customer/register/cashier context, and a backend-derived outstanding state.
- Added a stable financial summary and chronological transaction timeline for original split payments, collections, return credits, refunds, exchanges, and void reversals without changing authoritative backend calculations.
- Moved collection, partial/full return, exact restock/non-resellable disposition, refund, atomic exchange, and compensating void into permission-aware Radix dialogs with loading, retry, duplicate-submit, and explicit high-risk review states.
- Added bidirectional original/replacement sale navigation for atomic exchanges and retained existing verified thermal/A4 invoice projection for print/reprint access.
- Removed post-sale operations from the POS workspace while retaining direct navigation from invoice completion/history to Sale Detail.
- Verified local production browser workflows for partial collection and persisted customer ledger, exact-batch tile return and inventory reconciliation, paid return/refund, exchange settlement and linked records, void reversal, and print access at 1440 × 900 and 1280 × 720 with a clean console.
- Verified 8/8 web tests, warning-free ESLint, strict TypeScript, formatting, the Next.js production build (18 routes), and 14/14 affected Phase 9/10 API regression tests. Stage 4 is PASS; Stage 5 has not started.

### V1 UI redesign — Stage 3 POS cashier workspace

- Rebuilt the POS console as the approved light-first three-column cashier workspace with focused product discovery, current-sale, customer/pricing, checkout, payment, held-sale, and invoice-history components.
- Added scanner-first exact barcode handling, keyboard focus shortcuts, compact product filters, tile BOX/PCS/SQFT equivalents, exact batch/lot/shade context, and adaptive sanitary/general-item presentation without adding independent stock counters.
- Added Decimal-safe presentation helpers for conversion, pricing, totals, split payments, due, and cash tender/change; backend calculation and completion remain authoritative and the existing request contracts are unchanged.
- Preserved retail/wholesale pricing, permission-sensitive price/discount controls, hold/resume, stable retry idempotency, named-customer due, split payment, and atomic completion behavior.
- Reset invoice-level adjustments after hold/completion and deterministically reconstruct them from immutable line/document totals when a held sale is resumed, including after reload.
- Corrected two browser-confirmed shell defects affecting the approved 1440 layout: navigation icon sizing was overwritten by caller classes, and expanded sidebar content retained the compact 72px offset.
- Verified the production cashier workflow at 1440 × 900 and 1280 × 720, exact tile and sanitary barcodes, conversion/batch context, hold/resume, split payment/change/due, invoice detail/history, stock deduction, keyboard shortcuts, and a clean browser console.
- Verified 5/5 web tests, ESLint, strict TypeScript, formatting, the Next.js production build, and 14/14 affected Phase 9/10 API regression tests. Stage 3 is PASS; Stage 4 has not started.

### V1 UI redesign — Stage 2 application shell and routing

- Added an authenticated light-first application shell with responsive grouped navigation, route context, branch selector, session restoration, and sign-out while retaining backend authorization as the authority.
- Added centralized typed route metadata, permission filtering, shared authenticated API/branch context, and focused navigation tests.
- Made Dashboard, POS, Sales, Purchases, Products, Inventory, Customers, Suppliers, Cash, Expenses, Reports, and Settings directly addressable under `/app`; `/app` remains compatible by directing clients to the dashboard.
- Preserved the verified real consoles, register/shift behavior, request payloads, and V1 business logic; detailed module and POS screen redesign remains outside Stage 2.
- Verified Stage 2 tests, lint, strict TypeScript, production build, formatting, API readiness, and HTTP smoke for every primary route plus representative nested plan routes.
- Completed interactive production-browser acceptance after the Codex runtime recovered. Corrected expanded-sidebar labels, the Suppliers initial tab, mobile drawer navigation lifecycle, and compact navigation accessible names; authenticated desktop/mobile rendering and the browser console now pass.
- Stage 2 is PASS. Stage 3 POS redesign has not started.

### V1 UI redesign — Stage 1 foundation (conditionally accepted)

- Added the approved light-first semantic color, radius, control-size, shadow, and typography tokens; Geist is now the canonical global application font.
- Added source-owned accessible component foundations for actions, persistent-label forms, badges/statuses, cards, tables, pagination, dialogs, alerts, tooltips, loading/empty/error states, and presentation-only money/quantity values.
- Kept existing workflows and `StatusBadge` imports compatible; no route, backend, API, database, authentication, authorization, inventory, or financial behavior changed.
- Added focused UI component tests and verified frozen install, formatting, lint, strict TypeScript, UI build, Next.js production build, generated semantic CSS, dependency audit, API readiness, and HTTP web smoke.
- Stage 1 is PASS after completing its deferred authenticated browser/rendering/console gate on 2026-09-10; external runtime `BUG-029` is resolved.

### Production rollout preparation

- Established the environment-specific acceptance record for release `ff0b8a5f20fc23ace15a42897ce2d5bfd3d57265` without changing Version 1 architecture or starting Version 2 work.
- Revalidated the production Compose configuration with ephemeral undisclosed secrets, confirmed `.env.production` remains excluded from Git, verified production seed/bootstrap switches fail closed, and inventoried all 15 migrations.
- Recorded the external infrastructure, DNS, secure-secret, monitoring, backup, first-owner, business-configuration, and physical-hardware inputs that must be supplied before the deployment can be accepted.

### Phase 13 — Audit, Security, Testing, and Production Readiness

- Added permissioned, company-scoped audit-log retrieval; static route/branch/permission coverage regression checks; and explicit audit events for completed-sale discounts.
- Added request correlation, structured redacted completion/error logs, generic unexpected-error responses, bounded request bodies, explicit proxy/CORS behavior, strict fail-closed production configuration, and distinct database readiness.
- Added the `pg_trgm` search-performance migration with 18 GIN indexes and a guarded 10,000-product PostgreSQL performance fixture.
- Added production non-root API and standalone Next.js containers behind Caddy, a one-shot migration profile, private PostgreSQL, CI database verification, and production environment examples.
- Added guarded backup/restore scripts and production deployment, backup, disaster-recovery, operations, performance, release-checklist, security, and final module-review documentation.
- Resolved transitive high-severity `deepmerge-ts`, `mysql2`, and newly published Multer advisories; corrected API image packaging by making Express explicit and deploying injected workspace packages deterministically.
- Verified 15 migrations from zero, idempotent 105-permission bootstrap, live/replay schema equality, a custom-format backup/restore with catalog and invariant parity, 15 API suites/92 tests, all package quality/build gates, production images, 146 Swagger paths, and a representative production browser workflow with a clean console.

### Phase 12 — Dashboard, Reports, and Receipts

- Added a company-timezone operational dashboard and paginated sales, product/tile, inventory, purchase, customer, supplier, expense, cash, and restricted financial report APIs over real transaction ledgers.
- Defined event-period sales/return treatment, historical-cost gross profit, receivable/payable signs, valid-expense handling, and drawer cash semantics without presenting collections as revenue or subtracting refunds twice.
- Added permission-matched CSV exports and six granular report permissions; the guarded seed now idempotently grants newly introduced permissions to existing system Owner roles.
- Added migration `20260908120000_phase12_sale_display_snapshots` so product, SKU, unit, tile size, batch, lot, and shade remain stable on reprints after catalog changes.
- Added authenticated dashboard/report consoles and one historical invoice projection with thermal and A4 print layouts.
- Added Phase 12 integration coverage for return-aware revenue/profit, derived tile equivalents, customer/supplier ledger totals, historical snapshot reprints, and permission enforcement.
- Excluded only generated Prisma client output from API lint traversal so the authored application source remains fully linted without exhausting the build host.
- Verified 14 current migrations with clean replay/live schema equality, 104-permission seed idempotency, 144 Swagger paths, 14 API suites/85 tests, all package gates and production builds, and real production-browser dashboard/report/invoice/print workflows with a clean console.

### Phase 1 — Foundation

- Connected the empty local Git repository to `https://github.com/naimprince010-ship-it/Vendo.git`.
- Started repository governance, architecture documentation, and monorepo foundation.
- Generated the Next.js 16 application source and added a deterministic NestJS 11 API scaffold with a versioned health endpoint and Swagger bootstrap.
- Added root workspace, Turbo, formatting, environment, and PostgreSQL Compose configuration.
- Relocated the repository non-destructively to `D:\Projects\Vendo`, preserving `.git`, hidden files, documentation, configuration, and all uncommitted source changes; the C: source copy was retained.
- Added shared `@vendo/types`, `@vendo/validation`, and `@vendo/ui` workspace packages.
- Replaced the generated Next.js placeholder with an intentional foundation screen backed by TanStack Query and a schema-validated live API health check.
- Added GitHub Actions CI for frozen install, lint, typecheck, tests, builds, and Compose validation.
- Closed the Phase 1 storage/build blocker after a clean D:-local dependency install and successful Next.js production build.

### Phase 2 — Database Foundation

- Added a normalized 42-model Prisma 7.10 schema with composite tenant/location ownership, Decimal money and quantity types, optional product batches, transaction foundations, and one authoritative inventory base quantity.
- Added an initial PostgreSQL migration with 99 foreign keys, 23 business check constraints, null-safe/partial operational unique indexes, and immutable inventory movement triggers.
- Added the PostgreSQL driver-backed Nest database service, guarded development seed architecture, migration catalog verification SQL, and static database-foundation tests.
- Added Prisma configuration for the PostgreSQL driver adapter and generated client, plus migration, validation, deployment, status, and guarded seed commands.
- Applied and verified migration `20260904143000_initial_foundation` against PostgreSQL 17; clean migration replay reports no drift.
- Verified 43 public tables including Prisma migration metadata, 99 foreign keys, 23 custom check constraints, 164 total indexes, all 6 required operational unique indexes, and immutable inventory movement triggers.
- Verified database rejection of invalid conversion factors, duplicate unbatched balances, cross-product batch assignments, and inventory movement mutation; the verification transaction rolls back without residue.
- Verified the guarded seed twice with an idempotent result of 24 global permissions.
- Prisma format/validation/generation, repository lint, strict typecheck, 5 API tests, NestJS and Next.js production builds, formatting, Compose configuration, and database-backed API health all pass.
- Resolved Docker availability, host-log disk exhaustion, and over-parallelized verification incidents (`BUG-002`, `BUG-003`, `BUG-004`); uncached checks pass sequentially and no known blocking Phase 2 issue remains.

### Phase 3 — Authentication, Users, Roles, and Permissions

- Added migration `20260904160000_phase3_auth_identity` with tenant-owned rotating auth sessions, hashed password-reset tokens, credential versioning, failed-login state, lifecycle constraints, and tenant-safe session replacement ownership.
- Implemented Argon2id password hashing, short-lived JWT access tokens, opaque HMAC-SHA-256-fingerprinted refresh credentials, rotation/reuse-family revocation, current/other-session logout, password change, and provider-neutral password-reset architecture.
- Added generic login/reset responses, account lockout after repeated failures, endpoint throttling, validated environment secrets/lifetimes, secure headers, credentialed CORS, HttpOnly refresh cookies, and security-event audit records.
- Added company-scoped, paginated user administration; safe user updates/status/password administration; configurable role and permission APIs; and centralized permission metadata enforced by global authentication and authorization guards.
- Added a guarded, explicit, idempotent Owner bootstrap with no committed account or password; the centralized seed now synchronizes 35 administrative and business permission keys.
- Added the real web login, in-memory access-token state, refresh-cookie session restoration, protected app route, and logout using React Hook Form and Zod against the API.
- Added 23 API/database/security tests across five suites, plus live SQL checks for session/reset constraints, tenant ownership, preserved Phase 2 indexes, and rollback-safe invariants.
- Verified two applied migrations with no drift, idempotent seed/bootstrap behavior, Swagger bearer/cookie metadata across 19 paths, and live browser login, reload restoration, logout, and anonymous redirect.
- Fixed CommonJS dependency interop, React effect/session restoration lint behavior, and the Nest production output layout so consecutive builds always emit the current runnable `dist/main.js` (`BUG-005`, `BUG-006`, `BUG-007`).
- Repository lint, typecheck, tests, Prisma checks, NestJS/Next.js production builds, formatting, Compose validation, secret scan, and Git integrity pass with no open Critical/High Phase 3 blocker.

### Phase 4 — Company, Branch, Warehouse, and Register

- Added permission-protected, company-scoped APIs for company profile management; branch creation, update, status, and pagination; user branch-access grants/revocations; and warehouse/register lifecycle management.
- Added an explicit `x-branch-id` active-context guard that accepts only an active branch owned by the authenticated company and available through explicit assignment or the `branch.access_all` permission.
- Preserved Phase 2 composite tenant/location foreign keys and deactivation-based history; no schema change or Phase 4 migration was required, and default-warehouse selection remains intentionally deferred to Phase 6.
- Extended the centralized permission catalog from 35 to 48 keys without role-name authorization; the Owner bootstrap continues to receive the synchronized catalog through its existing policy.
- Added audit records for company updates, branch/warehouse/register creation and changes, and user branch-access grants/revocations, including actor and relevant before/after state without secrets.
- Replaced the protected placeholder with a real permission-aware organization console using TanStack Query, React Hook Form, and Zod against the production APIs.
- Added nine Phase 4 integration cases within a 32-test API regression suite covering authorized and unauthorized operations, tenant/branch isolation, duplicate codes, active context, deactivation, and audit behavior.
- Verified live production browser workflows for company, branches, user access, active branch context, warehouses, and registers; synthetic verification data and local-only credentials were removed afterward.
- Prisma checks and drift comparison, idempotent 48-permission seed, repository lint/typecheck/tests/builds, Swagger, formatting, Compose, secret scan, Git integrity, and destination free-space checks pass with no open Critical/High Phase 4 blocker.

### Phase 5 — Catalog, Units, Tile Domain, and Pricing

- Added company-scoped lifecycle APIs for category hierarchies, brands, normalized manufacturers, reusable units, and products with active-master-data validation and audit records.
- Added migration `20260906043323_phase5_catalog_foundation`, preserving legacy manufacturer values while adding normalized ownership, sanitary profiles, unit-bound barcodes, and deterministic active-conversion integrity.
- Implemented separate tile and sanitary profiles; nominal tile dimensions use Decimal millimetres while configured commercial factors remain authoritative for packaging/area conversion.
- Added direct unit-to-base conversion and preview logic, company-unique multiple barcodes, one primary barcode, and independent retail/wholesale/minimum unit prices.
- Added company-scoped, paginated server-side search across barcode, SKU, name, brand, manufacturer, model, and tile size.
- Added a real permission-aware catalog console with adaptive tile/sanitary product creation and management for master data, conversions, barcodes, pricing, search, and product lifecycle; it deliberately shows no fake inventory.
- Extended the idempotent permission catalog from 48 to 62 keys and added eight Phase 5 integration workflows within the 40-test regression suite, including dedicated price/cost authorization checks.
- Verified three migrations with no replay drift, required database constraints/indexes, production browser workflows, 55-path Swagger metadata, all repository checks/builds, and no Critical/High blocker.

### Phase 6 — Inventory and Batch/Lot/Shade

- Added an inventory application module for opening stock, adjustments, damage, loss, warehouse/branch transfers, optional batches, balances, low-stock queries, immutable movement history, and physical counts.
- Preserved a single `numeric(20,6)` base inventory quantity; operational unit factors are Decimal-validated and snapshotted as `numeric(24,10)` on movements and count items.
- Added company-scoped idempotent command records, transaction-scoped advisory position locks, version-conditional balance updates, negative-stock enforcement, deterministic multi-position locking, and correlated atomic transfer movements.
- Added draft/review/reopen/post physical-count workflow with captured quantity/version snapshots and stale-post rejection; reconciliation records only the signed variance.
- Added migrations `20260906060435_phase6_inventory_engine` and `20260906062000_phase6_inventory_constraints`; generated SQL inspection caught and corrected restoration of PostgreSQL-only null-safe batch identity and added count/hash/state checks.
- Added seven inventory integration workflows within the 48-test API regression suite, covering conversion snapshots, batch enforcement, idempotency, rollback, concurrent deductions, transfers, counts, tenant/branch/permission isolation, derived stock, and ledger immutability.
- Added seven fine-grained inventory permissions to the idempotent catalog and a real authenticated inventory console for branch stock, derived tile quantities, operations, batch/shade management, counts, low stock, and history.
- Fixed active-batch query boolean parsing (`BUG-009`) during production browser verification and reverified batch selection, opening, adjustment, reconciliation, derived Box/PCS display, and clean browser console behavior.

### Phase 7 — Customers and Suppliers

- Added company-scoped customer-group, customer, and supplier APIs with explicit company-local codes, server-side search/pagination, active/inactive lifecycle, inactive-group assignment protection, and audit records.
- Added protected company-local walk-in provisioning at the database boundary and idempotent bootstrap handling; operators cannot rename, deactivate, or duplicate the system walk-in identity.
- Replaced mutable customer/supplier opening-balance columns with separate immutable signed `numeric(19,4)` ledgers, preserving non-zero legacy values through migration backfill.
- Added transactional, idempotent opening balance, correction-delta, and adjustment workflows with request hashes, party locks, one-opening constraints, ledger-derived balances, debit/credit presentation, and database mutation triggers.
- Added dedicated customer credit, party ledger, customer group, and supplier permissions while keeping master data company-scoped rather than incorrectly branch-isolated.
- Added real authenticated customer, customer-group, customer-detail/ledger, supplier, and supplier-detail/ledger UI with deliberate balance posting and no fake sales, purchase, or payment history.
- Added Phase 7 integration and database-foundation coverage for walk-in provisioning/protection, lifecycle, search, inactive references, Decimal precision, idempotency, corrections, immutability, tenant isolation, and permission enforcement.
- Added migrations `20260906153000_phase7_parties_ledgers`, `20260906154500_phase7_walkin_provision`, and corrective `20260906155500_phase7_walkin_timestamp_fix`; `BUG-010` records the caught and resolved trigger timestamp defect.
- Added concurrent opening-post coverage and resolved the serializable-snapshot/advisory-lock conflict (`BUG-011`) so one request commits and the competing post returns a deterministic conflict without duplicate history.
- Verified eight-migration clean replay/zero drift, 78-permission and Owner-bootstrap idempotency, 55 API tests, all repository lint/type/build gates, 89-path Swagger metadata, database constraints/triggers, and live production browser customer/supplier ledger workflows with a clean console.

### Phase 8 — Purchasing and Supplier Dues

- Added separate purchase-order, goods-receipt, supplier-invoice, supplier-payment/allocation, and purchase-return API workflows with backend-owned lifecycle transitions and Decimal totals.
- Reused the Phase 6 inventory transaction primitive for receipt/return movements, base-unit conversion snapshots, tile batch/lot/shade creation, position locking, negative-stock policy, and atomic balance projection updates.
- Added immutable supplier-ledger effects for posted invoices, outbound payments/advances, and invoiced returns; received-only returns intentionally create no financial history.
- Added company/document sequences, command idempotency records, PO/invoice/receipt/return capacity locks, partial receiving/invoicing, allocation limits, proportional stored-line return credits, and real supplier due/outstanding queries.
- Added migrations `20260906170000_phase8_purchasing_workflow` and `20260906171000_phase8_purchasing_constraints`; SQL inspection restored Phase 6 null-safe indexes and corrected an unintended generated return relation before gate verification.
- Extended the centralized catalog with six Phase 8 permissions and added idempotent default Cash/Bank/Card/MFS payment methods to company bootstrap.
- Added a real authenticated purchasing console for PO lifecycle/detail, explicit tile receipt batches/shades, supplier invoices, payments/advances, and inventory-only versus financial returns. Cash-drawer effects and landed-cost allocation remain honestly deferred.
- Added draft-update, cancel/close lifecycle controls and real supplier-payment/purchase-return history to the purchasing UI; corrected transition audit action names.
- Added five Phase 8 integration workflows within the 60-test regression suite, covering PO lifecycle, partial/concurrent/idempotent receipts, Box-to-PCS batch stock, Decimal invoice posting, payment allocation/advance, and financial versus received-only returns.
- Verified all 10 migrations through a clean replay and exact live/replay catalog comparison (1,109 objects each, matching hash), 84-permission seed idempotency, 104-path Swagger metadata, live production browser purchasing/inventory/ledger behavior, and all repository lint/type/test/build/format/Prisma/Compose/security/integrity gates.

### Phase 9 — POS and Sales

- Added a dedicated sales/POS API module with bounded barcode/catalog/customer/context search, effect-free draft/hold/resume, paginated history, and receipt-ready detail.
- Implemented backend-authoritative Decimal retail/wholesale pricing, unit-specific minimums, permissioned fixed discounts/overrides, tax-exclusive totals, cash change, and named-customer credit validation.
- Added atomic sale completion across immutable invoice snapshots, one Phase 9 payment/allocation, unpaid customer receivable, shared Phase 6 inventory movements/balances, and audit history.
- Reused product-specific direct conversions and exact tile batch/shade positions; sale lines and movements snapshot entered unit, quantity, factor, base quantity, cost, configured price, and charged price.
- Added company-local atomic invoice/payment sequences, request-hash completion idempotency, deterministic stock locking, concurrent oversell protection, and completed sale/line mutation triggers.
- Added migration `20260906220000_phase9_sales_pos`; corrected a legacy check-name collision before final verification and confirmed an 11-migration clean replay with normalized live/replay schema equality (`BUG-015`).
- Added a desktop-first authenticated POS console with branch/register/warehouse context, fast search/barcode entry, tile batch/unit selection, retail/wholesale cart, hold/resume, payment/change inputs, completion, sales history, and invoice detail.
- Added six Phase 9 integration workflows within the 66-test API regression suite, covering barcode/search, effect-free holds, paid tile/sanitary sale, Box and Sq.ft conversion, permissions, credit, idempotency, immutability, and simultaneous overselling.
- Resolved nested Prisma sale-line persistence, React context-default lint, and default Cash classification defects (`BUG-016`, `BUG-017`, `BUG-018`). Split payments, due collection, returns/refunds/exchanges, cash-shift enforcement, and printable layouts remain explicitly deferred to their approved phases.
- Completed the production browser gate after the browser-control runtime recovered (`BUG-019`): verified branch/register/warehouse context, tile and sanitary barcode entry, BOX unit and exact batch/shade selection, hold/resume, BDT 150 cash change, atomic completion, receipt-ready invoice/history, inventory deduction, and a named-customer BDT 300 receivable in the immutable ledger; the browser console was clean.
- Phase 9 gate passed with 11-migration replay/parity, 66 API tests, 20/20 uncached repository tasks, production builds, Swagger, idempotent bootstrap/permissions, Prisma, formatting, Compose, security, Git, production API, and production browser verification. Split payments, due collection, returns/refunds/exchanges, cash-shift enforcement, and printable layouts remain explicitly deferred to their approved phases.

### Phase 10 — Payments, Dues, Returns, Refunds, and Exchange

- Extended atomic sale completion to up to ten distinct configured payment methods, cash tender/change, real payment allocations, and a ledger-backed due remainder rather than a synthetic due payment method.
- Added idempotent customer collection with explicit invoice allocation or unapplied advance, locked current-outstanding validation, immutable customer-ledger credit, payment history, and audit records.
- Added immutable linked `SaleReturn`, `SaleReturnItem`, `SaleRefund`, and `SaleExchange` aggregates with company/branch/warehouse ownership, exact original line/unit/conversion/batch snapshots, Decimal checks, indexes, and mutation triggers.
- Implemented full/partial returns, cumulative base-quantity protection, original invoice price/discount/tax allocation, receivable-first credit, bounded outbound refunds, exact batch/shade restocking, non-resellable disposition, atomic exchange, and controlled full-sale reversal.
- Reused Phase 6 inventory movements and the Phase 9 replacement-sale engine; current invoice outstanding and lifecycle (`PARTIALLY_RETURNED`, `RETURNED`, `EXCHANGED`, `VOIDED`) are derived without changing completed invoice history.
- Added `sale.return`, `sale.exchange`, `customer.collect_payment`, and `customer.view_payments`, while reusing `sale.refund`/`sale.void`; all endpoints retain authenticated tenant and active-branch enforcement.
- Added a production financial UI for split settlement, collection/advance, return/refund history, exchange settlement, and sale financial timelines using real APIs. Corrected the Phase 7-era ledger caption after live verification exposed stale wording.
- Added migration `20260907140329_phase10_payments_returns_exchange`, preserving PostgreSQL-only Phase 6 null-safe indexes. All 12 migrations replay cleanly and normalized live/replay schema hashes match.
- Added eight Phase 10 integration workflows plus static migration checks within 12 passing suites/75 tests, covering split/due, collection allocation/advance, full/partial, walk-in, and concurrent exact-batch returns, historical discount/tax reversal, refund bounds/idempotency/concurrency, exchange, void, immutability, audit, cross-company rejection, and permissions.
- Production browser verification passed partial collection, two-method sale with BDT 100 change and BDT 700 due, exact BROWSER-B001/Shade A partial return, fully-settled BDT 5,000 refund, linked exchange with BDT 1,850 credit and BDT 3,150 difference, inventory reconciliation, customer ledger, sale timeline, and clean console.
- Phase 10 gate passed with 88-permission idempotent seeds, 119-path Swagger, Prisma, migration status/replay/drift, uncached repository lint/typecheck/build, production Next.js/NestJS builds, formatting, Compose, secret scan, Git integrity, API regression, and browser checks. Cash drawer movements remain correctly deferred to Phase 11.

### Phase 11 — Cash Shifts and Expenses

- Added register-scoped cash shifts with concurrency-safe open/close operations, immutable opening and signed drawer movements, backend-derived expected cash, and preserved actual/variance close snapshots.
- Added one transaction-owned cash movement per eligible sale payment, customer collection, supplier payment, and refund; non-cash payments and cash tender/change do not alter drawer totals.
- Added idempotent manual cash in/out, company-scoped expense-category lifecycle, atomic cash/non-cash expenses, controlled expense reversal, paginated shift/movement/expense history, and audit records.
- Added migration `20260907180000_phase11_cash_shifts_expenses` with register/shift ownership, source uniqueness, request-hash and value checks, immutable movement/closed-shift/posted-expense guards, and retained PostgreSQL null-safe inventory identities.
- Added ten fine-grained cash/expense permissions, bringing the idempotent catalog to 98 permissions.
- Added a real cash console and POS register-shift status, plus register-aware customer collection, supplier payment, refund, and sale requests.
- Added Phase 11 integration/concurrency coverage within 13 passing suites/80 tests, including duplicate open, movement idempotency, automatic source uniqueness, cash/non-cash separation, expected cash, close-vs-post locking, tenant/branch/register security, and immutability.
- Fixed browser-discovered guarded expense-category loading and stale closed-shift state (`BUG-021`, `BUG-022`), then reverified production browser sale, partial cash due collection (BDT 1,850 to BDT 1,750 outstanding), expense, refund, close/variance, history, disabled drawer actions, and a clean console.
- Phase 11 gate passed with 13-migration clean replay/live equality, PostgreSQL catalog checks, 132-path Swagger, uncached 20/20 repository lint/typecheck/test/build tasks, production Next.js/NestJS builds, Prisma, formatting, Compose, secret scan, Git integrity, and destination capacity checks.
