# Current Phase

Approved V1 UI Redesign — Stage 2 Application Shell and Routing

# Current Task

Complete and record the recovered interactive browser acceptance for the implemented Stage 2 application shell and routing.

# Objective

Replace the local-state `/app` navigation container with a URL-addressable shell that preserves authentication/session restoration, company and branch access, permission-aware visibility, and existing console behavior.

# Dependencies

- Verified Vendo Version 1 release at `ff0b8a5f20fc23ace15a42897ce2d5bfd3d57265`
- Verified Stage 1 light-first component foundation
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
- Interactive browser acceptance confirms responsive rendering, route navigation, session behavior, light-first styling, and a clean console.

# Verification Required

- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- Relevant frontend tests
- `pnpm --filter @vendo/web build`
- Route manifest and HTTP smoke for `/app` compatibility plus module routes
- Authentication, permission visibility, and branch-context review
- Interactive shell/navigation/console acceptance at 1440 × 900, 1280 × 720, and 390 × 844

# Status

PASS. The authenticated shell, permission-aware navigation, shared branch context, route-addressable modules, `/app` compatibility, automated frontend checks, production build, HTTP route smoke, responsive interactive rendering, authentication cycle, and clean browser console are verified. Stage 1 is also promoted from conditional acceptance to PASS because its deferred browser gate now passes.

# Blockers

- No Stage 2 blocker remains. `BUG-029` and the browser-discovered `BUG-030` are resolved.
- Pre-existing uncommitted production-rollout and UI-audit artifacts remain preserved and must not be discarded.

# Next Approved Task

Stage 3 POS redesign is the next approved plan item, but it must not begin until the user explicitly authorizes it. This run stops after the verified Stage 2 commit and push.
