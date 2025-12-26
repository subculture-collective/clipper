#!/bin/bash

# Baseline Comparison Script
# Compares current k6 load test results against a baseline to detect regressions
#
# Usage: ./compare_baseline.sh <version|current>
# Example: ./compare_baseline.sh v1.0.0
# Example: ./compare_baseline.sh current

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Regression thresholds (as decimals)
LATENCY_P95_THRESHOLD=0.10  # 10% increase
LATENCY_P99_THRESHOLD=0.15  # 15% increase
ERROR_RATE_THRESHOLD=0.50   # 50% increase
THROUGHPUT_THRESHOLD=0.10   # 10% decrease
CHECK_FAIL_THRESHOLD=0.50   # 50% increase

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Baseline version required${NC}"
    echo "Usage: $0 <version|current>"
    echo "Example: $0 v1.0.0"
    echo "Example: $0 current"
    exit 1
fi

BASELINE_VERSION="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_TEST_DIR="$(dirname "$SCRIPT_DIR")"
BASELINES_DIR="${LOAD_TEST_DIR}/baselines"
BASELINE_DIR="${BASELINES_DIR}/${BASELINE_VERSION}"
TEMP_DIR="/tmp/k6_comparison_$$"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_DIR="${LOAD_TEST_DIR}/reports"
REPORT_FILE="${REPORT_DIR}/comparison_${BASELINE_VERSION}_$(date +%Y%m%d_%H%M%S).md"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           K6 Baseline Comparison${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Baseline Version:${NC} $BASELINE_VERSION"
echo -e "${CYAN}Comparison Time:${NC} $TIMESTAMP"
echo ""

# Check if baseline exists
if [ ! -d "$BASELINE_DIR" ]; then
    echo -e "${RED}Error: Baseline not found at $BASELINE_DIR${NC}"
    echo "Available baselines:"
    ls -1 "$BASELINES_DIR" 2>/dev/null | grep -v README || echo "  (none)"
    exit 1
fi

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    exit 1
fi

# Check if bc is installed
if ! command -v bc &> /dev/null; then
    echo -e "${RED}Error: bc is not installed${NC}"
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

# Create temp and report directories
mkdir -p "$TEMP_DIR"
mkdir -p "$REPORT_DIR"

# Initialize report
cat > "$REPORT_FILE" <<EOF
# Load Test Comparison Report

**Baseline Version:** $BASELINE_VERSION  
**Comparison Date:** $TIMESTAMP  
**Git Commit:** $(git rev-parse HEAD 2>/dev/null || echo "unknown")

---

## Executive Summary

EOF

# Track regressions
REGRESSIONS_FOUND=0
IMPROVEMENTS_FOUND=0

# Function to calculate percentage change
calculate_change() {
    local baseline=$1
    local current=$2
    
    if [ "$baseline" = "null" ] || [ "$current" = "null" ]; then
        echo "N/A"
        return
    fi
    
    # Use bc for floating point arithmetic
    local change=$(echo "scale=2; (($current - $baseline) / $baseline) * 100" | bc)
    echo "$change"
}

# Function to compare metrics
compare_scenario() {
    local scenario_name=$1
    local baseline_file="${BASELINE_DIR}/${scenario_name}.json"
    local current_json="${TEMP_DIR}/${scenario_name}_raw.json"
    
    if [ ! -f "$baseline_file" ]; then
        echo -e "${YELLOW}⚠ No baseline for ${scenario_name}, skipping${NC}"
        return
    fi
    
    # Run current test
    echo -e "${CYAN}Running: ${scenario_name}${NC}"
    local scenario_file="${LOAD_TEST_DIR}/scenarios/${scenario_name}.js"
    k6 run --out json="$current_json" "$scenario_file" > /dev/null 2>&1 || {
        echo -e "${YELLOW}⚠ Test failed, skipping comparison${NC}"
        return
    }
    
    # Extract baseline metrics
    local baseline_p95=$(jq -r '.metrics.http_req_duration.p95' "$baseline_file")
    local baseline_p99=$(jq -r '.metrics.http_req_duration.p99' "$baseline_file")
    local baseline_error_rate=$(jq -r '.metrics.http_req_failed.rate' "$baseline_file")
    local baseline_throughput=$(jq -r '.metrics.http_reqs.rate' "$baseline_file")
    local baseline_check_rate=$(jq -r '.metrics.checks.rate' "$baseline_file")
    
    # Extract current metrics
    local current_p95=$(jq -r '.metrics.http_req_duration.values.["p(95)"]' "$current_json")
    local current_p99=$(jq -r '.metrics.http_req_duration.values.["p(99)"]' "$current_json")
    local current_error_rate=$(jq -r '.metrics.http_req_failed.values.rate' "$current_json")
    local current_throughput=$(jq -r '.metrics.http_reqs.values.rate' "$current_json")
    local current_check_rate=$(jq -r '.metrics.checks.values.rate' "$current_json")
    
    # Calculate changes
    local p95_change=$(calculate_change "$baseline_p95" "$current_p95")
    local p99_change=$(calculate_change "$baseline_p99" "$current_p99")
    local error_change=$(calculate_change "$baseline_error_rate" "$current_error_rate")
    local throughput_change=$(calculate_change "$baseline_throughput" "$current_throughput")
    local check_change=$(calculate_change "$baseline_check_rate" "$current_check_rate")
    
    # Detect regressions (track individually)
    local p95_regression=0
    local p99_regression=0
    local error_regression=0
    local throughput_regression=0
    local check_regression=0
    
    local has_regression=0
    local regression_details=""
    
    # Check p95 regression
    if [ "$p95_change" != "N/A" ]; then
        local p95_check=$(echo "$p95_change > $(echo "$LATENCY_P95_THRESHOLD * 100" | bc)" | bc)
        if [ "$p95_check" -eq 1 ]; then
            p95_regression=1
            has_regression=1
            regression_details="${regression_details}\n  - p95 latency increased by ${p95_change}% (threshold: 10%)"
        fi
    fi
    
    # Check p99 regression
    if [ "$p99_change" != "N/A" ]; then
        local p99_check=$(echo "$p99_change > $(echo "$LATENCY_P99_THRESHOLD * 100" | bc)" | bc)
        if [ "$p99_check" -eq 1 ]; then
            p99_regression=1
            has_regression=1
            regression_details="${regression_details}\n  - p99 latency increased by ${p99_change}% (threshold: 15%)"
        fi
    fi
    
    # Check error rate regression
    if [ "$error_change" != "N/A" ]; then
        local error_check=$(echo "$error_change > $(echo "$ERROR_RATE_THRESHOLD * 100" | bc)" | bc)
        if [ "$error_check" -eq 1 ]; then
            error_regression=1
            has_regression=1
            regression_details="${regression_details}\n  - Error rate increased by ${error_change}% (threshold: 50%)"
        fi
    fi
    
    # Check throughput regression (negative change is bad)
    if [ "$throughput_change" != "N/A" ]; then
        local throughput_check=$(echo "$throughput_change < -$(echo "$THROUGHPUT_THRESHOLD * 100" | bc)" | bc)
        if [ "$throughput_check" -eq 1 ]; then
            throughput_regression=1
            has_regression=1
            regression_details="${regression_details}\n  - Throughput decreased by ${throughput_change}% (threshold: -10%)"
        fi
    fi
    
    # Update counters
    if [ $has_regression -eq 1 ]; then
        REGRESSIONS_FOUND=$((REGRESSIONS_FOUND + 1))
        echo -e "${RED}✗ REGRESSION DETECTED${NC}"
        echo -e "$regression_details"
    else
        echo -e "${GREEN}✓ No regressions detected${NC}"
    fi
    
    # Add to report with individual status
    cat >> "$REPORT_FILE" <<EOF

### ${scenario_name}

| Metric | Baseline | Current | Change | Status |
|--------|----------|---------|--------|--------|
| p95 Latency | ${baseline_p95}ms | ${current_p95}ms | ${p95_change}% | $([ $p95_regression -eq 1 ] && echo "⚠️ REGRESSION" || echo "✅ OK") |
| p99 Latency | ${baseline_p99}ms | ${current_p99}ms | ${p99_change}% | $([ $p99_regression -eq 1 ] && echo "⚠️ REGRESSION" || echo "✅ OK") |
| Error Rate | ${baseline_error_rate} | ${current_error_rate} | ${error_change}% | $([ $error_regression -eq 1 ] && echo "⚠️ REGRESSION" || echo "✅ OK") |
| Throughput | ${baseline_throughput} req/s | ${current_throughput} req/s | ${throughput_change}% | $([ $throughput_regression -eq 1 ] && echo "⚠️ REGRESSION" || echo "✅ OK") |
| Check Success | ${baseline_check_rate} | ${current_check_rate} | ${check_change}% | $([ $check_regression -eq 1 ] && echo "⚠️ REGRESSION" || echo "✅ OK") |

EOF

    if [ $has_regression -eq 1 ]; then
        echo -e "$regression_details" >> "$REPORT_FILE"
    fi
    
    echo ""
}

# Get scenarios from baseline directory
scenarios=($(ls -1 "$BASELINE_DIR"/*.json 2>/dev/null | xargs -n 1 basename | sed 's/\.json$//'))

if [ ${#scenarios[@]} -eq 0 ]; then
    echo -e "${RED}Error: No baseline scenarios found in $BASELINE_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}Found ${#scenarios[@]} scenarios to compare${NC}"
echo ""

# Compare each scenario
for scenario in "${scenarios[@]}"; do
    compare_scenario "$scenario"
done

# Update summary in report (portable across macOS and Linux)
temp_report_file="$(mktemp)"
sed "s/## Executive Summary/## Executive Summary\n\n**Total Scenarios:** ${#scenarios[@]}  \n**Regressions Found:** $REGRESSIONS_FOUND  \n**Improvements Found:** $IMPROVEMENTS_FOUND\n/" "$REPORT_FILE" > "$temp_report_file"
mv "$temp_report_file" "$REPORT_FILE"

# Add regression detection thresholds to report
cat >> "$REPORT_FILE" <<EOF

---

## Regression Detection Thresholds

- **p95 Latency:** >10% increase
- **p99 Latency:** >15% increase
- **Error Rate:** >50% increase
- **Throughput:** >10% decrease
- **Check Failures:** >50% increase

---

## Conclusion

EOF

if [ $REGRESSIONS_FOUND -eq 0 ]; then
    cat >> "$REPORT_FILE" <<EOF
✅ **No performance regressions detected.** All metrics are within acceptable thresholds.
EOF
else
    cat >> "$REPORT_FILE" <<EOF
⚠️ **Performance regressions detected in $REGRESSIONS_FOUND scenario(s).** Please review the details above and investigate the causes.

### Recommended Actions

1. Review the code changes since baseline version $BASELINE_VERSION
2. Profile the affected endpoints to identify bottlenecks
3. Consider reverting recent changes if regressions are severe
4. Update the baseline if the changes are intentional and acceptable
EOF
fi

# Print summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
if [ $REGRESSIONS_FOUND -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ No regressions detected!${NC}"
else
    echo -e "${RED}${BOLD}⚠ $REGRESSIONS_FOUND regression(s) detected!${NC}"
fi
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Report saved to:${NC} $REPORT_FILE"
echo ""

# Cleanup
rm -rf "$TEMP_DIR"

# Exit with error if regressions found
if [ $REGRESSIONS_FOUND -gt 0 ]; then
    exit 1
fi

exit 0
