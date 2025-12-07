#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-default}"
REGISTRY="${REGISTRY:-ghcr.io/subculture-collective/clipper}"
VERSION="${VERSION:-latest}"
KUBECTL="${KUBECTL:-kubectl}"

# Warn about using 'latest' in production
if [ "$VERSION" = "latest" ]; then
    echo -e "${YELLOW}WARNING: Using 'latest' tag is not recommended for production deployments.${NC}"
    echo -e "${YELLOW}Please specify a version tag (e.g., VERSION=v1.2.3)${NC}"
    echo ""
fi

echo -e "${BLUE}=== Kubernetes Blue/Green Deployment ===${NC}"
echo "Namespace: $NAMESPACE"
echo "Registry: $REGISTRY"
echo "Version: $VERSION"
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

# Function to detect active environment
detect_active_environment() {
    local active_selector=$($KUBECTL get service clipper-backend -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "blue")
    echo "$active_selector"
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

# Function to wait for deployment
wait_for_deployment() {
    local deployment=$1
    log_info "Waiting for deployment $deployment to be ready..."
    
    if ! $KUBECTL wait --for=condition=available --timeout=300s deployment/"$deployment" -n "$NAMESPACE"; then
        log_error "Deployment $deployment did not become ready"
        return 1
    fi
    
    log_info "✓ Deployment $deployment is ready"
}

# Function to run smoke tests
run_smoke_tests() {
    local version=$1
    log_info "Running smoke tests against $version environment..."
    
    # Get a pod from the deployment
    local pod=$($KUBECTL get pods -n "$NAMESPACE" -l "app=clipper-backend,version=$version" -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$pod" ]; then
        log_error "No pods found for $version environment"
        return 1
    fi
    
    # Port forward to the pod
    log_info "Port forwarding to pod $pod..."
    $KUBECTL port-forward -n "$NAMESPACE" "$pod" 9090:8080 &
    PF_PID=$!
    
    # Wait for port forward to be ready
    sleep 3
    
    # Verify port forward is working
    local retries=5
    while [ $retries -gt 0 ]; do
        if curl -s http://localhost:9090/health >/dev/null 2>&1; then
            break
        fi
        retries=$((retries - 1))
        if [ $retries -eq 0 ]; then
            log_error "Port forward failed to become ready"
            kill $PF_PID 2>/dev/null || true
            return 1
        fi
        sleep 1
    done
    
    # Run smoke tests
    if BACKEND_URL="http://localhost:9090" ./scripts/smoke-tests.sh; then
        log_info "✓ Smoke tests passed"
        kill $PF_PID 2>/dev/null || true
        return 0
    else
        log_error "Smoke tests failed"
        kill $PF_PID 2>/dev/null || true
        return 1
    fi
}

# Pre-deployment checks
log_step "Running pre-deployment checks..."

if ! command_exists "$KUBECTL"; then
    log_error "kubectl is not installed"
    exit 1
fi

# Check if namespace exists
if ! $KUBECTL get namespace "$NAMESPACE" >/dev/null 2>&1; then
    log_error "Namespace $NAMESPACE does not exist"
    exit 1
fi

# Detect current active environment
ACTIVE_ENV=$(detect_active_environment)
INACTIVE_ENV=$(get_inactive_environment "$ACTIVE_ENV")

log_info "Current active environment: $ACTIVE_ENV"
log_info "Deploying to inactive environment: $INACTIVE_ENV"

# Update image in inactive deployment
log_step "Updating $INACTIVE_ENV deployment with new image..."
$KUBECTL set image deployment/clipper-backend-"$INACTIVE_ENV" \
    backend="$REGISTRY/backend:$VERSION" \
    -n "$NAMESPACE"

# Wait for deployment to be ready
if ! wait_for_deployment "clipper-backend-$INACTIVE_ENV"; then
    log_error "Failed to deploy to $INACTIVE_ENV environment"
    exit 1
fi

# Run smoke tests
log_step "Running smoke tests on $INACTIVE_ENV environment..."
if ! run_smoke_tests "$INACTIVE_ENV"; then
    log_error "Smoke tests failed for $INACTIVE_ENV environment"
    log_error "Rolling back..."
    
    # Scale down the failed deployment
    $KUBECTL scale deployment/clipper-backend-"$INACTIVE_ENV" --replicas=0 -n "$NAMESPACE"
    exit 1
fi

# Switch traffic to new environment
log_step "Switching traffic to $INACTIVE_ENV environment..."
$KUBECTL patch service clipper-backend -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$INACTIVE_ENV\"}}}"

log_info "✓ Traffic switched to $INACTIVE_ENV environment"

# Monitor new environment for stability
log_step "Monitoring new environment for stability..."
sleep 15

# Verify new environment is still healthy
if ! run_smoke_tests "$INACTIVE_ENV"; then
    log_error "New environment became unhealthy after traffic switch"
    log_error "Rolling back to $ACTIVE_ENV environment..."
    
    $KUBECTL patch service clipper-backend -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$ACTIVE_ENV\"}}}"
    exit 1
fi

# Scale down old environment (optional - keep it running for quick rollback)
log_step "Scaling down old $ACTIVE_ENV environment..."
$KUBECTL scale deployment/clipper-backend-"$ACTIVE_ENV" --replicas=0 -n "$NAMESPACE"

log_info "Old $ACTIVE_ENV environment scaled down (preserved for rollback)"

# Show status
log_info "Deployment successful! Current status:"
$KUBECTL get deployments -n "$NAMESPACE" -l app=clipper-backend
$KUBECTL get pods -n "$NAMESPACE" -l app=clipper-backend

echo ""
echo -e "${GREEN}=== Blue/Green Deployment Complete ===${NC}"
echo "Active environment: $INACTIVE_ENV"
echo "Inactive environment: $ACTIVE_ENV (scaled to 0)"
echo ""
echo "To rollback: kubectl scale deployment/clipper-backend-$ACTIVE_ENV --replicas=2 -n $NAMESPACE"
echo "             kubectl patch service clipper-backend -n $NAMESPACE -p '{\"spec\":{\"selector\":{\"version\":\"$ACTIVE_ENV\"}}}'"
