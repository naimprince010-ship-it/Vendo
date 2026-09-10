# Current Phase

Approved V1 UI Redesign — Stage 2 Application Shell and Routing

# Current Task

Obtain human Chrome acceptance for the implemented Stage 2 application shell and routing while `BUG-029` remains open as an external Codex browser-runtime blocker.

# Objective

Replace the local-state `/app` navigation container with a URL-addressable shell that preserves authentication/session restoration, company and branch access, permission-aware visibility, and existing console behavior.

# Dependencies

- Verified Vendo Version 1 release at `ff0b8a5f20fc23ace15a42897ce2d5bfd3d57265`
- Conditionally accepted Stage 1 light-first component foundation
- Approved Figma application-shell direction and Stage 2 plan
- `docs/UI_IMPLEMENTATION_PLAN.md` and existing UI audit artifacts
- Existing production-rollout preparation remains paused and preserved; no external deployment is authorized

# Expected Files To Change

- `apps/web/src/app/app/layout.tsx` and route pages
- `apps/web/src/components/app-shell/*`
- `apps/web/src/contexts/branch-context.tsx`
- `apps/web/src/hooks/use-vendo-api.ts`
- `apps/web/src/lib/routes.ts`, `permissions.ts`, and `query-keys.ts`
- Narrow compatibility changes to `/app` and providers where required
- Governance documentation

# Acceptance Criteria

- Authenticated shell restores the existing secure session and redirects anonymous users to login.
- Sidebar/header navigation is light-first, scalable, permission-aware, and responsive at approved desktop widths.
- Company/branch context is centralized without trusting frontend ownership claims or changing API enforcement.
- `/app` remains compatible and module navigation is route-addressable.
- Existing consoles render through route pages without changing request payloads or business logic.
- Available lint, strict TypeScript, tests, production build, formatting, and route/HTTP smoke gates pass.
- Manual Chrome acceptance is requested explicitly while external `BUG-029` prevents automated browser/console verification.

# Verification Required

- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- Relevant frontend tests
- `pnpm --filter @vendo/web build`
- Route manifest and HTTP smoke for `/app` compatibility plus module routes
- Authentication, permission visibility, and branch-context review
- Manual Chrome shell/navigation/console checklist while `BUG-029` is open

# Status

IMPLEMENTATION COMPLETE — MANUAL ACCEPTANCE PENDING. The authenticated shell, permission-aware navigation, shared branch context, route-addressable modules, `/app` compatibility, automated frontend checks, production build, and HTTP route smoke are verified. Interactive rendering and console acceptance remain deferred to the documented manual Chrome checklist because `BUG-029` is external to Vendo.

# Blockers

- `BUG-029` remains an external deferred browser-automation blocker; manual Chrome acceptance is required for Stage 2.
- Pre-existing uncommitted production-rollout and UI-audit artifacts remain preserved and must not be discarded.

# Next Approved Task

Run and report the Stage 2 manual Chrome acceptance checklist in `docs/UI_STAGE2_MANUAL_ACCEPTANCE.md`. Do not begin Stage 3 POS redesign until the human result is recorded and the Stage 2 gate is evaluated.
