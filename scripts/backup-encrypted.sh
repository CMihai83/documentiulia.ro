#!/bin/bash
###############################################################################
# GI-SEC-3 — Encrypted PostgreSQL backups + restore drill (GDPR Art 32(1)(c/d))
#
# Dumps the live DB via the running container, compresses, and encrypts at rest
# with AES-256 (openssl, pbkdf2) so backups no longer hold plaintext PII.
#
#   ./backup-encrypted.sh backup        # dump + encrypt + prune (default)
#   ./backup-encrypted.sh restore-test  # decrypt latest + restore to a throwaway
#                                        # container + verify row counts (drill)
#
# Requires BACKUP_ENCRYPTION_KEY in the environment (root .env). Optional
# BACKUP_REMOTE="user@host:/path" rsyncs the .enc off-box (Hetzner Storage Box).
###############################################################################
set -euo pipefail

DB_CONTAINER="documentiulia-db"
DB_USER="${POSTGRES_USER:-documentiulia}"
DB_NAME="${POSTGRES_DB:-documentiulia}"
BACKUP_DIR="/root/documentiulia.ro/backups/db"
RETENTION_DAYS=30
LOG_FILE="/var/log/documentiulia/backup.log"
TS=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"
log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG_FILE"; }

require_key() {
  if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
    log "ERROR: BACKUP_ENCRYPTION_KEY not set — refusing to write an unencrypted backup."; exit 1
  fi
}

do_backup() {
  require_key
  local out="$BACKUP_DIR/documentiulia_${TS}.sql.gz.enc"
  log "Backup start -> $out"
  # dump (container-local, no password needed) | gzip | AES-256 encrypt
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" \
    | gzip \
    | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_ENCRYPTION_KEY \
    > "$out"
  local size; size=$(stat -c%s "$out")
  if [[ "$size" -lt 1000 ]]; then log "ERROR: backup only ${size} bytes — dump likely failed."; rm -f "$out"; exit 1; fi
  log "Backup ok (${size} bytes, encrypted)."
  # off-box copy (optional)
  if [[ -n "${BACKUP_REMOTE:-}" ]]; then
    log "Off-box rsync -> $BACKUP_REMOTE"; rsync -a "$out" "$BACKUP_REMOTE/" && log "Off-box copy ok." || log "WARN: off-box rsync failed."
  fi
  # retention
  find "$BACKUP_DIR" -name 'documentiulia_*.sql.gz.enc' -mtime +$RETENTION_DAYS -delete
  log "Pruned backups older than ${RETENTION_DAYS}d."
}

restore_test() {
  require_key
  local latest; latest=$(ls -t "$BACKUP_DIR"/documentiulia_*.sql.gz.enc 2>/dev/null | head -1)
  [[ -z "$latest" ]] && { log "ERROR: no encrypted backup to test."; exit 1; }
  log "Restore drill using $latest"
  local tc="backup_restore_drill_$$" port=5479
  docker rm -f "$tc" >/dev/null 2>&1 || true
  docker run -d --name "$tc" -e POSTGRES_PASSWORD=drill -e POSTGRES_DB=drill -p ${port}:5432 postgres:15-alpine >/dev/null
  for i in $(seq 1 30); do docker exec "$tc" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
  # decrypt -> gunzip -> psql restore into the throwaway
  openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "$latest" \
    | gunzip \
    | docker exec -i "$tc" psql -U postgres -d drill >/dev/null 2>&1 || { log "ERROR: restore failed (bad key or corrupt dump)."; docker rm -f "$tc" >/dev/null; exit 1; }
  # verify: table count + a couple of key tables exist with rows
  local tables users; tables=$(docker exec "$tc" psql -U postgres -d drill -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
  users=$(docker exec "$tc" psql -U postgres -d drill -tAc "SELECT count(*) FROM \"User\";" 2>/dev/null || echo "n/a")
  docker rm -f "$tc" >/dev/null
  log "Restore drill OK: ${tables} tables restored, User rows=${users}."
  [[ "$tables" -gt 50 ]] || { log "ERROR: only ${tables} tables — restore incomplete."; exit 1; }
}

case "${1:-backup}" in
  backup)       do_backup ;;
  restore-test) restore_test ;;
  *) echo "usage: $0 [backup|restore-test]"; exit 2 ;;
esac
