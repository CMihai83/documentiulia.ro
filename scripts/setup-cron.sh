#!/bin/bash
# Setup cron jobs for DocumentIulia.ro periodic review

# Add cron job for Grok reviewer (runs every 2 hours)
(crontab -l 2>/dev/null | grep -v "grok-reviewer.sh"; echo "0 */2 * * * /root/documentiulia.ro/scripts/grok-reviewer.sh >> /var/log/documentiulia-cron.log 2>&1") | crontab -

# Add cron job for Claude executor (runs 30 min after each Grok review)
(crontab -l 2>/dev/null | grep -v "claude-executor.sh"; echo "30 */2 * * * /root/documentiulia.ro/scripts/claude-executor.sh >> /var/log/documentiulia-cron.log 2>&1") | crontab -

echo "Cron jobs installed:"
crontab -l
