#!/bin/bash
set -e

# Weekly Backup Restore Test Script
# This script tests the backup restore process to ensure backups are viable
# Schedule: Weekly on Sundays at 3 AM (cron: 0 3 * * 0)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/clipper}"
TEST_DB_NAME="clipper_restore_test"
TEST_COMPOSE_FILE="/tmp/docker-compose-restore-test.yml"
LOG_FILE="${BACKUP_DIR}/restore-test-$(date +%Y%m%d).log"
TEST_PORT=5439  # Different port to avoid conflicts

# Notification settings
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
        echo "$message" | mail -s "Clipper Restore Test $status - $(date)" "$NOTIFY_EMAIL" 2>/dev/null || true
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
            --data "{\"text\":\"$emoji Clipper Restore Test $status\",\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    
    # Stop and remove test containers
    if [ -f "$TEST_COMPOSE_FILE" ]; then
        docker-compose -f "$TEST_COMPOSE_FILE" down -v 2>/dev/null || true
        rm -f "$TEST_COMPOSE_FILE"
    fi
    
    # Remove test database if it exists in production
    docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" 2>/dev/null || true
    
    log "✓ Cleanup complete"
}

# Set trap to cleanup on exit
trap cleanup EXIT

log "=== Clipper Backup Restore Test Started ==="
log_info "Backup Directory: $BACKUP_DIR"
log_info "Test Database: $TEST_DB_NAME"

# Initialize test status
TEST_STATUS="SUCCESS"
TEST_ERRORS=""

# ============================================================================
# 1. Find Latest Backup
# ============================================================================
log_info "Finding latest backup..."

LATEST_DB_BACKUP=$(find "$BACKUP_DIR" -name "db-*.sql.gz" -type f -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
LATEST_REDIS_BACKUP=$(find "$BACKUP_DIR" -name "redis-*" -type d -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST_DB_BACKUP" ]; then
    log_error "No database backup found"
    send_notification "FAILED" "No database backup found for restore test"
    exit 1
fi

log "✓ Latest database backup: $LATEST_DB_BACKUP"
if [ -n "$LATEST_REDIS_BACKUP" ]; then
    log "✓ Latest Redis backup: $LATEST_REDIS_BACKUP"
fi

# ============================================================================
# 2. Verify Backup Integrity
# ============================================================================
log_info "Verifying backup file integrity..."

if gunzip -t "$LATEST_DB_BACKUP" 2>> "$LOG_FILE"; then
    BACKUP_SIZE=$(du -h "$LATEST_DB_BACKUP" | cut -f1)
    log "✓ Database backup integrity verified (Size: $BACKUP_SIZE)"
else
    log_error "Database backup file is corrupted"
    send_notification "FAILED" "Database backup file is corrupted"
    exit 1
fi

# ============================================================================
# 3. Create Test Docker Compose Environment
# ============================================================================
log_info "Creating test PostgreSQL environment..."

cat > "$TEST_COMPOSE_FILE" << EOF
version: "3.8"

services:
  postgres-test:
    image: postgres:17-alpine
    container_name: clipper-postgres-restore-test
    environment:
      - POSTGRES_USER=clipper
      - POSTGRES_PASSWORD=test_password
      - POSTGRES_DB=$TEST_DB_NAME
    ports:
      - "$TEST_PORT:5432"
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U clipper"]
      interval: 5s
      timeout: 5s
      retries: 5
EOF

log "✓ Test docker-compose file created"

# ============================================================================
# 4. Start Test Database
# ============================================================================
log_info "Starting test PostgreSQL container..."

if docker-compose -f "$TEST_COMPOSE_FILE" up -d 2>> "$LOG_FILE"; then
    log "✓ Test PostgreSQL container started"
else
    log_error "Failed to start test PostgreSQL container"
    TEST_STATUS="FAILED"
    TEST_ERRORS="${TEST_ERRORS}\n- Failed to start test container"
fi

# Wait for database to be ready
log_info "Waiting for database to be ready..."
sleep 10

MAX_RETRIES=30
RETRY_COUNT=0
while ! docker-compose -f "$TEST_COMPOSE_FILE" exec -T postgres-test pg_isready -U clipper > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        log_error "Database did not become ready in time"
        TEST_STATUS="FAILED"
        TEST_ERRORS="${TEST_ERRORS}\n- Database startup timeout"
        send_notification "FAILED" "Test database failed to start"
        exit 1
    fi
    log_info "Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

log "✓ Test database is ready"

# ============================================================================
# 5. Restore Database Backup
# ============================================================================
log_info "Restoring database backup..."

RESTORE_START=$(date +%s)

if gunzip -c "$LATEST_DB_BACKUP" | docker-compose -f "$TEST_COMPOSE_FILE" exec -T postgres-test psql -U clipper -d "$TEST_DB_NAME" > /dev/null 2>> "$LOG_FILE"; then
    RESTORE_END=$(date +%s)
    RESTORE_TIME=$((RESTORE_END - RESTORE_START))
    log "✓ Database restore completed in ${RESTORE_TIME}s"
else
    log_error "Database restore failed"
    TEST_STATUS="FAILED"
    TEST_ERRORS="${TEST_ERRORS}\n- Database restore failed"
fi

# ============================================================================
# 6. Verify Restored Data
# ============================================================================
log_info "Verifying restored data..."

# Check table count
TABLE_COUNT=$(docker-compose -f "$TEST_COMPOSE_FILE" exec -T postgres-test psql -U clipper -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>> "$LOG_FILE" | tr -d ' \n')

if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    log "✓ Found $TABLE_COUNT tables in restored database"
else
    log_error "No tables found in restored database"
    TEST_STATUS="FAILED"
    TEST_ERRORS="${TEST_ERRORS}\n- No tables in restored database"
fi

# Check for key tables (adjust based on your schema)
KEY_TABLES=("users" "clips" "comments" "votes")
for table in "${KEY_TABLES[@]}"; do
    if docker-compose -f "$TEST_COMPOSE_FILE" exec -T postgres-test psql -U clipper -d "$TEST_DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>> "$LOG_FILE" | grep -q 't'; then
        # Get row count
        ROW_COUNT=$(docker-compose -f "$TEST_COMPOSE_FILE" exec -T postgres-test psql -U clipper -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>> "$LOG_FILE" | tr -d ' \n')
        log "✓ Table '$table' exists with $ROW_COUNT rows"
    else
        log_warn "Table '$table' not found in restored database"
    fi
done

# ============================================================================
# 7. Test Redis Restore (if backup exists)
# ============================================================================
if [ -n "$LATEST_REDIS_BACKUP" ] && [ -f "$LATEST_REDIS_BACKUP/dump.rdb" ]; then
    log_info "Testing Redis backup restore..."
    
    # Add Redis to test environment
    cat >> "$TEST_COMPOSE_FILE" << EOF

  redis-test:
    image: redis:7-alpine
    container_name: clipper-redis-restore-test
    tmpfs:
      - /data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
EOF
    
    # Start Redis
    if docker-compose -f "$TEST_COMPOSE_FILE" up -d redis-test 2>> "$LOG_FILE"; then
        sleep 5
        
        # Copy backup file
        if docker cp "$LATEST_REDIS_BACKUP/dump.rdb" clipper-redis-restore-test:/data/dump.rdb 2>> "$LOG_FILE"; then
            # Restart Redis to load data
            docker-compose -f "$TEST_COMPOSE_FILE" restart redis-test 2>> "$LOG_FILE"
            sleep 3
            
            # Check if Redis is working
            if docker-compose -f "$TEST_COMPOSE_FILE" exec -T redis-test redis-cli ping > /dev/null 2>&1; then
                KEY_COUNT=$(docker-compose -f "$TEST_COMPOSE_FILE" exec -T redis-test redis-cli dbsize 2>> "$LOG_FILE" | tr -d '\r')
                log "✓ Redis restore successful (Keys: $KEY_COUNT)"
            else
                log_warn "Redis restore verification failed"
            fi
        else
            log_warn "Failed to copy Redis backup file"
        fi
    else
        log_warn "Failed to start Redis test container"
    fi
fi

# ============================================================================
# 8. Performance Check
# ============================================================================
log_info "Running performance check on restored database..."

QUERY_START=$(date +%s%N)
docker-compose -f "$TEST_COMPOSE_FILE" exec -T postgres-test psql -U clipper -d "$TEST_DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
QUERY_END=$(date +%s%N)
QUERY_TIME=$(( (QUERY_END - QUERY_START) / 1000000 ))

log "✓ Simple query executed in ${QUERY_TIME}ms"

# ============================================================================
# 9. Test Summary
# ============================================================================
log ""
log "=== Restore Test Summary ==="
log_info "  Backup file: $(basename "$LATEST_DB_BACKUP")"
log_info "  Backup size: $BACKUP_SIZE"
log_info "  Restore time: ${RESTORE_TIME}s"
log_info "  Tables restored: $TABLE_COUNT"
log_info "  Query performance: ${QUERY_TIME}ms"
log_info "  Test status: $TEST_STATUS"

# ============================================================================
# 10. Send Notifications
# ============================================================================
SUMMARY="Restore test completed with status: $TEST_STATUS
Backup file: $(basename "$LATEST_DB_BACKUP")
Backup size: $BACKUP_SIZE
Restore time: ${RESTORE_TIME}s
Tables restored: $TABLE_COUNT
Query performance: ${QUERY_TIME}ms
${TEST_ERRORS}"

send_notification "$TEST_STATUS" "$SUMMARY"

log "=== Restore Test Complete ==="

# Exit with appropriate code
if [ "$TEST_STATUS" = "FAILED" ]; then
    exit 1
else
    exit 0
fi
