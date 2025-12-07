#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
TIMEOUT="${TIMEOUT:-10}"
VERBOSE="${VERBOSE:-false}"

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

echo -e "${BLUE}=== Clipper Smoke Tests ===${NC}"
echo "Backend URL: $BACKEND_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Function to print colored messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Function to run a smoke test
run_test() {
    local test_name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    local method=${4:-GET}
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_test "$test_name"
    
    local url="${BACKEND_URL}${endpoint}"
    local response_code
    
    if command -v curl >/dev/null 2>&1; then
        response_code=$(curl -s -o /dev/null -w "%{http_code}" -m "$TIMEOUT" -X "$method" "$url" 2>/dev/null || echo "000")
    else
        log_error "curl is not available"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    if [ "$response_code" = "$expected_status" ]; then
        log_info "✓ $test_name passed (HTTP $response_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "✗ $test_name failed (expected HTTP $expected_status, got HTTP $response_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to test JSON response
test_json_response() {
    local test_name=$1
    local endpoint=$2
    local json_field=$3
    local expected_value=$4
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_test "$test_name"
    
    local url="${BACKEND_URL}${endpoint}"
    local response
    
    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s -m "$TIMEOUT" "$url" 2>/dev/null || echo "{}")
    else
        log_error "curl is not available"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Check if jq is available for JSON parsing
    if command -v jq >/dev/null 2>&1; then
        local actual_value=$(echo "$response" | jq -r "$json_field" 2>/dev/null || echo "null")
        
        if [ "$actual_value" = "$expected_value" ]; then
            log_info "✓ $test_name passed (field: $json_field = $expected_value)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            log_error "✗ $test_name failed (expected $expected_value, got $actual_value)"
            if [ "$VERBOSE" = "true" ]; then
                echo "Response: $response"
            fi
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    else
        # Fallback: simple grep-based check
        if echo "$response" | grep -q "\"$json_field\".*\"$expected_value\""; then
            log_info "✓ $test_name passed (contains expected value)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            log_error "✗ $test_name failed"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    fi
}

# Function to test response time
test_response_time() {
    local test_name=$1
    local endpoint=$2
    local max_time_ms=$3
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_test "$test_name"
    
    local url="${BACKEND_URL}${endpoint}"
    local response_time
    
    if command -v curl >/dev/null 2>&1; then
        response_time=$(curl -s -o /dev/null -w "%{time_total}" -m "$TIMEOUT" "$url" 2>/dev/null || echo "999")
        # Convert to milliseconds
        response_time_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "999999")
        response_time_ms=${response_time_ms%.*} # Remove decimal
        
        if [ "$response_time_ms" -lt "$max_time_ms" ]; then
            log_info "✓ $test_name passed (${response_time_ms}ms < ${max_time_ms}ms)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            log_error "✗ $test_name failed (${response_time_ms}ms >= ${max_time_ms}ms)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    else
        log_error "curl is not available"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Run smoke tests
echo -e "${BLUE}Running smoke tests...${NC}"
echo ""

# Basic health checks
run_test "Basic Health Check" "/health" 200
run_test "Readiness Probe" "/health/ready" 200
run_test "Liveness Probe" "/health/live" 200

# API endpoints
run_test "API Ping" "/api/v1/ping" 200

# Test API response structure
test_json_response "Health Status Field" "/health" ".status" "ok"

# Test response times (should be fast)
if command -v bc >/dev/null 2>&1; then
    test_response_time "Health Response Time" "/health" 1000
    test_response_time "API Ping Response Time" "/api/v1/ping" 1000
else
    log_warn "bc not available, skipping response time tests"
fi

# API v1 endpoints (expect various status codes)
run_test "Clips Endpoint Exists" "/api/v1/clips" 200
run_test "Search Endpoint Exists" "/api/v1/search" 200
run_test "Tags Endpoint Exists" "/api/v1/tags" 200

# Protected endpoints (should return 401 when not authenticated)
run_test "Protected Submit Endpoint" "/api/v1/submit" 401 POST
run_test "Protected Favorites Endpoint" "/api/v1/favorites" 401

# Test error handling (404 for non-existent endpoints)
run_test "404 for Non-existent Endpoint" "/api/v1/nonexistent" 404

echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total Tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All smoke tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some smoke tests failed${NC}"
    exit 1
fi
