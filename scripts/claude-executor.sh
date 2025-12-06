#!/bin/bash
# Claude Executor Script
# Picks up Grok's instructions and executes them via Claude

set -e

PROJECT_DIR="/root/documentiulia.ro"
LOG_FILE="/var/log/documentiulia-claude-executor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting Claude executor..."

cd "$PROJECT_DIR"

# Find the latest Grok review
LATEST_REVIEW=$(ls -t GROK_REVIEW_*.md 2>/dev/null | head -1)

if [ -z "$LATEST_REVIEW" ]; then
    log "No pending Grok reviews found"
    exit 0
fi

log "Processing review: $LATEST_REVIEW"

# Read the review
INSTRUCTIONS=$(cat "$LATEST_REVIEW")

# Execute via Claude (this would be called by a cron or monitoring system)
# The actual Claude invocation would depend on how Claude Code is set up
log "Instructions to execute:"
echo "$INSTRUCTIONS" | tee -a "$LOG_FILE"

# Archive the processed review
mkdir -p "$PROJECT_DIR/reviews/processed"
mv "$LATEST_REVIEW" "$PROJECT_DIR/reviews/processed/"

log "Review processed and archived"
