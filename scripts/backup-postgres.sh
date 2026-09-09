#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required and must be a dedicated absolute directory}"

case "$BACKUP_DIR" in
  /*) ;;
  *) echo "BACKUP_DIR must be absolute" >&2; exit 1 ;;
esac
if [ "$BACKUP_DIR" = "/" ]; then
  echo "Refusing to use / as BACKUP_DIR" >&2
  exit 1
fi

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
case "$RETENTION_DAYS" in
  ''|*[!0-9]*) echo "BACKUP_RETENTION_DAYS must be a positive integer" >&2; exit 1 ;;
esac
if [ "$RETENTION_DAYS" -lt 1 ]; then
  echo "BACKUP_RETENTION_DAYS must be at least 1" >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/vendo-$STAMP.dump"
TEMP="$TARGET.partial"

pg_dump --format=custom --compress=9 --no-owner --no-acl --file="$TEMP" "$DATABASE_URL"
pg_restore --list "$TEMP" >/dev/null
mv "$TEMP" "$TARGET"
sha256sum "$TARGET" >"$TARGET.sha256"
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'vendo-*.dump' -o -name 'vendo-*.dump.sha256' \) -mtime "+$RETENTION_DAYS" -delete

echo "$TARGET"
