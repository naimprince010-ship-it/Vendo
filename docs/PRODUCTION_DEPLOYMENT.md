# Production Deployment

## Recommended Topology

Internet → DNS → Caddy (TLS) → Next.js web and NestJS API → private PostgreSQL 17.

`compose.production.yaml` implements this topology. PostgreSQL publishes no host port. Caddy is the only internet-facing service and obtains/renews TLS certificates. For larger installations, use a managed PostgreSQL service on a private network and retain the same application boundary.

## Host Prerequisites

- Supported Linux host with current Docker Engine and Compose plugin
- Domain A/AAAA record pointing to the host
- Firewall allowing inbound TCP 80/443 only; restrict SSH by operator policy
- Persistent, monitored storage for PostgreSQL and Caddy volumes
- Separate encrypted off-host backup destination

## Configuration

Copy `.env.production.example` to a host-only `.env.production`; never commit it. Generate independent high-entropy database, access-token, and refresh-token secrets. URL-encode the database password in `DATABASE_URL`. `APP_DOMAIN` must be the public HTTPS hostname.

Production startup rejects loopback/example database configuration, HTTP/wildcard CORS, reused or placeholder JWT secrets, invalid lifetimes, and enabled development seed/bootstrap switches. Swagger is disabled in production. Refresh cookies are Secure, HttpOnly, SameSite=Lax and scoped to authentication routes.

## First Deployment

1. Verify and store a database backup if upgrading an existing installation.
2. Build images: `docker compose --env-file .env.production -f compose.production.yaml build`.
3. Start PostgreSQL: `docker compose --env-file .env.production -f compose.production.yaml up -d postgres`.
4. Apply forward migrations once: `docker compose --env-file .env.production -f compose.production.yaml --profile tools run --rm migrate`.
5. Start API/web/proxy: `docker compose --env-file .env.production -f compose.production.yaml up -d api web caddy`.
6. Verify `/api/v1/health` (liveness), `/api/v1/health/ready` (database readiness), HTTPS, login, and a read-only business query.
7. Create the first owner through a controlled one-time administration procedure. The repository development bootstrap is disabled in production; if used during an initial isolated deployment, explicitly enable it only for that one command, supply a strong unique password through the secret environment, then disable it immediately and rotate that password at first login.
8. Configure company, branch, warehouse, register, payment methods, users/roles, products, conversions, and opening inventory.

## Updates and Migration Safety

1. Review the migration SQL and release notes.
2. Take and verify a fresh backup before deployment.
3. Use a maintenance window for migrations that lock or rewrite populated tables.
4. Build immutable images and run the one-shot migrate service.
5. Confirm migration status and readiness before switching application traffic.
6. Roll application containers forward together and run the smoke checklist.

Database migrations are forward-only. Do not assume an automatic destructive rollback is safe. If application rollout fails but schema is backward-compatible, restore the prior images. If a migration corrupts data or is incompatible, stop writes, preserve forensic copies/logs, and restore the verified pre-deploy backup to a new database before redirecting traffic.

## Monitoring

Monitor HTTPS availability, readiness, container restarts, structured JSON error logs, PostgreSQL connections/storage, host disk/memory/CPU, backup age, and restore-test age. Alert on repeated authentication failures, refresh-token reuse, HTTP 5xx, readiness failure, low disk, backup failure, and unexpected cash/inventory reconciliation differences. A paid monitoring service is optional.

## Assets and Printing

Product/company binary uploads are not implemented in v1; do not place business assets on ephemeral container filesystems. CSV report exports provide scoped operational portability, but are not a full database migration format. Thermal and A4 browser layouts are implemented; each production printer/browser/driver combination still requires hardware acceptance testing.
