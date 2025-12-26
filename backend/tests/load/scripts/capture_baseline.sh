#!/bin/bash

# Baseline Capture Script
# Captures performance baselines for k6 load tests and stores them per version
#
# Usage: ./capture_baseline.sh <version>
# Example: ./capture_baseline.sh v1.0.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Version required${NC}"
    echo "Usage: $0 <version>"
    echo "Example: $0 v1.0.0"
    exit 1
fi

VERSION="$1"
BASELINES_DIR="backend/tests/load/baselines"
VERSION_DIR="${BASELINES_DIR}/${VERSION}"
TEMP_DIR="/tmp/k6_baseline_${VERSION}_$$"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           K6 Baseline Capture${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Version:${NC} $VERSION"
echo -e "${CYAN}Git Commit:${NC} $GIT_COMMIT"
echo -e "${CYAN}Timestamp:${NC} $TIMESTAMP"
echo ""

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install it with: brew install k6 (macOS)"
    echo "Or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

K6_VERSION=$(k6 version | head -1 | awk '{print $2}')
echo -e "${CYAN}k6 Version:${NC} $K6_VERSION"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    echo "Install it with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Check if backend is running
echo -e "${BLUE}Checking if backend is running...${NC}"
if ! curl -s http://localhost:8080/api/v1/health > /dev/null; then
    echo -e "${YELLOW}Warning: Backend is not responding at http://localhost:8080${NC}"
    echo "Please start the backend with: make backend-dev"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Create directories
mkdir -p "$VERSION_DIR"
mkdir -p "$TEMP_DIR"

# Define scenarios
scenarios=(
    "feed_browsing"
    "clip_detail"
    "search"
    "comments"
    "authentication"
    "submit"
    "mixed_behavior"
)

echo -e "${BLUE}Running scenarios and capturing baselines...${NC}"
echo ""

# Function to extract metrics from k6 JSON output
extract_metrics() {
    local json_file="$1"
    local scenario_name="$2"
    local baseline_file="$3"
    
    # Extract key metrics
    local p50=$(jq -r '.metrics.http_req_duration.values.["p(50)"] // null' "$json_file")
    local p95=$(jq -r '.metrics.http_req_duration.values.["p(95)"] // null' "$json_file")
    local p99=$(jq -r '.metrics.http_req_duration.values.["p(99)"] // null' "$json_file")
    local avg=$(jq -r '.metrics.http_req_duration.values.avg // null' "$json_file")
    local min=$(jq -r '.metrics.http_req_duration.values.min // null' "$json_file")
    local max=$(jq -r '.metrics.http_req_duration.values.max // null' "$json_file")
    
    local error_rate=$(jq -r '.metrics.http_req_failed.values.rate // null' "$json_file")
    local error_count=$(jq -r '.metrics.http_req_failed.values.passes // 0' "$json_file")
    local total_reqs=$(jq -r '.metrics.http_reqs.values.count // null' "$json_file")
    local req_rate=$(jq -r '.metrics.http_reqs.values.rate // null' "$json_file")
    
    local check_rate=$(jq -r '.metrics.checks.values.rate // null' "$json_file")
    local check_passes=$(jq -r '.metrics.checks.values.passes // null' "$json_file")
    local check_fails=$(jq -r '.metrics.checks.values.fails // null' "$json_file")
    
    local iteration_rate=$(jq -r '.metrics.iterations.values.rate // null' "$json_file")
    local iteration_count=$(jq -r '.metrics.iterations.values.count // null' "$json_file")
    
    local vus_max=$(jq -r '.metrics.vus_max.values.max // null' "$json_file")
    
    # Get environment info
    local os_type=$(uname -s)
    local cpu_cores=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "unknown")
    local memory_gb=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024/1024/1024)}' || echo "unknown")
    
    # Create baseline JSON
    cat > "$baseline_file" <<EOF
{
  "version": "$VERSION",
  "scenario": "$scenario_name",
  "timestamp": "$TIMESTAMP",
  "git_commit": "$GIT_COMMIT",
  "metrics": {
    "http_req_duration": {
      "p50": $p50,
      "p95": $p95,
      "p99": $p99,
      "avg": $avg,
      "min": $min,
      "max": $max
    },
    "http_req_failed": {
      "rate": $error_rate,
      "count": $error_count,
      "total": $total_reqs
    },
    "http_reqs": {
      "rate": $req_rate,
      "count": $total_reqs
    },
    "checks": {
      "rate": $check_rate,
      "passes": $check_passes,
      "fails": $check_fails
    },
    "iterations": {
      "rate": $iteration_rate,
      "count": $iteration_count
    },
    "vus": {
      "max": $vus_max
    }
  },
  "environment": {
    "os": "$os_type",
    "k6_version": "$K6_VERSION",
    "cpu_cores": $cpu_cores,
    "memory_gb": $memory_gb
  }
}
EOF
    
    echo -e "${GREEN}✓ Baseline saved: ${scenario_name}.json${NC}"
    echo -e "  p95: ${p95}ms | p99: ${p99}ms | Error Rate: ${error_rate}"
}

# Run each scenario
for scenario in "${scenarios[@]}"; do
    scenario_file="backend/tests/load/scenarios/${scenario}.js"
    
    if [ ! -f "$scenario_file" ]; then
        echo -e "${YELLOW}⚠ Scenario not found: $scenario_file, skipping${NC}"
        continue
    fi
    
    echo -e "${CYAN}Running: ${scenario}${NC}"
    json_output="${TEMP_DIR}/${scenario}_raw.json"
    text_output="${TEMP_DIR}/${scenario}_output.txt"
    
    # Run k6 test
    k6 run --out json="$json_output" "$scenario_file" > "$text_output" 2>&1 || {
        echo -e "${YELLOW}⚠ Test failed, but continuing...${NC}"
    }
    
    # Wait a bit between tests
    sleep 5
    
    # Extract and save baseline
    baseline_file="${VERSION_DIR}/${scenario}.json"
    extract_metrics "$json_output" "$scenario" "$baseline_file"
    
    echo ""
done

# Create current symlink
echo -e "${BLUE}Updating 'current' baseline...${NC}"
rm -f "${BASELINES_DIR}/current"
ln -s "$VERSION" "${BASELINES_DIR}/current"
echo -e "${GREEN}✓ Current baseline now points to ${VERSION}${NC}"
echo ""

# Generate summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Baseline capture complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Baselines saved to:${NC} $VERSION_DIR"
echo -e "${CYAN}Files:${NC}"
ls -lh "$VERSION_DIR" | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Review baseline metrics"
echo "  2. Commit baselines to git: git add $VERSION_DIR"
echo "  3. Compare future runs: ./scripts/compare_baseline.sh $VERSION"
echo ""

# Cleanup temp directory
rm -rf "$TEMP_DIR"
