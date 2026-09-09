#!/bin/sh
set -eu

: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"

if [ "${CONFIRM_EMPTY_TARGET_RESTORE:-}" != "RESTORE_VENDO_BACKUP" ]; then
  echo "Set CONFIRM_EMPTY_TARGET_RESTORE=RESTORE_VENDO_BACKUP" >&2
  exit 1
fi
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file does not exist" >&2
  exit 1
fi

TABLE_COUNT="$(psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -tAc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")"
if [ "$TABLE_COUNT" -ne 0 ]; then
  echo "Target public schema is not empty; refusing restore" >&2
  exit 1
fi

pg_restore --list "$BACKUP_FILE" >/dev/null
pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname="$TARGET_DATABASE_URL" "$BACKUP_FILE"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT COUNT(*) AS applied_migrations FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;'
