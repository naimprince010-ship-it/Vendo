# Bug Register

## BUG-001 — Dependency installation blocked by disk exhaustion

- **ID:** BUG-001
- **Severity:** High
- **Area:** Development environment / Phase 1 verification
- **Description:** `create-next-app` dependency installation failed with `ERR_PNPM_ENOSPC`; C: had zero free bytes. A D:-hosted pnpm store permits installation and most verification, but Next.js production compilation cannot resolve a virtual store outside its C:-hosted workspace root.
- **Reproduction:** Run the initial pnpm install while C: has insufficient capacity.
- **Expected:** Workspace dependencies install and root quality commands execute.
- **Actual:** Workspace-local installation exhausts C:. Cross-drive installation succeeds, but `next build` fails to resolve Next.js through the D: virtual-store symlink. Lint, typecheck, tests, API build, and Compose validation pass.
- **Status:** Resolved — repository relocated to `D:\Projects\Vendo`; dependencies were reinstalled with a workspace-local virtual store and the complete Phase 1 gate passed on 2026-09-04.
- **Related task:** Phase 1 — governed monorepo foundation

## BUG-002 — Local PostgreSQL verification blocked by Docker service availability

- **ID:** BUG-002
- **Severity:** High
- **Area:** Development environment / Phase 2 migration verification
- **Description:** Docker Desktop's Linux engine was initially unavailable while `com.docker.service` was stopped and the session could not start the service directly.
- **Reproduction:** Run `docker compose --env-file .env.example up -d postgres` or `Start-Service com.docker.service` in the current session.
- **Expected:** Docker Desktop starts PostgreSQL 17 for migration application and catalog verification.
- **Actual:** Docker initially reported a missing `dockerDesktopLinuxEngine` pipe; Windows reported `Cannot open 'com.docker.service' service on computer '.'`.
- **Status:** Resolved — Docker Desktop was launched through its installed application, PostgreSQL 17 became healthy, and the migration, catalog, invariant, and runtime connectivity checks passed on 2026-09-04.
- **Related task:** Phase 2 — initial migration application and verification

## BUG-003 — Docker restart failed when C: reached zero free bytes

- **ID:** BUG-003
- **Severity:** High
- **Area:** Development environment / Phase 2 verification
- **Description:** Docker Desktop stores host-side VM logs under the user profile on C: even though Docker Desktop and the repository are on other drives. C: reached zero free bytes during the final migration replay check.
- **Reproduction:** Start or restart Docker Desktop when C: has no writable free space.
- **Expected:** Docker starts its Linux engine and preserves the PostgreSQL development volume.
- **Actual:** Docker reported `Docker Desktop cannot continue because the disk is full` while writing `AppData\Local\Docker\log\vm\init.log`; Prisma then lost its shadow-database connection.
- **Status:** Resolved — the 0.82 GiB Puppeteer download cache was moved recoverably to `D:\Projects\.cache-relocation-backup\puppeteer`, Docker restarted, the PostgreSQL volume remained intact, and the migration replay/drift check passed.
- **Related task:** Phase 2 — final verification gate

## BUG-004 — Fully parallel uncached verification exceeded available memory

- **ID:** BUG-004
- **Severity:** Low
- **Area:** Development environment / verification execution
- **Description:** Forcing lint, typecheck, tests, and builds for every package in one Turbo invocation launched too many Node.js processes for the available memory.
- **Reproduction:** Run `pnpm exec turbo run lint typecheck test build --force` on the current machine.
- **Expected:** All uncached checks complete.
- **Actual:** API and web typecheck processes exited with Node.js `Zone Allocation failed - process out of memory` while unrelated tasks were also running.
- **Status:** Resolved — the same uncached lint, typecheck, test, and build tasks passed with `--concurrency=1`; normal root verification commands also pass.
- **Related task:** Phase 2 — final verification gate

## BUG-005 — CommonJS authentication dependencies failed lint/runtime interop

- **ID:** BUG-005
- **Severity:** Medium
- **Area:** API authentication build and tests
- **Description:** TypeScript import-equals syntax made `cookie-parser` and `supertest` callable under CommonJS but violated the typed ESLint policy; synthetic default imports compiled to non-callable `.default` values without interop.
- **Reproduction:** Run the uncached API lint and integration tests with the initial Phase 3 imports.
- **Expected:** Imports satisfy lint and remain callable at runtime.
- **Actual:** Lint rejected import-equals syntax, while the earlier default-import form failed at runtime.
- **Status:** Resolved — enabled TypeScript `esModuleInterop`, used standard default imports, and reverified API lint, typecheck, and all 23 tests.
- **Related task:** Phase 3 — authentication and authorization verification

## BUG-006 — Authentication restoration violated React effect lint rule

- **ID:** BUG-006
- **Severity:** Low
- **Area:** Web authentication state
- **Description:** The initial mount effect directly invoked a callback that mutates authentication state, triggering `react-hooks/set-state-in-effect`.
- **Reproduction:** Run the uncached web lint task against the initial Phase 3 auth context.
- **Expected:** Session restoration synchronizes with the API without a synchronous effect-state cascade.
- **Actual:** Repository lint failed on the mount-time refresh invocation.
- **Status:** Resolved — session restoration now fetches inside the effect and applies state only from its asynchronous continuation; web and repository lint pass.
- **Related task:** Phase 3 — frontend auth foundation

## BUG-007 — Nest production build launched stale or missing output

- **ID:** BUG-007
- **Severity:** High
- **Area:** API production artifact
- **Description:** The build inherited a broad source root and incremental state, producing current files under `dist/src` while `pnpm start` launched stale `dist/main.js`; after output cleanup, a repeated incremental build could emit no `dist` directory.
- **Reproduction:** Build the API, run `pnpm --filter @vendo/api start`, inspect Swagger routes, then repeat the build.
- **Expected:** Every build emits current application code at `dist/main.js` and production start exposes all Phase 3 routes.
- **Actual:** The first smoke run exposed only the Phase 1 health route; a later repeated build removed the output without re-emitting it.
- **Status:** Resolved — restricted the production build to `src`, set its root directory, disabled incremental emission for that build, enabled output cleanup, verified two consecutive API builds, and passed the full repository production build plus live Swagger/auth smoke checks.
- **Related task:** Phase 3 — production build and Swagger gate

## Entry Template

- **ID:** BUG-000
- **Severity:** Critical | High | Medium | Low
- **Area:** Module or subsystem
- **Description:** Concise defect description
- **Reproduction:** Exact reproduction steps
- **Expected:** Expected behavior
- **Actual:** Observed behavior
- **Status:** Open | In Progress | Resolved | Deferred
- **Related task:** Phase/task reference

## Phase 4 Verification Note — 2026-09-06

No new product defect remains open from Phase 4. An initial integration-fixture assertion expected HTTP `201` from the existing login endpoint, which correctly returns `200`; the test expectation was corrected before the complete 32-test regression and production gate passed. Existing `BUG-001` through `BUG-007` remain resolved.

## BUG-008 — PostgreSQL driver emits a pg@9 compatibility warning

- **ID:** BUG-008
- **Severity:** Low
- **Area:** Prisma PostgreSQL adapter / test and concurrent API query runtime
- **Description:** The current Prisma 7.10 PostgreSQL driver adapter can emit a deprecation warning that calling `client.query()` while the client is already executing will be unsupported in pg 9.
- **Reproduction:** Run the database-backed API suite or load several catalog queries concurrently in the authenticated catalog UI.
- **Expected:** Supported concurrent adapter queries run without dependency deprecation output.
- **Actual:** Workflows complete successfully, but pg 8.23 logs a future-compatibility warning.
- **Status:** Deferred — no correctness failure exists on the pinned pg 8 runtime; re-evaluate with a supported Prisma adapter upgrade before pg 9 adoption.
- **Related task:** Phase 5 verification / production dependency maintenance

## BUG-009 — Active batch filter rejected boolean query strings

- **ID:** BUG-009
- **Severity:** Medium
- **Area:** Phase 6 inventory batch API / browser workflow
- **Description:** The initial batch-list DTO validated `isActive` as a boolean without transforming HTTP query-string values, so `?isActive=true` returned validation failure and the stock-operation batch selector remained empty.
- **Reproduction:** Open the production inventory operation form, select a batch-tracked product, and observe the active-batch request before the fix.
- **Expected:** Active batches for the selected company/product appear for allocation.
- **Actual:** The filter was rejected because the literal string `true` did not satisfy `@IsBoolean`.
- **Status:** Resolved — added explicit query-string boolean transformation, rebuilt/restarted the API, and completed the opening-stock browser workflow with the selected batch/shade.
- **Related task:** Phase 6 — optional batch/lot/shade allocation

## Phase 6 Verification Note — 2026-09-06

No Critical/High inventory blocker remains. `BUG-009` was found and resolved during the live browser gate. Deferred `BUG-008` remains a low-severity future pg@9 compatibility warning and did not affect correctness or verification on pinned pg 8.23.

## BUG-010 — Walk-in provisioning trigger omitted Prisma-managed timestamp

- **ID:** BUG-010
- **Severity:** High
- **Area:** Phase 7 database migration / company bootstrap
- **Description:** The first company-insert trigger attempted to create the required walk-in customer without supplying `updatedAt`, which Prisma manages in application writes but PostgreSQL does not default.
- **Reproduction:** Apply the initial Phase 7 migrations and insert a new `Company` directly or through bootstrap.
- **Expected:** Company creation atomically provisions one active company-local walk-in customer.
- **Actual:** PostgreSQL rejected the trigger insert with a not-null violation and rolled back company creation.
- **Status:** Resolved — additive migration `20260906155500_phase7_walkin_timestamp_fix` supplies `CURRENT_TIMESTAMP`; the original applied migration was not edited, and the Phase 7 integration test now verifies provisioning and protection.
- **Related task:** Phase 7 — walk-in customer foundation

## BUG-011 — Serializable party posting returned a write conflict under concurrency

- **ID:** BUG-011
- **Severity:** High
- **Area:** Phase 7 customer/supplier ledger concurrency
- **Description:** The initial ledger transaction combined PostgreSQL serializable isolation with a transaction-scoped party advisory lock. A waiting concurrent request established its serializable snapshot before obtaining the lock and could fail with `P2034` instead of returning the deterministic opening-balance conflict.
- **Reproduction:** Submit two different idempotency keys concurrently to the same customer's opening-balance endpoint.
- **Expected:** Exactly one immutable opening entry is committed; the competing request receives HTTP `409`.
- **Actual:** One request committed and the other returned HTTP `500` from a serialization conflict.
- **Status:** Resolved — retained the per-party advisory lock and used PostgreSQL read-committed transaction semantics so the waiter observes the committed entry after acquiring the lock. The dedicated concurrent-posting integration test passes.
- **Related task:** Phase 7 — ledger transaction safety

## Phase 7 Verification Note — 2026-09-06

No Critical/High customer, supplier, tenant, financial-foundation, migration, API, or UI blocker remains. `BUG-010` and `BUG-011` were found by migration/integration gates and resolved with additive migration and transaction changes before final verification. Deferred `BUG-008` remains a low-severity future pg@9 compatibility warning on the pinned pg 8.23 runtime.

## BUG-012 — Generated Phase 8 migration dropped null-safe indexes and added an ambiguous relation

- **ID:** BUG-012
- **Severity:** High
- **Area:** Phase 8 Prisma migration / relational integrity
- **Description:** Prisma's first generated Phase 8 SQL proposed dropping two PostgreSQL-only Phase 6 `NULLS NOT DISTINCT` indexes and inferred an unintended second PurchaseInvoice-to-return-item foreign key.
- **Reproduction:** Inspect the initially generated Phase 8 migration before finalizing the schema relation.
- **Expected:** Phase 6 batch/count identity constraints remain intact and return items reference one optional invoice line through a company-safe key.
- **Actual:** The generated SQL dropped both indexes and added `purchaseInvoiceId` independently of `invoiceItemId`.
- **Status:** Resolved — the original generated migration checksum was preserved, an additive constraints migration removes the unintended relation, adds a composite invoice-line key/FK, and restores both null-safe indexes. Fresh replay/drift verification is required by the gate.
- **Related task:** Phase 8 — migration inspection and purchasing returns

## BUG-013 — Zero-value Decimal was treated as a positive purchase-return credit

- **ID:** BUG-013
- **Severity:** High
- **Area:** Phase 8 purchase return / supplier ledger
- **Description:** Decimal.js reports positive zero as positive for sign inspection, causing a received-only return to attempt a zero supplier-ledger entry that violates the non-zero ledger check.
- **Reproduction:** Post a purchase return with a receipt line but no supplier invoice/invoice line.
- **Expected:** Inventory decreases and no financial ledger entry is created.
- **Actual:** The initial implementation attempted a zero `PURCHASE_RETURN` ledger entry and the entire atomic operation rolled back.
- **Status:** Resolved — financial posting now requires `financialTotal > 0`; the integration suite verifies an inventory-only return leaves supplier ledger balance unchanged.
- **Related task:** Phase 8 — received-only purchase return

## BUG-014 — Purchase-order detail omitted batch-tracking metadata

- **ID:** BUG-014
- **Severity:** High
- **Area:** Phase 8 goods-receipt UI / tile batches
- **Description:** The initial PO-detail projection omitted `product.batchTracking`, so the receiving form did not render required batch/lot/shade inputs for a batch-tracked tile.
- **Reproduction:** Select a confirmed batch-tracked tile PO line in the production receiving UI.
- **Expected:** Batch number and optional lot/shade controls are displayed before posting.
- **Actual:** The controls stayed hidden and the backend would correctly reject the incomplete receipt.
- **Status:** Resolved — PO detail now includes the authoritative batch-tracking flag; production UI/browser receiving is reverified with explicit batch, lot, and shade.
- **Related task:** Phase 8 — tile batch receiving browser gate

## BUG-015 — Initial Phase 9 migration collided with existing sale check names

- **ID:** BUG-015
- **Severity:** High
- **Area:** Database migration / sales foundation
- **Description:** The first development deployment attempted to add Phase 9 sale checks using names already created by Phase 2. Because earlier migration statements had committed, retrying also encountered newly created indexes.
- **Reproduction:** Deploy the initially generated Phase 9 SQL against the migrated Phase 8 development database.
- **Expected:** The additive migration replaces the intended legacy checks and applies atomically/retry-safely.
- **Actual:** PostgreSQL rejected the duplicate constraint name after some additive DDL had run.
- **Related task:** Phase 9 — sale lifecycle migration
- **Status:** Resolved — inspected the partial state, removed only empty Phase 9 objects, restored retained Phase 6 identities, marked the failed attempt rolled back, and corrected the unapplied migration to drop/recreate the named checks. Deployment, 11-migration clean replay, and normalized live/replay schema hash now pass.

## BUG-016 — Nested sale-item create supplied a relation-owned company field

- **ID:** BUG-016
- **Severity:** High
- **Area:** Sales completion / Prisma persistence
- **Description:** The first sale integration run supplied `companyId` inside a nested `Sale.items.create`, which Prisma rejects for the relation-aware nested create shape.
- **Reproduction:** Complete a valid sale through `POST /sales/complete` using the initial implementation.
- **Expected:** Sale header and lines persist in the same transaction.
- **Actual:** Prisma validation rejected the nested line payload and rolled back the transaction.
- **Related task:** Phase 9 — atomic sale completion
- **Status:** Resolved — the nested create now derives tenant ownership through its parent sale relation while line product/unit/batch ownership remains explicitly revalidated. The 66-test regression suite passes.

## BUG-017 — POS context defaults violated React effect lint policy

- **ID:** BUG-017
- **Severity:** Medium
- **Area:** POS frontend / quality gate
- **Description:** Initial warehouse, register, customer, and payment-method defaults were synchronously copied from query data into component state inside an effect.
- **Reproduction:** Run the web ESLint gate against the initial Phase 9 POS console.
- **Expected:** Server-derived defaults do not cause effect-driven state cascades.
- **Actual:** `react-hooks/set-state-in-effect` failed the build gate.
- **Related task:** Phase 9 — desktop cashier UI
- **Status:** Resolved — defaults are derived from query data and local explicit overrides; web lint and typecheck pass.

## BUG-018 — Bootstrapped Cash method was not classified as cash

- **ID:** BUG-018
- **Severity:** High
- **Area:** Company bootstrap / POS settlement
- **Description:** The Phase 8 default payment-method bootstrap created `CASH` without setting `isCash`, leaving its database default false.
- **Reproduction:** Bootstrap a company, then complete a sale with the default Cash method and a tendered amount.
- **Expected:** Cash accepts tendered amount and calculates change; non-cash methods reject tendered cash.
- **Actual:** The API correctly rejected tendered amount because the bootstrapped method was misclassified as non-cash.
- **Related task:** Phase 9 — live sale settlement verification
- **Status:** Resolved — bootstrap definitions now explicitly synchronize `isCash=true` only for Cash and false for Bank/Card/MFS. Bootstrap idempotency and the live cash/change workflow are reverified.

## BUG-019 — Browser verification runtime cannot initialize

- **ID:** BUG-019
- **Severity:** Medium (phase-gate blocker)
- **Area:** Verification environment / Phase 9 browser workflow
- **Description:** The app-provided browser control runtime fails before executing any browser command with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`.
- **Reproduction:** Initialize the required browser-control runtime, including after resetting it and retrying against `http://localhost:3000/login`.
- **Expected:** The production Next.js app opens so login, barcode/search, cart, hold/resume, completion, history, invoice detail, and console state can be verified interactively.
- **Actual:** The initial attempts failed before browser selection or navigation. On 2026-09-07 the runtime initialized successfully and allowed the complete production workflow to run.
- **Related task:** Phase 9 — production browser gate
- **Status:** Resolved — the runtime initialized on retry; login/context, barcode tile and sanitary cart, BOX conversion, batch/shade, hold/resume, cash change, completion, invoice/history, inventory deduction, named-customer credit ledger, and clean-console checks all passed.

## Phase 8 Verification Note — 2026-09-06

No Critical/High purchasing, inventory-integration, supplier-ledger, migration, API, or UI blocker remains. `BUG-012`, `BUG-013`, and `BUG-014` were found and resolved before the final gate. One parallel Turbo lint attempt exhausted the local Node worker heap while production verification servers were still resident; after those servers were stopped, the required uncached sequential lint run passed 5/5 with a 4096 MiB worker ceiling. This was an execution-resource failure, not a source defect. The guarded seed also correctly refused an invocation without `ALLOW_DEV_SEED=true`, then passed twice when explicitly authorized. Deferred `BUG-008` remains the only known issue and is a low-severity future pg@9 compatibility warning on the pinned pg 8.23 runtime.

## BUG-020 — Nested Phase 10 writes supplied relation-owned tenant fields

- **ID:** BUG-020
- **Severity:** High
- **Area:** Sale return/refund and customer collection persistence
- **Description:** Initial Phase 10 nested Prisma creates supplied `companyId` on relation-owned return lines and payment allocations, which Prisma's checked nested-write shape rejects.
- **Reproduction:** Run the first Phase 10 integration suite against valid collection and return requests.
- **Expected:** Parent-owned tenant identity is derived by the checked relation while all referenced IDs are company-revalidated before persistence.
- **Actual:** Prisma rejected the nested input and the transaction rolled back.
- **Status:** Resolved — relation-owned tenant fields were removed only from nested create payloads; company/product/unit/batch/customer/sale ownership remains explicitly validated and composite foreign keys remain authoritative. All 12 suites/75 tests pass.
- **Related task:** Phase 10 — customer collection and sale return persistence

## Phase 10 Verification Note — 2026-09-07

No Critical/High payment, collection, customer-ledger, return/refund/exchange, inventory, migration, API, security, or UI blocker remains. `BUG-020` and one stale Phase 7 ledger caption were found and resolved before the final gate. The production browser verified all required flows and a clean console. Temporary verification credentials and their local auth/audit rows were removed after use; transactional browser evidence remains as development data. Deferred `BUG-008` remains the only known issue and is a low-severity future pg@9 compatibility warning on pinned pg 8.23.

## BUG-021 — Expense categories were not loaded with active branch context

- **ID:** BUG-021
- **Severity:** High
- **Area:** Phase 11 expense frontend / authorization context
- **Description:** The expense-category query omitted the required `x-branch-id` header enforced by the cash controller's active-branch guard, so a successfully created category did not populate the category list or expense selector.
- **Reproduction:** In the production cash console, create an expense category and attempt to select it for a new expense.
- **Expected:** The authenticated company category appears immediately and can be used for a permitted branch expense.
- **Actual:** Creation committed, but the guarded list request failed and the selector remained empty.
- **Status:** Resolved — the category query is branch-context keyed and sends the validated active branch; production browser creation, selection, and cash-expense posting pass.
- **Related task:** Phase 11 — expense categories and expenses

## BUG-022 — Closed drawer remained displayed as an active shift

- **ID:** BUG-022
- **Severity:** High
- **Area:** Phase 11 cash frontend / shift lifecycle
- **Description:** Nest returns an empty body when the current-shift endpoint has no open shift. The generic browser API helper attempted JSON parsing, leaving TanStack Query's last successful OPEN shift data visible after close.
- **Reproduction:** Close an active shift, wait for query invalidation, and inspect the cash header and action controls.
- **Expected:** The register shows no open shift and drawer actions are disabled.
- **Actual:** Shift history was CLOSED, but the active card and cash controls retained stale OPEN state.
- **Status:** Resolved — empty successful responses are handled explicitly and the current-shift query normalizes them to `null`; the rebuilt production UI shows `No shift open`, disables cash actions, and preserves closed history.
- **Related task:** Phase 11 — shift close and reconciliation

## Phase 11 Verification Note — 2026-09-08

No Critical/High cash-shift, drawer-movement, expense, payment-integration, migration, API, security, concurrency, or UI blocker remains. `BUG-021` and `BUG-022` were found through the production browser gate and resolved before the full uncached gate. Browser evidence verifies applied sale cash (not tender/change), a named-customer partial cash collection reducing invoice outstanding from BDT 1,850 to BDT 1,750, cash expense, cash refund, expected/actual/variance closing, disabled closed-drawer actions, history, and a clean console. The temporary verification account is disabled, has no role, and has no active session; it is retained only because immutable business/audit records reference its actor identity. Transactional browser evidence remains as development data. Deferred `BUG-008` remains the only known issue and is a low-severity future pg@9 compatibility warning on pinned pg 8.23.

## BUG-023 — Historical snapshot backfill blocked by sale-line immutability

- **ID:** BUG-023
- **Severity:** High
- **Area:** Phase 12 migration / historical invoice snapshots
- **Description:** The first development migration attempt added nullable snapshot columns, then the Phase 10 completed-sale trigger rejected the controlled backfill.
- **Reproduction:** Apply the original Phase 12 migration to a database containing completed sale lines.
- **Expected:** Existing sale lines receive display snapshots while runtime mutation protection remains enabled after migration.
- **Actual:** PostgreSQL raised `completed sale items are immutable`; the backfill did not commit.
- **Status:** Resolved — the migration disables only `SaleItem_completed_immutable` around the one-time composite-tenant backfill and re-enables it before enforcing non-null columns. The partial development attempt was explicitly cleaned, and the corrected migration applies successfully.
- **Related task:** Phase 12 — immutable receipt/invoice reprints

## Phase 12 Verification Note — 2026-09-08

No Critical/High reporting, financial-definition, inventory-equivalence, historical-document, migration, API, permission, tenant-isolation, browser, or print blocker remains. `BUG-023` was resolved before the additive migration was replayed cleanly and compared with the live schema. The complete API suite passes (14 suites/85 tests), all eight checked financial immutability triggers are enabled, Phase 12 test fixtures were removed, and the production browser verified real dashboard/report/invoice data with a clean console. The in-app browser did not surface the blob-anchor download event, so CSV correctness is supported by the real API integration test rather than a claimed browser download. Deferred `BUG-008` remains the only known issue and is a low-severity future pg@9 compatibility warning on pinned pg 8.23.

## BUG-024 — Production dependency audit found transitive high advisories

- **ID:** BUG-024
- **Severity:** High
- **Area:** Production dependencies
- **Description:** The initial Phase 13 audit reported high-severity advisories in transitive `deepmerge-ts` and `mysql2` versions used by Prisma tooling.
- **Reproduction:** Run the production dependency audit before the Phase 13 overrides.
- **Expected:** No known high-severity dependency vulnerability ships in the verified lockfile.
- **Actual:** Two transitive vulnerable versions were selected.
- **Status:** Resolved — workspace overrides select `deepmerge-ts` 8.0.2 and `mysql2` 3.23.1; frozen reinstall and the final production audit report no known vulnerabilities.
- **Related task:** Phase 13 — dependency and supply-chain gate

## BUG-025 — Production API image omitted the Express runtime

- **ID:** BUG-025
- **Severity:** High
- **Area:** Production API container packaging
- **Description:** The first API image built from a legacy workspace deployment layout but failed at runtime because Express was only available transitively and was absent from the deployed production tree.
- **Reproduction:** Start the first Phase 13 API image and request readiness.
- **Expected:** The non-root image starts the compiled NestJS artifact with all declared runtime dependencies.
- **Actual:** Node terminated with `Cannot find module 'express'`.
- **Status:** Resolved — Express is an explicit API runtime dependency, workspace packages are injected for deterministic `pnpm deploy --prod`, and the rebuilt non-root image passes readiness, liveness, request-ID, 404, and production-Swagger smoke checks.
- **Related task:** Phase 13 — production container verification

## BUG-026 — Substring catalog search lacked an executable index plan

- **ID:** BUG-026
- **Severity:** High
- **Area:** Catalog and party search performance
- **Description:** Case-insensitive `contains` queries compile to leading-wildcard `ILIKE`, which ordinary B-tree indexes cannot efficiently serve as SME data grows.
- **Reproduction:** Inspect product/customer/supplier substring plans before the Phase 13 search migration.
- **Expected:** Bounded user-entered substring search has an index strategy at the documented SME scale.
- **Actual:** The database had only B-tree search keys and could fall back to sequential scans.
- **Status:** Resolved — migration `20260908180000_phase13_search_performance` enables `pg_trgm` and adds 18 GIN indexes. A guarded 10,000-product fixture verifies the intended warm GIN plan and sub-2 ms local database timings.
- **Related task:** Phase 13 — controlled performance gate

## BUG-027 — Docker build cache corruption and host temporary data blocked image rebuild

- **ID:** BUG-027
- **Severity:** Medium
- **Area:** Verification environment / production image gate
- **Description:** Docker Desktop BuildKit reported snapshot/cache failures while the host system drive was constrained by an obsolete installer temporary directory.
- **Reproduction:** Rebuild the corrected API production image in the affected local Docker Desktop state.
- **Expected:** A clean production image rebuild completes without changing application or database data.
- **Actual:** BuildKit could not materialize a valid snapshot until its disposable cache and host capacity were remediated.
- **Status:** Resolved — only disposable BuildKit cache was pruned; the obsolete 788 MB installer temporary directory was moved recoverably to `D:\TempArchive`; images/volumes and PostgreSQL data were preserved, and both production images passed smoke tests.
- **Related task:** Phase 13 — production image verification

## BUG-028 — New Multer denial-of-service advisories entered the final audit

- **ID:** BUG-028
- **Severity:** High
- **Area:** Production dependencies / request parsing
- **Description:** The final live registry audit began reporting newly published denial-of-service advisories against transitive Multer 2.2.0 after the earlier dependency gate had passed.
- **Reproduction:** Run `pnpm audit --prod --audit-level low` against the pre-fix Phase 13 lockfile on 2026-09-09.
- **Expected:** No known High vulnerability remains in the production dependency graph at release time.
- **Actual:** Three High and one Low Multer advisories were reported through Nest platform dependencies.
- **Status:** Resolved — the workspace now selects patched Multer 2.3.0; the frozen install, full affected quality suite, production audit, and rebuilt API image/runtime smoke test pass.
- **Related task:** Phase 13 — final time-sensitive dependency gate

## Phase 13 Verification Note — 2026-09-09

No Critical/High audit, authorization, tenant/branch, inventory, financial, migration, recovery, dependency, container, browser, or operational-documentation blocker remains. `BUG-024` through `BUG-028` were resolved before the final gate. The complete API suite passes (15 suites/92 tests), all 15 migrations replay from zero, restored catalog/invariant counts match live, both production images run as non-root, and the representative production browser workflow has a clean console. The disposable browser operator is disabled with zero roles and zero active sessions. `BUG-008` remains the sole known issue: a Low future pg@9 compatibility warning on the supported pinned pg 8.23 runtime.

## BUG-029 — Stage 1 browser-control runtime fails before navigation

- **ID:** BUG-029
- **Severity:** Medium
- **Area:** Verification environment / V1 UI redesign Stages 1–2
- **Description:** The Codex Desktop browser-control runtime cannot initialize, so the required interactive production browser smoke and console inspection cannot run for the UI foundation or application shell.
- **Reproduction:** Initialize the approved in-app browser control runtime before navigating to `http://localhost:3000/login`.
- **Expected:** Browser connection initializes, the existing application routes can be smoke-tested, and the browser console can be inspected.
- **Actual:** Initialization fails twice before browser selection or navigation with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`.
- **Status:** Resolved — on 2026-09-10 the fresh Codex in-app browser runtime initialized successfully. Login, authenticated routes, responsive shell behavior, representative module rendering, sign-out/anonymous redirect, and console inspection completed. The prior error remains classified as an external runtime failure rather than a Vendo defect.
- **Related task:** Approved V1 UI redesign — Stage 1 deferred browser gate and Stage 2 manual acceptance

## BUG-030 — Stage 2 browser acceptance exposed shell routing/accessibility defects

- **ID:** BUG-030
- **Severity:** Medium
- **Area:** V1 UI redesign Stage 2 application shell
- **Description:** Interactive acceptance found four bounded shell defects: expanded sidebar labels remained hidden at 1440 px, `/app/suppliers` opened the Customers tab, closing the mobile drawer during link activation could cancel navigation, and compact icon-only links lacked accessible names.
- **Reproduction:** Open the production build at 1440 × 900, `/app/suppliers`, 390 × 844, and 1280 × 720 respectively; inspect the sidebar labels, initial party tab, mobile route activation, and compact navigation accessibility tree.
- **Expected:** Expanded labels are visible, Suppliers opens supplier content, mobile navigation changes route then closes, and compact links retain route names.
- **Actual:** Labels were hidden, Suppliers defaulted to Customers, the drawer unmounted before navigation could complete, and compact link names were absent.
- **Status:** Resolved — breakpoint visibility was corrected, `PartiesConsole` now accepts the Suppliers initial tab, drawer visibility is tied to the pathname that opened it so route activation completes before closure, and every navigation link has an explicit accessible label. Production browser retest and clean-console inspection pass.
- **Related task:** Approved V1 UI redesign — Stage 2 browser acceptance

## BUG-031 — Expanded shell obscured the Stage 3 POS workspace

- **ID:** BUG-031
- **Severity:** High
- **Area:** V1 UI redesign Stage 3 browser acceptance / Stage 2 shell
- **Description:** At 1440 × 900, navigation SVGs expanded to the sidebar width and the main content retained a 72px offset while the sidebar expanded to 256px, obscuring the left POS column.
- **Reproduction:** Open the production POS at 1440 × 900 before the fix and inspect navigation icon bounds and the main/sidebar x coordinates.
- **Expected:** Navigation icons remain 20px, the 256px expanded sidebar has a matching 256px content offset, and all three POS columns remain visible without horizontal page scrolling.
- **Actual:** Caller classes replaced the icon `size-5` class, producing 207px SVGs; the expanded sidebar was 256px while main content started at 72px, placing product search beneath the fixed sidebar.
- **Status:** Resolved — `NavigationIcon` now merges its required size with caller classes, and the expanded shell explicitly overrides the compact content offset. Production verification reports 256px/256px at 1440 and 72px/72px at 1280 with viewport-width documents and a clean console.
- **Related task:** Approved V1 UI redesign — Stage 3 POS cashier workspace

## BUG-032 — Invoice adjustments leaked into a new cart after hold/completion

- **ID:** BUG-032
- **Severity:** High
- **Area:** V1 UI redesign Stage 3 POS state lifecycle
- **Description:** Invoice discount/tax remained visible after holding or completing a sale, and a held sale resumed after reload had no deterministic reconstruction of its invoice-level adjustments.
- **Reproduction:** Apply an invoice discount, hold or complete the sale, then inspect the empty cart; separately reload before resuming the held sale.
- **Expected:** A fresh cart starts with zero invoice adjustments, while a resumed sale restores its original invoice-only discount and tax without duplicating line-level values.
- **Actual:** Local component state retained the previous adjustment; same-session resume appeared correct accidentally, while a reload could lose the held invoice adjustment.
- **Status:** Resolved — hold/completion now clear invoice adjustments, and resume derives invoice-only values by subtracting immutable line totals from the sale document totals with Decimal-safe helpers. Production browser verification observed `50 → 0 → 50` across hold/resume and `50 → 0` on completion.
- **Related task:** Approved V1 UI redesign — Stage 3 POS cashier workspace

## Stage 3 Verification Note — 2026-09-10

No Critical/High POS presentation, scanner, tile conversion, batch/shade, pricing, hold/resume, split-payment, due, completion, responsive-layout, regression, or browser-console blocker remains. `BUG-031` and `BUG-032` were resolved during interactive acceptance. The production browser completed invoice `INV-000003` with a named-customer due, verified exact inventory deduction, and completed invoice `INV-000004` while proving held adjustment restoration and post-completion reset; five web tests and the 14 affected Phase 9/10 API tests pass. The existing Low deferred `BUG-008` remains unchanged.

## BUG-033 — Completed exchange lacked visible linked-sale navigation

- **ID:** BUG-033
- **Severity:** Medium
- **Area:** V1 UI redesign Stage 4 exchange history
- **Description:** After an atomic exchange completed, the original Sale Detail timeline showed the exchange reference and financial values but did not expose the replacement sale, while the replacement invoice did not expose its original sale.
- **Reproduction:** Complete an exchange, reload the original and replacement Sale Detail routes, and inspect the human-readable transaction history.
- **Expected:** Both immutable sale records expose their exchange reference and direct navigation to the linked counterpart.
- **Actual:** The backend relation was present but no linked-sale navigation was rendered.
- **Status:** Resolved — Sale Detail now renders a bidirectional linked-exchange card with exchange reference, applied credit/settlement context, and direct original/replacement sale links. Production browser verification passed on both sides with a clean console.
- **Related task:** Approved V1 UI redesign — Stage 4 sale detail and post-sale workflows

## Stage 4 Verification Note — 2026-09-11

No Critical/High sale-detail, historical snapshot, outstanding, collection, return, exact batch/shade restoration, refund-capacity, exchange, void, print-access, responsive-layout, regression, or browser-console blocker remains. `BUG-033` was found and resolved during interactive acceptance. Production browser workflows created only synthetic local UAT events, verified the customer ledger and exact inventory position, and left the preserved UAT data intact. Eight web tests, the 14 affected Phase 9/10 API tests, formatting, warning-free lint, strict TypeScript, the 18-route Next.js production build, and clean-console inspection pass. The existing Low deferred `BUG-008` remains unchanged.

## Stage 5 Verification Note — 2026-09-12

No Critical/High catalog, adaptive-product-form, tile/sanitary separation, commercial conversion, unit-price, barcode, master-data lifecycle, search/pagination, responsive-layout, regression, or browser-console blocker remains. Production browser workflows used only synthetic local UAT records and verified product creation/editing, detail presentation, independent pricing, barcode search, category lifecycle, adaptive TILE/SANITARY fields, and clean-console behavior. Full API regression (15 suites/92 tests), 11 web tests, 5 shared UI tests, formatting, lint, strict TypeScript, and production builds pass. The transient Docker/PostgreSQL startup interruption was an environment availability issue; PostgreSQL recovered cleanly and the complete gate passed. The existing Low deferred `BUG-008` remains unchanged.

## BUG-034 — Stage 6 browser-control runtime fails before navigation

- **ID:** BUG-034
- **Severity:** Medium
- **Area:** Verification environment / V1 UI redesign Stage 6
- **Description:** The Codex Desktop browser-control runtime cannot initialize, so the required interactive Inventory workflows, responsive checks, and browser-console inspection cannot run.
- **Reproduction:** Initialize browser control for `http://localhost:3000/app/inventory` after the production web and API services are healthy.
- **Expected:** Browser control initializes and can run the required tile stock, opening, adjustment, damage/loss, physical count, transfer, movement-history, responsive, and console checks.
- **Actual:** Initialization fails before browser selection or Vendo navigation with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`.
- **Status:** Open — external Codex tooling issue, non-blocking for Stage 6 after the approved human-Chrome fallback. Human Inventory workflows, responsive checks, clean-console inspection, and independent API/database reconciliation pass; Codex automated browser control remains unverified and this is not a Vendo application defect.
- **Related task:** Approved V1 UI redesign — Stage 6 Inventory acceptance

## BUG-035 — Inventory mutation forms retained an empty unit ID

- **ID:** BUG-035
- **Severity:** High
- **Area:** V1 UI redesign Stage 6 / Inventory mutation integration
- **Description:** Selecting a product reset the controlled stock-line `unitId` to an empty string while the native unit selector visually displayed its first option. An asynchronous product-detail effect was expected to repair the state later, so every shared mutation form could look complete while client preflight remained invalid.
- **Reproduction:** In Opening Stock, Adjustment, Damage/Loss, Transfer, or Physical Count, select a product and complete the visible fields before the product-detail synchronization repairs `unitId`; the review/create action remains silently disabled and no API request or database record is produced.
- **Expected:** Product selection synchronously assigns the product base unit, all required-field failures are visible, and a valid submit reaches the existing authenticated Inventory API.
- **Actual:** The displayed unit and controlled form value could disagree; validation silently blocked the mutation before the request layer.
- **Status:** Resolved — product selection now synchronously sets the base-unit ID from the already-loaded catalog reference, the fragile effect was removed, and explicit line/location/reason/batch validation is surfaced. Focused tests, production builds, direct API controls, exact database reconciliation, Phase 6/8/9/10 regressions, and post-fix human Chrome mutation acceptance all pass.
- **Related task:** Approved V1 UI redesign — Stage 6 Inventory mutation acceptance

## BUG-036 — Physical Count rejected an exact zero quantity

- **ID:** BUG-036
- **Severity:** High
- **Area:** Phase 6 Inventory / physical-count validation
- **Description:** Physical Count reused the positive-only stock-operation line DTO and domain resolver, while its database check also required positive entered transaction quantity. A legitimate count of zero was rejected before draft creation.
- **Reproduction:** In UAT-WH-2, create a count for `UAT-BASIN-01` with system stock 1 PCS and counted quantity 0 PCS.
- **Expected:** Draft stores snapshot 1 and counted 0; posting creates one −1 PCS reconciliation movement and leaves balance at zero.
- **Actual:** API returned the inherited positive-regex validation error and created no draft.
- **Status:** Resolved — Physical Count now has a dedicated non-negative DTO, count-only domain resolution permits zero, the UI maps validation failures to `Counted quantity must be zero or greater.`, and additive migration `20260912064000_phase6_zero_physical_count` updates only the count-item constraint. UAT count `COUNT-UAT-ZERO-1789203188` posted idempotently with snapshot 1, counted 0, exactly one −1 PCS movement, and a final zero balance. Human Chrome reload/presentation acceptance and independent API/database reconciliation pass.
- **Related task:** Approved V1 UI redesign — Stage 6 physical-count acceptance
