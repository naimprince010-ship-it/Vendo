# Operations Runbook

## Deploy and Restart

- Follow `PRODUCTION_DEPLOYMENT.md`; backup before migrations.
- Inspect state with `docker compose --env-file .env.production -f compose.production.yaml ps`.
- Restart one stateless service with `docker compose --env-file .env.production -f compose.production.yaml restart api` (or `web`). Avoid restarting PostgreSQL as a routine application fix.
- Confirm liveness, readiness, HTTPS, login, branch selection, and one read-only report after intervention.

## Logs

API request logs are JSON and carry request ID, route, status, duration, user/company/branch identifiers when authenticated, and no request bodies or credentials. Correlate client-visible `x-request-id` with container logs. Restrict log access and retention.

## Backup and Restore

Use `BACKUP_RESTORE.md`. A successful dump command alone is not proof of recoverability; validate the archive and schedule isolated restore drills.

## Failed Migration

Stop application writes, capture migration output and database state, and do not modify an applied migration. Prefer a corrective forward migration when data is intact. Restore the verified pre-deploy backup to a new database when integrity is uncertain.

## Owner/Admin Recovery

Use a controlled database-backed administrative procedure from a secured host. Do not create default credentials. After recovery, require a strong new password, revoke existing sessions, record the action, and remove temporary elevated access.

## Database Unavailable

Readiness returns 503. Check PostgreSQL health, network/DNS, credentials, connection exhaustion, locks, disk, and provider status. Keep the API out of load-balancer rotation until readiness returns 200.

## Disk Full

Stop write-heavy workloads, identify the exact full filesystem, preserve database files, and remove only verified expendable logs/caches. Never recursively delete broad or unresolved paths. Expand storage and verify PostgreSQL recovery, backup freshness, and invariants.

## Emergency Shutdown

Block external traffic at the proxy/firewall, stop web/API containers, allow PostgreSQL to shut down cleanly, preserve volumes/logs, and record time/reason/operator. Do not delete containers or volumes during containment.
