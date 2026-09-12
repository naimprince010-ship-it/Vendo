# Current Phase

Approved V1 UI Redesign — Stage 6 Inventory

# Current Task

Redesign the verified Phase 6 Inventory frontend into route-addressable, light-first operational workspaces while preserving every existing backend inventory rule and API contract.

# Objective

Deliver Inventory Overview, Stock, Product Stock Detail, Low Stock, Batches, Opening Stock, Adjustments, Damage/Loss, Physical Counts, Reconciliation, Transfers, and immutable Movement History using real APIs and one authoritative base-stock presentation.

# Dependencies

- Verified Stage 5 commit `a139b6dd83472e56f941df09a1b1ad878e077df8`
- Approved Stage 1 light design system and Stage 2 route-addressable application shell
- Verified Phase 6 inventory engine, idempotency, concurrency, batch, count, transfer, and immutable movement behavior
- `docs/UI_IMPLEMENTATION_PLAN.md`, `docs/INVENTORY_DESIGN.md`, and `docs/UNIT_CONVERSION.md`
- Approved Figma file contains the light-first design-system cover but no dedicated Inventory frames
- Existing production-rollout preparation and UI-audit artifacts remain preserved

# Expected Files To Change

- `apps/web/src/app/app/inventory-console.tsx`
- `apps/web/src/features/inventory/*`
- Focused Inventory presentation/characterization tests
- Governance documentation

# Acceptance Criteria

- Inventory Overview, Stock, Low Stock, Batches, Counts, Transfers, and Movements are route-addressable.
- Stock views distinguish the one authoritative base quantity from backend-provided derived equivalents.
- Product detail answers where stock exists, including warehouse and exact batch/lot/shade positions.
- Opening, adjustment, damage, loss, reconciliation, and transfer actions use deliberate reviewed dialogs and existing idempotent API requests.
- Physical counts present expected, counted, variance, snapshot/version, review/reopen/post states, and human-readable stale-count errors.
- Search/filter/pagination remain bounded to existing supported API parameters.
- Permission-sensitive actions remain hidden while backend authorization stays authoritative.
- No backend, Prisma schema, migration, API contract, authentication, sales, purchasing, cash, or reporting change is introduced.

# Verification Required

- Web and shared UI tests
- Monorepo lint and strict TypeScript
- Prettier and `git diff --check`
- Next.js production build
- Phase 6 inventory API regression, including idempotency/concurrency/stale-count/immutability
- Affected Phase 8/9/10 inventory integration regressions
- Production-mode browser workflows, responsive checks, and clean console
- Secret scan and backend/schema/API-contract diff review

# Status

PASS (2026-09-12). Human Chrome acceptance completed the corrected Inventory workflows, posted-count reload, responsive checks at 1440 × 900 and 1280 × 720, and clean-console inspection. Independent API/database reconciliation confirms `BUG-035` remains resolved and `BUG-036` accepts snapshot 1/counted 0, posts exactly one −1 PCS variance, and leaves the final balance at zero. All requested Stage 6 tests, regressions, production builds, Prisma/migration checks, formatting, secret scan, and Git whitespace checks pass.

# Blockers

- No Vendo application blocker remains for Stage 6.
- `BUG-034` remains documented as an external Codex browser-runtime/tooling issue, not a Vendo defect; automated browser control was not claimed as PASS.
- `BUG-035` and `BUG-036` are fully resolved and accepted through human Chrome plus independent API/database verification.
- Pre-existing uncommitted production-rollout and UI-audit artifacts must remain untouched.

# Next Approved Task

Stage 7 — Purchasing UI/UX redesign, only after explicit user approval. Do not begin it automatically.
