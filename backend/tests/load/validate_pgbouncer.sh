#!/bin/bash
# Load Test Validation Script for PgBouncer Connection Pooling
# Validates that PgBouncer handles load without connection exhaustion

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PGBOUNCER_SERVICE="${PGBOUNCER_SERVICE:-pgbouncer}"
PGBOUNCER_METRICS_PORT="${PGBOUNCER_METRICS_PORT:-9127}"
TEST_DURATION="${TEST_DURATION:-300}" # 5 minutes default
NAMESPACE="${NAMESPACE:-default}"
MAX_POOL_SIZE=50
WARNING_THRESHOLD=40  # 80% of max
CRITICAL_THRESHOLD=48 # 96% of max

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PgBouncer Load Test Validation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if PgBouncer is deployed
echo -e "${YELLOW}Checking PgBouncer deployment...${NC}"
if ! kubectl get deployment pgbouncer -n "$NAMESPACE" &> /dev/null; then
    echo -e "${RED}ERROR: PgBouncer deployment not found${NC}"
    echo "Deploy PgBouncer first: kubectl apply -f backend/k8s/pgbouncer.yaml"
    exit 1
fi

# Check if PgBouncer pods are ready
READY_PODS=$(kubectl get pods -l app=pgbouncer -n "$NAMESPACE" -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' | wc -w)
if [ "$READY_PODS" -eq 0 ]; then
    echo -e "${RED}ERROR: No PgBouncer pods are running${NC}"
    kubectl get pods -l app=pgbouncer -n "$NAMESPACE"
    exit 1
fi
echo -e "${GREEN}✓ PgBouncer deployment found ($READY_PODS pods running)${NC}"
echo ""

# Function to get metrics from PgBouncer
get_pgbouncer_metrics() {
    local metric=$1
    kubectl port-forward -n "$NAMESPACE" svc/"$PGBOUNCER_SERVICE" "$PGBOUNCER_METRICS_PORT":"$PGBOUNCER_METRICS_PORT" &> /dev/null &
    local PF_PID=$!
    
    # Wait for port-forward to be ready (up to 10 seconds)
    local max_retries=10
    local attempt=0
    local port_ready=0
    while [ "$attempt" -lt "$max_retries" ]; do
        if curl -s "http://localhost:${PGBOUNCER_METRICS_PORT}/metrics" -o /dev/null 2>&1; then
            port_ready=1
            break
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    if [ "$port_ready" -ne 1 ]; then
        kill $PF_PID 2>/dev/null || true
        wait $PF_PID 2>/dev/null || true
        echo "0"
        return
    fi
    
    local value=$(curl -s "http://localhost:${PGBOUNCER_METRICS_PORT}/metrics" | grep -E -m1 "^${metric}\{[^}]*database=\"clipper_db\"[^}]*\}" | awk '{print $NF}')
    
    kill $PF_PID 2>/dev/null || true
    wait $PF_PID 2>/dev/null || true
    
    echo "${value:-0}"
}

# Function to check metrics
check_metric() {
    local metric_name=$1
    local metric_value=$2
    local threshold=$3
    local comparison=$4  # "gt" or "lt"
    
    if [ "$comparison" = "gt" ]; then
        if [ "$metric_value" -gt "$threshold" ]; then
            echo -e "${RED}✗ FAIL${NC}"
            return 1
        fi
    elif [ "$comparison" = "lt" ]; then
        if [ "$metric_value" -lt "$threshold" ]; then
            echo -e "${RED}✗ FAIL${NC}"
            return 1
        fi
    fi
    echo -e "${GREEN}✓ PASS${NC}"
    return 0
}

# Baseline metrics before test
echo -e "${YELLOW}Collecting baseline metrics...${NC}"
BASELINE_ACTIVE=$(get_pgbouncer_metrics "pgbouncer_pools_sv_active")
BASELINE_WAITING=$(get_pgbouncer_metrics "pgbouncer_pools_cl_waiting")
BASELINE_IDLE=$(get_pgbouncer_metrics "pgbouncer_pools_sv_idle")

echo "  Active server connections: $BASELINE_ACTIVE"
echo "  Waiting clients: $BASELINE_WAITING"
echo "  Idle server connections: $BASELINE_IDLE"
echo ""

# Run load test
echo -e "${YELLOW}Running load test ($TEST_DURATION seconds)...${NC}"
echo "This will execute the mixed behavior test scenario"
echo ""

cd "$(dirname "$0")" || exit 1
if [ ! -f "scenarios/mixed_behavior.js" ]; then
    echo -e "${RED}ERROR: Load test script not found${NC}"
    echo "Expected: scenarios/mixed_behavior.js"
    exit 1
fi

# Check if k6 is available
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}ERROR: k6 is not installed${NC}"
    echo "Install from: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Run k6 test in background
echo "Starting k6 load test..."
k6 run --vus 100 --duration "${TEST_DURATION}s" scenarios/mixed_behavior.js > /tmp/k6_output.log 2>&1 &
K6_PID=$!

# Verify k6 started successfully before monitoring
sleep 2
if ! kill -0 "$K6_PID" 2>/dev/null; then
    echo -e "${RED}ERROR: k6 failed to start or exited prematurely${NC}"
    echo "k6 output (last 20 lines):"
    tail -n 20 /tmp/k6_output.log || true
    exit 1
fi

# Monitor metrics during test
echo -e "${YELLOW}Monitoring PgBouncer metrics during test...${NC}"
echo ""

MAX_ACTIVE_SEEN=0
MAX_WAITING_SEEN=0
SAMPLES=0
ISSUES_FOUND=0

for i in $(seq 1 $((TEST_DURATION / 10))); do
    sleep 10
    
    ACTIVE=$(get_pgbouncer_metrics "pgbouncer_pools_sv_active")
    WAITING=$(get_pgbouncer_metrics "pgbouncer_pools_cl_waiting")
    IDLE=$(get_pgbouncer_metrics "pgbouncer_pools_sv_idle")
    UTILIZATION=$((ACTIVE * 100 / MAX_POOL_SIZE))
    
    # Track maximums
    [ "$ACTIVE" -gt "$MAX_ACTIVE_SEEN" ] && MAX_ACTIVE_SEEN=$ACTIVE
    [ "$WAITING" -gt "$MAX_WAITING_SEEN" ] && MAX_WAITING_SEEN=$WAITING
    
    SAMPLES=$((SAMPLES + 1))
    
    # Display current metrics
    printf "[%3ds] Active: %2d/%d (%3d%%) | Idle: %2d | Waiting: %2d" \
        $((i * 10)) "$ACTIVE" "$MAX_POOL_SIZE" "$UTILIZATION" "$IDLE" "$WAITING"
    
    # Check for issues
    if [ "$ACTIVE" -ge "$CRITICAL_THRESHOLD" ]; then
        echo -e " ${RED}⚠ CRITICAL: Near exhaustion${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    elif [ "$ACTIVE" -ge "$WARNING_THRESHOLD" ]; then
        echo -e " ${YELLOW}⚠ WARNING: High utilization${NC}"
    elif [ "$WAITING" -gt 0 ]; then
        echo -e " ${YELLOW}⚠ Clients waiting${NC}"
    else
        echo -e " ${GREEN}✓${NC}"
    fi
done

# Wait for k6 to complete
echo ""
echo -e "${YELLOW}Waiting for load test to complete...${NC}"
wait $K6_PID
K6_EXIT_CODE=$?

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Results${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Collect final metrics
FINAL_ACTIVE=$(get_pgbouncer_metrics "pgbouncer_pools_sv_active")
FINAL_WAITING=$(get_pgbouncer_metrics "pgbouncer_pools_cl_waiting")
FINAL_IDLE=$(get_pgbouncer_metrics "pgbouncer_pools_sv_idle")

echo "Load Test Results:"
if [ $K6_EXIT_CODE -eq 0 ]; then
    echo -e "  k6 test: ${GREEN}✓ PASSED${NC}"
else
    echo -e "  k6 test: ${RED}✗ FAILED (exit code: $K6_EXIT_CODE)${NC}"
    echo "  See /tmp/k6_output.log for details"
fi
echo ""

echo "PgBouncer Connection Pool Metrics:"
echo "  Baseline active connections: $BASELINE_ACTIVE"
echo "  Peak active connections: $MAX_ACTIVE_SEEN / $MAX_POOL_SIZE ($(( MAX_ACTIVE_SEEN * 100 / MAX_POOL_SIZE ))%)"
echo "  Final active connections: $FINAL_ACTIVE"
echo ""

echo "  Max waiting clients: $MAX_WAITING_SEEN"
echo "  Final waiting clients: $FINAL_WAITING"
echo ""

echo "  Final idle connections: $FINAL_IDLE"
echo "  Samples collected: $SAMPLES"
echo ""

# Validation checks
echo "Validation Checks:"
echo -n "  ✓ No connection exhaustion (active < $CRITICAL_THRESHOLD): "
if [ "$MAX_ACTIVE_SEEN" -lt "$CRITICAL_THRESHOLD" ]; then
    echo -e "${GREEN}PASS${NC} ($MAX_ACTIVE_SEEN < $CRITICAL_THRESHOLD)"
    PASS_COUNT=1
else
    echo -e "${RED}FAIL${NC} ($MAX_ACTIVE_SEEN >= $CRITICAL_THRESHOLD)"
    PASS_COUNT=0
fi

echo -n "  ✓ No persistent client waiting (max waiting < 10): "
if [ "$MAX_WAITING_SEEN" -lt 10 ]; then
    echo -e "${GREEN}PASS${NC} ($MAX_WAITING_SEEN < 10)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC} ($MAX_WAITING_SEEN >= 10)"
fi

echo -n "  ✓ Pool returns to baseline (final <= baseline + 5): "
if [ "$FINAL_ACTIVE" -le $((BASELINE_ACTIVE + 5)) ]; then
    echo -e "${GREEN}PASS${NC} ($FINAL_ACTIVE <= $((BASELINE_ACTIVE + 5)))"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${YELLOW}WARNING${NC} ($FINAL_ACTIVE > $((BASELINE_ACTIVE + 5)))"
fi

echo -n "  ✓ k6 load test completed: "
if [ $K6_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${RED}FAIL${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"

if [ $PASS_COUNT -eq 4 ] && [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}PgBouncer is properly configured and handles load without connection exhaustion.${NC}"
    EXIT_CODE=0
elif [ $PASS_COUNT -ge 3 ]; then
    echo -e "${YELLOW}⚠ PASSED WITH WARNINGS${NC}"
    echo -e "${YELLOW}PgBouncer handles the load but consider reviewing configuration.${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}✗ VALIDATION FAILED${NC}"
    echo -e "${RED}Connection pool exhaustion detected or significant issues found.${NC}"
    echo ""
    echo "Recommendations:"
    if [ "$MAX_ACTIVE_SEEN" -ge "$CRITICAL_THRESHOLD" ]; then
        echo "  - Increase max_db_connections in pgbouncer-configmap.yaml"
        echo "  - Verify PostgreSQL max_connections setting"
    fi
    if [ "$MAX_WAITING_SEEN" -ge 10 ]; then
        echo "  - Increase default_pool_size in pgbouncer-configmap.yaml"
        echo "  - Check for slow queries in PostgreSQL"
    fi
    EXIT_CODE=1
fi

echo -e "${BLUE}========================================${NC}"
echo ""

# Cleanup
echo "Logs saved to /tmp/k6_output.log"
echo "View detailed k6 results: cat /tmp/k6_output.log"
echo ""
echo "Check PgBouncer dashboard in Grafana for detailed metrics"
echo "Monitor alerts in: monitoring/alerts.yml (pgbouncer_alerts group)"

exit $EXIT_CODE
