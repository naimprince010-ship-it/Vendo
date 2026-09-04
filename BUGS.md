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

## BUG-002 — Local PostgreSQL verification blocked by Docker service availability

- **ID:** BUG-002
- **Severity:** High
- **Area:** Development environment / Phase 2 migration verification
- **Description:** Docker Desktop's Linux engine was initially unavailable while `com.docker.service` was stopped and the session could not start the service directly.
- **Reproduction:** Run `docker compose --env-file .env.example up -d postgres` or `Start-Service com.docker.service` in the current session.
- **Expected:** Docker Desktop starts PostgreSQL 17 for migration application and catalog verification.
- **Actual:** Docker initially reported a missing `dockerDesktopLinuxEngine` pipe; Windows reported `Cannot open 'com.docker.service' service on computer '.'`.
- **Status:** Resolved — Docker Desktop was launched through its installed application, PostgreSQL 17 became healthy, and the migration, catalog, invariant, and runtime connectivity checks passed on 2026-09-04.
- **Related task:** Phase 2 — initial migration application and verification

## BUG-003 — Docker restart failed when C: reached zero free bytes

- **ID:** BUG-003
- **Severity:** High
- **Area:** Development environment / Phase 2 verification
- **Description:** Docker Desktop stores host-side VM logs under the user profile on C: even though Docker Desktop and the repository are on other drives. C: reached zero free bytes during the final migration replay check.
- **Reproduction:** Start or restart Docker Desktop when C: has no writable free space.
- **Expected:** Docker starts its Linux engine and preserves the PostgreSQL development volume.
- **Actual:** Docker reported `Docker Desktop cannot continue because the disk is full` while writing `AppData\Local\Docker\log\vm\init.log`; Prisma then lost its shadow-database connection.
- **Status:** Resolved — the 0.82 GiB Puppeteer download cache was moved recoverably to `D:\Projects\.cache-relocation-backup\puppeteer`, Docker restarted, the PostgreSQL volume remained intact, and the migration replay/drift check passed.
- **Related task:** Phase 2 — final verification gate

## BUG-004 — Fully parallel uncached verification exceeded available memory

- **ID:** BUG-004
- **Severity:** Low
- **Area:** Development environment / verification execution
- **Description:** Forcing lint, typecheck, tests, and builds for every package in one Turbo invocation launched too many Node.js processes for the available memory.
- **Reproduction:** Run `pnpm exec turbo run lint typecheck test build --force` on the current machine.
- **Expected:** All uncached checks complete.
- **Actual:** API and web typecheck processes exited with Node.js `Zone Allocation failed - process out of memory` while unrelated tasks were also running.
- **Status:** Resolved — the same uncached lint, typecheck, test, and build tasks passed with `--concurrency=1`; normal root verification commands also pass.
- **Related task:** Phase 2 — final verification gate

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
