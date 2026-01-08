#!/bin/bash
# Test script for deployment automation features

set -e

echo "=== Testing Deployment Automation Features ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASSED=$((PASSED + 1))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
}

# Test 1: Validate shell script syntax
echo "[1/5] Testing shell script syntax..."
if bash -n scripts/blue-green-deploy.sh 2>/dev/null; then
    test_pass "blue-green-deploy.sh syntax valid"
else
    test_fail "blue-green-deploy.sh syntax invalid"
fi

if bash -n scripts/validate-hardening.sh 2>/dev/null; then
    test_pass "validate-hardening.sh syntax valid"
else
    test_fail "validate-hardening.sh syntax invalid"
fi

if bash -n backend/tests/load/run_all_benchmarks.sh 2>/dev/null; then
    test_pass "run_all_benchmarks.sh syntax valid"
else
    test_fail "run_all_benchmarks.sh syntax invalid"
fi
echo ""

# Test 2: Check that TODOs are removed from modified sections
echo "[2/5] Checking for TODO comments in modified sections..."
TODO_COUNT=$(grep -n "TODO" scripts/blue-green-deploy.sh backend/tests/load/run_all_benchmarks.sh scripts/validate-hardening.sh 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -eq 0 ]; then
    test_pass "No TODO comments found in deployment automation scripts"
else
    test_fail "Found $TODO_COUNT TODO comment(s) in deployment automation scripts"
    grep -n "TODO" scripts/blue-green-deploy.sh backend/tests/load/run_all_benchmarks.sh scripts/validate-hardening.sh 2>/dev/null || true
fi
echo ""

# Test 3: Test migration function exists and is implemented
echo "[3/5] Testing migration function implementation..."
if grep -A3 "docker run" scripts/blue-green-deploy.sh | grep -q "migrate/migrate"; then
    test_pass "Migration execution implemented using golang-migrate"
else
    test_fail "Migration execution not properly implemented"
fi

if grep -q "pg_isready" scripts/blue-green-deploy.sh; then
    test_pass "Pre-flight database validation implemented"
else
    test_fail "Pre-flight database validation not found"
fi
echo ""

# Test 4: Test k6 metrics extraction function
echo "[4/5] Testing k6 metrics extraction..."

# Create test data
mkdir -p /tmp/k6-test-deployment
cat > /tmp/k6-test-deployment/test.log << 'EOFLOG'
p50: 18.23ms (target: <20ms) ✓
p95: 67.45ms (target: <75ms) ✓
p99: 142.89ms (target: <150ms) ✓
Error Rate: 0.32% (target: <0.5%) ✓
Throughput: 52.34 RPS (target: >50 RPS) ✓
Cache Hit Rate: 73.21% (target: >70%) ✓
EOFLOG

# Extract the function and test it
# Set error handling to match the parent script behavior
set -euo pipefail
source <(sed -n '/^extract_k6_metrics/,/^}/p' backend/tests/load/run_all_benchmarks.sh)
result=$(extract_k6_metrics "/tmp/k6-test-deployment/nonexistent.json" "/tmp/k6-test-deployment/test.log")

if [[ "$result" == *"18.23ms"* ]] && [[ "$result" == *"67.45ms"* ]]; then
    test_pass "k6 metrics extraction working correctly"
else
    test_fail "k6 metrics extraction failed: $result"
fi

# Cleanup
rm -rf /tmp/k6-test-deployment
echo ""

# Test 5: Test password validation function
echo "[5/5] Testing password validation..."

if grep -q "validate_env_placeholders" scripts/validate-hardening.sh; then
    test_pass "Password validation function defined"
else
    test_fail "Password validation function not found"
fi

if grep -q "CHANGEME" scripts/validate-hardening.sh; then
    test_pass "CHANGEME placeholder validation implemented"
else
    test_fail "CHANGEME placeholder validation not found"
fi

# Check for exclude patterns to avoid false positives
if grep -q "EXPIRY\|TTL\|TIMEOUT" scripts/validate-hardening.sh; then
    test_pass "False positive filtering implemented"
else
    test_fail "False positive filtering not found"
fi
echo ""

# Summary
echo "=== Test Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
