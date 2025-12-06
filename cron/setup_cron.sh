#!/bin/bash
# Cron Setup Script for Documentiulia.ro
# Run this script to set up automated tasks

CRON_DIR="/var/www/documentiulia.ro/cron"
SCRIPTS_DIR="/var/www/documentiulia.ro/scripts"
LOG_DIR="/var/log/documentiulia"

# Create log directory
mkdir -p "$LOG_DIR"
chown www-data:www-data "$LOG_DIR"

# Create cron jobs file
CRON_FILE="/tmp/documentiulia_cron"

cat > "$CRON_FILE" << 'EOF'
# Documentiulia.ro Automated Tasks
# ================================

# Health Check - Every 5 minutes
*/5 * * * * /var/www/documentiulia.ro/scripts/health_check.sh >> /var/log/documentiulia/health.log 2>&1

# Database Backup - Daily at 2:00 AM
0 2 * * * /var/www/documentiulia.ro/scripts/backup_database.sh >> /var/log/documentiulia/backup.log 2>&1

# Clean old logs - Weekly on Sunday at 3:00 AM
0 3 * * 0 find /var/log/documentiulia -name "*.log" -mtime +30 -delete

# Sync bank transactions - Every 6 hours
0 */6 * * * /var/www/documentiulia.ro/cron/sync_bank_transactions.php >> /var/log/documentiulia/bank_sync.log 2>&1

# Send reminder emails - Daily at 8:00 AM
0 8 * * * /var/www/documentiulia.ro/cron/send_reminders.php >> /var/log/documentiulia/reminders.log 2>&1

# Clean expired sessions - Every hour
0 * * * * /var/www/documentiulia.ro/cron/cleanup_sessions.php >> /var/log/documentiulia/cleanup.log 2>&1

# Generate reports - Daily at 6:00 AM
0 6 * * * /var/www/documentiulia.ro/cron/generate_daily_reports.php >> /var/log/documentiulia/reports.log 2>&1

# Check SSL certificates - Weekly on Monday at 9:00 AM
0 9 * * 1 /var/www/documentiulia.ro/cron/check_ssl.sh >> /var/log/documentiulia/ssl.log 2>&1

EOF

# Install cron jobs
crontab "$CRON_FILE"

echo "Cron jobs installed successfully!"
echo "Current cron jobs:"
crontab -l

# Clean up temp file
rm "$CRON_FILE"
