#!/bin/bash
# DocumentIulia.ro Database Backup Script
# Runs daily via cron: 0 2 * * * /root/documentiulia.ro/backend/scripts/backup-database.sh

set -e

# Configuration
BACKUP_DIR="/root/documentiulia.ro/backups"
DB_NAME="${POSTGRES_DB:-documentiulia}"
DB_USER="${POSTGRES_USER:-documentiulia}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Load environment variables if .env exists
if [ -f "/root/documentiulia.ro/backend/.env" ]; then
    export $(grep -v '^#' /root/documentiulia.ro/backend/.env | xargs)
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Perform backup with pg_dump via docker-compose
cd /root/documentiulia.ro
docker-compose exec -T postgres pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"

    # Log to file
    echo "[$(date)] SUCCESS: $BACKUP_FILE ($BACKUP_SIZE)" >> "$BACKUP_DIR/backup.log"
else
    echo "[$(date)] ERROR: Backup failed!"
    echo "[$(date)] ERROR: Backup failed!" >> "$BACKUP_DIR/backup.log"
    exit 1
fi

# Delete old backups (older than RETENTION_DAYS)
echo "[$(date)] Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
DELETED_COUNT=$?

# Count remaining backups
REMAINING_BACKUPS=$(ls -1 "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Cleanup complete. Remaining backups: $REMAINING_BACKUPS"

# Optional: Upload to S3/Google Cloud Storage (uncomment and configure if needed)
# aws s3 cp "$BACKUP_FILE" "s3://documentiulia-backups/$(basename $BACKUP_FILE)"
# gsutil cp "$BACKUP_FILE" "gs://documentiulia-backups/$(basename $BACKUP_FILE)"

echo "[$(date)] Backup process finished."
