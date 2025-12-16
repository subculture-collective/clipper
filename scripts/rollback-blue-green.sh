#!/bin/bash
# Blue-Green Rollback Script
# Quickly switches traffic back to the previous stable environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/clipper}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.blue-green.yml}"

# Log functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Detect currently active environment
detect_active_env() {
    if docker ps --format '{{.Names}}' | grep -q "clipper-backend-blue"; then
        if docker ps --format '{{.Names}}' | grep -q "clipper-backend-green"; then
            log_warn "Both environments are running"
            # Check which one Caddy is pointing to via environment variable
            local caddy_env=$(docker exec clipper-caddy env 2>/dev/null | grep ACTIVE_ENV | cut -d= -f2 || echo "blue")
            echo "$caddy_env"
        else
            echo "blue"
        fi
    elif docker ps --format '{{.Names}}' | grep -q "clipper-backend-green"; then
        echo "green"
    else
        log_error "No active environment detected"
        exit 1
    fi
}

# Get target environment (opposite of active)
get_target_env() {
    local active=$1
    if [ "$active" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Start target environment if not running
start_environment() {
    local env=$1
    
    if docker ps --format '{{.Names}}' | grep -q "clipper-backend-$env"; then
        log_info "$env environment is already running"
        return 0
    fi
    
    log_info "Starting $env environment..."
    cd "$DEPLOY_DIR" || exit 1
    
    if [ "$env" = "green" ]; then
        docker compose -f "$COMPOSE_FILE" --profile green up -d backend-green frontend-green
    else
        docker compose -f "$COMPOSE_FILE" up -d backend-blue frontend-blue
    fi
    
    log_success "$env environment started"
    return 0
}

# Health check for environment
health_check() {
    local env=$1
    local retries=10
    local count=0
    
    log_info "Checking health of $env environment..."
    
    while [ $count -lt $retries ]; do
        if docker exec clipper-backend-$env wget --spider -q http://localhost:8080/health 2>/dev/null; then
            if docker exec clipper-frontend-$env wget --spider -q http://localhost:80/health.html 2>/dev/null; then
                log_success "$env environment is healthy"
                return 0
            fi
        fi
        count=$((count + 1))
        if [ $count -lt $retries ]; then
            sleep 3
        fi
    done
    
    log_error "$env environment health check failed"
    return 1
}

# Switch traffic to target environment
switch_traffic() {
    local target_env=$1
    
    log_info "Switching traffic to $target_env environment..."
    
    cd "$DEPLOY_DIR" || exit 1
    
    # Update Caddyfile to point to target environment
    if [ -f "Caddyfile" ]; then
        # Create backup
        cp Caddyfile Caddyfile.rollback-backup
        
        # Replace environment references
        if [ "$target_env" = "blue" ]; then
            sed -i 's/clipper-backend-green:8080/clipper-backend-blue:8080/g' Caddyfile 2>/dev/null || \
            sed -i.bak 's/clipper-backend-green:8080/clipper-backend-blue:8080/g' Caddyfile
            sed -i 's/clipper-frontend-green:80/clipper-frontend-blue:80/g' Caddyfile 2>/dev/null || \
            sed -i.bak 's/clipper-frontend-green:80/clipper-frontend-blue:80/g' Caddyfile
        else
            sed -i 's/clipper-backend-blue:8080/clipper-backend-green:8080/g' Caddyfile 2>/dev/null || \
            sed -i.bak 's/clipper-backend-blue:8080/clipper-backend-green:8080/g' Caddyfile
            sed -i 's/clipper-frontend-blue:80/clipper-frontend-green:80/g' Caddyfile 2>/dev/null || \
            sed -i.bak 's/clipper-frontend-blue:80/clipper-frontend-green:80/g' Caddyfile
        fi
    fi
    
    # Update environment variable and restart Caddy
    export ACTIVE_ENV=$target_env
    
    if docker compose -f "$COMPOSE_FILE" up -d caddy; then
        log_success "Caddy restarted with $target_env configuration"
        
        # Give Caddy a moment to reload
        sleep 3
        
        # Verify traffic switch
        if curl -f -s http://localhost/health > /dev/null 2>&1; then
            log_success "Traffic switched successfully to $target_env"
            return 0
        else
            log_error "Traffic switch verification failed"
            return 1
        fi
    else
        log_error "Failed to restart Caddy"
        return 1
    fi
}

# Main rollback function
main() {
    echo -e "${YELLOW}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║   Clipper Blue-Green Rollback Script          ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Check if we're in the right directory
    if [ ! -f "$DEPLOY_DIR/$COMPOSE_FILE" ]; then
        log_error "Compose file not found: $DEPLOY_DIR/$COMPOSE_FILE"
        exit 1
    fi
    
    cd "$DEPLOY_DIR" || exit 1
    
    # Detect active environment
    ACTIVE_ENV=$(detect_active_env)
    TARGET_ENV=$(get_target_env "$ACTIVE_ENV")
    
    log_warn "Current environment: $ACTIVE_ENV"
    log_info "Target environment: $TARGET_ENV"
    echo ""
    
    # Confirm rollback
    if [ "${1:-}" != "--yes" ] && [ "${1:-}" != "-y" ]; then
        echo -e "${YELLOW}WARNING: This will switch traffic from $ACTIVE_ENV to $TARGET_ENV${NC}"
        read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
        
        if [ "$CONFIRM" != "yes" ]; then
            log_info "Rollback cancelled"
            exit 0
        fi
    fi
    echo ""
    
    # Start target environment if needed
    if ! start_environment "$TARGET_ENV"; then
        log_error "Failed to start $TARGET_ENV environment"
        exit 1
    fi
    
    # Wait for startup
    log_info "Waiting for $TARGET_ENV environment to initialize..."
    sleep 15
    echo ""
    
    # Health check target environment
    if ! health_check "$TARGET_ENV"; then
        log_error "Target environment $TARGET_ENV is not healthy"
        log_error "Cannot complete rollback safely"
        exit 1
    fi
    echo ""
    
    # Switch traffic
    if ! switch_traffic "$TARGET_ENV"; then
        log_error "Failed to switch traffic to $TARGET_ENV"
        exit 1
    fi
    echo ""
    
    # Monitor for 30 seconds
    log_info "Monitoring $TARGET_ENV environment for 30 seconds..."
    sleep 30
    
    # Final health check
    if ! health_check "$TARGET_ENV"; then
        log_error "Post-rollback health check failed"
        log_warn "You may need to investigate $TARGET_ENV environment"
        exit 1
    fi
    echo ""
    
    # Optionally stop old environment
    read -p "Stop $ACTIVE_ENV environment? (yes/no): " STOP_OLD
    if [ "$STOP_OLD" = "yes" ]; then
        log_info "Stopping $ACTIVE_ENV environment..."
        if [ "$ACTIVE_ENV" = "green" ]; then
            docker compose -f "$COMPOSE_FILE" --profile green stop backend-green frontend-green
        else
            docker compose -f "$COMPOSE_FILE" stop backend-blue frontend-blue
        fi
        log_success "$ACTIVE_ENV environment stopped"
    else
        log_info "Keeping $ACTIVE_ENV environment running for safety"
    fi
    echo ""
    
    # Success
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   Rollback Completed Successfully! ✓          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    log_success "Rollback completed successfully"
    log_info "Previous environment: $ACTIVE_ENV"
    log_info "Current environment: $TARGET_ENV (active)"
    echo ""
    log_info "Next steps:"
    echo "  1. Monitor application metrics"
    echo "  2. Check error logs: docker compose logs --tail=100"
    echo "  3. Investigate cause of original deployment issue"
    echo "  4. Document incident and lessons learned"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Blue-Green deployment rollback script"
        echo ""
        echo "Options:"
        echo "  -y, --yes      Skip confirmation prompt"
        echo "  -h, --help     Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  DEPLOY_DIR     Deployment directory (default: /opt/clipper)"
        echo "  COMPOSE_FILE   Compose file name (default: docker-compose.blue-green.yml)"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
