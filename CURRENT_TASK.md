# Current Phase

Approved V1 UI Redesign — Stage 11 Administration and Settings

# Current Task

Redesign the verified Phase 3/4 Administration and Settings frontend into route-addressable, light-first company, branch, location, user, role, and permission workspaces without changing security or tenancy behavior.

# Objective

Deliver Company Profile, Branches, User Branch Access, Warehouses, Registers, Users, Roles, and Permissions management using only existing authenticated APIs and backend-authoritative authorization.

# Dependencies

- Verified Stage 10 commit `9278e7d0654dbfff3629e8c6f74a227a2f23db61`
- Approved Stage 1 light design system and Stage 2 route-addressable application shell
- Verified Phase 3 authentication, user, role, permission, session, and audit behavior
- Verified Phase 4 company, branch, branch-access, warehouse, register, and tenant-isolation behavior
- Existing report permission behavior for cross-module verification
- Existing production-rollout and UI-audit artifacts remain preserved

# Expected Files To Change

- `apps/web/src/app/app/settings/*`
- `apps/web/src/features/administration/*`
- Focused administration presentation and permission tests
- Governance documentation

# Acceptance Criteria

- Company, branch, user-access, warehouse, register, user, role, and permission workspaces are route-addressable, permission-aware, bounded where APIs support it, responsive, and backed by real APIs.
- Lifecycle and high-risk changes use deliberate reviewed UI without browser prompts or destructive deletion.
- Protected self-access, system-role, company/branch ownership, audit, session, and backend authorization behavior remain authoritative.
- Unsupported settings such as negative-stock mutation and payment-method CRUD are not fabricated.
- No backend security rule, API contract, Prisma schema, migration, authentication/RBAC semantic, or transaction behavior changes.

# Verification Required

- Web and shared UI tests
- Monorepo lint and strict TypeScript
- Prettier and `git diff --check`
- API and Next.js production builds
- Phase 3 auth/RBAC and Phase 4 organization regressions
- Report and cross-module permission regressions
- Production-browser company, branch, access, warehouse, register, user, role/permission, responsive, and clean-console workflows
- API/database reconciliation, audit verification, secret scan, and forbidden backend/schema/migration diff review

# Status

PASS (2026-09-13). Stage 11 browser, API/database, regression, responsive, console, build, formatting, and scope gates are complete. `BUG-040` was resolved with a frontend-only UserStatus mapping correction.

# Blockers

- No Stage 11 blocker remains.
- `BUG-039` remains a separately documented Medium pre-existing Purchasing payment-list issue and is outside this stage.
- Pre-existing untracked production-rollout and UI-audit artifacts remain untouched.

# Next Approved Task

Stage 12 — Print, Responsive, Accessibility, and Final Polish. Do not begin until explicitly authorized.
