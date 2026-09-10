# Current Phase

Approved V1 UI Redesign — Stage 3 POS Cashier Workspace

# Current Task

Refactor the existing real POS console into the approved light-first cashier workspace while preserving verified Phase 9 and Phase 10 behavior and request contracts.

# Objective

Deliver a fast, workstation-fit product-search, cart, customer/pricing, checkout, payment, hold/resume, and completion experience at 1440 × 900 and 1280 × 720 without changing backend business logic.

# Dependencies

- Verified Stage 1 and Stage 2 commit `519c0891ced486583b35dbc805a21481475d18ef`
- Approved Figma POS frames `POS / Light / 1440×900` and `POS / Light / 1280×720`
- Verified Phase 9 sale and Phase 10 split-payment/due/return foundations
- `docs/UI_IMPLEMENTATION_PLAN.md`, `docs/FIGMA_FUNCTIONAL_MAP.md`, and existing UI audit artifacts
- Existing production-rollout preparation remains paused and preserved; no external deployment is authorized

# Expected Files To Change

- `apps/web/src/app/app/pos-console.tsx`
- `apps/web/src/features/pos/*`
- `apps/web/src/components/app-shell/navigation-icon.tsx` and `authenticated-shell.tsx` only for browser-confirmed Stage 2 shell defects affecting the approved POS layouts
- Focused frontend characterization tests
- Governance documentation

# Acceptance Criteria

- Search/scanner focus, barcode/SKU/name discovery, and rapid add behavior remain efficient.
- Tile Box/PCS/area equivalents and exact batch/shade are clear without introducing independent stock counters.
- Customer, retail/wholesale pricing, permission-sensitive discounts/overrides, split payments, tender/change, due, hold/resume, and complete-sale states remain functional.
- The primary cashier workflow fits the approved 1440 × 900 and 1280 × 720 targets without whole-page horizontal scrolling.
- Existing payloads, idempotency behavior, API authority, branch/register/warehouse context, and Stage 2 shell remain unchanged.
- Affected Phase 9/10 regression suites and all required frontend/browser gates pass.

# Verification Required

- `pnpm format:check`
- Web and shared-UI lint, strict TypeScript, and tests
- `pnpm --filter @vendo/web build`
- Affected Phase 9 and Phase 10 API regression tests, including concurrency/invariants
- Production browser POS workflow and console inspection
- Figma comparison at 1440 × 900 and 1280 × 720
- `git diff --check` and backend/schema/API-contract diff review

# Status

PASS (2026-09-10). The approved light-first POS cashier workspace is implemented and verified at 1440 × 900 and 1280 × 720. Five web tests, strict TypeScript, ESLint, formatting, the Next.js production build, Phase 9/10 API regressions (14/14), production HTTP checks, the complete interactive POS workflow, invoice/history and inventory verification, and clean browser console inspection all pass. No backend, Prisma schema, or API contract changed.

# Blockers

- No Stage 3 blocker remains.
- Pre-existing uncommitted production-rollout and UI-audit artifacts remain preserved and must not be discarded.

# Next Approved Task

Stage 4 — Sale Detail, Return, Refund, and Exchange only after explicit approval. Do not begin it automatically.
