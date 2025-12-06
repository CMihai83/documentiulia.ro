#!/bin/bash
# Grok Periodic Reviewer Script for DocumentIulia.ro
# Runs periodically via cron to review project status and provide instructions

set -e

PROJECT_DIR="/root/documentiulia.ro"
LOG_FILE="/var/log/documentiulia-grok-review.log"
GROK_CLI="/root/.bun/bin/grok"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting Grok periodic review..."

# Check if project exists
if [ ! -d "$PROJECT_DIR" ]; then
    log "ERROR: Project directory not found"
    exit 1
fi

cd "$PROJECT_DIR"

# Gather project status
git_status=$(git status --short 2>/dev/null || echo "Not a git repo")
file_count=$(find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.py" | wc -l)
last_commit=$(git log -1 --format="%h %s" 2>/dev/null || echo "No commits")

# Create status report
STATUS_REPORT=$(cat <<EOF
DocumentIulia.ro Project Status Report
========================================
Date: $(date '+%Y-%m-%d %H:%M:%S')
Project Directory: $PROJECT_DIR

Git Status:
$git_status

Last Commit: $last_commit
Total Source Files: $file_count

Directory Structure:
$(ls -la)

Recent Changes:
$(git diff --stat HEAD~1 2>/dev/null || echo "Unable to get diff")

Please review the current state of DocumentIulia.ro and provide:
1. Assessment of progress towards MVP
2. Critical issues or bugs to fix
3. Priority tasks for next sprint
4. Instructions for Claude to execute improvements

Focus areas:
- ANAF compliance (SAF-T D406, e-Factura, TVA 21%/11%)
- SAGA v3.2 integration status
- Frontend/Backend completeness
- Test coverage
- Documentation

Respond with specific, actionable instructions that Claude can execute.
EOF
)

log "Sending status to Grok for review..."

# Send to Grok for review
REVIEW_RESULT=$($GROK_CLI -p "$STATUS_REPORT" 2>&1)

log "Grok Review Result:"
echo "$REVIEW_RESULT" | tee -a "$LOG_FILE"

# Save review to file for Claude to pick up
echo "$REVIEW_RESULT" > "$PROJECT_DIR/GROK_REVIEW_$(date '+%Y%m%d_%H%M%S').md"

log "Review complete. Instructions saved."
