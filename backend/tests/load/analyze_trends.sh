#!/bin/bash

# Load Test Trend Analysis Script
# Analyzes historical load test results from JSON outputs
# Usage: ./analyze_trends.sh <directory_with_json_files>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Check if bc is installed
if ! command -v bc &> /dev/null; then
    echo -e "${RED}Error: bc is not installed${NC}"
    echo "Install with: brew install bc (macOS) or apt-get install bc (Linux)"
    exit 1
fi

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <directory_with_json_files>"
    echo ""
    echo "This script analyzes K6 load test JSON outputs to show trends over time."
    echo ""
    echo "Example:"
    echo "  1. Download load test artifacts from GitHub Actions"
    echo "  2. Extract JSON files to a directory"
    echo "  3. Run: $0 ./load-test-results"
    exit 1
fi

RESULTS_DIR="$1"

if [ ! -d "$RESULTS_DIR" ]; then
    echo -e "${RED}Error: Directory not found: $RESULTS_DIR${NC}"
    exit 1
fi

# Find all JSON files
JSON_FILES=$(find "$RESULTS_DIR" -name "*.json" -type f | sort)

if [ -z "$JSON_FILES" ]; then
    echo -e "${RED}Error: No JSON files found in $RESULTS_DIR${NC}"
    exit 1
fi

FILE_COUNT=$(echo "$JSON_FILES" | wc -l | tr -d ' ')

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           K6 Load Test Trend Analysis${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Analyzing $FILE_COUNT test result file(s) from: $RESULTS_DIR"
echo ""

# Initialize summary arrays
declare -A p95_values
declare -A p99_values
declare -A error_rates
declare -A throughput
declare -A check_rates

# Function to extract metrics from JSON
extract_metrics() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo -e "${YELLOW}Processing: $filename${NC}"
    
    # Check if file is valid JSON
    if ! jq empty "$file" 2>/dev/null; then
        echo -e "${RED}  ✗ Invalid JSON, skipping${NC}"
        return
    fi
    
    # Extract key metrics
    local p95=$(jq -r '.metrics.http_req_duration.values.["p(95)"] // "N/A"' "$file")
    local p99=$(jq -r '.metrics.http_req_duration.values.["p(99)"] // "N/A"' "$file")
    local error_rate=$(jq -r '.metrics.http_req_failed.values.rate // "N/A"' "$file")
    local reqs=$(jq -r '.metrics.http_reqs.values.rate // "N/A"' "$file")
    local checks=$(jq -r '.metrics.checks.values.rate // "N/A"' "$file")
    
    echo "  p95: ${p95}ms | p99: ${p99}ms | Error Rate: ${error_rate} | RPS: ${reqs}"
    
    # Store values
    p95_values["$filename"]=$p95
    p99_values["$filename"]=$p99
    error_rates["$filename"]=$error_rate
    throughput["$filename"]=$reqs
    check_rates["$filename"]=$checks
}

# Process all files
for file in $JSON_FILES; do
    extract_metrics "$file"
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    Summary Report${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to calculate average (simple approach)
calculate_stats() {
    local metric_name="$1"
    shift
    local -a values=("$@")
    
    local sum=0
    local count=0
    local min=999999
    local max=0
    
    for val in "${values[@]}"; do
        if [ "$val" != "N/A" ] && [ -n "$val" ]; then
            sum=$(echo "$sum + $val" | bc -l)
            count=$((count + 1))
            
            # Update min/max
            if (( $(echo "$val < $min" | bc -l) )); then
                min=$val
            fi
            if (( $(echo "$val > $max" | bc -l) )); then
                max=$val
            fi
        fi
    done
    
    if [ $count -gt 0 ]; then
        local avg=$(echo "scale=2; $sum / $count" | bc -l)
        echo -e "${metric_name}:"
        echo "  Average: $avg"
        echo "  Min: $min"
        echo "  Max: $max"
    else
        echo -e "${metric_name}: No valid data"
    fi
    echo ""
}

# Calculate and display statistics
echo "Response Time Statistics (ms):"
echo "────────────────────────────────"
calculate_stats "  p95" "${p95_values[@]}"
calculate_stats "  p99" "${p99_values[@]}"

echo "Error Rate Statistics:"
echo "────────────────────────────────"
calculate_stats "  Error Rate" "${error_rates[@]}"

echo "Throughput Statistics (req/s):"
echo "────────────────────────────────"
calculate_stats "  Requests/Second" "${throughput[@]}"

# Identify trends
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    Trend Analysis${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Compare first and last results if we have multiple files
if [ $FILE_COUNT -gt 1 ]; then
    FIRST_FILE=$(echo "$JSON_FILES" | head -1)
    LAST_FILE=$(echo "$JSON_FILES" | tail -1)
    
    FIRST_P95=${p95_values[$(basename "$FIRST_FILE")]}
    LAST_P95=${p95_values[$(basename "$LAST_FILE")]}
    
    if [ "$FIRST_P95" != "N/A" ] && [ "$LAST_P95" != "N/A" ]; then
        DIFF=$(echo "$LAST_P95 - $FIRST_P95" | bc -l)
        PERCENT=$(echo "scale=1; ($DIFF / $FIRST_P95) * 100" | bc -l)
        
        echo "p95 Response Time Change:"
        if (( $(echo "$DIFF > 0" | bc -l) )); then
            echo -e "  ${RED}↑ Increased by ${DIFF}ms (${PERCENT}%)${NC}"
        elif (( $(echo "$DIFF < 0" | bc -l) )); then
            echo -e "  ${GREEN}↓ Decreased by ${DIFF#-}ms (${PERCENT#-}%)${NC}"
        else
            echo -e "  ${GREEN}→ No change${NC}"
        fi
    fi
    
    FIRST_ERROR=${error_rates[$(basename "$FIRST_FILE")]}
    LAST_ERROR=${error_rates[$(basename "$LAST_FILE")]}
    
    if [ "$FIRST_ERROR" != "N/A" ] && [ "$LAST_ERROR" != "N/A" ]; then
        ERROR_DIFF=$(echo "$LAST_ERROR - $FIRST_ERROR" | bc -l)
        
        echo ""
        echo "Error Rate Change:"
        if (( $(echo "$ERROR_DIFF > 0" | bc -l) )); then
            echo -e "  ${RED}↑ Increased by ${ERROR_DIFF}${NC}"
        elif (( $(echo "$ERROR_DIFF < 0" | bc -l) )); then
            echo -e "  ${GREEN}↓ Decreased by ${ERROR_DIFF#-}${NC}"
        else
            echo -e "  ${GREEN}→ No change${NC}"
        fi
    fi
else
    echo "Only one result file found. Need multiple files for trend analysis."
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "For detailed analysis, consider:"
echo "  - Viewing results in Grafana dashboard"
echo "  - Comparing reports from different time periods"
echo "  - Looking at individual scenario breakdowns"
echo ""
echo "Dashboard: https://clpr.tv/grafana → K6 Load Test Trends"
echo ""
