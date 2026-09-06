# Current Phase

Phase 4 — Company, Branch, Warehouse, and Register

# Current Task

Implement and verify company profile management, branches, user branch access, secure active-branch context, warehouses, registers, and the corresponding real management UI.

# Objective

Deliver the production-grade organization and location foundation without starting catalog, inventory, purchasing, sales, cash-shift, or later-phase workflows.

# Dependencies

- Verified Phase 3 authentication and permission guards
- Existing composite Company/Branch/Warehouse/Register ownership constraints
- Existing company-scoped UserBranch relation and AuditLog foundation
- PostgreSQL 17 development service

# Expected Files To Change

- Organization/location modules under `apps/api/src/**`
- Active branch-context authorization infrastructure
- Phase 4 management UI under `apps/web/src/**`
- Permission, API, security, architecture, database, and decision documentation
- Project-control files

# Acceptance Criteria

- Company profile reads/updates derive company scope only from the authenticated principal.
- Branch, warehouse, and register management is tenant- and branch-safe, paginated, permission-protected, audited, and deactivation-based.
- User branch grants verify both user and branch company ownership and cannot be self-expanded without authorization.
- Active branch context accepts only an active company branch available through explicit assignment or `branch.access_all` permission.
- Phase 4 frontend uses the real APIs and exposes actions only when useful to the authenticated permission set.

# Verification Required

- Company/location API integration tests, tenant/branch isolation tests, permission tests, audit checks, and active-context tests
- Existing migration status and drift verification; new migration only if schema changes are genuinely required
- Idempotent permission seed/bootstrap checks and Swagger metadata
- Live browser workflows for company, branch access, warehouse, and register management
- Repository lint, typecheck, tests, production builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — Phase 4 gate passed on 2026-09-06. Organization/location APIs and UI, active-branch authorization, tenant isolation, audit behavior, database status, tests, production builds, Swagger, and live browser workflows are verified.

# Blockers

None.

# Next Approved Task

Phase 5 — Catalog, Units, Tile Domain, and Pricing. Begin by rereading governance and domain documentation, then implement categories/brands/manufacturers and the reusable product/unit foundation before tile profiles, controlled conversions, barcodes, and unit-specific pricing.
