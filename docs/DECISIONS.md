# Architecture Decision Log

## ADR-001 — Modular Monolith

- **Date:** 2026-09-04
- **Context:** The product has broad transactional scope but is operated and evolved as one business system.
- **Decision:** Use a modular monolith with a Next.js web app and a NestJS API in one monorepo.
- **Alternatives:** Microservices; single full-stack Next.js deployment.
- **Rationale:** Strong module boundaries and independent frontend/backend deployment without premature distributed-system complexity.
- **Consequences:** Domain modules must not bypass their public application services; extraction remains possible if demonstrated later.

## ADR-002 — Reusable POS Core

- **Date:** 2026-09-04
- **Context:** Version 1 targets tiles and sanitary retail/wholesale, while core commerce behavior may support other retail later.
- **Decision:** Keep identity, organization, catalog, inventory, parties, purchasing, sales, payments, expenses, and audit concepts industry-neutral.
- **Alternatives:** A tile-only data model.
- **Rationale:** Avoids embedding tile assumptions in every transaction while retaining explicit domain support.
- **Consequences:** Industry extensions reference core products rather than redefine them.

## ADR-003 — Separate Tile Domain Profile

- **Date:** 2026-09-04
- **Context:** Tile dimensions, finish, shade, coverage, and pieces per box do not apply to normal retail products.
- **Decision:** Store tile-only attributes in a one-to-one tile profile and optional batch records.
- **Alternatives:** Nullable tile columns on Product; schemaless JSON only.
- **Rationale:** Preserves type-safe tile logic and a clean reusable Product core.
- **Consequences:** Tile workflows join the profile and validate its invariants.

## ADR-004 — Movement Ledger as Inventory Authority

- **Date:** 2026-09-04
- **Context:** Stock must be traceable to purchases, sales, transfers, adjustments, and reversals.
- **Decision:** Every stock change creates an immutable inventory movement; balance records are transactional projections for performance.
- **Alternatives:** A mutable `product.quantity` counter.
- **Rationale:** Provides auditability, reconciliation, and defensible transaction history.
- **Consequences:** No feature may mutate stock without a movement and atomic balance update.

## ADR-005 — One Authoritative Tile Base Quantity

- **Date:** 2026-09-04
- **Context:** Boxes, pieces, square feet, and square metres describe the same physical tiles.
- **Decision:** Persist inventory quantities in a product-defined base unit. Derived quantities are never independent stock counters.
- **Alternatives:** Separate quantity columns per display unit.
- **Rationale:** Prevents contradictory stock and rounding drift.
- **Consequences:** Movements retain transaction unit and conversion factor for audit, while base quantity controls availability.

## ADR-006 — Controlled Unit Conversion

- **Date:** 2026-09-04
- **Context:** Sales and receiving occur in boxes, pieces, and area units.
- **Decision:** Version and validate product-aware conversion rules in backend domain services, using Decimal arithmetic.
- **Alternatives:** Frontend-only calculations; global conversion rules for product-specific packaging.
- **Rationale:** Backend authority prevents manipulated or inconsistent quantities.
- **Consequences:** APIs accept transaction units but calculate and persist base quantities server-side.

## ADR-007 — Optional Batch/Lot/Shade Tracking

- **Date:** 2026-09-04
- **Context:** Shade consistency matters for tiles but not every product requires batch allocation.
- **Decision:** Batch tracking is opt-in per product and required by inventory/sale services only when enabled.
- **Alternatives:** Force batches globally; ignore tile shade.
- **Rationale:** Supports tile operations without burdening sanitary/general products.
- **Consequences:** Batch-enabled movements must identify and lock the relevant batch balance.

## ADR-008 — Financial Precision

- **Date:** 2026-09-04
- **Context:** JavaScript binary floating point is unsafe for authoritative money calculations.
- **Decision:** Use PostgreSQL `numeric`, Prisma Decimal, explicit rounding policy, and string-based API serialization for monetary values.
- **Alternatives:** JavaScript `number`; integer minor units only.
- **Rationale:** Supports BDT today and configurable currency/decimal behavior later.
- **Consequences:** The API is authoritative for all totals and the frontend must not recompute financial truth.

## ADR-009 — Composite Tenant and Location Foreign Keys

- **Date:** 2026-09-04
- **Context:** A valid UUID from another company or branch must not become a valid relationship merely because it exists.
- **Decision:** Business tables carry company scope and key location relationships use composite foreign keys such as `(warehouseId, branchId, companyId)`.
- **Alternatives:** Single-column foreign keys plus API-only tenant checks; separate database schemas per company.
- **Rationale:** Database-enforced ownership provides defense in depth without introducing SaaS tenancy infrastructure.
- **Consequences:** Candidate composite unique keys are present on parent tables and mutations must provide consistent scope IDs.

## ADR-010 — Transaction Foundations Now, Workflow Tables When Implemented

- **Date:** 2026-09-04
- **Context:** Later phases require stable sale, purchase, payment, cash, inventory, and audit keys, but return/session/accounting lifecycles are not yet implemented.
- **Decision:** Create normalized transaction headers, lines, allocations, and inventory foundations in Phase 2; defer authentication sessions, returns/exchanges, and any general ledger to their implementation phases.
- **Alternatives:** Create every anticipated table now; defer all transaction tables until each feature phase.
- **Rationale:** This establishes referential architecture for atomic workflows while avoiding speculative tables and fake accounting.
- **Consequences:** Later migrations extend this foundation and must preserve posted transaction history.

## ADR-011 — Prisma 7 with PostgreSQL Driver Adapter

- **Date:** 2026-09-04
- **Context:** The project needs a current, supported Prisma workflow compatible with PostgreSQL and explicit generated-client output.
- **Decision:** Pin Prisma 7.10, use the `prisma-client` generator with a repository-ignored output, and connect at runtime through `@prisma/adapter-pg`.
- **Alternatives:** Prisma 6 `prisma-client-js`; adopting the newly released Prisma 8 contract API immediately.
- **Rationale:** Prisma 7 is fully supported and stable while avoiding premature adoption of Prisma 8's revised migration/query workflow.
- **Consequences:** Generation runs before API typecheck/build, and the database service supplies a PostgreSQL adapter.

## ADR-012 — Opaque Rotating Refresh Credentials

- **Date:** 2026-09-04
- **Context:** Access tokens must be short-lived while browser sessions remain revocable and refresh-token reuse is detectable.
- **Decision:** Use signed 15-minute JWT access tokens plus 256-bit opaque refresh credentials stored in HttpOnly cookies. Persist only keyed HMAC-SHA-256 credential fingerprints in versioned session-family rows; rotation revokes the predecessor and creates a successor atomically.
- **Alternatives:** Long-lived access JWTs; stateless refresh JWTs; overwrite one refresh hash per user.
- **Rationale:** Server-side session rows provide immediate revocation and family-wide response to replay without storing bearer secrets.
- **Consequences:** Protected requests verify current user and session state, refresh requires a database transaction, and deployments must use HTTPS for secure cookies.

## ADR-013 — Server-Loaded Permission Context

- **Date:** 2026-09-04
- **Context:** Permissions and account status changes must take effect without waiting for access-token expiry, and client-supplied tenant context is untrusted.
- **Decision:** JWTs identify user, company, session, and credential version only. The global authentication guard reloads active user/session, branch assignments, and effective permission keys from PostgreSQL; a separate global permission guard evaluates controller metadata.
- **Alternatives:** Embed permissions in JWTs; hardcode role names; repeat authorization queries in controllers.
- **Rationale:** Centralized guards enforce current authorization and company scope consistently.
- **Consequences:** Protected requests incur a database lookup; caching may be added later only with explicit invalidation guarantees.

## ADR-014 — Permission-Based Active Branch Context

- **Date:** 2026-09-06
- **Context:** Later POS and inventory operations need an explicit active branch without trusting an arbitrary client-supplied branch ID or hardcoding Owner/Admin role names.
- **Decision:** The client selects a branch with `x-branch-id`; a reusable API guard accepts it only when the branch belongs to the authenticated company, is active, and is either explicitly assigned through `UserBranch` or available through the `branch.access_all` permission.
- **Alternatives:** Embed one permanent branch in the access token; trust request bodies; infer global access from role names.
- **Rationale:** Current database state remains authoritative, permission changes take effect immediately, and configurable roles can safely represent company-wide operators.
- **Consequences:** Operational endpoints that require branch context must use the active-branch guard; inactive or foreign branches fail closed. Users with `branch.access_all` do not require explicit assignment rows.

## ADR-015 — Reuse the Phase 2 Organization Schema

- **Date:** 2026-09-06
- **Context:** Phase 2 already created Company, Branch, UserBranch, Warehouse, and Register with the required composite ownership and operational fields.
- **Decision:** Phase 4 adds services, authorization, audit behavior, and UI without a schema migration. Branch, warehouse, and register codes remain unique per company. A default warehouse is deferred until Phase 6 inventory workflows establish the exact selection invariant.
- **Alternatives:** Add speculative address/terminal/default flags now; make codes branch-scoped; create a migration solely for Phase 4.
- **Rationale:** The existing model satisfies current workflows and avoids premature columns or conflicting default-warehouse semantics.
- **Consequences:** Warehouse/register branch ownership remains immutable after creation. Phase 6 may add a constrained default warehouse only if its real transaction design requires one.

## ADR-016 — Catalog Conversion and Coverage Authority

- **Date:** 2026-09-06
- **Context:** Nominal tile dimensions and commercial packaging coverage can differ.
- **Decision:** Persist nominal dimensions in millimetres and calculate informational area with Decimal arithmetic. Product-specific `factorToBase` conversions are the commercial authority, while the base unit remains the sole future inventory quantity. Manufacturers and tile/sanitary profiles are normalized extensions of Product.
- **Alternatives:** Derive all conversions from dimensions; duplicate coverage counters; store separate box/piece/area stock.
- **Rationale:** Explicit factors support real package specifications and independent unit pricing without corrupting physical stock.
- **Consequences:** One active conversion per product/unit is database-enforced, conversions traverse directly through base, and later transactions snapshot the applied factor.

## ADR-017 — Serialized Inventory Positions and Idempotent Posting

- **Date:** 2026-09-06
- **Context:** Opening stock, deductions, counts, and transfers must update a movement journal and balance projection without duplicate posts, partial commits, or concurrent overselling.
- **Decision:** Every mutating inventory request uses a company-scoped idempotency key and one database transaction. PostgreSQL transaction-scoped advisory locks serialize each `(company, warehouse, product, optional batch)` position; balance versions provide compare-and-swap protection. Multi-position and transfer locks are acquired in deterministic order. Physical counts snapshot both quantity and version and reject stale posting.
- **Alternatives:** Application mutexes; balance reads followed by unguarded writes; serializable isolation for every request; independent tile-unit counters.
- **Rationale:** Database locks work across API processes, retain high concurrency between unrelated positions, and preserve the immutable ledger/base-quantity decisions.
- **Consequences:** A movement and balance change commit or roll back together; repeat keys return the stored result; reuse with another payload fails. Transfers create correlated OUT/IN movements. Count variance posts a reconciliation movement rather than rewriting history.

## ADR-018 — Explicit Warehouse Selection in Phase 6

- **Date:** 2026-09-06
- **Context:** Phase 4 deferred default-warehouse semantics until real inventory workflows existed.
- **Decision:** Phase 6 requires an explicit active, company-owned warehouse for every mutation and query filter. No default warehouse column is introduced yet.
- **Alternatives:** Infer the first active warehouse; add a branch default immediately.
- **Rationale:** Silent inference can put stock in the wrong location. Explicit selection is safe and sufficient until POS and receiving define their defaults.
- **Consequences:** A constrained operational default may be added in Phase 8 or 9 if those workflows demonstrate need; it must never bypass branch access validation.

## ADR-019 — Separate Immutable Party Ledgers

- **Date:** 2026-09-06
- **Context:** Customer receivables and supplier payables need auditable opening positions now and real sale, purchase, return, and payment entries later, without introducing a general ledger or a polymorphic party model.
- **Decision:** Use separate `CustomerLedgerEntry` and `SupplierLedgerEntry` models with one signed `numeric(19,4)` impact per immutable entry. Customer positive means receivable and negative means customer advance; supplier positive means payable and negative means supplier advance. Current balances are derived by summing entries. Opening corrections add an explicit delta instead of mutating history.
- **Alternatives:** Editable balance columns; one generic polymorphic party ledger; premature double-entry accounting tables.
- **Rationale:** Explicit foreign keys and services keep normal queries clear, enforce tenant ownership, and leave future transactional phases able to post atomic entries without pretending Phase 7 implements accounting.
- **Consequences:** Posting requires a company-scoped idempotency key, request hash, permission, reason, and transaction. PostgreSQL advisory locks serialize corrections per party; partial unique indexes allow one original opening entry; database triggers reject ledger updates/deletes. Branch is optional until a real branch-originating transaction supplies it.

## ADR-020 — Company-Local Walk-In Customer and Explicit Party Codes

- **Date:** 2026-09-06
- **Context:** Future anonymous POS sales require a stable default customer, while normal customer and supplier codes must be predictable without unsafe max-plus generation.
- **Decision:** A PostgreSQL company-insert trigger provisions exactly one active system walk-in customer per company, reinforced by the existing partial unique index. Bootstrap remains idempotent. Normal customer and supplier codes are caller-assigned, normalized uppercase, and unique only within the authenticated company; `WALK-IN` is reserved.
- **Alternatives:** One global walk-in record; lazy POS creation; automatic max-plus codes; globally unique party codes.
- **Rationale:** Database provisioning covers every company creation path and avoids concurrency collisions. Explicit company-local codes fit established business numbering without inventing an unapproved sequence policy.
- **Consequences:** The walk-in identity cannot be renamed or deactivated through the API. Phone and email remain searchable but intentionally non-unique so legitimate shared contacts are not blocked.

## ADR-021 — Separate Purchasing Events with Shared Physical and Financial Journals

- **Date:** 2026-09-06
- **Context:** An order, physical receipt, supplier invoice, payment, and return can occur at different times and have different stock/payable effects.
- **Decision:** Keep separate PO, receipt, invoice, payment/allocation, and return aggregates. Only a posted receipt/return calls the Phase 6 inventory transaction primitive; only a posted invoice, payment, or invoiced return writes the immutable supplier ledger. Company/document counters allocate numbers with atomic PostgreSQL upserts. Critical posts use company-scoped request hashes and idempotency records, while advisory locks serialize PO receipt capacity, invoice allocation, and returnable quantities.
- **Alternatives:** One purchase transaction; stock updates embedded in purchasing; mutable supplier due columns; `MAX(number)+1` numbering.
- **Rationale:** Separate aggregates match real operations while shared journals preserve one physical and one payable authority. Database sequencing and locks work across API instances.
- **Consequences:** POs never affect stock/payable. Receipt conversion factors and costs are snapshots. Unallocated payment is a supplier advance. A received-only return has no financial effect; an invoiced return credits the proportional stored invoice-line amount. Automatic landed-cost allocation and Phase 11 cash-drawer effects remain explicitly deferred.

## ADR-022 — Effect-Free Drafts and Atomic Sales Completion

- **Date:** 2026-09-07
- **Context:** A cashier sale combines volatile catalog pricing, product conversion, exact tile stock, customer credit, payment, and audit effects; drafts and held carts must not reserve or mutate those authorities.
- **Decision:** Keep `DRAFT`/`HELD` sales effect-free and revalidate every dependency at completion. One PostgreSQL transaction creates immutable sale snapshots, calls the shared Phase 6 inventory primitive, records at most one Phase 9 payment, posts only the unpaid amount to the Phase 7 customer ledger, and writes audit history. Company-local sequence rows allocate invoice/payment numbers, and `SalesOperation` provides request-hash idempotency. Completed rows are mutation-protected until later linked reversal models are implemented.
- **Alternatives:** Reserve stock on hold; trust browser totals; maintain mutable customer due and stock fields; reuse purchase idempotency polymorphically; permit edits to completed invoices.
- **Rationale:** Revalidation prevents stale held carts, shared journals preserve physical/financial authority, and one transaction prevents partial sales under failures or concurrent overselling.
- **Consequences:** Walk-in sales must be fully settled; named-customer dues respect ledger-derived balance and credit limit. Phase 9 supports zero/one payment only. Split settlement/due collection, linked returns/refunds/exchanges, cash shifts, and receipt printing remain Phase 10–12 work.

## ADR-023 — Immutable Compensating Sales Documents

- **Date:** 2026-09-07
- **Context:** Collections, partial returns, refunds, exchanges, and voids must change inventory and customer financial state without corrupting a completed invoice or its historical price/conversion snapshots.
- **Decision:** Keep completed sales and payments immutable. Represent returns, refunds, exchanges, and voids as linked aggregates with compensating inventory and customer-ledger entries. Allocate return credit from the original invoice total proportionally, apply credit to current receivable first, and allow only the residual to be refunded, exchanged, or retained as named-customer advance. Exchange is one atomic linked return plus a replacement sale through the existing engine.
- **Alternatives:** Edit completed sale lines/payments; calculate returns at current prices; refund every return in cash; model exchange by replacing original items.
- **Rationale:** Linked immutable documents preserve historical truth, prevent excess refunds, and reuse the established inventory, sale, payment, ledger, idempotency, and locking authorities.
- **Consequences:** Original `Sale.due` is only a completion snapshot; current outstanding is derived. Exact batch/shade is restored using the original conversion. Walk-in returns require immediate refund because anonymous advance pooling is unsafe. Phase 11 will add cash-drawer movements without changing Phase 10 financial records.

## ADR-024 — Register-Serialized Immutable Cash Journal

- **Date:** 2026-09-07
- **Context:** Cash sales, collections, supplier payments, refunds, manual movements, and expenses must reconcile one physical drawer without changing the existing payment, party-ledger, or inventory authorities.
- **Decision:** Permit one open shift per register. Represent opening float and every eligible drawer event as one immutable `CashMovement`; derive expected cash by signed aggregation. A shared transaction-owned cash service uses a company/register advisory lock for open, post, and close, request-hash operations for explicit commands, and source-unique identities for automatic movements. Cash business events require an open shift; non-cash events do not.
- **Alternatives:** Mutable drawer balance; one shift per cashier with overlapping register ownership; asynchronous cash-event replication; treating tendered cash/change as separate revenue movements.
- **Rationale:** One lock and one journal remain correct across API instances, make close-vs-post deterministic, and preserve atomicity with the originating transaction without double counting cash or rewriting historical Phase 8–10 records.
- **Consequences:** Opening is included once through its movement. Closed shifts cannot reopen or accept movements. Actual cash and variance are preserved as reconciliation facts rather than converted into fake transactions. Cash-account/general-ledger treatment and denomination counts remain deferred.

## ADR-025 — Event-Period Reports and Immutable Sale Display Snapshots

- **Date:** 2026-09-08
- **Context:** Accurate daily reports and stable invoice reprints must survive catalog edits. Sale lines already snapshot money, quantity, conversion, and cost, but mutable product/unit/batch labels could change historical print output.
- **Decision:** Build read-only transaction-event reports with company-local date boundaries and no summary counters. Add only missing sale display snapshots. Gross sales recognize completed invoices; return/void credits recognize their posting event; collections and refunds are settlement rather than revenue. Restocked returns reverse proportional historical cost, while non-resellable returns do not.
- **Alternatives:** Mutable dashboard totals; current-catalog reprints; subtracting both return credit and refund; a premature general ledger.
- **Rationale:** The model reconciles to immutable transaction sources, prevents historical drift, and avoids misleading accounting claims.
- **Consequences:** Sale and later return may appear in different period events. Current invoice detail can show lifetime state while period summaries stay event based. Net profit remains unavailable until complete accounting exists.

## ADR-026 — Production Runtime and Recovery Boundary

- **Date:** 2026-09-08
- **Context:** The modular monolith needs a repeatable single-host production shape, observable failures, safe database rollout, and exercised recovery without introducing microservices or fake in-app infrastructure.
- **Decision:** Package the API and standalone Next.js app as non-root containers behind Caddy TLS; keep PostgreSQL private and persistent; run additive Prisma migrations as an explicit one-shot deployment step. Fail startup on unsafe production configuration, expose separate liveness/readiness probes, correlate structured redacted logs, and keep backup/restore plus disaster recovery as guarded operator procedures. Use `pg_trgm` GIN indexes for bounded user-entered substring search.
- **Alternatives:** Expose app/database ports directly; migrate automatically during API startup; store backups on the database volume only; introduce an external observability/messaging platform before need; accept sequential search at SME catalog scale.
- **Rationale:** This boundary is deployable on one appropriately secured host, preserves the modular-monolith decision, prevents partial rollout ambiguity, and provides independently testable recovery and performance controls.
- **Consequences:** Operators must provide DNS/TLS reachability, secret-store values, off-host encrypted backup retention, monitoring, and a tested rollback window. Binary uploads, full accounting, offline operation, and horizontally distributed transaction coordination remain outside Version 1.

## ADR-027 — Source-Owned Light-First UI Foundation

- **Date:** 2026-09-09
- **Context:** The approved Figma redesign needs consistent business-software primitives without a wholesale UI-framework migration or changes to verified V1 workflows.
- **Decision:** Keep Vendo-owned React components in `packages/ui`, styled through Tailwind CSS v4 semantic tokens. Use Radix only for Dialog, Alert Dialog, and Tooltip where focus, keyboard, portal, and modal behavior materially reduce accessibility risk. Keep Select, Checkbox, Radio, and Switch native in Stage 1. Geist is the canonical application font and light mode is the default.
- **Alternatives:** Adopt a large component framework; duplicate per-screen Tailwind palettes; hand-roll modal focus management; migrate application routes during the foundation stage.
- **Rationale:** A small source-owned layer preserves control, limits dependencies, aligns with the approved Figma tokens, and enables later screen-by-screen migration without touching business logic.
- **Consequences:** Existing application screens are not visually migrated in Stage 1. Popover and Dropdown Menu dependencies remain deferred until an approved screen needs them. Money and quantity components format authoritative values only and contain no business calculation logic.

## ADR-028 — Route-Addressable Shell with Shared Branch Context

- **Date:** 2026-09-10
- **Context:** The verified V1 application used one local-state `/app` console container. The approved redesign needs scalable direct module URLs and a consistent shell without changing authentication, API authorization, or business workflows.
- **Decision:** Use an authenticated Next.js `/app` layout with typed route metadata, permission-filtered navigation, and one shared branch context. Keep backend guards authoritative, pass the selected branch through the existing `x-branch-id` contract, redirect `/app` to `/app/dashboard`, and render the existing real consoles through route pages. Representative nested plan URLs resolve through module catch-all routes until later approved stages decompose each console.
- **Alternatives:** Retain local-state tabs; redesign every screen during the shell stage; duplicate branch selection per route; trust frontend navigation visibility as authorization.
- **Rationale:** Route ownership enables refreshable, bookmarkable navigation while the compatibility layer preserves tested workflows and confines Stage 2 to presentation architecture.
- **Consequences:** Permission filtering improves navigation relevance but never replaces API enforcement. Branch changes invalidate branch-bound queries. Existing console interiors retain their current visuals until their approved redesign stages. Human Chrome acceptance remains required while external-tooling `BUG-029` prevents Codex browser automation.
