#!/bin/bash
# Frontend Playwright E2E Test Runner
# Similar structure to backend/run-tests-verbose.sh
# Runs Playwright E2E tests with verbose output and helpful debugging info

set -e

# Load E2E environment configuration if it exists
if [ -f ".env.e2e" ]; then
    source ".env.e2e"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BROWSERS="chromium"
HEADED=false
REPORT=true
STOP_ON_FAILURE=false
DEBUG=false
VERBOSE=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --browsers)
            BROWSERS="$2"
            shift 2
            ;;
        --headed)
            HEADED=true
            shift
            ;;
        --no-report)
            REPORT=false
            shift
            ;;
        --stop-on-failure)
            STOP_ON_FAILURE=true
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        --quiet)
            VERBOSE=false
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Print header
if [ "$VERBOSE" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎭 Playwright E2E Test Runner"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

# Check prerequisites
if [ "$VERBOSE" = true ]; then
    echo -e "${CYAN}📋 Checking prerequisites...${NC}"
fi

# Check if playwright is installed
if ! command -v npx &> /dev/null || ! npx playwright --version &>/dev/null; then
    echo -e "${RED}✗ Playwright not found${NC}"
    echo "Install with: npm install @playwright/test"
    exit 1
fi

# Check if we have a playwright.config.ts
if [ ! -f "playwright.config.ts" ]; then
    echo -e "${RED}✗ playwright.config.ts not found${NC}"
    echo "E2E tests require a Playwright configuration file"
    exit 1
fi

# Check base URL availability
if [ "$VERBOSE" = true ]; then
    echo "  Checking base URL (http://localhost:3000)..."
fi
BASE_URL="http://localhost:3000"
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    if [ "$VERBOSE" = true ]; then
        echo -e "${YELLOW}⚠ Frontend not running at $BASE_URL${NC}"
        echo "  (Tests will timeout if frontend is not accessible)"
    fi
fi

# Check backend API if needed
if grep -q "api" e2e/*.spec.ts 2>/dev/null || grep -q "localhost:8080" playwright.config.ts 2>/dev/null; then
    if [ "$VERBOSE" = true ]; then
        echo "  Checking backend API (http://localhost:8080)..."
    fi
    BACKEND_URL="http://localhost:8080"
    if ! curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Backend API not running at $BACKEND_URL${NC}"
        echo "  E2E tests may fail if backend is not available"
        echo "  Start with: make docker-dev-build && make docker-dev"
    fi
fi

if [ "$VERBOSE" = true ]; then
    echo -e "${GREEN}✓ Prerequisites check complete${NC}"
    echo ""
fi

# Build Playwright command
COMMAND="npx playwright test"

# Add browsers if specified
if [ ! -z "$BROWSERS" ]; then
    COMMAND="$COMMAND --project=$BROWSERS"
fi

# Add headed mode
if [ "$HEADED" = true ]; then
    COMMAND="$COMMAND --headed"
fi

# Add debug mode
if [ "$DEBUG" = true ]; then
    COMMAND="$COMMAND --debug"
fi

# Always use verbose reporter
COMMAND="$COMMAND --reporter=list"

# Print test configuration
if [ "$VERBOSE" = true ]; then
    echo -e "${CYAN}⚙️  Test Configuration${NC}"
    echo "  Browsers: $BROWSERS"
    echo "  Headed: $HEADED"
    echo "  Debug: $DEBUG"
    echo "  Report: $REPORT"
    echo "  Stop on Failure: $STOP_ON_FAILURE"
    echo ""
    echo -e "${CYAN}📦 Test Modes${NC}"
    echo "  CDN Failover:    ${E2E_CDN_FAILOVER_MODE:-false}"
    echo "  Search Failover: ${E2E_FAILOVER_MODE:-false}"
    echo "  Stripe Test:     ${E2E_STRIPE_TEST_MODE:-false}"
    echo ""
    echo -e "${CYAN}📝 Running command:${NC}"
    echo "  $COMMAND"
    echo ""
fi

# Run the tests
if [ "$VERBOSE" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

TEST_START=$(date +%s)
eval "$COMMAND"
TEST_RESULT=$?
TEST_END=$(date +%s)
TEST_DURATION=$((TEST_END - TEST_START))

if [ "$VERBOSE" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

# Report results
if [ $TEST_RESULT -eq 0 ]; then
    if [ "$VERBOSE" = true ]; then
        echo -e "${GREEN}✓ All Playwright tests passed!${NC}"
        echo -e "  Duration: ${TEST_DURATION}s"
    fi
else
    if [ "$VERBOSE" = true ]; then
        echo -e "${RED}✗ Some Playwright tests failed${NC}"
        echo -e "  Duration: ${TEST_DURATION}s"
    fi
fi

# Show report
if [ "$REPORT" = true ] && [ "$VERBOSE" = true ]; then
    if [ -d "playwright-report" ]; then
        echo ""
        echo -e "${CYAN}📊 Test Report${NC}"
        echo "  View with: npx playwright show-report"
        echo "  Or open: open playwright-report/index.html"
    fi
fi

# Additional debugging info on failure
if [ $TEST_RESULT -ne 0 ]; then
    if [ "$VERBOSE" = true ]; then
        echo ""
        echo -e "${YELLOW}💡 Debugging Tips${NC}"
        echo "  • Run with --headed to see browser"
        echo "  • Run with --debug for debugging UI"
        echo "  • Check playwright-report/ for detailed results"
        echo "  • Run: npx playwright show-report"
        echo ""
        echo -e "${CYAN}Useful Commands${NC}"
        echo "  Debug mode:     bash $0 --debug"
        echo "  Headed mode:    bash $0 --headed"
        echo "  With UI:        npm run test:e2e:ui"
        echo "  Show report:    npx playwright show-report"
    fi
fi

echo ""
exit $TEST_RESULT
