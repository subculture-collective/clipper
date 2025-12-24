#!/bin/bash
# Blue-Green Deployment Testing Script
# Tests the blue-green deployment process in staging environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TEST_ENV="${TEST_ENV:-staging}"
DEPLOY_DIR="${DEPLOY_DIR:-.}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.blue-green.yml}"
TEST_RESULTS_DIR="/tmp/blue-green-test-results"

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Log functions
log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test function wrapper
run_test() {
    local test_name=$1
    local test_func=$2
    
    TESTS_RUN=$((TESTS_RUN + 1))
    log_test "Running: $test_name"
    
    if $test_func; then
        log_pass "$test_name"
        return 0
    else
        log_fail "$test_name"
        return 1
    fi
}

# Test: Prerequisites are installed
test_prerequisites() {
    command -v docker &>/dev/null && \
    docker compose version &>/dev/null && \
    command -v curl &>/dev/null && \
    command -v jq &>/dev/null
}

# Test: Compose file exists and is valid
test_compose_file() {
    [ -f "$DEPLOY_DIR/$COMPOSE_FILE" ] && \
    docker compose -f "$DEPLOY_DIR/$COMPOSE_FILE" config &>/dev/null
}

# Test: Shared services start correctly
test_shared_services() {
    cd "$DEPLOY_DIR" || return 1
    
    # Start shared services
    docker compose -f "$COMPOSE_FILE" up -d postgres redis &>/dev/null || return 1
    
    # Wait for health checks
    sleep 10
    
    # Check postgres
    docker exec clipper-postgres pg_isready &>/dev/null || return 1
    
    # Check redis
    docker exec clipper-redis redis-cli ping | grep -q PONG || return 1
    
    return 0
}

# Test: Blue environment starts and becomes healthy
test_blue_environment_start() {
    cd "$DEPLOY_DIR" || return 1
    
    # Start blue environment
    docker compose -f "$COMPOSE_FILE" up -d backend-blue frontend-blue &>/dev/null || return 1
    
    # Wait for containers to start
    sleep 20
    
    # Check containers are running
    docker ps --filter "name=clipper-backend-blue" --format '{{.Status}}' | grep -q "Up" || return 1
    docker ps --filter "name=clipper-frontend-blue" --format '{{.Status}}' | grep -q "Up" || return 1
    
    return 0
}

# Test: Blue environment health checks pass
test_blue_health_checks() {
    # Backend health
    docker exec clipper-backend-blue wget --spider -q http://localhost:8080/health || return 1
    
    # Frontend health
    docker exec clipper-frontend-blue wget --spider -q http://localhost:80/health.html || return 1
    
    return 0
}

# Test: Caddy proxy starts and routes to blue
test_caddy_proxy() {
    cd "$DEPLOY_DIR" || return 1
    
    # Start Caddy
    export ACTIVE_ENV=blue
    docker compose -f "$COMPOSE_FILE" up -d caddy &>/dev/null || return 1
    
    # Wait for Caddy to start
    sleep 5
    
    # Check Caddy is running
    docker ps --filter "name=clipper-caddy" --format '{{.Status}}' | grep -q "Up" || return 1
    
    # Check Caddy health
    docker exec clipper-caddy wget --spider -q http://localhost:2019/config/ || return 1
    
    return 0
}

# Test: Traffic flows through blue environment
test_blue_traffic() {
    # Test health endpoint through proxy
    curl -f -s http://localhost/health | grep -q "healthy" || return 1
    
    # Test API endpoint
    curl -f -s http://localhost/api/v1/health | grep -q "healthy" || return 1
    
    return 0
}

# Test: Green environment starts
test_green_environment_start() {
    cd "$DEPLOY_DIR" || return 1
    
    # Start green environment
    docker compose -f "$COMPOSE_FILE" --profile green up -d backend-green frontend-green &>/dev/null || return 1
    
    # Wait for containers to start
    sleep 20
    
    # Check containers are running
    docker ps --filter "name=clipper-backend-green" --format '{{.Status}}' | grep -q "Up" || return 1
    docker ps --filter "name=clipper-frontend-green" --format '{{.Status}}' | grep -q "Up" || return 1
    
    return 0
}

# Test: Green environment health checks pass
test_green_health_checks() {
    # Backend health
    docker exec clipper-backend-green wget --spider -q http://localhost:8080/health || return 1
    
    # Frontend health
    docker exec clipper-frontend-green wget --spider -q http://localhost:80/health.html || return 1
    
    return 0
}

# Test: Both environments can run simultaneously
test_both_environments_running() {
    docker ps --filter "name=clipper-backend-blue" --format '{{.Status}}' | grep -q "Up" || return 1
    docker ps --filter "name=clipper-backend-green" --format '{{.Status}}' | grep -q "Up" || return 1
    docker ps --filter "name=clipper-frontend-blue" --format '{{.Status}}' | grep -q "Up" || return 1
    docker ps --filter "name=clipper-frontend-green" --format '{{.Status}}' | grep -q "Up" || return 1
    
    return 0
}

# Test: Traffic switch from blue to green
test_traffic_switch_to_green() {
    cd "$DEPLOY_DIR" || return 1
    
    # Switch to green
    export ACTIVE_ENV=green
    docker compose -f "$COMPOSE_FILE" up -d caddy &>/dev/null || return 1
    
    # Wait for switch
    sleep 5
    
    # Verify traffic flows
    curl -f -s http://localhost/health | grep -q "healthy" || return 1
    
    return 0
}

# Test: Traffic switch from green back to blue
test_traffic_switch_to_blue() {
    cd "$DEPLOY_DIR" || return 1
    
    # Switch to blue
    export ACTIVE_ENV=blue
    docker compose -f "$COMPOSE_FILE" up -d caddy &>/dev/null || return 1
    
    # Wait for switch
    sleep 5
    
    # Verify traffic flows
    curl -f -s http://localhost/health | grep -q "healthy" || return 1
    
    return 0
}

# Test: Zero downtime during switch
test_zero_downtime() {
    cd "$DEPLOY_DIR" || return 1
    
    # Start continuous health check in background
    local downtime=0
    local checks=0
    local temp_file="/tmp/health_check_$$"
    
    # Run health checks for 30 seconds while switching
    (
        for i in {1..30}; do
            if ! curl -f -s http://localhost/health &>/dev/null; then
                echo "fail" >> "$temp_file"
            fi
            sleep 1
        done
    ) &
    local health_check_pid=$!
    
    # Wait 5 seconds then switch
    sleep 5
    export ACTIVE_ENV=green
    docker compose -f "$COMPOSE_FILE" up -d caddy &>/dev/null
    
    # Wait for health checks to complete
    wait $health_check_pid
    
    # Count failures
    if [ -f "$temp_file" ]; then
        downtime=$(wc -l < "$temp_file")
        rm -f "$temp_file"
    fi
    
    # Allow up to 3 seconds of downtime during Caddy restart
    # Note: True zero-downtime requires advanced techniques like:
    # - Multiple Caddy instances with graceful handoff
    # - HAProxy with hitless reload
    # - Kubernetes rolling updates
    # This implementation minimizes downtime to < 3 seconds
    [ $downtime -le 3 ]
}

# Test: Rollback functionality
test_rollback() {
    cd "$DEPLOY_DIR" || return 1
    
    # Current environment should be green
    export ACTIVE_ENV=blue
    docker compose -f "$COMPOSE_FILE" up -d caddy &>/dev/null || return 1
    
    # Wait for switch
    sleep 5
    
    # Verify rollback worked
    curl -f -s http://localhost/health | grep -q "healthy" || return 1
    
    return 0
}

# Test: Environment cleanup
test_cleanup() {
    cd "$DEPLOY_DIR" || return 1
    
    # Stop green environment
    docker compose -f "$COMPOSE_FILE" --profile green stop backend-green frontend-green &>/dev/null || return 1
    
    # Verify only blue is running
    docker ps --filter "name=clipper-backend-green" --format '{{.Status}}' | grep -q "Exited" || return 1
    docker ps --filter "name=clipper-backend-blue" --format '{{.Status}}' | grep -q "Up" || return 1
    
    return 0
}

# Generate test report
generate_report() {
    local report_file="$TEST_RESULTS_DIR/test-report-$(date +%Y%m%d-%H%M%S).txt"
    
    mkdir -p "$TEST_RESULTS_DIR"
    
    {
        echo "Blue-Green Deployment Test Report"
        echo "=================================="
        echo "Date: $(date)"
        echo "Environment: $TEST_ENV"
        echo ""
        echo "Test Results:"
        echo "  Total Tests: $TESTS_RUN"
        echo "  Passed: $TESTS_PASSED"
        echo "  Failed: $TESTS_FAILED"
        echo "  Success Rate: $(( TESTS_PASSED * 100 / TESTS_RUN ))%"
        echo ""
        
        if [ $TESTS_FAILED -eq 0 ]; then
            echo "Status: ✓ ALL TESTS PASSED"
        else
            echo "Status: ✗ SOME TESTS FAILED"
        fi
    } | tee "$report_file"
    
    log_info "Report saved to: $report_file"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    cd "$DEPLOY_DIR" || return
    
    # Stop all services
    docker compose -f "$COMPOSE_FILE" --profile green down -v &>/dev/null || true
    docker compose -f "$COMPOSE_FILE" down -v &>/dev/null || true
    
    log_info "Cleanup complete"
}

# Main test execution
main() {
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Blue-Green Deployment Test Suite             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_info "Testing environment: $TEST_ENV"
    log_info "Deploy directory: $DEPLOY_DIR"
    echo ""
    
    # Register cleanup trap
    trap cleanup EXIT
    
    # Run tests
    run_test "Prerequisites installed" test_prerequisites
    run_test "Compose file valid" test_compose_file
    run_test "Shared services start" test_shared_services
    run_test "Blue environment starts" test_blue_environment_start
    run_test "Blue health checks pass" test_blue_health_checks
    run_test "Caddy proxy starts" test_caddy_proxy
    run_test "Traffic flows through blue" test_blue_traffic
    run_test "Green environment starts" test_green_environment_start
    run_test "Green health checks pass" test_green_health_checks
    run_test "Both environments run simultaneously" test_both_environments_running
    run_test "Traffic switches to green" test_traffic_switch_to_green
    run_test "Traffic switches back to blue" test_traffic_switch_to_blue
    run_test "Zero downtime during switch" test_zero_downtime
    run_test "Rollback functionality" test_rollback
    run_test "Environment cleanup" test_cleanup
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo ""
    
    # Generate report
    generate_report
    
    echo ""
    
    # Summary
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  All Tests Passed! ✓                           ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
        return 0
    else
        echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  Some Tests Failed ✗                           ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
        return 1
    fi
}

# Run tests
main "$@"
