# PostgreSQL Backup and Restore

## Policy

- Run a custom-format `pg_dump` at least daily; businesses with heavy transaction volume should increase frequency or add WAL/PITR through their PostgreSQL provider.
- Retain daily backups for at least 14 days, weekly backups for 8 weeks, and monthly backups according to legal/business needs.
- Encrypt backups at rest and in transit, restrict restore credentials, and copy backups off the application host/account.
- Monitor backup completion, size, checksum, and age. Test a restore at least monthly and before significant schema releases.

## Backup

`scripts/backup-postgres.sh` requires `DATABASE_URL` and a dedicated absolute `BACKUP_DIR`. It writes with restrictive permissions, creates a compressed custom archive, validates its catalog, records SHA-256, and prunes only matching old Vendo archives according to `BACKUP_RETENTION_DAYS`.

Example inside a trusted PostgreSQL client environment:

```sh
DATABASE_URL="$DATABASE_URL" BACKUP_DIR=/var/backups/vendo BACKUP_RETENTION_DAYS=14 ./scripts/backup-postgres.sh
```

Do not place credentials in cron text. Load them from a root-readable environment file or secret manager. Upload the resulting archive and checksum to encrypted off-host storage.

## Restore Drill

Always restore into a new empty database first. `scripts/restore-postgres.sh` refuses a non-empty public schema and requires the explicit confirmation value.

```sh
TARGET_DATABASE_URL="$TARGET_DATABASE_URL" \
BACKUP_FILE=/secure/backups/vendo-YYYYMMDDTHHMMSSZ.dump \
CONFIRM_EMPTY_TARGET_RESTORE=RESTORE_VENDO_BACKUP \
./scripts/restore-postgres.sh
```

After restore, verify migration count/status, row counts, immutable triggers, inventory movement-to-balance reconciliation, party-ledger sums, cash-shift totals, and a read-only API smoke test. Record the archive checksum, source/target PostgreSQL versions, duration, evidence, and operator.

## Recovery Boundary

Logical dumps do not provide point-in-time recovery between dumps. A managed database with encrypted snapshots and WAL/PITR is recommended where the recovery-point objective requires it. Never overwrite the only surviving database during a restore test.
