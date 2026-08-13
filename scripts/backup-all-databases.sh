#!/bin/bash
###############################################################################
# REQ-048 — Encrypted backups for EVERY Postgres on the box, not just the
# platform DB.
#
# The platform database (documentiulia-db) was the only thing covered by
# backup-encrypted.sh. certainty-engine's database — which holds paying-customer
# lease documents, extractions and the verified-corrections dataset (the actual
# product moat) — had ZERO backup coverage, as did any running module slice.
# Losing that volume would mean losing customer data with no recovery path.
#
# Discovers containers dynamically, so a slice that gets started later is
# picked up automatically without editing this script.
#
#   ./backup-all-databases.sh backup   # dump + encrypt + prune every DB found
#   ./backup-all-databases.sh list     # show what would be backed up
#
# Requires BACKUP_ENCRYPTION_KEY (same key as backup-encrypted.sh).
###############################################################################
set -uo pipefail

BACKUP_ROOT="/root/documentiulia.ro/backups/db"
RETENTION_DAYS=30
LOG_FILE="/var/log/documentiulia/backup.log"
TS=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_ROOT" "$(dirname "$LOG_FILE")"
log() { echo "[$(date '+%F %T')] [all-db] $*" | tee -a "$LOG_FILE"; }

# Every running container whose image is a postgres variant. Excludes the
# platform DB (handled by backup-encrypted.sh, which also runs restore drills)
# and any throwaway drill container.
# Scoped to THIS platform's databases: the certainty-engine product DB and the
# module slices (modules/*/docker-compose.yml -> "<slice>-db-1"). Other projects
# on this host (ai_xyz_v2, apex, content-platform, fisher) run their own backup
# regimes — sweeping them here would duplicate work and confuse ownership.
discover() {
  local slices=""
  if [[ -d /root/documentiulia.ro/modules ]]; then
    slices=$(ls -1 /root/documentiulia.ro/modules 2>/dev/null | sed 's/$/-db-1/' | paste -sd'|' -)
  fi
  local pattern="^certainty-engine-db-1$"
  [[ -n "$slices" ]] && pattern="${pattern}|^(${slices})$"

  docker ps --format '{{.Names}}\t{{.Image}}' \
    | awk -F'\t' 'tolower($2) ~ /postgres|timescale|pgvector/ { print $1 }' \
    | grep -E "$pattern" \
    | grep -v 'backup_restore_drill'
}

backup_one() {
  local container="$1"
  # Read credentials from the container's own environment — every image sets these.
  local user db
  user=$(docker exec "$container" printenv POSTGRES_USER 2>/dev/null || echo postgres)
  db=$(docker exec "$container" printenv POSTGRES_DB 2>/dev/null || echo "$user")
  local dir="$BACKUP_ROOT/$container"
  mkdir -p "$dir"
  local out="$dir/${container}_${TS}.sql.gz.enc"

  if ! docker exec "$container" pg_dump -U "$user" "$db" 2>/dev/null \
      | gzip \
      | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_ENCRYPTION_KEY \
      > "$out"; then
    log "ERROR: dump failed for $container"; rm -f "$out"; return 1
  fi

  local size; size=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [[ "$size" -lt 500 ]]; then
    log "ERROR: $container backup only ${size} bytes — treating as failure."; rm -f "$out"; return 1
  fi
  log "OK $container ($db) -> $(basename "$out") [${size} bytes]"

  if [[ -n "${BACKUP_REMOTE:-}" ]]; then
    rsync -a "$out" "$BACKUP_REMOTE/" && log "  off-box copy ok" || log "  WARN off-box rsync failed"
  fi
  find "$dir" -name "${container}_*.sql.gz.enc" -mtime +$RETENTION_DAYS -delete
  return 0
}

case "${1:-backup}" in
  list)
    discover
    ;;
  backup)
    if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
      log "ERROR: BACKUP_ENCRYPTION_KEY not set — refusing to write unencrypted backups."; exit 1
    fi
    failed=0; total=0
    for c in $(discover); do
      total=$((total+1))
      backup_one "$c" || failed=$((failed+1))
    done
    log "Done: $((total-failed))/${total} databases backed up."
    [[ "$failed" -eq 0 ]] || exit 1
    ;;
  *)
    echo "usage: $0 [backup|list]"; exit 2 ;;
esac
