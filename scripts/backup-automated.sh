#!/bin/bash
set -e

# Automated Nightly Backup Script for Clipper
# This script is designed to be run via cron for automated backups
# Schedule: Daily at 2 AM (cron: 0 2 * * *)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/clipper}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/clipper}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DATE_ONLY=$(date +%Y%m%d)
LOG_FILE="${BACKUP_DIR}/backup-${DATE_ONLY}.log"

# Notification settings (optional)
NOTIFY_EMAIL="${BACKUP_NOTIFY_EMAIL:-}"
SLACK_WEBHOOK="${BACKUP_SLACK_WEBHOOK:-}"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to send notifications
send_notification() {
    local status=$1
    local message=$2
    
    # Email notification
    if [ -n "$NOTIFY_EMAIL" ]; then
        echo "$message" | mail -s "Clipper Backup $status - $(date)" "$NOTIFY_EMAIL" 2>/dev/null || true
    fi
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        local emoji=":white_check_mark:"
        local color="good"
        if [ "$status" = "FAILED" ]; then
            emoji=":x:"
            color="danger"
        elif [ "$status" = "WARNING" ]; then
            emoji=":warning:"
            color="warning"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji Clipper Backup $status\",\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

log "=== Clipper Automated Backup Started ==="
log_info "Deploy Directory: $DEPLOY_DIR"
log_info "Backup Directory: $BACKUP_DIR"
log_info "Retention: $RETENTION_DAYS days"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running"
    send_notification "FAILED" "Docker is not running. Backup aborted."
    exit 1
fi

cd "$DEPLOY_DIR" || exit 1

# Initialize backup status
BACKUP_STATUS="SUCCESS"
BACKUP_ERRORS=""

# ============================================================================
# 1. Backup PostgreSQL Database
# ============================================================================
log_info "Backing up PostgreSQL database..."
POSTGRES_CONTAINER=$(docker-compose ps -q postgres)

if [ -n "$POSTGRES_CONTAINER" ]; then
    POSTGRES_DB="${POSTGRES_DB:-clipper_db}"
    POSTGRES_USER="${POSTGRES_USER:-clipper}"
    DB_BACKUP_FILE="$BACKUP_DIR/db-$TIMESTAMP.sql.gz"
    
    # Perform backup with error handling
    if docker-compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "$DB_BACKUP_FILE" 2>> "$LOG_FILE"; then
        DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
        log "✓ Database backup saved: $DB_BACKUP_FILE (Size: $DB_SIZE)"
        
        # Verify backup integrity
        if gunzip -t "$DB_BACKUP_FILE" 2>> "$LOG_FILE"; then
            log "✓ Database backup integrity verified"
        else
            log_error "Database backup file is corrupted"
            BACKUP_STATUS="WARNING"
            BACKUP_ERRORS="${BACKUP_ERRORS}\n- Database backup corrupted"
        fi
    else
        log_error "Database backup failed"
        BACKUP_STATUS="FAILED"
        BACKUP_ERRORS="${BACKUP_ERRORS}\n- Database backup failed"
    fi
else
    log_warn "PostgreSQL container not found, skipping database backup"
    BACKUP_STATUS="WARNING"
    BACKUP_ERRORS="${BACKUP_ERRORS}\n- PostgreSQL container not found"
fi

# ============================================================================
# 2. Backup Redis Data
# ============================================================================
log_info "Backing up Redis data..."
REDIS_CONTAINER=$(docker-compose ps -q redis)

if [ -n "$REDIS_CONTAINER" ]; then
    REDIS_BACKUP_DIR="$BACKUP_DIR/redis-$TIMESTAMP"
    mkdir -p "$REDIS_BACKUP_DIR"
    
    # Trigger Redis save
    if docker-compose exec -T redis redis-cli SAVE > /dev/null 2>&1; then
        log "✓ Redis SAVE command executed"
    else
        log_warn "Redis SAVE command failed (may require password)"
    fi
    
    # Copy Redis data
    if docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$REDIS_BACKUP_DIR/dump.rdb" 2>/dev/null; then
        REDIS_SIZE=$(du -h "$REDIS_BACKUP_DIR/dump.rdb" | cut -f1)
        log "✓ Redis backup saved: $REDIS_BACKUP_DIR/dump.rdb (Size: $REDIS_SIZE)"
    else
        log_warn "Redis backup failed (may not have data yet)"
    fi
else
    log_warn "Redis container not found, skipping Redis backup"
fi

# ============================================================================
# 3. Backup Configuration Files
# ============================================================================
log_info "Backing up configuration files..."
CONFIG_BACKUP_DIR="$BACKUP_DIR/config-$TIMESTAMP"
mkdir -p "$CONFIG_BACKUP_DIR"

CONFIG_FILES=(
    "docker-compose.yml"
    "docker-compose.prod.yml"
    ".env"
    "nginx.conf"
    "nginx/nginx-ssl.conf"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$DEPLOY_DIR/$file" ]; then
        # Create directory structure if needed
        mkdir -p "$CONFIG_BACKUP_DIR/$(dirname "$file")"
        # Backup with permissions preserved
        cp -p "$DEPLOY_DIR/$file" "$CONFIG_BACKUP_DIR/$file"
        log "✓ Backed up: $file"
    fi
done

# ============================================================================
# 4. Create Backup Manifest
# ============================================================================
log_info "Creating backup manifest..."
cat > "$CONFIG_BACKUP_DIR/manifest.txt" << EOF
Backup Timestamp: $TIMESTAMP
Backup Date: $(date)
Deploy Directory: $DEPLOY_DIR
Backup Directory: $BACKUP_DIR
Backup Status: $BACKUP_STATUS

Components Backed Up:
- Database: db-$TIMESTAMP.sql.gz
- Redis: redis-$TIMESTAMP/dump.rdb
- Configuration: config-$TIMESTAMP/

Checksums:
$(if [ -f "$DB_BACKUP_FILE" ]; then sha256sum "$DB_BACKUP_FILE"; fi)
$(if [ -f "$REDIS_BACKUP_DIR/dump.rdb" ]; then sha256sum "$REDIS_BACKUP_DIR/dump.rdb"; fi)

Restore Instructions:
1. Restore database:
   gunzip < $BACKUP_DIR/db-$TIMESTAMP.sql.gz | docker-compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

2. Restore Redis:
   docker-compose stop redis
   docker cp $BACKUP_DIR/redis-$TIMESTAMP/dump.rdb <redis_container>:/data/dump.rdb
   docker-compose start redis

3. Restore configuration:
   cp $BACKUP_DIR/config-$TIMESTAMP/* $DEPLOY_DIR/
   docker-compose up -d
EOF

log "✓ Backup manifest saved: $CONFIG_BACKUP_DIR/manifest.txt"

# ============================================================================
# 5. Cleanup Old Backups (Retention Policy)
# ============================================================================
log_info "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED_COUNT=0

# Clean database backups
find "$BACKUP_DIR" -name "db-*.sql.gz" -mtime +$RETENTION_DAYS -type f | while read -r file; do
    rm -f "$file"
    DELETED_COUNT=$((DELETED_COUNT + 1))
    log_info "Deleted old database backup: $(basename "$file")"
done

# Clean Redis backups
find "$BACKUP_DIR" -name "redis-*" -type d -mtime +$RETENTION_DAYS | while read -r dir; do
    rm -rf "$dir"
    DELETED_COUNT=$((DELETED_COUNT + 1))
    log_info "Deleted old Redis backup: $(basename "$dir")"
done

# Clean config backups
find "$BACKUP_DIR" -name "config-*" -type d -mtime +$RETENTION_DAYS | while read -r dir; do
    rm -rf "$dir"
    DELETED_COUNT=$((DELETED_COUNT + 1))
    log_info "Deleted old config backup: $(basename "$dir")"
done

# Clean old log files
find "$BACKUP_DIR" -name "backup-*.log" -mtime +$RETENTION_DAYS -type f -delete

log "✓ Cleanup complete (retention: $RETENTION_DAYS days)"

# ============================================================================
# 6. Backup Summary
# ============================================================================
DB_BACKUP_COUNT=$(find "$BACKUP_DIR" -name "db-*.sql.gz" -type f | wc -l)
REDIS_BACKUP_COUNT=$(find "$BACKUP_DIR" -name "redis-*" -type d | wc -l)
CONFIG_BACKUP_COUNT=$(find "$BACKUP_DIR" -name "config-*" -type d | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log ""
log "=== Backup Summary ==="
log_info "  Database backups: $DB_BACKUP_COUNT"
log_info "  Redis backups: $REDIS_BACKUP_COUNT"
log_info "  Config backups: $CONFIG_BACKUP_COUNT"
log_info "  Total backup size: $TOTAL_SIZE"
log_info "  Backup status: $BACKUP_STATUS"

# ============================================================================
# 7. Send Notifications
# ============================================================================
SUMMARY="Backup completed with status: $BACKUP_STATUS
Database backups: $DB_BACKUP_COUNT
Redis backups: $REDIS_BACKUP_COUNT
Total size: $TOTAL_SIZE
${BACKUP_ERRORS}"

send_notification "$BACKUP_STATUS" "$SUMMARY"

log "=== Backup Complete ==="

# Exit with appropriate code
if [ "$BACKUP_STATUS" = "FAILED" ]; then
    exit 1
elif [ "$BACKUP_STATUS" = "WARNING" ]; then
    exit 0  # Still exit 0 for partial success
else
    exit 0
fi
