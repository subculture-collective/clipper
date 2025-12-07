#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/clipper}"
REGISTRY="${REGISTRY:-ghcr.io/subculture-collective/clipper}"
ENVIRONMENT="${ENVIRONMENT:-production}"
BLUE_PORT="${BLUE_PORT:-8080}"
GREEN_PORT="${GREEN_PORT:-8081}"
NGINX_CONFIG="${NGINX_CONFIG:-/etc/nginx/sites-available/clipper}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-10}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-5}"

echo -e "${BLUE}=== Clipper Blue/Green Deployment ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Deploy Directory: $DEPLOY_DIR"
echo "Registry: $REGISTRY"
echo "Blue Port: $BLUE_PORT"
echo "Green Port: $GREEN_PORT"
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect current active environment
detect_active_environment() {
    # Check if either container is running
    local blue_running=$(docker ps --filter "name=clipper-backend-blue" --filter "status=running" --format '{{.Names}}' 2>/dev/null)
    local green_running=$(docker ps --filter "name=clipper-backend-green" --filter "status=running" --format '{{.Names}}' 2>/dev/null)
    
    if [ -n "$green_running" ]; then
        echo "green"
    elif [ -n "$blue_running" ]; then
        echo "blue"
    else
        # Default to blue if nothing is running
        echo "blue"
    fi
}

# Function to get inactive environment
get_inactive_environment() {
    local active=$1
    if [ "$active" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to get port for environment
get_port() {
    local env=$1
    if [ "$env" = "blue" ]; then
        echo "$BLUE_PORT"
    else
        echo "$GREEN_PORT"
    fi
}

# Function to run health checks
run_health_check() {
    local port=$1
    local retries=$HEALTH_CHECK_RETRIES
    
    log_info "Running health checks on port $port..."
    
    while [ $retries -gt 0 ]; do
        if curl -f -s -m 5 "http://localhost:$port/health" > /dev/null 2>&1; then
            log_info "✓ Health check passed"
            return 0
        fi
        
        retries=$((retries - 1))
        if [ $retries -gt 0 ]; then
            log_warn "Health check failed, retrying... ($retries attempts remaining)"
            sleep "$HEALTH_CHECK_INTERVAL"
        fi
    done
    
    log_error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# Function to run smoke tests
run_smoke_tests() {
    local port=$1
    log_info "Running smoke tests on port $port..."
    
    if [ -f "$DEPLOY_DIR/../scripts/smoke-tests.sh" ]; then
        BACKEND_URL="http://localhost:$port" "$DEPLOY_DIR/../scripts/smoke-tests.sh"
    elif [ -f "./scripts/smoke-tests.sh" ]; then
        BACKEND_URL="http://localhost:$port" ./scripts/smoke-tests.sh
    else
        log_warn "Smoke test script not found, skipping detailed tests"
        # Basic health check as fallback
        run_health_check "$port"
    fi
}

# Function to switch traffic
switch_traffic() {
    local target_env=$1
    local target_port=$(get_port "$target_env")
    
    log_step "Switching traffic to $target_env environment (port $target_port)..."
    
    # Update nginx configuration if it exists
    if [ -f "$NGINX_CONFIG" ]; then
        log_info "Updating nginx configuration..."
        
        # Verify the pattern exists before replacement
        if grep -q "proxy_pass http://localhost:[0-9]\+" "$NGINX_CONFIG"; then
            sed -i.bak "s/proxy_pass http:\/\/localhost:[0-9]\+/proxy_pass http:\/\/localhost:$target_port/g" "$NGINX_CONFIG"
        else
            log_error "Nginx configuration doesn't contain expected proxy_pass pattern"
            return 1
        fi
        
        # Test nginx configuration
        if nginx -t 2>/dev/null; then
            nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || log_warn "Could not reload nginx"
            log_info "✓ Traffic switched to $target_env environment"
        else
            log_error "Nginx configuration test failed, restoring backup"
            mv "$NGINX_CONFIG.bak" "$NGINX_CONFIG"
            return 1
        fi
    else
        log_warn "Nginx configuration not found at $NGINX_CONFIG"
        log_info "Manually update your load balancer to point to port $target_port"
    fi
}

# Pre-deployment checks
log_step "Running pre-deployment checks..."

if ! command_exists docker; then
    log_error "Docker is not installed"
    exit 1
fi

if ! command_exists curl; then
    log_error "curl is not installed"
    exit 1
fi

cd "$DEPLOY_DIR" || exit 1

# Detect current active environment
ACTIVE_ENV=$(detect_active_environment)
INACTIVE_ENV=$(get_inactive_environment "$ACTIVE_ENV")
INACTIVE_PORT=$(get_port "$INACTIVE_ENV")

log_info "Current active environment: $ACTIVE_ENV"
log_info "Deploying to inactive environment: $INACTIVE_ENV (port $INACTIVE_PORT)"

# Pull latest images
log_step "Pulling latest images from registry..."
docker pull "$REGISTRY/backend:$ENVIRONMENT" || {
    log_error "Failed to pull backend image"
    exit 1
}

# Stop old inactive environment containers if they exist
log_step "Stopping old $INACTIVE_ENV environment containers..."
docker stop "clipper-backend-$INACTIVE_ENV" 2>/dev/null || true
docker rm "clipper-backend-$INACTIVE_ENV" 2>/dev/null || true

# Start new version in inactive environment
log_step "Starting new version in $INACTIVE_ENV environment..."

docker run -d \
    --name "clipper-backend-$INACTIVE_ENV" \
    --network clipper-network \
    -p "$INACTIVE_PORT:8080" \
    --env-file .env \
    --restart unless-stopped \
    "$REGISTRY/backend:$ENVIRONMENT" || {
    log_error "Failed to start $INACTIVE_ENV environment"
    exit 1
}

log_info "✓ $INACTIVE_ENV environment started on port $INACTIVE_PORT"

# Wait for service to initialize
log_step "Waiting for service to initialize..."
sleep 10

# Run health checks
log_step "Running health checks on $INACTIVE_ENV environment..."
if ! run_health_check "$INACTIVE_PORT"; then
    log_error "Health checks failed for $INACTIVE_ENV environment"
    log_error "Rolling back..."
    docker stop "clipper-backend-$INACTIVE_ENV"
    docker rm "clipper-backend-$INACTIVE_ENV"
    exit 1
fi

# Run smoke tests
log_step "Running smoke tests on $INACTIVE_ENV environment..."
if ! run_smoke_tests "$INACTIVE_PORT"; then
    log_error "Smoke tests failed for $INACTIVE_ENV environment"
    log_error "Rolling back..."
    docker stop "clipper-backend-$INACTIVE_ENV"
    docker rm "clipper-backend-$INACTIVE_ENV"
    exit 1
fi

# Switch traffic to new environment
if ! switch_traffic "$INACTIVE_ENV"; then
    log_error "Failed to switch traffic"
    log_error "Rolling back..."
    docker stop "clipper-backend-$INACTIVE_ENV"
    docker rm "clipper-backend-$INACTIVE_ENV"
    exit 1
fi

# Monitor new environment for a brief period
log_step "Monitoring new environment for stability..."
sleep 15

if ! run_health_check "$INACTIVE_PORT"; then
    log_error "New environment became unhealthy after traffic switch"
    log_error "Rolling back to $ACTIVE_ENV environment..."
    
    switch_traffic "$ACTIVE_ENV"
    docker stop "clipper-backend-$INACTIVE_ENV"
    docker rm "clipper-backend-$INACTIVE_ENV"
    exit 1
fi

# Deployment successful - stop old environment
log_step "Stopping old $ACTIVE_ENV environment..."
docker stop "clipper-backend-$ACTIVE_ENV" 2>/dev/null || true

# Keep old container for quick rollback (don't remove it)
log_info "Old $ACTIVE_ENV environment stopped but preserved for rollback"

# Cleanup old images
log_step "Cleaning up old Docker images..."
docker image prune -f > /dev/null 2>&1 || true

# Show status
log_info "Deployment successful! Current status:"
docker ps --filter "name=clipper-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${GREEN}=== Blue/Green Deployment Complete ===${NC}"
echo "Active environment: $INACTIVE_ENV (port $INACTIVE_PORT)"
echo "Inactive environment: $ACTIVE_ENV (stopped, preserved for rollback)"
echo ""
echo "To rollback: docker start clipper-backend-$ACTIVE_ENV && <switch traffic back>"
echo "To cleanup old environment: docker rm clipper-backend-$ACTIVE_ENV"
