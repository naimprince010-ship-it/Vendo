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

## Transaction Boundaries

Sale completion, goods receipt, returns, stock transfers, stock adjustments, and cash shift close are atomic database transactions. Critical rows are locked or updated conditionally to prevent overselling.

## Dependency Direction

Transport/UI → application services → domain rules → persistence/infrastructure. Tile-specific services extend catalog and inventory behavior; reusable core modules do not depend on tile UI concepts.
