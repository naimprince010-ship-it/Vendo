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
