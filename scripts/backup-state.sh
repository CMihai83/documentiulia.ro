#!/bin/bash
# Backup project state before context reset
# Usage: ./backup-state.sh [optional-message]

TIMESTAMP=$(date +%Y%m%d-%H%M)
STATE_FILE="/root/documentiulia.ro/project-state.json"
BACKUP_DIR="/root/documentiulia.ro/backups"
BACKUP_FILE="${BACKUP_DIR}/project-state-backup-${TIMESTAMP}.json"

# Create backup
cp "$STATE_FILE" "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"

# Keep only last 30 backups
cd "$BACKUP_DIR"
ls -t project-state-backup-*.json 2>/dev/null | tail -n +31 | xargs -r rm --

# Git commit if message provided
if [ -n "$1" ]; then
    cd /root/documentiulia.ro
    git add project-state.json
    git commit -m "Update project state: $1"
    echo "Committed to git with message: $1"
fi

echo "State backup complete."
