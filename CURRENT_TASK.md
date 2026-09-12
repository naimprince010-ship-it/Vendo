# Current Phase

Approved V1 UI Redesign — Stage 5 Catalog

# Current Task

Redesign the existing catalog and product-management experience into route-addressable, light-first workspaces without changing backend business logic, database schema, or API contracts.

# Objective

Deliver professional product list, adaptive product editor, product detail, category, brand, manufacturer, and unit workspaces that preserve the verified reusable product core, tile/sanitary separation, Decimal conversions, unit pricing, barcode behavior, lifecycle rules, company isolation, and permission enforcement.

# Dependencies

- Verified Stage 4 sale-detail and post-sale implementation
- Approved Vendo light-first design system and Stage 2 application shell
- Verified Phase 5 catalog APIs, permissions, Decimal conversion rules, and tenant boundaries
- `docs/UI_IMPLEMENTATION_PLAN.md`, `docs/TILE_DOMAIN.md`, and `docs/UNIT_CONVERSION.md`
- Existing production-rollout preparation and UI-audit artifacts remain preserved

# Expected Files To Change

- `apps/web/src/app/app/catalog-console.tsx`
- `apps/web/src/features/catalog/*`
- Focused catalog presentation tests
- Governance documentation

# Acceptance Criteria

- Products, categories, brands, manufacturers, and units are route-addressable inside the approved shell.
- Product search/filtering/pagination use real server APIs and barcode lookup remains reusable for POS.
- Product create/edit adapts to TILE, SANITARY, ACCESSORY, and GENERAL without exposing irrelevant fields.
- Tile dimensions and nominal coverage remain informational while configured commercial conversions remain authoritative.
- Product-specific direct-to-base conversions, independent unit prices, barcodes, lifecycle controls, and cost visibility preserve backend validation and permissions.
- No fake stock, backend logic, database schema, migration, or API contract change is introduced.
- Browser workflows, responsive layouts, full regressions, lint, TypeScript, formatting, and production builds pass.

# Verification Required

- `pnpm format:check`
- Full monorepo lint, strict TypeScript, tests, and production build
- Phase 5 API regression tests
- Production browser catalog workflows and console inspection
- 1440 × 900 and 1280 × 720 responsive checks
- `git diff --check`, secret scan, and backend/schema/API-contract diff review

# Status

PASS (2026-09-12). The approved light-first catalog and product-management workspaces are implemented and verified. Product/master-data routes, adaptive product creation/editing, tile/sanitary detail presentation, direct-to-base conversions, independent unit prices, multiple barcodes, lifecycle actions, server-side search/filtering/pagination, unsaved-change protection, and permission-aware cost controls use the existing real APIs. Full monorepo tests pass (API 15 suites/92 tests, web 11 tests, UI 5 tests), as do lint, strict TypeScript, formatting, production builds, responsive browser acceptance, and clean-console inspection. No backend, Prisma schema, migration, or API contract changed.

# Blockers

- No Stage 5 blocker remains.
- The existing Low deferred `BUG-008` remains unchanged.
- Pre-existing uncommitted production-rollout and UI-audit artifacts remain preserved and must not be discarded.

# Next Approved Task

Stage 6 — Inventory only after explicit approval. Do not begin it automatically.
