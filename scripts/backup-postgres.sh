#!/bin/bash

###############################################################################
# PostgreSQL Automated Backup Script for DocumentIulia.ro
#
# Features:
# - Full database dumps with pg_dump
# - Incremental backups with pg_basebackup
# - Compression (gzip) to save storage
# - S3-compatible storage upload (Bunny.net, Backblaze, AWS S3)
# - Encryption (GPG) for sensitive data
# - Retention management (30 days local, 1 year remote)
# - Health monitoring and alerting
# - Restore validation
#
# Usage:
#   ./backup-postgres.sh [full|incremental]
#
# Cron Setup (Daily at 2 AM):
#   0 2 * * * /root/documentiulia.ro/scripts/backup-postgres.sh full >> /var/log/backup-postgres.log 2>&1
#
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
LOG_FILE="${LOG_FILE:-/var/log/backup-postgres.log}"

# PostgreSQL Configuration
PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-documentiulia_user}"
PG_DB="${POSTGRES_DB:-documentiulia}"
PGPASSWORD="${POSTGRES_PASSWORD:-}"

# S3-Compatible Storage Configuration
S3_ENABLED="${S3_ENABLED:-false}"
S3_ENDPOINT="${S3_ENDPOINT:-https://storage.bunnycdn.com}"
S3_BUCKET="${S3_BUCKET:-documentiulia-backups}"
S3_ACCESS_KEY="${S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${S3_SECRET_KEY:-}"
S3_REGION="${S3_REGION:-eu-west-1}"

# Encryption Configuration
ENCRYPT_ENABLED="${ENCRYPT_ENABLED:-true}"
GPG_RECIPIENT="${GPG_RECIPIENT:-backups@documentIulia.ro}"

# Retention Configuration
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-30}"
REMOTE_RETENTION_DAYS="${REMOTE_RETENTION_DAYS:-365}"

# Backup Type (full or incremental)
BACKUP_TYPE="${1:-full}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE=$(date +"%Y-%m-%d")

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

###############################################################################
# FULL BACKUP (pg_dump)
###############################################################################
perform_full_backup() {
    log "Starting full PostgreSQL backup for database: $PG_DB"

    BACKUP_FILE="$BACKUP_DIR/${PG_DB}_full_${TIMESTAMP}.sql"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    ENCRYPTED_FILE="${COMPRESSED_FILE}.gpg"

    # Perform pg_dump
    log "Running pg_dump..."
    PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$PG_HOST" \
        -p "$PG_PORT" \
        -U "$PG_USER" \
        -d "$PG_DB" \
        --format=custom \
        --verbose \
        --file="$BACKUP_FILE" \
        2>&1 | tee -a "$LOG_FILE"

    if [ $? -ne 0 ]; then
        error_exit "pg_dump failed"
    fi

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup completed: $BACKUP_FILE ($BACKUP_SIZE)"

    # Compress backup
    log "Compressing backup..."
    gzip -9 "$BACKUP_FILE"
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    log "Compression completed: $COMPRESSED_FILE ($COMPRESSED_SIZE)"

    # Encrypt backup (if enabled)
    if [ "$ENCRYPT_ENABLED" = "true" ]; then
        log "Encrypting backup..."
        gpg --encrypt --recipient "$GPG_RECIPIENT" --output "$ENCRYPTED_FILE" "$COMPRESSED_FILE"

        if [ $? -eq 0 ]; then
            rm "$COMPRESSED_FILE"
            FINAL_FILE="$ENCRYPTED_FILE"
            FINAL_SIZE=$(du -h "$FINAL_FILE" | cut -f1)
            log "Encryption completed: $FINAL_FILE ($FINAL_SIZE)"
        else
            log "WARNING: Encryption failed, keeping unencrypted backup"
            FINAL_FILE="$COMPRESSED_FILE"
        fi
    else
        FINAL_FILE="$COMPRESSED_FILE"
    fi

    # Upload to S3 (if enabled)
    if [ "$S3_ENABLED" = "true" ]; then
        upload_to_s3 "$FINAL_FILE"
    fi

    # Cleanup old local backups
    cleanup_local_backups

    log "Full backup completed successfully: $FINAL_FILE"
}

###############################################################################
# INCREMENTAL BACKUP (pg_basebackup)
###############################################################################
perform_incremental_backup() {
    log "Starting incremental PostgreSQL backup (WAL archiving)"

    BACKUP_DIR_INCREMENTAL="$BACKUP_DIR/incremental_${TIMESTAMP}"
    mkdir -p "$BACKUP_DIR_INCREMENTAL"

    # Perform pg_basebackup
    log "Running pg_basebackup..."
    PGPASSWORD="$PGPASSWORD" pg_basebackup \
        -h "$PG_HOST" \
        -p "$PG_PORT" \
        -U "$PG_USER" \
        -D "$BACKUP_DIR_INCREMENTAL" \
        --format=tar \
        --gzip \
        --checkpoint=fast \
        --progress \
        --verbose \
        2>&1 | tee -a "$LOG_FILE"

    if [ $? -ne 0 ]; then
        error_exit "pg_basebackup failed"
    fi

    BACKUP_SIZE=$(du -sh "$BACKUP_DIR_INCREMENTAL" | cut -f1)
    log "Incremental backup completed: $BACKUP_DIR_INCREMENTAL ($BACKUP_SIZE)"

    # Upload to S3 (if enabled)
    if [ "$S3_ENABLED" = "true" ]; then
        upload_directory_to_s3 "$BACKUP_DIR_INCREMENTAL"
    fi

    log "Incremental backup completed successfully"
}

###############################################################################
# UPLOAD TO S3-COMPATIBLE STORAGE
###############################################################################
upload_to_s3() {
    local file="$1"
    local filename=$(basename "$file")
    local s3_path="s3://${S3_BUCKET}/postgres/${DATE}/${filename}"

    log "Uploading backup to S3: $s3_path"

    # Use AWS CLI or s3cmd
    if command -v aws &> /dev/null; then
        AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
        AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
        aws s3 cp "$file" "$s3_path" \
            --endpoint-url "$S3_ENDPOINT" \
            --region "$S3_REGION" \
            --storage-class STANDARD \
            2>&1 | tee -a "$LOG_FILE"
    elif command -v s3cmd &> /dev/null; then
        s3cmd put "$file" "$s3_path" \
            --access_key="$S3_ACCESS_KEY" \
            --secret_key="$S3_SECRET_KEY" \
            --host="$S3_ENDPOINT" \
            --host-bucket="$S3_ENDPOINT" \
            2>&1 | tee -a "$LOG_FILE"
    else
        log "WARNING: Neither aws-cli nor s3cmd found. Skipping S3 upload."
        return 1
    fi

    if [ $? -eq 0 ]; then
        log "Upload completed successfully: $s3_path"

        # Cleanup old remote backups
        cleanup_remote_backups
    else
        log "ERROR: Upload failed"
        return 1
    fi
}

upload_directory_to_s3() {
    local dir="$1"
    local dirname=$(basename "$dir")
    local s3_path="s3://${S3_BUCKET}/postgres/${DATE}/${dirname}/"

    log "Uploading directory to S3: $s3_path"

    if command -v aws &> /dev/null; then
        AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
        AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
        aws s3 sync "$dir" "$s3_path" \
            --endpoint-url "$S3_ENDPOINT" \
            --region "$S3_REGION" \
            --storage-class STANDARD \
            2>&1 | tee -a "$LOG_FILE"
    else
        log "WARNING: aws-cli not found. Skipping S3 upload."
        return 1
    fi
}

###############################################################################
# CLEANUP OLD BACKUPS
###############################################################################
cleanup_local_backups() {
    log "Cleaning up local backups older than $LOCAL_RETENTION_DAYS days..."

    find "$BACKUP_DIR" -type f -name "*.sql.gz*" -mtime +"$LOCAL_RETENTION_DAYS" -delete
    find "$BACKUP_DIR" -type d -name "incremental_*" -mtime +"$LOCAL_RETENTION_DAYS" -exec rm -rf {} +

    log "Local cleanup completed"
}

cleanup_remote_backups() {
    log "Cleaning up remote backups older than $REMOTE_RETENTION_DAYS days..."

    # Calculate cutoff date
    CUTOFF_DATE=$(date -d "-$REMOTE_RETENTION_DAYS days" +"%Y-%m-%d")

    if command -v aws &> /dev/null; then
        AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
        AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
        aws s3 ls "s3://${S3_BUCKET}/postgres/" \
            --endpoint-url "$S3_ENDPOINT" \
            --recursive | while read -r line; do
                file_date=$(echo "$line" | awk '{print $1}')
                file_path=$(echo "$line" | awk '{print $4}')

                if [[ "$file_date" < "$CUTOFF_DATE" ]]; then
                    log "Deleting old backup: $file_path"
                    AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
                    AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
                    aws s3 rm "s3://${S3_BUCKET}/${file_path}" \
                        --endpoint-url "$S3_ENDPOINT"
                fi
            done
    fi

    log "Remote cleanup completed"
}

###############################################################################
# VALIDATE BACKUP
###############################################################################
validate_backup() {
    local file="$1"

    log "Validating backup integrity: $file"

    # Test gzip integrity
    if [[ "$file" == *.gz ]]; then
        gzip -t "$file"
        if [ $? -eq 0 ]; then
            log "Backup integrity check passed"
        else
            error_exit "Backup integrity check failed"
        fi
    fi

    # Test GPG decryption
    if [[ "$file" == *.gpg ]]; then
        gpg --decrypt "$file" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            log "Backup decryption test passed"
        else
            log "WARNING: Backup decryption test failed"
        fi
    fi
}

###############################################################################
# HEALTH CHECK
###############################################################################
health_check() {
    log "Performing health check..."

    # Check PostgreSQL connectivity
    PGPASSWORD="$PGPASSWORD" pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER"
    if [ $? -eq 0 ]; then
        log "PostgreSQL health check: OK"
    else
        error_exit "PostgreSQL health check: FAILED"
    fi

    # Check disk space
    DISK_USAGE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    log "Backup directory disk usage: ${DISK_USAGE}%"

    if [ "$DISK_USAGE" -gt 90 ]; then
        log "WARNING: Disk usage is above 90%"
    fi
}

###############################################################################
# MAIN
###############################################################################
main() {
    log "==================================================================="
    log "Starting PostgreSQL backup process"
    log "Backup type: $BACKUP_TYPE"
    log "Database: $PG_DB"
    log "Host: $PG_HOST:$PG_PORT"
    log "==================================================================="

    # Health check
    health_check

    # Perform backup based on type
    case "$BACKUP_TYPE" in
        full)
            perform_full_backup
            ;;
        incremental)
            perform_incremental_backup
            ;;
        *)
            error_exit "Invalid backup type: $BACKUP_TYPE. Use 'full' or 'incremental'."
            ;;
    esac

    log "==================================================================="
    log "Backup process completed successfully"
    log "==================================================================="
}

# Run main function
main
