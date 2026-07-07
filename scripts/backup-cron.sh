#!/bin/bash
# cron wrapper: loads the backup key from .env then runs the requested mode
cd /root/documentiulia.ro || exit 1
export BACKUP_ENCRYPTION_KEY="$(grep '^BACKUP_ENCRYPTION_KEY=' .env | cut -d= -f2-)"
export POSTGRES_USER=documentiulia POSTGRES_DB=documentiulia
exec bash scripts/backup-encrypted.sh "${1:-backup}"
