# Current Phase

Approved V1 UI Redesign — Stage 4 Sale Detail and Post-Sale Workflows

# Current Task

Move the verified Phase 10 post-sale workflows out of the cashier POS screen into a route-addressable, light-first sale-detail workspace without changing backend business rules or request contracts.

# Objective

Deliver a professional immutable invoice view with backend-derived financial state, chronological payment history, deliberate collection/return/refund/exchange/void workflows, and print/reprint access at the approved desktop breakpoints.

# Dependencies

- Verified Stage 3 commit `78841d96602c6cc6663046e61ca9fef686a33202`
- Approved Vendo light-first design direction and Stage 2 application shell
- Verified Phase 9 sale and Phase 10 split-payment/due/return foundations
- `docs/UI_IMPLEMENTATION_PLAN.md`, `docs/FIGMA_FUNCTIONAL_MAP.md`, and existing UI audit artifacts
- Existing production-rollout preparation remains paused and preserved; no external deployment is authorized

# Expected Files To Change

- `apps/web/src/app/app/sales/*`
- `apps/web/src/features/sales/*`
- Bounded navigation links from the existing POS/history surfaces
- Existing invoice presentation export for print/reprint reuse
- Focused frontend characterization tests
- Governance documentation

# Acceptance Criteria

- Sale history and direct sale-detail routes show immutable product, unit, conversion, tile, batch, shade, pricing, discount, tax, and payment snapshots.
- Current outstanding, credits, refunds, collections, and exchange effects use backend-derived state without duplicate financial arithmetic.
- Collection, partial/full return, exact restock, refund, atomic exchange, and compensating void workflows are deliberate, permission-aware, idempotent, and recoverable.
- Linked exchange invoices and thermal/A4 print access remain directly reachable from sale detail.
- Sale Detail fits 1440 × 900 and 1280 × 720 without whole-page horizontal scrolling.
- Existing payloads, backend authority, inventory/ledger invariants, branch/register/warehouse context, and Stage 2 shell remain unchanged.
- Affected Phase 9/10 regression suites and all required frontend/browser gates pass.

# Verification Required

- `pnpm format:check`
- Web lint, strict TypeScript, and tests
- `pnpm --filter @vendo/web build`
- Affected Phase 9 and Phase 10 API regression tests, including concurrency/invariants
- Production browser POS workflow and console inspection
- Figma comparison at 1440 × 900 and 1280 × 720
- `git diff --check` and backend/schema/API-contract diff review

# Status

PASS (2026-09-11). The approved light-first Sale Detail and post-sale workspace is implemented and verified. Eight web tests, warning-free ESLint, strict TypeScript, formatting, the Next.js production build, Phase 9/10 API regressions (14/14), production browser collection/return/refund/exchange/void workflows, customer-ledger and exact batch/shade inventory verification, linked exchange navigation, print/reprint access, responsive checks, and clean browser console inspection all pass. No backend, Prisma schema, migration, or API contract changed.

# Blockers

- No Stage 4 blocker remains.
- Pre-existing uncommitted production-rollout and UI-audit artifacts remain preserved and must not be discarded.

# Next Approved Task

Stage 5 — Catalog only after explicit approval. Do not begin it automatically.
