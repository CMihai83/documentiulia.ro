#!/bin/bash
###############################################################################
# Documentiulia Database Backup Script
# Creates timestamped backups with compression and retention policy
###############################################################################

set -e  # Exit on error

# Configuration
BACKUP_DIR="/var/backups/documentiulia/database"
DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_NAME="accountech_production"
DB_USER="accountech_app"
DB_PASSWORD="AccTech2025Prod@Secure"
RETENTION_DAYS=30
S3_BUCKET=""  # Optional: Set for S3 upload

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="documentiulia_db_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo "==========================================="
echo "Documentiulia Database Backup"
echo "==========================================="
echo ""
echo "Timestamp: $(date)"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

# Create database dump
echo "Creating database dump..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --create \
    --if-exists \
    --verbose \
    > "$BACKUP_PATH" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Database dump created successfully"
else
    echo -e "${RED}✗${NC} Database dump failed"
    exit 1
fi

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_PATH"
BACKUP_PATH="${BACKUP_PATH}.gz"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo -e "${GREEN}✓${NC} Backup compressed: $BACKUP_SIZE"
else
    echo -e "${RED}✗${NC} Compression failed"
    exit 1
fi

# Calculate checksum
echo "Calculating checksum..."
CHECKSUM=$(md5sum "$BACKUP_PATH" | awk '{print $1}')
echo "$CHECKSUM  $BACKUP_FILE.gz" > "${BACKUP_PATH}.md5"
echo -e "${GREEN}✓${NC} Checksum: $CHECKSUM"

# Upload to S3 (if configured)
if [ ! -z "$S3_BUCKET" ]; then
    echo "Uploading to S3..."
    if command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/database/" --storage-class STANDARD_IA
        aws s3 cp "${BACKUP_PATH}.md5" "s3://${S3_BUCKET}/database/"
        echo -e "${GREEN}✓${NC} Uploaded to S3: s3://${S3_BUCKET}/database/${BACKUP_FILE}.gz"
    else
        echo -e "${YELLOW}⚠${NC} AWS CLI not installed, skipping S3 upload"
    fi
fi

# Delete old backups (retention policy)
echo "Applying retention policy (${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "documentiulia_db_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "documentiulia_db_*.sql.gz.md5" -type f -mtime +$RETENTION_DAYS -delete

REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "documentiulia_db_*.sql.gz" -type f | wc -l)
echo -e "${GREEN}✓${NC} Retention policy applied, $REMAINING_BACKUPS backups retained"

# Create backup manifest
echo "Creating backup manifest..."
cat > "${BACKUP_DIR}/latest_backup.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "backup_file": "$BACKUP_FILE.gz",
  "backup_path": "$BACKUP_PATH",
  "backup_size": "$BACKUP_SIZE",
  "checksum": "$CHECKSUM",
  "database": "$DB_NAME",
  "retention_days": $RETENTION_DAYS,
  "total_backups": $REMAINING_BACKUPS
}
EOF

echo ""
echo "==========================================="
echo "Backup completed successfully!"
echo "==========================================="
echo ""
echo "Backup file: $BACKUP_PATH"
echo "Size: $BACKUP_SIZE"
echo "Checksum: $CHECKSUM"
echo ""
echo "To restore this backup, run:"
echo "  bash /var/www/documentiulia.ro/scripts/restore_database.sh $BACKUP_FILE.gz"
echo ""
