#!/bin/bash

# Run Go tests package by package with verbose output, stopping on first error

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse flags
INTEGRATION=${INTEGRATION:-0}
E2E=${E2E:-0}
SETUP_ENV=${SETUP_ENV:-1}  # Default to setting up environment

# Setup test environment if requested
if [ "$SETUP_ENV" = "1" ]; then
    echo -e "${BLUE}Setting up test environment...${NC}"

    # Check if setup script exists and run it
    if [ -f "./setup-test-env.sh" ]; then
        bash ./setup-test-env.sh
        # Source the generated .env.test file
        if [ -f "./.env.test" ]; then
            set -a
            source ./.env.test
            set +a
            echo -e "${GREEN}✓ Test environment loaded${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ setup-test-env.sh not found, using existing environment${NC}"
    fi
    echo ""
fi

echo "Finding test packages..."
echo "INTEGRATION=${INTEGRATION}, E2E=${E2E}"
echo ""

# Find all unique package directories containing test files
test_packages=$(find . -name "*_test.go" -type f -exec dirname {} \; | sort -u)

# Categorize packages
unit_packages=()
integration_packages=()
e2e_packages=()

for pkg in $test_packages; do
    # Check if package has integration or e2e tests
    has_integration=$(find "$pkg" -maxdepth 1 -name "*integration_test.go" -o -name "*_integration_test.go" 2>/dev/null | wc -l)
    has_e2e=$(find "$pkg" -maxdepth 1 -name "*e2e_test.go" -o -name "*_e2e_test.go" 2>/dev/null | wc -l)

    if [ "$has_e2e" -gt 0 ]; then
        e2e_packages+=("$pkg")
    elif [ "$has_integration" -gt 0 ]; then
        integration_packages+=("$pkg")
    else
        unit_packages+=("$pkg")
    fi
done

# Determine which tests to run
packages_to_run=()

# Always run unit tests
packages_to_run+=("${unit_packages[@]}")

if [ "$INTEGRATION" = "1" ]; then
    packages_to_run+=("${integration_packages[@]}")
fi

if [ "$E2E" = "1" ]; then
    packages_to_run+=("${e2e_packages[@]}")
fi

total=${#packages_to_run[@]}
current=0
passed=0
failed=0

echo -e "${YELLOW}Running ${total} test packages...${NC}"
echo ""

for pkg in "${packages_to_run[@]}"; do
    current=$((current + 1))

    echo -e "${YELLOW}[${current}/${total}]${NC} Testing package: ${GREEN}${pkg}${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Determine build tags based on test type
    tags=""
    if echo "$pkg" | grep -q "integration"; then
        tags="-tags=integration"
    elif echo "$pkg" | grep -q "e2e"; then
        tags="-tags=e2e"
    fi

    # Run the test with verbose output and appropriate tags
    if go test -v -count=1 $tags "$pkg"; then
        passed=$((passed + 1))
        echo -e "${GREEN}✓ PASSED${NC}"
        echo ""
    else
        failed=$((failed + 1))
        echo -e "${RED}✗ FAILED${NC}"
        echo ""
        echo -e "${RED}Test failed in package: ${pkg}${NC}"
        echo -e "${YELLOW}Summary: ${passed} passed, ${failed} failed out of ${current}/${total} packages${NC}"
        exit 1
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}All tests passed!${NC}"
echo -e "${YELLOW}Summary: ${passed} passed, ${failed} failed out of ${total} packages${NC}"
