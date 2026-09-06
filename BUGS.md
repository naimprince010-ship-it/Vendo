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

## Phase 8 Verification Note — 2026-09-06

No Critical/High purchasing, inventory-integration, supplier-ledger, migration, API, or UI blocker remains. `BUG-012`, `BUG-013`, and `BUG-014` were found and resolved before the final gate. One parallel Turbo lint attempt exhausted the local Node worker heap while production verification servers were still resident; after those servers were stopped, the required uncached sequential lint run passed 5/5 with a 4096 MiB worker ceiling. This was an execution-resource failure, not a source defect. The guarded seed also correctly refused an invocation without `ALLOW_DEV_SEED=true`, then passed twice when explicitly authorized. Deferred `BUG-008` remains the only known issue and is a low-severity future pg@9 compatibility warning on the pinned pg 8.23 runtime.
