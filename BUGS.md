# Bug Register

## BUG-001 — Dependency installation blocked by disk exhaustion

- **ID:** BUG-001
- **Severity:** High
- **Area:** Development environment / Phase 1 verification
- **Description:** `create-next-app` dependency installation failed with `ERR_PNPM_ENOSPC`; C: had zero free bytes. A D:-hosted pnpm store permits installation and most verification, but Next.js production compilation cannot resolve a virtual store outside its C:-hosted workspace root.
- **Reproduction:** Run the initial pnpm install while C: has insufficient capacity.
- **Expected:** Workspace dependencies install and root quality commands execute.
- **Actual:** Workspace-local installation exhausts C:. Cross-drive installation succeeds, but `next build` fails to resolve Next.js through the D: virtual-store symlink. Lint, typecheck, tests, API build, and Compose validation pass.
- **Status:** Resolved — repository relocated to `D:\Projects\Vendo`; dependencies were reinstalled with a workspace-local virtual store and the complete Phase 1 gate passed on 2026-09-04.
- **Related task:** Phase 1 — governed monorepo foundation

## Entry Template

- **ID:** BUG-000
- **Severity:** Critical | High | Medium | Low
- **Area:** Module or subsystem
- **Description:** Concise defect description
- **Reproduction:** Exact reproduction steps
- **Expected:** Expected behavior
- **Actual:** Observed behavior
- **Status:** Open | In Progress | Resolved | Deferred
- **Related task:** Phase/task reference
