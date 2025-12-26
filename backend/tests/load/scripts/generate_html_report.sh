#!/bin/bash

# HTML Report Generation Script using xk6-reporter
# This script builds a custom k6 binary with xk6-reporter extension
# and provides functions to run tests with HTML output
#
# Usage: ./generate_html_report.sh [scenario_name]
# Example: ./generate_html_report.sh feed_browsing
# Example: ./generate_html_report.sh all

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_TEST_DIR="$(dirname "$SCRIPT_DIR")"
K6_BINARY="${LOAD_TEST_DIR}/k6-with-reporter"
REPORT_DIR="${LOAD_TEST_DIR}/reports"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           K6 HTML Report Generator${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to check if custom k6 binary exists
check_k6_binary() {
    if [ -f "$K6_BINARY" ]; then
        echo -e "${GREEN}✓ Custom k6 binary found${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Custom k6 binary not found${NC}"
        return 1
    fi
}

# Function to build custom k6 with xk6-reporter
build_k6_with_reporter() {
    echo -e "${BLUE}Building custom k6 with xk6-reporter...${NC}"
    
    # Check if Go is installed
    if ! command -v go &> /dev/null; then
        echo -e "${RED}Error: Go is not installed${NC}"
        echo "Please install Go: https://golang.org/doc/install"
        exit 1
    fi
    
    # Check if xk6 is installed
    if ! command -v xk6 &> /dev/null; then
        echo -e "${YELLOW}Installing xk6...${NC}"
        go install go.k6.io/xk6/cmd/xk6@latest
        
        # Add GOPATH/bin to PATH if not already there
        export PATH="$PATH:$(go env GOPATH)/bin"
        
        if ! command -v xk6 &> /dev/null; then
            echo -e "${RED}Error: Failed to install xk6${NC}"
            echo "Please ensure \$(go env GOPATH)/bin is in your PATH"
            exit 1
        fi
    fi
    
    echo -e "${CYAN}Building k6 with xk6-reporter extension...${NC}"
    cd "$LOAD_TEST_DIR"
    
    # Pin to a specific version for security and reproducibility
    # Version 2.3.0 released 2023-01-04, commit hash: 73ffd3a
    # Periodically review and update this pinned version
    local K6_REPORTER_VERSION="v2.3.0"
    
    # Build k6 with reporter extension (pinned version)
    xk6 build --with "github.com/benc-uk/k6-reporter@${K6_REPORTER_VERSION}" --output "$K6_BINARY"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Custom k6 binary built successfully${NC}"
        chmod +x "$K6_BINARY"
    else
        echo -e "${RED}✗ Failed to build custom k6 binary${NC}"
        exit 1
    fi
    
    echo ""
}

# Function to run a scenario with HTML report
run_scenario_with_html() {
    local scenario_name=$1
    local scenario_file="${LOAD_TEST_DIR}/scenarios/${scenario_name}.js"
    
    if [ ! -f "$scenario_file" ]; then
        echo -e "${RED}Error: Scenario not found: $scenario_file${NC}"
        return 1
    fi
    
    mkdir -p "$REPORT_DIR"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local json_report="${REPORT_DIR}/${scenario_name}_${timestamp}.json"
    
    echo -e "${CYAN}Running: ${scenario_name}${NC}"
    
    # Note: HTML report generation requires the scenario to have a handleSummary function
    # that uses the simpleHtmlReport() from config/html-reporter.js
    # See scenarios/example_with_html.js for an example
    
    # Run k6 with JSON output
    "$K6_BINARY" run \
        --out json="$json_report" \
        "$scenario_file" \
        2>&1 | tee "${REPORT_DIR}/${scenario_name}_${timestamp}.log"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Test completed${NC}"
        echo -e "  JSON: $json_report"
        
        # Check if HTML was generated (by handleSummary in the scenario)
        local html_pattern="${REPORT_DIR}/${scenario_name}_*.html"
        if compgen -G "$html_pattern" > /dev/null; then
            echo -e "  HTML: $html_pattern"
        else
            echo -e "${YELLOW}  Note: No HTML report generated. Add handleSummary() to scenario to enable HTML.${NC}"
        fi
    else
        echo -e "${RED}✗ Test failed${NC}"
    fi
    
    echo ""
}

# Main execution
SCENARIO=${1:-"all"}

# Check or build k6 binary
if ! check_k6_binary; then
    echo -e "${YELLOW}Building custom k6 binary with xk6-reporter...${NC}"
    build_k6_with_reporter
fi

echo -e "${BLUE}Using k6 binary: $K6_BINARY${NC}"
echo ""

# Run scenarios
if [ "$SCENARIO" = "all" ]; then
    echo -e "${BLUE}Running all scenarios with HTML reports...${NC}"
    echo ""
    
    scenarios=(
        "feed_browsing"
        "clip_detail"
        "search"
        "comments"
        "authentication"
        "submit"
        "mixed_behavior"
    )
    
    for scenario in "${scenarios[@]}"; do
        run_scenario_with_html "$scenario"
        sleep 5  # Wait between scenarios
    done
else
    run_scenario_with_html "$SCENARIO"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}HTML report generation complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Reports saved to: $REPORT_DIR${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Open HTML reports in your browser"
echo "  2. Review performance metrics and trends"
echo "  3. Compare with baseline metrics"
echo ""
