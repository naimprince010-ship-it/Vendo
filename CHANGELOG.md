# Changelog

All meaningful project changes are recorded here. This project follows a phase-oriented development history rather than release claims based on file presence.

## Unreleased

### Phase 1 — Foundation

- Connected the empty local Git repository to `https://github.com/naimprince010-ship-it/Vendo.git`.
- Started repository governance, architecture documentation, and monorepo foundation.
- Generated the Next.js 16 application source and added a deterministic NestJS 11 API scaffold with a versioned health endpoint and Swagger bootstrap.
- Added root workspace, Turbo, formatting, environment, and PostgreSQL Compose configuration.
- Relocated the repository non-destructively to `D:\Projects\Vendo`, preserving `.git`, hidden files, documentation, configuration, and all uncommitted source changes; the C: source copy was retained.
- Added shared `@vendo/types`, `@vendo/validation`, and `@vendo/ui` workspace packages.
- Replaced the generated Next.js placeholder with an intentional foundation screen backed by TanStack Query and a schema-validated live API health check.
- Added GitHub Actions CI for frozen install, lint, typecheck, tests, builds, and Compose validation.
- Closed the Phase 1 storage/build blocker after a clean D:-local dependency install and successful Next.js production build.

### Known Issues

- No known Phase 1 issue remains. Phase 2 database implementation is active.
