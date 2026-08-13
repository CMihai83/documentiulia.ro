#!/bin/bash
# cron wrapper: loads the backup key from .env then runs the requested mode
cd /root/documentiulia.ro || exit 1
export BACKUP_ENCRYPTION_KEY="$(grep '^BACKUP_ENCRYPTION_KEY=' .env | cut -d= -f2-)"
export POSTGRES_USER=documentiulia POSTGRES_DB=documentiulia
# REQ-048: the platform DB gets the full treatment (backup + weekly restore
# drill); certainty-engine and the module slices get encrypted dumps too —
# previously they had no backup coverage at all.
if [[ "${1:-backup}" == "backup" ]]; then
  bash scripts/backup-all-databases.sh backup || echo "WARN: secondary-database backup reported failures"
fi

exec bash scripts/backup-encrypted.sh "${1:-backup}"
