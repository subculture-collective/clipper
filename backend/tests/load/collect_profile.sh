#!/bin/bash

# Performance Profiling Collection Script
# This script collects profiling data while running load tests

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080}"
PROFILE_DIR="profiles/$(date +%Y%m%d_%H%M%S)"
LOAD_TEST_DURATION=180  # 3 minutes
CPU_PROFILE_DURATION=60

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Clipper Performance Profiling ===${NC}"
echo ""

# Create profile directory
mkdir -p "$PROFILE_DIR"
echo -e "${GREEN}✓ Created profile directory: $PROFILE_DIR${NC}"

# Check if backend is running
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${RED}✗ Backend is not running at $BASE_URL${NC}"
    echo "  Start it with: make backend-dev"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}✗ k6 is not installed${NC}"
    echo "  Install it with: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"
    exit 1
fi
echo -e "${GREEN}✓ k6 is installed${NC}"

echo ""
echo -e "${YELLOW}=== Collecting Baseline Metrics ===${NC}"

# Collect initial metrics
echo "Collecting initial Prometheus metrics..."
curl -s "$BASE_URL/debug/metrics" > "$PROFILE_DIR/metrics_before.txt"
echo -e "${GREEN}✓ Saved metrics_before.txt${NC}"

# Collect database stats
echo "Collecting database statistics..."
curl -s "$BASE_URL/health/stats" | jq '.' > "$PROFILE_DIR/db_stats_before.json"
echo -e "${GREEN}✓ Saved db_stats_before.json${NC}"

# Collect cache stats
echo "Collecting cache statistics..."
curl -s "$BASE_URL/health/cache" | jq '.' > "$PROFILE_DIR/cache_stats_before.json"
echo -e "${GREEN}✓ Saved cache_stats_before.json${NC}"

echo ""
echo -e "${YELLOW}=== Starting Load Test ===${NC}"
echo "Duration: ${LOAD_TEST_DURATION}s"
echo ""

# Start load test in background
k6 run --duration "${LOAD_TEST_DURATION}s" --vus 100 scenarios/mixed_behavior.js > "$PROFILE_DIR/k6_results.txt" 2>&1 &
LOAD_TEST_PID=$!

# Wait a bit for load test to ramp up
sleep 10
echo -e "${GREEN}✓ Load test started (PID: $LOAD_TEST_PID)${NC}"

echo ""
echo -e "${YELLOW}=== Collecting Profiles During Load Test ===${NC}"

# Collect CPU profile
echo "Collecting CPU profile (${CPU_PROFILE_DURATION}s)..."
go tool pprof -proto "$BASE_URL/debug/pprof/profile?seconds=$CPU_PROFILE_DURATION" > "$PROFILE_DIR/cpu.pb.gz" 2>/dev/null &
CPU_PROFILE_PID=$!

# Collect heap profile
echo "Collecting heap profile..."
curl -s "$BASE_URL/debug/pprof/heap" > "$PROFILE_DIR/heap.pb.gz"
echo -e "${GREEN}✓ Saved heap.pb.gz${NC}"

# Collect goroutine profile
echo "Collecting goroutine profile..."
curl -s "$BASE_URL/debug/pprof/goroutine" > "$PROFILE_DIR/goroutine.pb.gz"
echo -e "${GREEN}✓ Saved goroutine.pb.gz${NC}"

# Collect allocs profile
echo "Collecting allocs profile..."
curl -s "$BASE_URL/debug/pprof/allocs" > "$PROFILE_DIR/allocs.pb.gz"
echo -e "${GREEN}✓ Saved allocs.pb.gz${NC}"

# Collect block profile
echo "Collecting block profile..."
curl -s "$BASE_URL/debug/pprof/block" > "$PROFILE_DIR/block.pb.gz"
echo -e "${GREEN}✓ Saved block.pb.gz${NC}"

# Collect mutex profile
echo "Collecting mutex profile..."
curl -s "$BASE_URL/debug/pprof/mutex" > "$PROFILE_DIR/mutex.pb.gz"
echo -e "${GREEN}✓ Saved mutex.pb.gz${NC}"

# Wait for CPU profile to complete
wait $CPU_PROFILE_PID
echo -e "${GREEN}✓ Saved cpu.pb.gz${NC}"

# Wait for load test to complete
echo ""
echo "Waiting for load test to complete..."
wait $LOAD_TEST_PID
echo -e "${GREEN}✓ Load test completed${NC}"

echo ""
echo -e "${YELLOW}=== Collecting Post-Test Metrics ===${NC}"

# Collect final metrics
echo "Collecting final Prometheus metrics..."
curl -s "$BASE_URL/debug/metrics" > "$PROFILE_DIR/metrics_after.txt"
echo -e "${GREEN}✓ Saved metrics_after.txt${NC}"

# Collect final database stats
echo "Collecting final database statistics..."
curl -s "$BASE_URL/health/stats" | jq '.' > "$PROFILE_DIR/db_stats_after.json"
echo -e "${GREEN}✓ Saved db_stats_after.json${NC}"

# Collect final cache stats
echo "Collecting final cache statistics..."
curl -s "$BASE_URL/health/cache" | jq '.' > "$PROFILE_DIR/cache_stats_after.json"
echo -e "${GREEN}✓ Saved cache_stats_after.json${NC}"

echo ""
echo -e "${YELLOW}=== Generating Summary Report ===${NC}"

# Generate summary report
cat > "$PROFILE_DIR/REPORT.md" << EOF
# Performance Profiling Report

**Generated**: $(date)
**Profile Directory**: $(basename "$PROFILE_DIR")

## Test Configuration

- **Base URL**: $BASE_URL
- **Load Test Duration**: ${LOAD_TEST_DURATION}s
- **CPU Profile Duration**: ${CPU_PROFILE_DURATION}s
- **Scenario**: Mixed user behavior (100 VUs)

## Files Collected

### Profiles (pprof format)
- `cpu.pb.gz` - CPU profile
- `heap.pb.gz` - Memory heap profile
- `allocs.pb.gz` - All memory allocations
- `goroutine.pb.gz` - Goroutine profile
- `block.pb.gz` - Blocking profile
- `mutex.pb.gz` - Mutex contention profile

### Metrics
- `metrics_before.txt` - Prometheus metrics before load test
- `metrics_after.txt` - Prometheus metrics after load test
- `db_stats_before.json` - Database stats before load test
- `db_stats_after.json` - Database stats after load test
- `cache_stats_before.json` - Cache stats before load test
- `cache_stats_after.json` - Cache stats after load test

### Load Test Results
- `k6_results.txt` - K6 load test output with performance metrics

## How to Analyze

### View CPU Profile
\`\`\`bash
go tool pprof -http=:8081 cpu.pb.gz
\`\`\`

### View Heap Profile
\`\`\`bash
go tool pprof -http=:8082 heap.pb.gz
\`\`\`

### View Goroutine Profile
\`\`\`bash
go tool pprof -http=:8083 goroutine.pb.gz
\`\`\`

### Compare Metrics
\`\`\`bash
diff metrics_before.txt metrics_after.txt
\`\`\`

### View K6 Summary
\`\`\`bash
grep -A 50 "     checks" k6_results.txt
\`\`\`

## Quick Analysis

### Load Test Results
\`\`\`bash
grep -E "(http_req_duration|http_req_failed|http_reqs)" k6_results.txt
\`\`\`

### Top CPU Consumers
\`\`\`bash
go tool pprof -top cpu.pb.gz | head -20
\`\`\`

### Memory Allocations
\`\`\`bash
go tool pprof -top heap.pb.gz | head -20
\`\`\`

### Goroutine Count
\`\`\`bash
go tool pprof -top goroutine.pb.gz | head -10
\`\`\`

## Next Steps

1. Analyze the profiles using the commands above
2. Identify bottlenecks (functions consuming >10% CPU or >100MB memory)
3. Document findings in this report
4. Implement optimizations
5. Re-run profiling to measure improvements

## Findings

### CPU Bottlenecks
<!-- Add findings here -->

### Memory Issues
<!-- Add findings here -->

### Database Performance
<!-- Add findings here -->

### Cache Performance
<!-- Add findings here -->

## Optimization Recommendations

<!-- Add recommendations here -->

## Before/After Metrics

<!-- Compare metrics after implementing optimizations -->
EOF

echo -e "${GREEN}✓ Generated REPORT.md${NC}"

# Extract key metrics from k6 results
echo ""
echo -e "${YELLOW}=== Quick Performance Summary ===${NC}"
echo ""

if [ -f "$PROFILE_DIR/k6_results.txt" ]; then
    echo "Load Test Results:"
    grep -E "(http_req_duration|http_req_failed|http_reqs|checks)" "$PROFILE_DIR/k6_results.txt" | head -4 || echo "  Could not extract metrics"
else
    echo "  k6_results.txt not found"
fi

echo ""
echo -e "${GREEN}=== Profiling Complete ===${NC}"
echo ""
echo "Results saved to: $PROFILE_DIR"
echo ""
echo "Next steps:"
echo "  1. View the report: cat $PROFILE_DIR/REPORT.md"
echo "  2. Analyze CPU profile: go tool pprof -http=:8081 $PROFILE_DIR/cpu.pb.gz"
echo "  3. Analyze heap profile: go tool pprof -http=:8082 $PROFILE_DIR/heap.pb.gz"
echo "  4. View k6 results: cat $PROFILE_DIR/k6_results.txt"
echo ""
