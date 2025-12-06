#!/bin/bash
###############################################################################
# Documentiulia Database Restore Script
# Restores database from compressed backup with safety checks
###############################################################################

set -e  # Exit on error

# Configuration
BACKUP_DIR="/var/backups/documentiulia/database"
DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_NAME="accountech_production"
DB_USER="accountech_app"
DB_PASSWORD="AccTech2025Prod@Secure"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if backup file provided
if [ -z "$1" ]; then
    echo -e "${RED}✗${NC} No backup file specified"
    echo ""
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/documentiulia_db_*.sql.gz 2>/dev/null | tail -10 | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}'
    exit 1
fi

BACKUP_FILE="$1"

# Determine backup path
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_PATH="$BACKUP_FILE"
elif [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
else
    echo -e "${RED}✗${NC} Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "==========================================="
echo "Documentiulia Database Restore"
echo "==========================================="
echo ""
echo "Timestamp: $(date)"
echo "Backup file: $(basename $BACKUP_PATH)"
echo "Database: $DB_NAME"
echo ""

# Verify checksum if available
if [ -f "${BACKUP_PATH}.md5" ]; then
    echo "Verifying backup integrity..."
    EXPECTED_CHECKSUM=$(cat "${BACKUP_PATH}.md5" | awk '{print $1}')
    ACTUAL_CHECKSUM=$(md5sum "$BACKUP_PATH" | awk '{print $1}')

    if [ "$EXPECTED_CHECKSUM" == "$ACTUAL_CHECKSUM" ]; then
        echo -e "${GREEN}✓${NC} Checksum verified: $ACTUAL_CHECKSUM"
    else
        echo -e "${RED}✗${NC} Checksum mismatch!"
        echo "  Expected: $EXPECTED_CHECKSUM"
        echo "  Actual: $ACTUAL_CHECKSUM"
        echo ""
        read -p "Continue anyway? (yes/no): " CONTINUE
        if [ "$CONTINUE" != "yes" ]; then
            echo "Restore aborted"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠${NC} No checksum file found, skipping verification"
fi

# Safety confirmation
echo ""
echo -e "${YELLOW}⚠ WARNING:${NC} This will DROP and RECREATE the database!"
echo "  Database: $DB_NAME"
echo "  All current data will be lost!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore aborted"
    exit 0
fi

# Create pre-restore backup
echo ""
echo "Creating pre-restore backup..."
PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --create \
    --if-exists \
    | gzip > "$PRE_RESTORE_BACKUP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Pre-restore backup created: $(basename $PRE_RESTORE_BACKUP)"
else
    echo -e "${RED}✗${NC} Pre-restore backup failed"
    read -p "Continue without pre-restore backup? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        echo "Restore aborted"
        exit 1
    fi
fi

# Terminate active connections
echo ""
echo "Terminating active database connections..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1

echo -e "${GREEN}✓${NC} Active connections terminated"

# Restore database
echo ""
echo "Restoring database from backup..."
echo "This may take several minutes..."
echo ""

if [[ "$BACKUP_PATH" == *.gz ]]; then
    gunzip -c "$BACKUP_PATH" | PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        > /dev/null 2>&1
else
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -f "$BACKUP_PATH" \
        > /dev/null 2>&1
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Database restored successfully"
else
    echo -e "${RED}✗${NC} Database restore failed"
    echo ""
    echo "Attempting to restore from pre-restore backup..."
    gunzip -c "$PRE_RESTORE_BACKUP" | PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Pre-restore backup restored successfully"
        echo "Database rolled back to pre-restore state"
    else
        echo -e "${RED}✗${NC} Failed to restore pre-restore backup"
        echo "Database may be in inconsistent state!"
    fi
    exit 1
fi

# Verify restore
echo ""
echo "Verifying restore..."

# Count tables
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

echo -e "${GREEN}✓${NC} Restored $TABLE_COUNT tables"

# Count critical records
TREE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM decision_trees WHERE is_active = true;" | xargs)

USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM users;" | xargs)

echo -e "${GREEN}✓${NC} Decision trees: $TREE_COUNT active"
echo -e "${GREEN}✓${NC} Users: $USER_COUNT"

# Run health check
echo ""
echo "Running health check..."
if [ -f "/var/www/documentiulia.ro/scripts/health_check.php" ]; then
    php /var/www/documentiulia.ro/scripts/health_check.php | tail -20
else
    echo -e "${YELLOW}⚠${NC} Health check script not found, skipping"
fi

echo ""
echo "==========================================="
echo "Restore completed successfully!"
echo "==========================================="
echo ""
echo "Database: $DB_NAME"
echo "Tables restored: $TABLE_COUNT"
echo "Active decision trees: $TREE_COUNT"
echo "Users: $USER_COUNT"
echo ""
echo "Pre-restore backup saved to:"
echo "  $PRE_RESTORE_BACKUP"
echo ""
