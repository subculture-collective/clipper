#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:80}"
TIMEOUT="${TIMEOUT:-10}"
MAX_RETRIES="${MAX_RETRIES:-3}"

echo -e "${GREEN}=== Clipper Health Check ===${NC}"
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Timeout: ${TIMEOUT}s"
echo "Max Retries: $MAX_RETRIES"
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

# Function to check endpoint with retries
check_endpoint() {
    local url=$1
    local name=$2
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if command -v curl >/dev/null 2>&1; then
            if curl -f -s -m "$TIMEOUT" "$url" > /dev/null 2>&1; then
                log_info "$name is healthy"
                return 0
            fi
        elif command -v wget >/dev/null 2>&1; then
            if wget --spider -q -T "$TIMEOUT" "$url" 2>/dev/null; then
                log_info "$name is healthy"
                return 0
            fi
        else
            log_error "Neither curl nor wget is available"
            return 2
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            log_warn "$name check failed, retrying ($retries/$MAX_RETRIES)..."
            sleep 2
        fi
    done
    
    log_error "$name is unhealthy after $MAX_RETRIES retries"
    return 1
}

# Check backend health
check_endpoint "$BACKEND_URL/health" "Backend"
BACKEND_STATUS=$?

# Check frontend health
check_endpoint "$FRONTEND_URL/health.html" "Frontend"
FRONTEND_STATUS=$?

echo ""

# Overall status
if [ $BACKEND_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ All services are healthy${NC}"
    exit 0
elif [ $BACKEND_STATUS -eq 0 ] || [ $FRONTEND_STATUS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Some services are unhealthy${NC}"
    exit 1
else
    echo -e "${RED}✗ All services are unhealthy${NC}"
    exit 1
fi
