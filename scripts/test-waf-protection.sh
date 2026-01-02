#!/bin/bash
# WAF Protection Security Test Script
# Tests SQLi, XSS, path traversal, and other WAF protections
# Usage: ./test-waf-protection.sh [base_url]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost}"
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
test_case() {
    TOTAL=$((TOTAL + 1))
    echo -e "\n${YELLOW}Test $TOTAL: $1${NC}"
}

expect_block() {
    local url="$1"
    local description="$2"
    
    echo "  Testing: $description"
    echo "  URL: $url"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "403" ] || [ "$response" = "405" ] || [ "$response" = "413" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} - Request blocked (HTTP $response)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC} - Request not blocked (HTTP $response, expected 403/405/413)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

expect_allow() {
    local url="$1"
    local description="$2"
    
    echo "  Testing: $description"
    echo "  URL: $url"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ] || [ "$response" = "404" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} - Request allowed (HTTP $response)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC} - Request incorrectly blocked (HTTP $response, expected 200/301/302/404)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "=================================================="
echo "WAF Protection Security Test Suite"
echo "=================================================="
echo "Target: $BASE_URL"
echo "Start time: $(date)"
echo "=================================================="

# SQL Injection Tests
test_case "SQL Injection - UNION SELECT"
expect_block "${BASE_URL}/api/v1/clips?id=1'%20UNION%20SELECT%20*%20FROM%20users--" "UNION SELECT injection"

test_case "SQL Injection - DROP TABLE"
expect_block "${BASE_URL}/api/v1/clips?id=1';%20DROP%20TABLE%20users--" "DROP TABLE injection"

test_case "SQL Injection - INSERT INTO"
expect_block "${BASE_URL}/api/v1/search?q=test'%20INSERT%20INTO%20users" "INSERT INTO injection"

test_case "SQL Injection - DELETE FROM"
expect_block "${BASE_URL}/api/v1/clips?sort=name%20DELETE%20FROM%20clips" "DELETE FROM injection"

# XSS Tests
test_case "XSS - Script Tag"
expect_block "${BASE_URL}/?q=<script>alert(1)</script>" "Script tag injection"

test_case "XSS - JavaScript Protocol"
expect_block "${BASE_URL}/?redirect=javascript:alert(1)" "JavaScript protocol"

test_case "XSS - Event Handler"
expect_block "${BASE_URL}/?q=<img%20src=x%20onerror=alert(1)>" "Event handler injection"

test_case "XSS - Iframe Injection"
expect_block "${BASE_URL}/?embed=<iframe%20src=evil.com></iframe>" "Iframe injection"

# Path Traversal Tests
test_case "Path Traversal - Unix"
expect_block "${BASE_URL}/api/v1/files?path=../../../etc/passwd" "Unix path traversal"

test_case "Path Traversal - Windows"
expect_block "${BASE_URL}/api/v1/files?path=..\\..\\..\\windows\\system32" "Windows path traversal"

test_case "Path Traversal - Direct"
expect_block "${BASE_URL}/../../etc/passwd" "Direct path traversal"

# User Agent Tests
test_case "Scanner - sqlmap"
response=$(curl -s -o /dev/null -w "%{http_code}" -A "sqlmap/1.0" "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$response" = "403" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} - sqlmap blocked (HTTP $response)"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗ FAIL${NC} - sqlmap not blocked (HTTP $response, expected 403)"
    FAILED=$((FAILED + 1))
fi

test_case "Scanner - nikto"
response=$(curl -s -o /dev/null -w "%{http_code}" -A "nikto/2.0" "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$response" = "403" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} - nikto blocked (HTTP $response)"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗ FAIL${NC} - nikto not blocked (HTTP $response, expected 403)"
    FAILED=$((FAILED + 1))
fi

test_case "Scanner - nmap"
response=$(curl -s -o /dev/null -w "%{http_code}" -A "nmap scripting engine" "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$response" = "403" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} - nmap blocked (HTTP $response)"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗ FAIL${NC} - nmap not blocked (HTTP $response, expected 403)"
    FAILED=$((FAILED + 1))
fi

# HTTP Method Tests
test_case "Invalid Method - TRACE"
response=$(curl -s -o /dev/null -w "%{http_code}" -X TRACE "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$response" = "405" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} - TRACE method blocked (HTTP $response)"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗ FAIL${NC} - TRACE method not blocked (HTTP $response, expected 405)"
    FAILED=$((FAILED + 1))
fi

# Request Size Tests (this requires generating large payloads)
test_case "Request Size - Oversized Request"
echo "  Note: This test creates a temporary 11MB file"
dd if=/dev/zero of=/tmp/waf-test-large.bin bs=1M count=11 2>/dev/null
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/octet-stream" \
    --data-binary @/tmp/waf-test-large.bin \
    "$BASE_URL/api/v1/upload" 2>/dev/null || echo "000")
rm -f /tmp/waf-test-large.bin

if [ "$response" = "413" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} - Large request blocked (HTTP $response)"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗ FAIL${NC} - Large request not blocked (HTTP $response, expected 413)"
    FAILED=$((FAILED + 1))
fi

# Legitimate Request Tests (should NOT be blocked)
test_case "Legitimate - Normal GET"
expect_allow "${BASE_URL}/" "Normal homepage request"

test_case "Legitimate - API Request"
expect_allow "${BASE_URL}/api/v1/clips" "Normal API request"

test_case "Legitimate - Search Query"
expect_allow "${BASE_URL}/api/v1/search?q=gaming" "Normal search query"

test_case "Legitimate - Numeric Parameter"
expect_allow "${BASE_URL}/api/v1/clips?id=123" "Numeric parameter"

# Results Summary
echo ""
echo "=================================================="
echo "Test Results Summary"
echo "=================================================="
echo -e "Total Tests: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo "End time: $(date)"
echo "=================================================="

# Exit with error if any tests failed
if [ $FAILED -gt 0 ]; then
    echo -e "\n${RED}WAF security tests FAILED${NC}"
    exit 1
else
    echo -e "\n${GREEN}All WAF security tests PASSED${NC}"
    exit 0
fi
