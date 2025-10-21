#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/clipper}"
BACKUP_TAG="${1:-backup}"

echo -e "${YELLOW}=== Clipper Rollback Script ===${NC}"
echo "Deploy Directory: $DEPLOY_DIR"
echo "Backup Tag: $BACKUP_TAG"
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

# Check if deploy directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    log_error "Deploy directory does not exist: $DEPLOY_DIR"
    exit 1
fi

cd "$DEPLOY_DIR" || exit 1

# Check if backup images exist
BACKEND_BACKUP_EXISTS=$(docker images | grep -c "clipper-backend.*$BACKUP_TAG" || echo "0")
FRONTEND_BACKUP_EXISTS=$(docker images | grep -c "clipper-frontend.*$BACKUP_TAG" || echo "0")

if [ "$BACKEND_BACKUP_EXISTS" = "0" ] && [ "$FRONTEND_BACKUP_EXISTS" = "0" ]; then
    log_error "No backup images found with tag: $BACKUP_TAG"
    echo ""
    log_info "Available backup images:"
    docker images | grep clipper | grep -E '(backup|production|latest)' || echo "No backup images found"
    exit 1
fi

# Confirm rollback
echo -e "${YELLOW}WARNING: This will rollback to the backup version.${NC}"
echo "Images to restore:"
[ "$BACKEND_BACKUP_EXISTS" != "0" ] && echo "  - clipper-backend:$BACKUP_TAG"
[ "$FRONTEND_BACKUP_EXISTS" != "0" ] && echo "  - clipper-frontend:$BACKUP_TAG"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Rollback cancelled"
    exit 0
fi

# Stop current containers
log_info "Stopping current containers..."
docker-compose down

# Restore from backup
log_info "Restoring from backup..."

if [ "$BACKEND_BACKUP_EXISTS" != "0" ]; then
    docker tag "clipper-backend:$BACKUP_TAG" "clipper-backend:latest"
    log_info "Restored backend from backup"
fi

if [ "$FRONTEND_BACKUP_EXISTS" != "0" ]; then
    docker tag "clipper-frontend:$BACKUP_TAG" "clipper-frontend:latest"
    log_info "Restored frontend from backup"
fi

# Start containers with restored images
log_info "Starting containers..."
docker-compose up -d

# Wait for services to start
log_info "Waiting for services to start..."
sleep 10

# Health check
log_info "Running health checks..."

if command -v curl >/dev/null 2>&1; then
    if curl -f -s http://localhost:8080/health > /dev/null; then
        log_info "Backend health check passed"
    else
        log_error "Backend health check failed"
        docker-compose logs backend
    fi
fi

# Show running containers
log_info "Rollback complete! Running containers:"
docker-compose ps

echo -e "${GREEN}=== Rollback Complete ===${NC}"
