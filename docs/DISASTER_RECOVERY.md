# Disaster Recovery

## Targets

Set business-approved RPO/RTO before go-live. The baseline daily dump policy provides an RPO of up to 24 hours; RTO depends on database size and restore testing. Use managed snapshots plus WAL/PITR for tighter targets.

## Database Loss or Corruption

Stop API writes, preserve logs and damaged storage, identify the last verified backup/PITR point, restore into a new database, run migration/invariant/readiness checks, then switch `DATABASE_URL` and restart the API. Keep the old database isolated until reconciliation is approved.

## Server Loss

Provision a hardened replacement host, restore the host-only environment from the secret manager, deploy the pinned images, restore PostgreSQL or connect the managed database, restore Caddy data or reissue certificates, and run the production checklist before DNS/failover.

## Failed Deploy or Migration

Stop rollout traffic. If the schema is compatible, restore the prior application images. For data/schema damage, do not edit migration history or improvise reverse SQL; restore the pre-deploy backup into a new database and verify before cutover. Preserve the failed database for analysis.

## Compromised Credential

Revoke affected sessions, disable impacted users, rotate database/JWT/host credentials, restart services that consume rotated secrets, review audit and structured request logs, and invalidate all sessions through credential changes where needed. If signing secrets are compromised, treat all issued tokens as untrusted.

## Accidental Operator Action

Use immutable movements/ledgers and supported reversal workflows where possible. For destructive database actions, stop writes and restore to a separate database to measure the impact before any cutover. Preserve audit evidence.
