# Current Phase

Phase 3 — Authentication, Users, Roles, and Permissions

# Current Task

Implement and verify authentication, revocable rotating sessions, user administration, configurable roles, granular permissions, server-side authorization, and the minimum real frontend login/logout flow.

# Objective

Deliver the production-grade identity and access-control foundation without starting Phase 4 organization-management workflows.

# Dependencies

- Verified Phase 2 database foundation and PostgreSQL 17 development service
- Existing company-scoped User/Role and global Permission relational model
- AuditLog foundation
- Environment-provided JWT secrets and explicit development bootstrap values

# Expected Files To Change

- `apps/api/prisma/**`
- `apps/api/src/auth/**`, `apps/api/src/users/**`, and shared authorization infrastructure
- Minimal real auth routes/state under `apps/web/src/**`
- Environment, API, security, permission, database, and decision documentation
- Project-control files

# Acceptance Criteria

- Password login issues a short-lived access token and a rotating, revocable refresh credential whose raw value is never persisted.
- Passwords use Argon2id; inactive users and revoked sessions are rejected.
- Protected APIs derive company scope and current permissions from authenticated server-side state.
- User, role, permission, session, password-change/reset, and administrative role APIs validate requests and never serialize credential fields.
- Login/reset abuse controls and security-event audit records are active.
- The web login, protected shell, session refresh, and logout use the real API.

# Verification Required

- Additive auth migration application, status, catalog checks, and clean replay/drift
- Auth/RBAC unit and live API integration tests covering the required security workflows
- Swagger bearer security metadata
- Rate limiting and startup environment validation
- Repository lint, typecheck, tests, production builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — Phase 3 gate passed on 2026-09-05. Authentication, session lifecycle, company-scoped user/RBAC APIs, minimal real web authentication, migration, tests, builds, Swagger metadata, and live browser workflows are verified.

# Blockers

None.

# Next Approved Task

Phase 4 — Company, branch, warehouse, and register. Begin by reading the governance and organization-domain documents, then implement company profile/settings, branches and user branch access before warehouses and registers.
