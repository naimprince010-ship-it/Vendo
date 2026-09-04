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
