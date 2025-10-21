#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/clipper}"
REGISTRY="${REGISTRY:-ghcr.io/subculture-collective/clipper}"
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"

echo -e "${GREEN}=== Clipper Deployment Script ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Deploy Directory: $DEPLOY_DIR"
echo "Registry: $REGISTRY"
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-deployment checks
log_info "Running pre-deployment checks..."

if ! command_exists docker; then
    log_error "Docker is not installed"
    exit 1
fi

if ! command_exists docker-compose && ! command_exists docker compose; then
    log_error "Docker Compose is not installed"
    exit 1
fi

if [ ! -d "$DEPLOY_DIR" ]; then
    log_error "Deploy directory does not exist: $DEPLOY_DIR"
    exit 1
fi

cd "$DEPLOY_DIR" || exit 1

if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml not found in $DEPLOY_DIR"
    exit 1
fi

if [ ! -f ".env" ]; then
    log_warn ".env file not found, make sure environment variables are set"
fi

# Backup current deployment
log_info "Creating backup of current deployment..."
for service in backend frontend; do
    if docker images | grep -q "clipper-$service.*latest"; then
        docker tag "clipper-$service:latest" "clipper-$service:$BACKUP_TAG" 2>/dev/null || true
        log_info "Backed up clipper-$service:latest -> clipper-$service:$BACKUP_TAG"
    fi
done

# Pull latest images
log_info "Pulling latest images from registry..."
if ! docker-compose pull; then
    log_error "Failed to pull images"
    exit 1
fi

# Run database migrations (if migration script exists)
if [ -f "./migrate.sh" ]; then
    log_info "Running database migrations..."
    if ! ./migrate.sh; then
        log_error "Database migration failed"
        exit 1
    fi
else
    log_warn "No migration script found, skipping migrations"
fi

# Deploy new version
log_info "Deploying new version..."
if ! docker-compose up -d; then
    log_error "Deployment failed"
    log_info "Attempting rollback..."
    
    # Restore from backup
    for service in backend frontend; do
        if docker images | grep -q "clipper-$service.*$BACKUP_TAG"; then
            docker tag "clipper-$service:$BACKUP_TAG" "clipper-$service:latest"
        fi
    done
    docker-compose up -d
    
    exit 1
fi

# Wait for services to start
log_info "Waiting for services to start..."
sleep 10

# Health check
log_info "Running health checks..."
HEALTH_CHECK_PASSED=true

# Check backend health
if command_exists curl; then
    if ! curl -f -s http://localhost:8080/health > /dev/null; then
        log_error "Backend health check failed"
        HEALTH_CHECK_PASSED=false
    else
        log_info "Backend health check passed"
    fi
else
    log_warn "curl not installed, skipping backend health check"
fi

# Check frontend health
if command_exists wget; then
    if ! wget --spider -q http://localhost:80/health.html 2>/dev/null; then
        log_warn "Frontend health check failed (this may be normal if using a reverse proxy)"
    else
        log_info "Frontend health check passed"
    fi
fi

# If health checks failed, rollback
if [ "$HEALTH_CHECK_PASSED" = false ]; then
    log_error "Health checks failed, rolling back..."
    
    # Restore from backup
    docker-compose down
    for service in backend frontend; do
        if docker images | grep -q "clipper-$service.*$BACKUP_TAG"; then
            docker tag "clipper-$service:$BACKUP_TAG" "clipper-$service:latest"
            log_info "Restored clipper-$service from backup"
        fi
    done
    docker-compose up -d
    
    log_error "Deployment failed and rolled back"
    exit 1
fi

# Cleanup old images
log_info "Cleaning up old Docker images..."
docker system prune -f > /dev/null 2>&1 || true

# Show running containers
log_info "Deployment successful! Running containers:"
docker-compose ps

echo ""
log_info "Backup tag: $BACKUP_TAG"
log_info "To rollback: docker tag clipper-backend:$BACKUP_TAG clipper-backend:latest && docker-compose up -d"

echo -e "${GREEN}=== Deployment Complete ===${NC}"
