#!/bin/bash
# Setup Cron Jobs for Automated Backups and Restore Tests
#
# This script configures cron jobs for:
# - Nightly backups at 2 AM
# - Weekly restore tests on Sundays at 3 AM
#
# Usage: sudo ./setup-cron.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Setting up Clipper Backup Cron Jobs ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Usage: sudo $0"
    exit 1
fi

# Get the actual user who should own the cron jobs
ACTUAL_USER="${SUDO_USER:-$(whoami)}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/clipper}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/clipper}"

echo "Deploy Directory: $DEPLOY_DIR"
echo "Backup Directory: $BACKUP_DIR"
echo "Running as user: $ACTUAL_USER"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    chown -R "$ACTUAL_USER:$ACTUAL_USER" "$BACKUP_DIR"
fi

# Verify scripts exist
BACKUP_SCRIPT="$DEPLOY_DIR/scripts/backup-automated.sh"
RESTORE_TEST_SCRIPT="$DEPLOY_DIR/scripts/restore-test.sh"

if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}Error: Backup script not found: $BACKUP_SCRIPT${NC}"
    exit 1
fi

if [ ! -f "$RESTORE_TEST_SCRIPT" ]; then
    echo -e "${RED}Error: Restore test script not found: $RESTORE_TEST_SCRIPT${NC}"
    exit 1
fi

# Make scripts executable
chmod +x "$BACKUP_SCRIPT"
chmod +x "$RESTORE_TEST_SCRIPT"

echo -e "${GREEN}✓ Scripts are executable${NC}"

# Create cron job entries
CRON_BACKUP="0 2 * * * cd $DEPLOY_DIR && DEPLOY_DIR=$DEPLOY_DIR BACKUP_DIR=$BACKUP_DIR $BACKUP_SCRIPT >> $BACKUP_DIR/cron.log 2>&1"
CRON_RESTORE_TEST="0 3 * * 0 cd $DEPLOY_DIR && BACKUP_DIR=$BACKUP_DIR $RESTORE_TEST_SCRIPT >> $BACKUP_DIR/cron.log 2>&1"

# Backup existing crontab
echo "Backing up existing crontab..."
crontab -u "$ACTUAL_USER" -l > "/tmp/crontab.backup.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# Get current crontab
CURRENT_CRON=$(crontab -u "$ACTUAL_USER" -l 2>/dev/null || echo "")

# Check if jobs already exist
if echo "$CURRENT_CRON" | grep -q "$BACKUP_SCRIPT"; then
    echo -e "${YELLOW}Warning: Backup cron job already exists. Skipping...${NC}"
else
    # Add backup job
    (echo "$CURRENT_CRON"; echo "# Clipper nightly backup at 2 AM"; echo "$CRON_BACKUP") | crontab -u "$ACTUAL_USER" -
    echo -e "${GREEN}✓ Added nightly backup cron job (2 AM daily)${NC}"
fi

# Update current cron
CURRENT_CRON=$(crontab -u "$ACTUAL_USER" -l 2>/dev/null || echo "")

if echo "$CURRENT_CRON" | grep -q "$RESTORE_TEST_SCRIPT"; then
    echo -e "${YELLOW}Warning: Restore test cron job already exists. Skipping...${NC}"
else
    # Add restore test job
    (echo "$CURRENT_CRON"; echo "# Clipper weekly restore test on Sundays at 3 AM"; echo "$CRON_RESTORE_TEST") | crontab -u "$ACTUAL_USER" -
    echo -e "${GREEN}✓ Added weekly restore test cron job (3 AM Sundays)${NC}"
fi

# Display installed cron jobs
echo ""
echo "=== Installed Cron Jobs ==="
crontab -u "$ACTUAL_USER" -l | grep -A 1 "Clipper"

echo ""
echo -e "${GREEN}=== Cron Setup Complete ===${NC}"
echo ""
echo "Cron jobs installed:"
echo "  - Nightly backup: 2:00 AM daily"
echo "  - Restore test: 3:00 AM every Sunday"
echo ""
echo "Logs will be written to: $BACKUP_DIR/cron.log"
echo "Backup files will be stored in: $BACKUP_DIR"
echo ""
echo "To view cron jobs: crontab -l"
echo "To edit cron jobs: crontab -e"
echo "To remove all cron jobs: crontab -r"
echo ""
echo "Optional: Set up email/Slack notifications by setting these environment variables:"
echo "  export BACKUP_NOTIFY_EMAIL=your-email@example.com"
echo "  export BACKUP_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
echo ""
echo "To test the backup script manually:"
echo "  sudo -u $ACTUAL_USER $BACKUP_SCRIPT"
echo ""
echo "To test the restore test script manually:"
echo "  sudo -u $ACTUAL_USER $RESTORE_TEST_SCRIPT"
