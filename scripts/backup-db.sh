#!/bin/bash
# DocumentIulia.ro PostgreSQL Backup Script
# Automated daily backups with 30-day retention
# ANAF compliance requires 7-year data retention (handled by application, backups are for disaster recovery)

set -euo pipefail

# Configuration
BACKUP_DIR="/root/documentiulia.ro/backups/db"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/documentiulia/db-backup.log"

# Database connection (from environment or defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-documentiulia}"
DB_USER="${DB_USER:-documentiulia}"

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting database backup..."

# Check if running in Docker
if command -v docker &> /dev/null && docker ps | grep -q "documentiulia-postgres"; then
    log "Running backup via Docker container..."
    BACKUP_FILE="$BACKUP_DIR/documentiulia_${TIMESTAMP}.sql.gz"

    docker exec documentiulia-postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
    log "Running backup via local pg_dump..."
    BACKUP_FILE="$BACKUP_DIR/documentiulia_${TIMESTAMP}.sql.gz"

    PGPASSWORD="${DB_PASSWORD:-}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log "ERROR: Backup file is empty or not created!"
    exit 1
fi

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "documentiulia_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "Deleted $DELETED_COUNT old backup(s)"

# List current backups
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "documentiulia_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log "Total backups: $TOTAL_BACKUPS (Total size: $TOTAL_SIZE)"

# Optional: Upload to remote storage (S3, B2, etc.)
# Uncomment and configure if using remote backup storage
# if command -v aws &> /dev/null; then
#     log "Uploading to S3..."
#     aws s3 cp "$BACKUP_FILE" "s3://documentiulia-backups/db/" --storage-class STANDARD_IA
#     log "S3 upload complete"
# fi

log "Database backup completed successfully"
