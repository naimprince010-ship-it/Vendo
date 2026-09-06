# Changelog

All meaningful project changes are recorded here. This project follows a phase-oriented development history rather than release claims based on file presence.

## Unreleased

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
