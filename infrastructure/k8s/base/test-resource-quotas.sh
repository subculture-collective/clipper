#!/bin/bash
# Resource Quotas & Limits Testing Script
# Tests quota enforcement and OOM behavior
# Related to Roadmap 5.0 Phase 5.2

set -e

NAMESPACE="${1:-clipper-staging}"
VERBOSE="${VERBOSE:-0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

# Check if namespace exists
check_namespace() {
    log "Checking if namespace $NAMESPACE exists..."
    if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
        error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    success "Namespace $NAMESPACE exists"
}

# Check ResourceQuota
check_quota() {
    log "Checking ResourceQuota in $NAMESPACE..."
    
    if ! kubectl get resourcequota -n "$NAMESPACE" &>/dev/null; then
        warn "No ResourceQuota found in $NAMESPACE"
        return 1
    fi
    
    echo ""
    echo "=== ResourceQuota Status ==="
    kubectl describe resourcequota -n "$NAMESPACE"
    echo ""
    
    success "ResourceQuota exists in $NAMESPACE"
}

# Check LimitRange
check_limitrange() {
    log "Checking LimitRange in $NAMESPACE..."
    
    if ! kubectl get limitrange -n "$NAMESPACE" &>/dev/null; then
        warn "No LimitRange found in $NAMESPACE"
        return 1
    fi
    
    echo ""
    echo "=== LimitRange Configuration ==="
    kubectl describe limitrange -n "$NAMESPACE"
    echo ""
    
    success "LimitRange exists in $NAMESPACE"
}

# Test OOM behavior
test_oom() {
    log "Testing OOM behavior in $NAMESPACE..."
    
    local pod_name="oom-test-$$"
    
    log "Creating test pod: $pod_name"
    
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: $pod_name
  namespace: $NAMESPACE
  labels:
    test: oom
spec:
  containers:
  - name: memory-hog
    image: polinux/stress:1.0.4
    resources:
      limits:
        memory: "128Mi"
      requests:
        memory: "64Mi"
    command: ["stress"]
    args: ["--vm", "1", "--vm-bytes", "256M", "--vm-hang", "1"]
  restartPolicy: Never
EOF

    log "Waiting for pod to be created..."
    sleep 3
    
    log "Monitoring pod status (will wait up to 30 seconds for OOM)..."
    local count=0
    local max_attempts=30
    local oom_detected=0
    
    while [ $count -lt $max_attempts ]; do
        local status=$(kubectl get pod "$pod_name" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[0].state.terminated.reason}' 2>/dev/null || echo "")
        
        if [ "$status" = "OOMKilled" ]; then
            oom_detected=1
            break
        fi
        
        if [ $VERBOSE -eq 1 ]; then
            kubectl get pod "$pod_name" -n "$NAMESPACE"
        fi
        
        sleep 1
        ((count++))
    done
    
    echo ""
    echo "=== Pod Status ==="
    kubectl describe pod "$pod_name" -n "$NAMESPACE" | tail -20
    echo ""
    
    # Check events
    echo "=== Recent Events ==="
    kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$pod_name" --sort-by='.lastTimestamp' | tail -10
    echo ""
    
    # Cleanup
    log "Cleaning up test pod..."
    kubectl delete pod "$pod_name" -n "$NAMESPACE" --wait=false &>/dev/null || true
    
    if [ $oom_detected -eq 1 ]; then
        success "OOM behavior verified - pod was killed due to memory limit"
        return 0
    else
        error "OOM was not detected within ${max_attempts} seconds"
        return 1
    fi
}

# Test quota enforcement
test_quota_enforcement() {
    log "Testing quota enforcement in $NAMESPACE..."
    
    # Get current quota limits
    local cpu_hard=$(kubectl get resourcequota -n "$NAMESPACE" -o jsonpath='{.items[0].status.hard.requests\.cpu}' 2>/dev/null || echo "")
    local mem_hard=$(kubectl get resourcequota -n "$NAMESPACE" -o jsonpath='{.items[0].status.hard.requests\.memory}' 2>/dev/null || echo "")
    
    if [ -z "$cpu_hard" ] || [ -z "$mem_hard" ]; then
        warn "Cannot test quota enforcement - quota not configured"
        return 1
    fi
    
    log "Current quota limits: CPU=$cpu_hard, Memory=$mem_hard"
    
    echo ""
    echo "=== Current Quota Usage ==="
    kubectl get resourcequota -n "$NAMESPACE" -o yaml | grep -A 10 "status:"
    echo ""
    
    success "Quota enforcement check completed (manual verification required)"
}

# Test pod resource requirements
test_pod_resources() {
    log "Checking pod resource configurations in $NAMESPACE..."
    
    local pods=$(kubectl get pods -n "$NAMESPACE" -o name 2>/dev/null | wc -l)
    
    if [ "$pods" -eq 0 ]; then
        warn "No pods found in $NAMESPACE to check"
        return 1
    fi
    
    echo ""
    echo "=== Pod Resource Requests/Limits ==="
    # Check if jq is available
    if command -v jq &>/dev/null; then
        kubectl get pods -n "$NAMESPACE" -o json | jq -r '
            .items[] |
            {
                pod: .metadata.name,
                containers: [
                    .spec.containers[] |
                    {
                        name: .name,
                        requests: .resources.requests,
                        limits: .resources.limits
                    }
                ]
            }
        ' 2>/dev/null
    else
        # Fallback if jq is not available
        kubectl get pods -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .spec.containers[*]}  {.name}: requests={.resources.requests} limits={.resources.limits}{"\n"}{end}{end}'
    fi
    echo ""
    
    success "Pod resource check completed"
}

# Main test suite
main() {
    echo "=============================================="
    echo "Resource Quotas & Limits Testing"
    echo "Namespace: $NAMESPACE"
    echo "=============================================="
    echo ""
    
    check_namespace
    echo ""
    
    check_quota
    echo ""
    
    check_limitrange
    echo ""
    
    if [ "${TEST_OOM:-1}" = "1" ]; then
        test_oom
        echo ""
    fi
    
    test_quota_enforcement
    echo ""
    
    test_pod_resources
    echo ""
    
    echo "=============================================="
    echo "Testing completed!"
    echo ""
    echo "For monitoring, check:"
    echo "  - Grafana: http://grafana.clpr.tv/d/resource-quotas"
    echo "  - Prometheus Alerts: http://prometheus.clpr.tv/alerts"
    echo ""
    echo "Related documentation:"
    echo "  - docs/operations/resource-quotas.md"
    echo "=============================================="
}

# Show usage
usage() {
    cat <<EOF
Usage: $0 [NAMESPACE]

Test resource quotas and limits in a Kubernetes namespace.

Arguments:
  NAMESPACE    Namespace to test (default: clipper-staging)

Environment Variables:
  TEST_OOM     Set to 0 to skip OOM test (default: 1)
  VERBOSE      Set to 1 for verbose output (default: 0)

Examples:
  # Test in staging namespace
  $0 clipper-staging

  # Test in production namespace
  $0 clipper-production

  # Skip OOM test
  TEST_OOM=0 $0 clipper-staging

  # Verbose mode
  VERBOSE=1 $0 clipper-staging

EOF
}

# Parse arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
    exit 0
fi

# Run tests
main
