#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-.}"
REGISTRY="${REGISTRY:-ghcr.io/subculture-collective/clipper}"
ENVIRONMENT="${ENVIRONMENT:-production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.blue-green.yml}"
CURRENT_ENV="blue"  # Default to blue, will be detected
NEXT_ENV="green"
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
HEALTH_CHECK_INTERVAL=5
TRAFFIC_SWITCH_CMD="${TRAFFIC_SWITCH_CMD:-}"  # Command to switch traffic (e.g., nginx config update)

# Colors for environment names
COLOR_BLUE='\033[0;36m'
COLOR_GREEN='\033[0;32m'

echo -e "${BLUE}=== Clipper Blue-Green Deployment ===${NC}"
echo "Deploy Directory: $DEPLOY_DIR"
echo "Registry: $REGISTRY"
echo "Environment: $ENVIRONMENT"
echo "Compose File: $COMPOSE_FILE"
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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

log_env() {
    if [ "$1" = "blue" ]; then
        echo -e "${COLOR_BLUE}[BLUE]${NC} $2"
    else
        echo -e "${COLOR_GREEN}[GREEN]${NC} $2"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run docker-compose command
docker_compose() {
    if command_exists docker-compose; then
        docker-compose -f "$COMPOSE_FILE" "$@"
    else
        docker compose -f "$COMPOSE_FILE" "$@"
    fi
}

# Function to detect which environment is currently running
detect_current_env() {
    if docker ps | grep -q "clipper-backend-blue"; then
        CURRENT_ENV="blue"
        NEXT_ENV="green"
        log_info "Current environment: $(log_env 'blue' 'BLUE')"
    elif docker ps | grep -q "clipper-backend-green"; then
        CURRENT_ENV="green"
        NEXT_ENV="blue"
        log_info "Current environment: $(log_env 'green' 'GREEN')"
    else
        log_error "Neither BLUE nor GREEN environment is running"
        exit 1
    fi
}

# Function to perform health check
health_check() {
    local env=$1
    local port=$2
    local service_name=$3
    local elapsed=0

    log_debug "Waiting for $service_name to be healthy..."

    while [ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -fs "http://localhost:${port}/health" > /dev/null 2>&1; then
            log_env "$env" "$service_name is healthy ✓"
            return 0
        fi

        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))

        if [ $((elapsed % 30)) -eq 0 ]; then
            log_debug "Still waiting for $service_name... ($elapsed seconds elapsed)"
        fi
    done

    log_error "Health check failed for $service_name after ${HEALTH_CHECK_TIMEOUT}s"
    return 1
}

# Function to switch traffic to new environment
switch_traffic() {
    local env=$1

    if [ -z "$TRAFFIC_SWITCH_CMD" ]; then
        log_warn "No TRAFFIC_SWITCH_CMD provided. You'll need to manually update your load balancer/proxy"
        log_info "Update your nginx/load balancer configuration to route traffic to the $env environment"
        read -p "Press enter after updating your load balancer configuration..."
    else
        log_info "Switching traffic to $env environment..."
        if eval "$TRAFFIC_SWITCH_CMD '$env'"; then
            log_env "$env" "Traffic switched successfully"
        else
            log_error "Failed to switch traffic: $TRAFFIC_SWITCH_CMD"
            return 1
        fi
    fi

    return 0
}

# Pre-deployment checks
log_info "Running pre-deployment checks..."

if ! command_exists docker; then
    log_error "Docker is not installed"
    exit 1
fi

cd "$DEPLOY_DIR" || exit 1

if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Detect current environment
detect_current_env

log_info "Deploying to $(log_env "$NEXT_ENV" "${NEXT_ENV^^}") environment..."
echo ""

# 1. Pull latest images for next environment
log_info "Pulling latest images for $NEXT_ENV..."
docker_compose pull "backend-${NEXT_ENV}" "frontend-${NEXT_ENV}"

# 2. Start green environment (in background)
log_info "Starting $(log_env "$NEXT_ENV" "${NEXT_ENV^^}") services..."
docker_compose up -d --no-deps "backend-${NEXT_ENV}" "frontend-${NEXT_ENV}"

echo ""
log_info "Waiting for $(log_env "$NEXT_ENV" "${NEXT_ENV^^}") services to be healthy..."

# 3. Health checks
BACKEND_PORT=$((8080 + (NEXT_ENV == "green" ? 1 : 0)))
FRONTEND_PORT=$((80 + (NEXT_ENV == "green" ? 1 : 0)))

if ! health_check "$NEXT_ENV" "$BACKEND_PORT" "backend-${NEXT_ENV}"; then
    log_error "Backend health check failed. Stopping deployment..."
    docker_compose down "backend-${NEXT_ENV}" "frontend-${NEXT_ENV}"
    exit 1
fi

if ! health_check "$NEXT_ENV" "$FRONTEND_PORT" "frontend-${NEXT_ENV}"; then
    log_error "Frontend health check failed. Stopping deployment..."
    docker_compose down "backend-${NEXT_ENV}" "frontend-${NEXT_ENV}"
    exit 1
fi

echo ""
log_env "$NEXT_ENV" "All $(echo $NEXT_ENV | tr '[:lower:]' '[:upper:]') services are healthy ✓"
echo ""

# 4. Get approval to switch traffic
log_warn "Ready to switch traffic to $(log_env "$NEXT_ENV" "${NEXT_ENV^^}") environment"
log_warn "Blue URL: http://localhost:8080"
log_warn "Green URL: http://localhost:8081"
echo ""
read -p "Review the new environment and press 'y' to switch traffic, or 'n' to rollback: " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warn "Deployment cancelled. Rolling back..."
    docker_compose down "backend-${NEXT_ENV}" "frontend-${NEXT_ENV}"
    exit 1
fi

echo ""

# 5. Switch traffic
if ! switch_traffic "$NEXT_ENV"; then
    log_error "Traffic switch failed. Rolling back..."
    docker_compose down "backend-${NEXT_ENV}" "frontend-${NEXT_ENV}"
    exit 1
fi

# 6. Monitor for a bit
log_info "Monitoring new environment for 30 seconds..."
sleep 30

# Verify still healthy after traffic switch
if ! curl -fs "http://localhost:$(($BACKEND_PORT))/health" > /dev/null 2>&1; then
    log_error "New environment became unhealthy after traffic switch!"
    log_warn "Rolling back traffic to $CURRENT_ENV..."

    # Switch back to previous environment
    switch_traffic "$CURRENT_ENV" || true

    log_error "Deployment failed and rolled back"
    exit 1
fi

echo ""

# 7. Stop old environment
log_info "Stopping $(log_env "$CURRENT_ENV" "${CURRENT_ENV^^}") services..."
docker_compose down "backend-${CURRENT_ENV}" "frontend-${CURRENT_ENV}"

# 8. Cleanup
log_info "Cleaning up Docker resources..."
docker system prune -f > /dev/null 2>&1 || true

echo ""
echo -e "${GREEN}=== Deployment Successful ===${NC}"
log_env "$NEXT_ENV" "Traffic is now routed to the $(echo $NEXT_ENV | tr '[:lower:]' '[:upper:]') environment"
echo ""
log_info "To rollback to $CURRENT_ENV, run:"
echo "  docker-compose -f $COMPOSE_FILE up -d backend-${CURRENT_ENV} frontend-${CURRENT_ENV}"
echo "  # Then manually switch traffic back"
