#!/bin/bash
# Grok → Claude Bridge Script
# Grok analyzes the project and generates tasks, then Claude executes them
# Usage: ./grok-claude-bridge.sh [--dry-run] [--auto-approve]

set -e

PROJECT_DIR="/root/documentiulia.ro"
LOG_DIR="/var/log/documentiulia"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="$LOG_DIR/grok-claude-$TIMESTAMP.log"
GROK_CLI="/root/.bun/bin/grok"
CLAUDE_CLI="claude"

# Flags
DRY_RUN=false
AUTO_APPROVE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      ;;
    --auto-approve)
      AUTO_APPROVE=true
      ;;
  esac
done

# Ensure log directory exists
mkdir -p "$LOG_DIR"
mkdir -p "$PROJECT_DIR/reviews/claude-executions"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Grok → Claude Bridge Starting"
log "Dry Run: $DRY_RUN"
log "Auto Approve: $AUTO_APPROVE"
log "=========================================="

cd "$PROJECT_DIR"

# Gather project context
log "Gathering project context..."

GIT_STATUS=$(git status --short 2>/dev/null | head -50 || echo "Not a git repo")
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "No commits")
DOCKER_STATUS=$(docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "Docker not running")
RECENT_ERRORS=$(docker logs documentiulia-backend --tail 20 2>&1 | grep -i error | head -5 || echo "No recent errors")

# Build the prompt for Grok
GROK_PROMPT=$(cat <<'PROMPT_END'
You are Grok, the elite code reviewer for DocumentIulia.ro.

YOUR TASK: Analyze the project and generate SPECIFIC, EXECUTABLE tasks for Claude Code to perform.

PROJECT STATUS:
__GIT_STATUS__

LAST COMMIT: __LAST_COMMIT__

DOCKER STATUS:
__DOCKER_STATUS__

RECENT ERRORS:
__RECENT_ERRORS__

INSTRUCTIONS:
1. Review the current state
2. Identify the TOP 3 most important tasks Claude should execute NOW
3. For each task, provide:
   - Clear description
   - Exact file paths to modify
   - Specific code changes or commands

OUTPUT FORMAT (Claude will execute this directly):
```
TASK 1: [Title]
Priority: [Critical/High/Medium]
Files: [exact paths]
Action: [specific instruction for Claude]

TASK 2: [Title]
Priority: [Critical/High/Medium]
Files: [exact paths]
Action: [specific instruction for Claude]

TASK 3: [Title]
Priority: [Critical/High/Medium]
Files: [exact paths]
Action: [specific instruction for Claude]
```

Be specific and actionable. Claude will execute these tasks immediately.
PROMPT_END
)

# Replace placeholders
GROK_PROMPT="${GROK_PROMPT//__GIT_STATUS__/$GIT_STATUS}"
GROK_PROMPT="${GROK_PROMPT//__LAST_COMMIT__/$LAST_COMMIT}"
GROK_PROMPT="${GROK_PROMPT//__DOCKER_STATUS__/$DOCKER_STATUS}"
GROK_PROMPT="${GROK_PROMPT//__RECENT_ERRORS__/$RECENT_ERRORS}"

log "Calling Grok for analysis..."

# Call Grok API
GROK_RESPONSE=$($GROK_CLI -p "$GROK_PROMPT" 2>&1) || {
    log "ERROR: Grok API call failed"
    echo "$GROK_RESPONSE" >> "$LOG_FILE"
    exit 1
}

log "Grok response received (${#GROK_RESPONSE} chars)"

# Save Grok's response
GROK_OUTPUT_FILE="$PROJECT_DIR/reviews/claude-executions/grok-tasks-$TIMESTAMP.md"
echo "# Grok Tasks for Claude - $TIMESTAMP" > "$GROK_OUTPUT_FILE"
echo "" >> "$GROK_OUTPUT_FILE"
echo "$GROK_RESPONSE" >> "$GROK_OUTPUT_FILE"

log "Grok tasks saved to: $GROK_OUTPUT_FILE"

# Dry run - just show what would happen
if [ "$DRY_RUN" = true ]; then
    log "DRY RUN MODE - Not executing Claude"
    echo ""
    echo "=========================================="
    echo "GROK'S TASKS FOR CLAUDE:"
    echo "=========================================="
    echo "$GROK_RESPONSE"
    echo ""
    echo "To execute: ./grok-claude-bridge.sh --auto-approve"
    exit 0
fi

# Approval gate (unless auto-approve)
if [ "$AUTO_APPROVE" = false ]; then
    echo ""
    echo "=========================================="
    echo "GROK'S TASKS FOR CLAUDE:"
    echo "=========================================="
    echo "$GROK_RESPONSE"
    echo ""
    echo "=========================================="
    read -p "Execute these tasks with Claude? (y/N): " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        log "User declined execution"
        exit 0
    fi
fi

log "Sending tasks to Claude Code..."

# Build Claude prompt
CLAUDE_PROMPT=$(cat <<CLAUDE_END
You are Claude Code working on DocumentIulia.ro.

Grok (the project reviewer) has analyzed the codebase and assigned you these tasks:

$GROK_RESPONSE

EXECUTE these tasks now. For each task:
1. Read the relevant files first
2. Make the necessary changes
3. Verify your changes work

Work through each task systematically. Start with Task 1.
CLAUDE_END
)

# Save Claude prompt
CLAUDE_INPUT_FILE="$PROJECT_DIR/reviews/claude-executions/claude-input-$TIMESTAMP.md"
echo "$CLAUDE_PROMPT" > "$CLAUDE_INPUT_FILE"

# Execute with Claude Code
log "Executing Claude Code..."

CLAUDE_OUTPUT=$($CLAUDE_CLI -p "$CLAUDE_PROMPT" --allowedTools "Read,Edit,Write,Bash,Glob,Grep" 2>&1) || {
    log "WARNING: Claude execution had issues"
}

# Save Claude's output
CLAUDE_OUTPUT_FILE="$PROJECT_DIR/reviews/claude-executions/claude-output-$TIMESTAMP.md"
echo "# Claude Execution Report - $TIMESTAMP" > "$CLAUDE_OUTPUT_FILE"
echo "" >> "$CLAUDE_OUTPUT_FILE"
echo "## Input (from Grok)" >> "$CLAUDE_OUTPUT_FILE"
echo '```' >> "$CLAUDE_OUTPUT_FILE"
echo "$GROK_RESPONSE" >> "$CLAUDE_OUTPUT_FILE"
echo '```' >> "$CLAUDE_OUTPUT_FILE"
echo "" >> "$CLAUDE_OUTPUT_FILE"
echo "## Claude's Response" >> "$CLAUDE_OUTPUT_FILE"
echo '```' >> "$CLAUDE_OUTPUT_FILE"
echo "$CLAUDE_OUTPUT" >> "$CLAUDE_OUTPUT_FILE"
echo '```' >> "$CLAUDE_OUTPUT_FILE"

log "Claude output saved to: $CLAUDE_OUTPUT_FILE"

log "=========================================="
log "Grok → Claude Bridge Complete"
log "Grok tasks: $GROK_OUTPUT_FILE"
log "Claude output: $CLAUDE_OUTPUT_FILE"
log "=========================================="

echo ""
echo "Execution complete! Check logs at: $LOG_FILE"
