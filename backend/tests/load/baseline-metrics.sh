#!/bin/bash
# Baseline Metrics Collection Script
# This script helps capture baseline performance metrics from K6 load tests
# 
# Usage: ./baseline-metrics.sh [scenario_name]
# Example: ./baseline-metrics.sh feed_browsing

set -e

SCENARIO=${1:-"all"}
RESULTS_DIR="backend/tests/load/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory if it doesn't exist
mkdir -p "$RESULTS_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}K6 Baseline Metrics Collection${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${YELLOW}Error: k6 is not installed${NC}"
    echo "Install it with: brew install k6 (macOS)"
    echo "Or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if backend is running
echo -e "${BLUE}Checking if backend is running...${NC}"
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo -e "${YELLOW}Warning: Backend is not responding at http://localhost:8080${NC}"
    echo "Please start the backend with: make backend-dev"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Function to run a scenario and save results
run_scenario() {
    local scenario_name=$1
    local scenario_file="backend/tests/load/scenarios/${scenario_name}.js"
    
    if [ ! -f "$scenario_file" ]; then
        echo -e "${YELLOW}Scenario file not found: $scenario_file${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Running scenario: ${scenario_name}${NC}"
    echo "================================================================"
    
    local output_file="${RESULTS_DIR}/${scenario_name}_${TIMESTAMP}.json"
    local summary_file="${RESULTS_DIR}/${scenario_name}_${TIMESTAMP}_summary.txt"
    
    # Run k6 with JSON output
    k6 run --out json="$output_file" "$scenario_file" | tee "$summary_file"
    
    echo ""
    echo -e "${GREEN}✓ Results saved to:${NC}"
    echo "  - JSON: $output_file"
    echo "  - Summary: $summary_file"
    echo ""
}

# Run scenarios based on input
if [ "$SCENARIO" = "all" ]; then
    echo -e "${BLUE}Running all scenarios...${NC}"
    echo ""
    
    scenarios=(
        "feed_browsing"
        "clip_detail"
        "search"
        "comments"
        "mixed_behavior"
    )
    
    for scenario in "${scenarios[@]}"; do
        run_scenario "$scenario"
        echo "Waiting 10 seconds before next scenario..."
        sleep 10
    done
else
    run_scenario "$SCENARIO"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Baseline metrics collection complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Results are saved in: $RESULTS_DIR"
echo ""
echo "To generate a metrics report, run:"
echo "  ./scripts/generate-metrics-report.sh"
