# Architecture

Vendo is a TypeScript-first modular monolith in a pnpm monorepo.

## Runtime Shape

- `apps/web`: Next.js App Router client and server-rendered business UI.
- `apps/api`: NestJS REST API, versioned under `/api/v1`, with OpenAPI documentation.
- PostgreSQL: authoritative transactional store accessed through Prisma.
- Shared packages: UI primitives, contracts, validation, TypeScript/ESLint configuration.

The browser never accesses the database. The API owns authorization, conversion, pricing, inventory, payments, and transactional consistency. TanStack Query manages server state; React Hook Form and Zod manage form state and user-facing validation.

## Backend Module Boundaries

Identity, organization, catalog, inventory, parties, purchasing, sales, payments, cash, expenses, reporting, audit, and settings are explicit NestJS modules. Cross-module workflows use application services and database transactions rather than direct controller-to-table orchestration.

The Phase 4 organization boundary is split into company, branch/access, warehouse, and register modules. All derive company scope from the authenticated principal. Later operational modules obtain a validated active branch through the reusable active-branch guard rather than reading raw request IDs directly.

## Transaction Boundaries

Sale completion, goods receipt, returns, stock transfers, stock adjustments, and cash shift close are atomic database transactions. Critical rows are locked or updated conditionally to prevent overselling.

## Dependency Direction

Transport/UI → application services → domain rules → persistence/infrastructure. Tile-specific services extend catalog and inventory behavior; reusable core modules do not depend on tile UI concepts.

Phase 5 adds a catalog module for company-scoped master data, products, separate tile/sanitary profiles, Decimal conversions, unit barcodes, independent prices, and paginated search. It does not mutate or display inventory.

Phase 6 adds the inventory application boundary. Controllers require a validated active branch and explicit warehouse; services resolve Decimal product conversions, optional batch identity, negative-stock policy, idempotency, deterministic database locks, immutable movements, balance projection updates, counts, and transfers inside PostgreSQL transactions. The inventory UI consumes these APIs and never calculates authoritative stock.

Phase 8 adds a purchasing application boundary while preserving PO, receipt, invoice, payment, and return as distinct business events. Receipt and return stock effects call the Phase 6 transaction-owned posting primitive; invoice/payment/financial-return effects append to the Phase 7 supplier ledger. Company-scoped atomic document sequences, advisory capacity locks, and request-hash idempotency protect critical mutations. Cash-drawer integration and landed-cost allocation remain deferred to their approved phases.
