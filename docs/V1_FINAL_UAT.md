# Vendo V1 Final UAT and Production Readiness

Date: 2026-09-13
Release baseline: `51d7b11e477b8aef6fbf15932f4d5267d3a0c7f3`

## Verdict

**D. NOT READY — PRODUCTION ENVIRONMENT INPUTS MISSING**

The Vendo V1 application release passed the final code, database, recovery, security, dependency, and production-like local acceptance gates described below. No open Medium or High Vendo application defect was found. This verdict does not classify the application as unsafe; external production infrastructure and business-site inputs have not been supplied or provisioned, so deployment acceptance cannot yet be completed.

Version 2 is not started. No external production resource was provisioned or changed during this task.

## Release baseline and repository state

- Branch: `master`.
- Local release HEAD and pre-documentation `origin/master`: `51d7b11e477b8aef6fbf15932f4d5267d3a0c7f3`.
- The release baseline matched the requested commit and had no tracked source changes.
- Existing untracked UI-audit and rollout artifacts were preserved and excluded from the release changes unless explicitly listed in the final commit.
- `pnpm install --frozen-lockfile` passed and the 1,143-entry lockfile passed the repository supply-chain policy.

## Automated release evidence

| Gate                                         | Result                                        |
| -------------------------------------------- | --------------------------------------------- |
| Complete API/business suite                  | PASS — 15 suites, 96 tests, 0 failures        |
| Web suite                                    | PASS — 39/39 tests                            |
| Shared UI suite                              | PASS — 5/5 tests                              |
| Uncached monorepo lint and strict TypeScript | PASS — 10/10 tasks, 0 cached                  |
| Uncached API/shared/Next.js production build | PASS — 5/5 tasks, 0 cached; 18 Next.js routes |
| Prettier and Git whitespace                  | PASS                                          |
| Production dependency audit                  | PASS — no known vulnerabilities               |

The only test-runtime warning is the documented low-severity `BUG-008` future `pg@9` compatibility warning on the pinned supported `pg` 8.23 runtime. It does not represent a current correctness failure.

## Database, migration, backup, and restore acceptance

- PostgreSQL 17 development service was healthy.
- Prisma format, validate, generate, and migration status passed.
- Migration count: **16**; the live database was up to date.
- A fresh empty database replay applied all 16 migrations.
- Normalized live/replay schema comparison was identical with SHA-256 `6a4c3ad541fc7340e22ba801d818ccf62b2a395cf23f531c1dbc1a1a290c31c4`.
- Fresh custom-format backup creation and catalog inspection passed. Backup SHA-256: `449c251dfcb92086ab0ab7e071a7b4c8e2ad7ec3b7d8132454d4d236f77f02c5`.
- Restore into a new isolated database passed.
- Live/restore catalog parity: 64 tables, 291 indexes, 178 foreign keys, 49 checks, and 24 triggers.
- Inventory movement/balance reconciliation reported zero mismatches.
- Representative restored aggregates exactly matched live for inventory balances and movements, customer and supplier ledgers, sales, purchase orders, goods receipts, purchase invoices, cash shifts, and expenses.
- A raw `pg_dump` text comparison had one semantically equivalent parenthesis normalization in `Company_scale_check`; catalog objects and constraint semantics matched. This is not recorded as byte-for-byte dump equality.

This local drill proves the documented procedure and application data invariants. It does not prove production backup protection until an encrypted off-host destination, schedule, retention, monitoring, and target-environment restore rehearsal exist.

## Security acceptance

- Password hashing uses Argon2id with explicit cost parameters.
- Short-lived access tokens, hashed refresh credentials, rotation, family revocation, and reuse detection are covered by the passing authentication regression.
- Permission, company, branch, warehouse, register, profit-visibility, and administration isolation are covered by the complete API/security suite.
- Global validation strips/rejects unknown fields; body-size limits, Helmet headers, explicit credentialed CORS origins, and authentication rate limiting are configured.
- Production configuration rejects wildcard/non-HTTPS CORS, weak/example secrets, loopback production database settings, and enabled development seed/bootstrap flags.
- Swagger is created only outside production.
- Production API and web Docker runtime stages use the unprivileged `vendo` user.
- Production Compose keeps PostgreSQL on the private backend network with no published database port; only Caddy publishes ports 80/443.
- Tracked-files and relevant high-confidence Git-history secret scans found no private keys or provider-token signatures. Broader candidate matches were synthetic integration-test values and permission/config identifiers, not production credentials.
- `.env`, `apps/api/.env`, and production environment files are ignored; production templates contain placeholders only.

## Production asset acceptance

- Production Compose renders successfully with required ephemeral validation values.
- Intended topology is Caddy to private Next.js/NestJS services to private PostgreSQL 17.
- API readiness is `/api/v1/health/ready`; local liveness/readiness and web `/login`/authenticated routes returned HTTP 200.
- Fresh host-side uncached production builds passed.
- Two fresh Docker image rebuild attempts reached the frozen dependency-install step and then timed out while reading the npm registry after the 1,143-entry lockfile policy passed. This is recorded as an external package-registry/network limitation, not an application compilation failure. The current host-side production builds, validated Compose definition, non-root Dockerfiles, and last verified Stage 13 image smoke remain the release evidence; both images must be rebuilt successfully in the target registry/CI environment before deployment.

## Browser, responsive, accessibility, and print acceptance

The immutable release baseline already contains the completed Stage 12 final UI acceptance: authenticated Owner/restricted-user journeys, POS, post-sale, purchasing, inventory, cash/expenses, reports, administration, deep links, thermal/A4 browser print, keyboard/focus/accessibility checks, and clean consoles. This final audit additionally performed a fresh production-server route sweep:

- 18 representative authenticated routes rendered at 1440×900.
- Geist was the computed application font.
- No whole-page horizontal overflow was observed.
- The checked browser console contained no errors or warnings.
- Eight representative Dashboard, POS, Inventory, Purchasing, Customer, Cash, Reports, and Administration routes were rechecked at the active 1280×720 browser viewport with the selected UAT branch, no overflow, and a clean console.
- One rapid navigation pass transiently returned to login while session restoration was still in flight; the existing session restored without credential re-entry. No credential was entered or exposed.
- The release's completed Stage 12 evidence remains authoritative for the full 1024 and supported 390×844 responsive matrix.
- Representative keyboard focus remained visibly rendered with a four-pixel navy focus ring.

No formal WCAG certification is claimed. Stage 12 verified keyboard order, visible focus, accessible names, dialog focus behavior, labels, and status text on representative workflows.

Browser print layout acceptance:

- Approximately 72 mm thermal receipt: PASS in browser print layout/CSS.
- A4 invoice: PASS in browser print layout/CSS.
- Physical thermal-printer acceptance: **PENDING HARDWARE**.
- Physical barcode-scanner acceptance: **PENDING HARDWARE**. Typed/scanner-style barcode behavior is tested, but it is not a substitute for actual scanner hardware.

## Functional UAT status

The final 15-suite API run revalidated the authoritative business behavior for authentication/RBAC, organization, catalog, inventory, parties/ledgers, purchasing, POS/sales, returns/refunds/exchange, cash/expenses, reporting, and security. The Stage 1–12 accepted browser records at this same release baseline cover:

- Owner/Admin: login/session/logout, company, branch, warehouse, register, users, roles, permissions, and restricted navigation.
- Cashier/POS: search/barcode, tile unit and exact batch/shade, customer/pricing/discount, split payment, tender/change/due, completion, invoice/detail/history, inventory, customer ledger, and cash movement.
- Post-sale: collection, partial return, refund, exchange, and void with linked immutable records.
- Purchasing: PO, two partial receipts, invoice, partial payment, return, inventory, batch/shade, payable, and related documents.
- Inventory: authoritative base stock, derived equivalents, opening, adjustment, damage/loss, zero physical count/reconciliation, transfer, and immutable movements.
- Cash/expenses: opening float, automatic and manual movements, cash/non-cash expense, reversal, expected/actual/variance, close, and closed-shift blocking.
- Reports: dashboard, sales, inventory, purchasing, parties, expenses, cash, financial summary, event-date semantics, non-revenue collections, no refund double count, profit permission, and server CSV export.

The current audit did not create a second duplicate set of these financial UAT transactions. Database integrity and behavior were revalidated through the complete API suite and fresh backup/restore reconciliation.

## Open defect classification

- `BUG-008`: Low deferred — future `pg@9` compatibility warning; non-blocking on pinned `pg` 8.23.
- `BUG-034`: External tooling only — historical Codex browser-control failure; not a Vendo runtime defect. Browser control initialized successfully for this final route sweep, but the historical record remains correctly classified.
- `BUG-035` through `BUG-040`: Resolved with regression evidence.
- All other recorded application defects: Resolved.
- Open Medium/High Vendo application defects: **none**.

## Performance sanity

- Bounded server-side pagination/search remains in place for operational lists.
- Phase 13's 10,000-product search fixture and database index-plan evidence remains valid.
- The fresh browser sweep showed no obvious render loop, whole-page overflow, or console failure.
- Report and transaction behavior passed the complete API suite. No release-blocking performance defect was observed.

## Monitoring and backup readiness

The operations and deployment documentation defines health/readiness monitoring, API error and container/process health, PostgreSQL health, disk/resource alerts, certificate expiry, backup-age/failure alerts, and restore-test age. None is provisioned because no target environment or monitoring destination was supplied.

Recommended production backup policy remains:

- automated PostgreSQL custom-format backups;
- encryption before off-host transfer;
- daily backups retained 14 days, weekly backups retained 8 weeks, and monthly backups retained 12 months, unless the business approves another documented policy;
- monitored backup success/failure and age;
- quarterly restore rehearsal plus a restore rehearsal before first live data and material infrastructure changes;
- a final verified backup immediately before real business data entry begins.

## First Owner bootstrap readiness

The bootstrap is explicit, idempotent for the selected company/Owner identity, guarded by `ALLOW_DEV_BOOTSTRAP=true`, requires a company code/name and strong 12+ character mixed-case/numeric password, hashes with Argon2id, and has no committed default credentials. Production rejects the bootstrap flag by default. The real Owner must not be created until the environment exists and the authorized email is supplied through a secure channel. No production Owner was created in this task.

## Missing production environment inputs

The following are required before deployment acceptance:

- target host/provider, server size, operating system/runtime, and administrative access;
- public hostname/domain, DNS provider/access, and TLS/certificate method;
- secure secret injection/storage method and separately generated database, access-token, and refresh-token secrets;
- PostgreSQL persistent storage path/volume and private network/firewall policy;
- encrypted off-host backup destination, credentials supplied outside chat, schedule, retention approval, and monitoring;
- monitoring and alert destinations/recipients;
- authorized first Owner email;
- company display/legal name, phone, email, address, country, currency, and timezone;
- production branches, warehouses, registers, payment methods, initial users, roles, and permissions;
- actual thermal-printer model/paper specification and barcode-scanner model;
- business acceptance owner and approved go-live window.

Do not paste passwords, private keys, JWT secrets, database credentials, or backup-provider tokens into chat or commit them to Git.

## Next task

**Production Environment Provisioning & Deployment Acceptance** — only after the missing environment and business inputs are supplied through appropriate secure channels. Do not start Version 2.
