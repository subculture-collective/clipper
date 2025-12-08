#!/bin/bash
# Helper script to manage blue-green traffic switching

set -e

ACTIVE_ENV_FILE="/etc/nginx/active_env"
CURRENT_ENV=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Function to check if environment is healthy
check_health() {
    local env=$1
    local port=$2

    if curl -fs "http://localhost:${port}/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to get current active environment
get_current_env() {
    if [ -f "$ACTIVE_ENV_FILE" ]; then
        cat "$ACTIVE_ENV_FILE" | tr -d '\n'
    else
        echo "blue"  # Default to blue
    fi
}

# Function to set active environment
set_active_env() {
    local env=$1
    echo "$env" | tee "$ACTIVE_ENV_FILE" > /dev/null
    log_info "Active environment set to: $env"
}

# Function to switch traffic
switch_traffic() {
    local from_env=$1
    local to_env=$2

    log_info "Switching traffic from $from_env to $to_env..."

    # Determine ports
    local from_port=$((8080 + (from_env == "green" ? 1 : 0)))
    local to_port=$((8080 + (to_env == "green" ? 1 : 0)))

    # Check health before switching
    log_info "Checking health of $to_env environment (port $to_port)..."
    if ! check_health "$to_env" "$to_port"; then
        log_error "$to_env environment is not healthy!"
        return 1
    fi

    # Switch in nginx
    set_active_env "$to_env"

    # Reload nginx
    log_info "Reloading nginx..."
    if ! systemctl reload nginx; then
        log_error "Failed to reload nginx"
        # Revert
        set_active_env "$from_env"
        systemctl reload nginx || true
        return 1
    fi

    log_info "Traffic successfully switched to $to_env environment"
    return 0
}

# Main command handling
case "${1:-}" in
    status)
        CURRENT_ENV=$(get_current_env)
        echo "Current active environment: $CURRENT_ENV"

        # Check health of both
        if check_health "blue" "8080"; then
            echo -e "${GREEN}✓${NC} Blue (8080) is healthy"
        else
            echo -e "${RED}✗${NC} Blue (8080) is NOT healthy"
        fi

        if check_health "green" "8081"; then
            echo -e "${GREEN}✓${NC} Green (8081) is healthy"
        else
            echo -e "${RED}✗${NC} Green (8081) is NOT healthy"
        fi
        ;;

    switch)
        if [ -z "$2" ]; then
            log_error "Usage: $0 switch <blue|green>"
            exit 1
        fi

        NEW_ENV="$2"
        CURRENT_ENV=$(get_current_env)

        if [ "$CURRENT_ENV" = "$NEW_ENV" ]; then
            log_warn "Already on $NEW_ENV environment"
            exit 0
        fi

        if ! switch_traffic "$CURRENT_ENV" "$NEW_ENV"; then
            exit 1
        fi
        ;;

    check)
        CURRENT_ENV=$(get_current_env)
        echo "Active: $CURRENT_ENV"

        # Get health status
        BLUE_HEALTH=$(check_health "blue" "8080" && echo "healthy" || echo "unhealthy")
        GREEN_HEALTH=$(check_health "green" "8081" && echo "healthy" || echo "unhealthy")

        echo "Blue: $BLUE_HEALTH"
        echo "Green: $GREEN_HEALTH"

        # If active environment is unhealthy, suggest switch
        if [ "$CURRENT_ENV" = "blue" ] && [ "$BLUE_HEALTH" = "unhealthy" ]; then
            if [ "$GREEN_HEALTH" = "healthy" ]; then
                log_warn "Current environment (blue) is unhealthy!"
                log_info "Green is healthy. Run: $0 switch green"
            fi
        elif [ "$CURRENT_ENV" = "green" ] && [ "$GREEN_HEALTH" = "unhealthy" ]; then
            if [ "$BLUE_HEALTH" = "healthy" ]; then
                log_warn "Current environment (green) is unhealthy!"
                log_info "Blue is healthy. Run: $0 switch blue"
            fi
        fi
        ;;

    *)
        echo "Usage: $0 <status|switch|check>"
        echo ""
        echo "Commands:"
        echo "  status              Show current active environment and health"
        echo "  switch <env>        Switch traffic to blue or green"
        echo "  check               Check health of both environments"
        echo ""
        echo "Examples:"
        echo "  sudo $0 status"
        echo "  sudo $0 switch green"
        echo "  sudo $0 check"
        exit 1
        ;;
esac
