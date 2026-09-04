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
