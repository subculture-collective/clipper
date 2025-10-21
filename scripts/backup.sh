#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/clipper}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/clipper}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}=== Clipper Backup Script ===${NC}"
echo "Deploy Directory: $DEPLOY_DIR"
echo "Backup Directory: $BACKUP_DIR"
echo "Retention: $RETENTION_DAYS days"
echo ""

# Function to print colored messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running"
    exit 1
fi

cd "$DEPLOY_DIR" || exit 1

# Backup database
log_info "Backing up PostgreSQL database..."
POSTGRES_CONTAINER=$(docker-compose ps -q postgres)

if [ -n "$POSTGRES_CONTAINER" ]; then
    POSTGRES_DB="${POSTGRES_DB:-clipper}"
    POSTGRES_USER="${POSTGRES_USER:-clipper}"
    DB_BACKUP_FILE="$BACKUP_DIR/db-$TIMESTAMP.sql.gz"
    
    if docker-compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$DB_BACKUP_FILE"; then
        log_info "Database backup saved: $DB_BACKUP_FILE"
        log_info "Size: $(du -h "$DB_BACKUP_FILE" | cut -f1)"
    else
        log_error "Database backup failed"
        exit 1
    fi
else
    log_warn "PostgreSQL container not found, skipping database backup"
fi

# Backup Redis data
log_info "Backing up Redis data..."
REDIS_CONTAINER=$(docker-compose ps -q redis)

if [ -n "$REDIS_CONTAINER" ]; then
    REDIS_BACKUP_DIR="$BACKUP_DIR/redis-$TIMESTAMP"
    mkdir -p "$REDIS_BACKUP_DIR"
    
    # Trigger Redis save
    docker-compose exec -T redis redis-cli SAVE > /dev/null 2>&1 || true
    
    # Copy Redis data
    if docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$REDIS_BACKUP_DIR/dump.rdb" 2>/dev/null; then
        log_info "Redis backup saved: $REDIS_BACKUP_DIR/dump.rdb"
        log_info "Size: $(du -h "$REDIS_BACKUP_DIR/dump.rdb" | cut -f1)"
    else
        log_warn "Redis backup failed (may not have data yet)"
    fi
else
    log_warn "Redis container not found, skipping Redis backup"
fi

# Backup configuration files
log_info "Backing up configuration files..."
CONFIG_BACKUP_DIR="$BACKUP_DIR/config-$TIMESTAMP"
mkdir -p "$CONFIG_BACKUP_DIR"

for file in docker-compose.yml .env nginx.conf; do
    if [ -f "$DEPLOY_DIR/$file" ]; then
        cp "$DEPLOY_DIR/$file" "$CONFIG_BACKUP_DIR/"
        log_info "Backed up: $file"
    fi
done

# Create backup manifest
cat > "$CONFIG_BACKUP_DIR/manifest.txt" << EOF
Backup Timestamp: $TIMESTAMP
Backup Date: $(date)
Deploy Directory: $DEPLOY_DIR
Backup Directory: $BACKUP_DIR

Files Backed Up:
- Database: db-$TIMESTAMP.sql.gz
- Redis: redis-$TIMESTAMP/dump.rdb
- Configuration: config-$TIMESTAMP/

Restore Instructions:
1. Restore database:
   gunzip < db-$TIMESTAMP.sql.gz | docker-compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

2. Restore Redis:
   docker cp redis-$TIMESTAMP/dump.rdb <redis_container>:/data/dump.rdb
   docker-compose restart redis

3. Restore configuration:
   cp config-$TIMESTAMP/* $DEPLOY_DIR/
EOF

log_info "Backup manifest saved: $CONFIG_BACKUP_DIR/manifest.txt"

# Cleanup old backups
log_info "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "db-*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "redis-*" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
find "$BACKUP_DIR" -name "config-*" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

# Show backup summary
echo ""
log_info "Backup Summary:"
log_info "  Database backups: $(find "$BACKUP_DIR" -name "db-*.sql.gz" | wc -l)"
log_info "  Redis backups: $(find "$BACKUP_DIR" -name "redis-*" -type d | wc -l)"
log_info "  Config backups: $(find "$BACKUP_DIR" -name "config-*" -type d | wc -l)"
log_info "  Total backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"

echo -e "${GREEN}=== Backup Complete ===${NC}"
