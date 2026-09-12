# Current Phase

Approved V1 UI Redesign — Stage 7 Purchasing

# Current Task

Redesign the verified Phase 8 Purchasing frontend into route-addressable, light-first document workspaces while preserving every existing backend purchasing rule and API contract.

# Objective

Deliver Purchase Orders, Goods Receipts, partial receiving, Supplier Invoices, Supplier Payments, Purchase Returns, supplier payable context, tile batch/lot/shade receiving, and linked document history using real APIs and backend-authoritative calculations.

# Dependencies

- Verified Stage 6 commit `fc3d6e34b059700dba04f52ff34ebbd0ba8949f4`
- Approved Stage 1 light design system and Stage 2 route-addressable application shell
- Stage 5 catalog and Stage 6 inventory presentation patterns
- Verified Phase 8 purchasing lifecycle, inventory integration, supplier ledger, idempotency, and concurrency behavior
- `docs/UI_IMPLEMENTATION_PLAN.md`, `docs/DATABASE_DESIGN.md`, `docs/INVENTORY_DESIGN.md`, and `docs/PERMISSIONS.md`
- Existing production-rollout and UI-audit artifacts remain preserved

# Expected Files To Change

- `apps/web/src/app/app/purchasing-console.tsx`
- `apps/web/src/features/purchasing/*`
- Focused Purchasing presentation/characterization tests
- Governance documentation

# Acceptance Criteria

- Purchase Orders, Goods Receipts, Supplier Invoices, Supplier Payments, and Purchase Returns are route-addressable and bounded.
- Document lists/details consistently expose lifecycle, lines, totals, progress, supplier, branch/warehouse, and related references supported by existing APIs.
- PO create/edit/submit/confirm/cancel/close remains backend-controlled and never implies a stock effect before receipt.
- Partial receiving uses explicit warehouse and adaptive tile batch/lot/shade fields while preserving backend conversion and over-receipt authority.
- Invoice draft/post, supplier payable, payment allocation/advance, and return financial effects use backend-returned values.
- Received-only and invoiced return effects remain visually distinct and reference exact receipt lines.
- High-impact actions use reviewed dialogs, permission-aware controls, stable idempotency keys, and surfaced API errors.
- No backend purchasing rule, Prisma schema, migration, API contract, authentication, RBAC, inventory engine, sales, cash, or reporting behavior is changed.

# Verification Required

- Web and shared UI tests
- Monorepo lint and strict TypeScript
- Prettier and `git diff --check`
- Next.js production build
- Phase 8 purchasing regression including lifecycle, receipt capacity, batch/shade, invoice, payment, return, idempotency, and concurrency
- Phase 6 inventory integration regression
- Production-browser PO, partial/second receipt, invoice, payment, return, related-document, responsive, and clean-console workflows
- Secret scan and forbidden backend/schema/migration/API-contract diff review

# Status

PASS (2026-09-12). Stage 7 Purchasing is implemented, verified against the unchanged Phase 8 APIs, accepted in the production browser at 1440 × 900 and 1280 × 720 with a clean console, and reconciled against the local UAT database. The verified change set is ready for its focused Stage 7 commit and push.

# Blockers

- No Stage 7 application blocker remains. Browser-discovered projection defect `BUG-037` is resolved.
- `BUG-034` remains separately documented as an external Stage 6 tooling issue; the Stage 7 Codex browser runtime and clean-console gate passed.
- Pre-existing uncommitted production-rollout and UI-audit artifacts remain untouched.

# Next Approved Task

Await explicit approval for Stage 8 — Customers and Suppliers. Do not begin it automatically.
