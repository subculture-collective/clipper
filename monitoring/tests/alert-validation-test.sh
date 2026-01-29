#!/bin/bash
# Alert Validation Test Suite
# Tests that alerts fire correctly with proper labels and clear on recovery
#
# Usage:
#   ./alert-validation-test.sh [test-type]
#
# Test Types:
#   latency-alert       - Test latency alert fires and clears
#   error-rate-alert    - Test error rate alert fires and clears
#   webhook-alert       - Test webhook failure alert fires and clears
#   search-failover-alert - Test search failover alert fires and clears
#   cdn-failover-alert  - Test CDN failover alert fires and clears
#   queue-alert         - Test queue depth alert fires and clears
#   all                 - Run all alert validation tests

set -e

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
PROMETHEUS_API="${PROMETHEUS_URL}/api/v1"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
ALERTMANAGER_API="${ALERTMANAGER_URL}/api/v1"
PROMETHEUS_PUSHGATEWAY="${PROMETHEUS_PUSHGATEWAY:-http://localhost:9091}"

# Test configuration
ALERT_WAIT_TIME=${ALERT_WAIT_TIME:-120}
RECOVERY_WAIT_TIME=${RECOVERY_WAIT_TIME:-120}
FLAP_TOLERANCE=${FLAP_TOLERANCE:-2}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}Test #${TESTS_TOTAL}: $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

pass_test() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "✓ Test passed: $1"
}

fail_test() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    log_error "✗ Test failed: $1"
}

# Check if alert is firing
check_alert_firing() {
    local alert_name=$1
    local expected_labels=$2
    
    log_info "Checking if alert '$alert_name' is firing..."
    
    local alert_response=$(curl -s "${PROMETHEUS_API}/alerts" | jq -r ".data.alerts[] | select(.labels.alertname==\"$alert_name\")")
    
    if [ -z "$alert_response" ]; then
        log_error "Alert '$alert_name' is not present in Prometheus"
        return 1
    fi
    
    local alert_state=$(echo "$alert_response" | jq -r '.state')
    
    if [ "$alert_state" = "firing" ]; then
        log_success "Alert '$alert_name' is firing"
        return 0
    else
        log_warning "Alert '$alert_name' state is: $alert_state (expected: firing)"
        return 1
    fi
}

# Check alert labels
check_alert_labels() {
    local alert_name=$1
    shift
    local required_labels=("$@")
    
    log_info "Checking alert labels for '$alert_name'..."
    
    local alert_response=$(curl -s "${PROMETHEUS_API}/alerts" | jq -r ".data.alerts[] | select(.labels.alertname==\"$alert_name\")")
    
    if [ -z "$alert_response" ]; then
        log_error "Alert '$alert_name' not found"
        return 1
    fi
    
    local all_labels_present=true
    
    for label in "${required_labels[@]}"; do
        local label_key=$(echo "$label" | cut -d= -f1)
        local expected_value=$(echo "$label" | cut -d= -f2)
        local actual_value=$(echo "$alert_response" | jq -r ".labels.$label_key // empty")
        
        if [ -z "$actual_value" ]; then
            log_error "Label '$label_key' is missing"
            all_labels_present=false
        elif [ "$actual_value" != "$expected_value" ]; then
            log_error "Label '$label_key' has value '$actual_value', expected '$expected_value'"
            all_labels_present=false
        else
            log_success "Label '$label_key' is correct: $actual_value"
        fi
    done
    
    # Check for runbook annotation
    local runbook=$(echo "$alert_response" | jq -r '.annotations.runbook // empty')
    if [ -z "$runbook" ]; then
        log_error "Runbook annotation is missing"
        all_labels_present=false
    else
        log_success "Runbook link present: $runbook"
    fi
    
    if [ "$all_labels_present" = true ]; then
        return 0
    else
        return 1
    fi
}

# Check if alert has cleared
check_alert_cleared() {
    local alert_name=$1
    
    log_info "Checking if alert '$alert_name' has cleared..."
    
    local alert_response=$(curl -s "${PROMETHEUS_API}/alerts" | jq -r ".data.alerts[] | select(.labels.alertname==\"$alert_name\")")
    
    if [ -z "$alert_response" ]; then
        log_success "Alert '$alert_name' has cleared (not present in active alerts)"
        return 0
    fi
    
    local alert_state=$(echo "$alert_response" | jq -r '.state')
    
    if [ "$alert_state" = "inactive" ] || [ "$alert_state" = "resolved" ]; then
        log_success "Alert '$alert_name' has cleared (state: $alert_state)"
        return 0
    else
        log_error "Alert '$alert_name' is still active (state: $alert_state)"
        return 1
    fi
}

# Check flapping behavior
check_flapping() {
    local alert_name=$1
    local duration=${2:-60}
    
    log_info "Monitoring alert '$alert_name' for flapping (${duration}s)..."
    
    local state_changes=0
    local previous_state=""
    local end_time=$(($(date +%s) + duration))
    
    while [ "$(date +%s)" -lt $end_time ]; do
        local alert_response=$(curl -s "${PROMETHEUS_API}/alerts" | jq -r ".data.alerts[] | select(.labels.alertname==\"$alert_name\")")
        local current_state="inactive"
        
        if [ -n "$alert_response" ]; then
            current_state=$(echo "$alert_response" | jq -r '.state')
        fi
        
        if [ -n "$previous_state" ] && [ "$current_state" != "$previous_state" ]; then
            state_changes=$((state_changes + 1))
            log_warning "State change detected: $previous_state -> $current_state"
        fi
        
        previous_state=$current_state
        sleep 10
    done
    
    log_info "Total state changes in ${duration}s: $state_changes (tolerance: $FLAP_TOLERANCE)"
    
    if [ $state_changes -le $FLAP_TOLERANCE ]; then
        log_success "Alert is not flapping (${state_changes} changes <= ${FLAP_TOLERANCE} tolerance)"
        return 0
    else
        log_error "Alert is flapping excessively (${state_changes} changes > ${FLAP_TOLERANCE} tolerance)"
        return 1
    fi
}

# Test latency alert
test_latency_alert() {
    log_test "Latency Alert Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    if [ ! -f "$generator" ]; then
        log_error "Synthetic signal generator not found at: $generator"
        fail_test "Latency alert (generator missing)"
        return 1
    fi
    
    # Generate high latency signal
    log_info "Generating high latency signal (150ms for 60s)..."
    bash "$generator" latency 60 150 > /dev/null 2>&1 &
    local generator_pid=$!
    
    # Wait for alert to fire
    log_info "Waiting ${ALERT_WAIT_TIME}s for alert to fire..."
    sleep $ALERT_WAIT_TIME
    
    # Check if SLOLatencyBreach alert is firing
    if check_alert_firing "SLOLatencyBreach"; then
        pass_test "Latency alert fired"
        
        # Check required labels
        if check_alert_labels "SLOLatencyBreach" "severity=warning" "slo=latency"; then
            pass_test "Latency alert has correct labels"
        else
            fail_test "Latency alert labels incorrect"
        fi
    else
        fail_test "Latency alert did not fire"
    fi
    
    # Stop generator and send recovery signal
    kill $generator_pid 2>/dev/null || true
    log_info "Sending recovery signal..."
    bash "$generator" recovery latency > /dev/null 2>&1
    
    # Wait for alert to clear
    log_info "Waiting ${RECOVERY_WAIT_TIME}s for alert to clear..."
    sleep $RECOVERY_WAIT_TIME
    
    # Check if alert has cleared
    if check_alert_cleared "SLOLatencyBreach"; then
        pass_test "Latency alert cleared on recovery"
    else
        fail_test "Latency alert did not clear"
    fi
}

# Test error rate alert
test_error_rate_alert() {
    log_test "Error Rate Alert Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate high error rate signal
    log_info "Generating high error rate signal (1% for 60s)..."
    bash "$generator" error-rate 60 0.01 > /dev/null 2>&1 &
    local generator_pid=$!
    
    # Wait for alert to fire
    log_info "Waiting ${ALERT_WAIT_TIME}s for alert to fire..."
    sleep $ALERT_WAIT_TIME
    
    # Check if SLOErrorRateBreach alert is firing
    if check_alert_firing "SLOErrorRateBreach"; then
        pass_test "Error rate alert fired"
        
        # Check required labels
        if check_alert_labels "SLOErrorRateBreach" "severity=critical" "slo=error_rate"; then
            pass_test "Error rate alert has correct labels"
        else
            fail_test "Error rate alert labels incorrect"
        fi
    else
        fail_test "Error rate alert did not fire"
    fi
    
    # Stop generator and send recovery signal
    kill $generator_pid 2>/dev/null || true
    log_info "Sending recovery signal..."
    bash "$generator" recovery error-rate > /dev/null 2>&1
    
    # Wait for alert to clear
    log_info "Waiting ${RECOVERY_WAIT_TIME}s for alert to clear..."
    sleep $RECOVERY_WAIT_TIME
    
    # Check if alert has cleared
    if check_alert_cleared "SLOErrorRateBreach"; then
        pass_test "Error rate alert cleared on recovery"
    else
        fail_test "Error rate alert did not clear"
    fi
}

# Test webhook alert
test_webhook_alert() {
    log_test "Webhook Failure Alert Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate webhook failure signal
    log_info "Generating webhook failure signal (15% for 60s)..."
    bash "$generator" webhook-failure 60 0.15 > /dev/null 2>&1 &
    local generator_pid=$!
    
    # Wait for alert to fire
    log_info "Waiting ${ALERT_WAIT_TIME}s for alert to fire..."
    sleep $ALERT_WAIT_TIME
    
    # Check if HighWebhookFailureRate alert is firing
    if check_alert_firing "HighWebhookFailureRate"; then
        pass_test "Webhook failure alert fired"
        
        # Check required labels
        if check_alert_labels "HighWebhookFailureRate" "severity=warning"; then
            pass_test "Webhook alert has correct labels"
        else
            fail_test "Webhook alert labels incorrect"
        fi
    else
        fail_test "Webhook failure alert did not fire"
    fi
    
    # Stop generator and send recovery signal
    kill $generator_pid 2>/dev/null || true
    log_info "Sending recovery signal..."
    bash "$generator" recovery webhook-failure > /dev/null 2>&1
    
    # Wait for alert to clear
    log_info "Waiting ${RECOVERY_WAIT_TIME}s for alert to clear..."
    sleep $RECOVERY_WAIT_TIME
    
    # Check if alert has cleared
    if check_alert_cleared "HighWebhookFailureRate"; then
        pass_test "Webhook alert cleared on recovery"
    else
        fail_test "Webhook alert did not clear"
    fi
}

# Test search failover alert
test_search_failover_alert() {
    log_test "Search Failover Alert Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate search failover signal
    log_info "Generating search failover signal (10/min for 60s)..."
    bash "$generator" search-failover 60 10 > /dev/null 2>&1 &
    local generator_pid=$!
    
    # Wait for alert to fire
    log_info "Waiting ${ALERT_WAIT_TIME}s for alert to fire..."
    sleep $ALERT_WAIT_TIME
    
    # Check if SearchFailoverRateHigh alert is firing
    if check_alert_firing "SearchFailoverRateHigh"; then
        pass_test "Search failover alert fired"
        
        # Check required labels
        if check_alert_labels "SearchFailoverRateHigh" "severity=warning"; then
            pass_test "Search failover alert has correct labels"
        else
            fail_test "Search failover alert labels incorrect"
        fi
    else
        fail_test "Search failover alert did not fire"
    fi
    
    # Stop generator and send recovery signal
    kill $generator_pid 2>/dev/null || true
    log_info "Sending recovery signal..."
    bash "$generator" recovery search-failover > /dev/null 2>&1
    
    # Wait for alert to clear
    log_info "Waiting ${RECOVERY_WAIT_TIME}s for alert to clear..."
    sleep $RECOVERY_WAIT_TIME
    
    # Check if alert has cleared
    if check_alert_cleared "SearchFailoverRateHigh"; then
        pass_test "Search failover alert cleared on recovery"
    else
        fail_test "Search failover alert did not clear"
    fi
}

# Test CDN failover alert
test_cdn_failover_alert() {
    log_test "CDN Failover Alert Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate CDN failover signal
    log_info "Generating CDN failover signal (10/sec for 60s)..."
    bash "$generator" cdn-failover 60 10 > /dev/null 2>&1 &
    local generator_pid=$!
    
    # Wait for alert to fire
    log_info "Waiting ${ALERT_WAIT_TIME}s for alert to fire..."
    sleep $ALERT_WAIT_TIME
    
    # Check if CDNFailoverRateHigh alert is firing
    if check_alert_firing "CDNFailoverRateHigh"; then
        pass_test "CDN failover alert fired"
        
        # Check required labels
        if check_alert_labels "CDNFailoverRateHigh" "severity=warning"; then
            pass_test "CDN failover alert has correct labels"
        else
            fail_test "CDN failover alert labels incorrect"
        fi
    else
        fail_test "CDN failover alert did not fire"
    fi
    
    # Stop generator and send recovery signal
    kill $generator_pid 2>/dev/null || true
    log_info "Sending recovery signal..."
    bash "$generator" recovery cdn-failover > /dev/null 2>&1
    
    # Wait for alert to clear
    log_info "Waiting ${RECOVERY_WAIT_TIME}s for alert to clear..."
    sleep $RECOVERY_WAIT_TIME
    
    # Check if alert has cleared
    if check_alert_cleared "CDNFailoverRateHigh"; then
        pass_test "CDN failover alert cleared on recovery"
    else
        fail_test "CDN failover alert did not clear"
    fi
}

# Test queue depth alert
test_queue_alert() {
    log_test "Queue Depth Alert Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate queue depth signal
    log_info "Generating queue depth signal (500 items for 60s)..."
    bash "$generator" queue-depth 60 500 > /dev/null 2>&1 &
    local generator_pid=$!
    
    # Wait for alert to fire
    log_info "Waiting ${ALERT_WAIT_TIME}s for alert to fire..."
    sleep $ALERT_WAIT_TIME
    
    # Check if LargeWebhookRetryQueue alert is firing
    if check_alert_firing "LargeWebhookRetryQueue"; then
        pass_test "Queue depth alert fired"
        
        # Check required labels
        if check_alert_labels "LargeWebhookRetryQueue" "severity=warning"; then
            pass_test "Queue depth alert has correct labels"
        else
            fail_test "Queue depth alert labels incorrect"
        fi
    else
        fail_test "Queue depth alert did not fire"
    fi
    
    # Stop generator and send recovery signal
    kill $generator_pid 2>/dev/null || true
    log_info "Sending recovery signal..."
    bash "$generator" recovery queue-depth > /dev/null 2>&1
    
    # Wait for alert to clear
    log_info "Waiting ${RECOVERY_WAIT_TIME}s for alert to clear..."
    sleep $RECOVERY_WAIT_TIME
    
    # Check if alert has cleared
    if check_alert_cleared "LargeWebhookRetryQueue"; then
        pass_test "Queue depth alert cleared on recovery"
    else
        fail_test "Queue depth alert did not clear"
    fi
}

# Print summary
print_summary() {
    echo ""
    echo "================================================"
    echo "Test Summary"
    echo "================================================"
    echo -e "Total Tests:  ${TESTS_TOTAL}"
    echo -e "${GREEN}Passed:${NC}       ${TESTS_PASSED}"
    echo -e "${RED}Failed:${NC}       ${TESTS_FAILED}"
    echo "================================================"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "All tests passed!"
        return 0
    else
        log_error "${TESTS_FAILED} test(s) failed"
        return 1
    fi
}

# Main script
main() {
    echo "================================================"
    echo "Alert Validation Test Suite"
    echo "Monitoring Alert Rule Validation"
    echo "================================================"
    echo ""
    
    local test_type=${1:-all}
    
    case $test_type in
        latency-alert)
            test_latency_alert
            ;;
        error-rate-alert)
            test_error_rate_alert
            ;;
        webhook-alert)
            test_webhook_alert
            ;;
        search-failover-alert)
            test_search_failover_alert
            ;;
        cdn-failover-alert)
            test_cdn_failover_alert
            ;;
        queue-alert)
            test_queue_alert
            ;;
        all)
            test_latency_alert
            test_error_rate_alert
            test_webhook_alert
            test_search_failover_alert
            test_cdn_failover_alert
            test_queue_alert
            ;;
        help|*)
            echo "Usage: $0 [test-type]"
            echo ""
            echo "Test Types:"
            echo "  latency-alert         - Test latency alert"
            echo "  error-rate-alert      - Test error rate alert"
            echo "  webhook-alert         - Test webhook failure alert"
            echo "  search-failover-alert - Test search failover alert"
            echo "  cdn-failover-alert    - Test CDN failover alert"
            echo "  queue-alert           - Test queue depth alert"
            echo "  all                   - Run all tests (default)"
            echo ""
            echo "Environment Variables:"
            echo "  PROMETHEUS_URL         - Prometheus URL (default: http://localhost:9090)"
            echo "  ALERTMANAGER_URL       - Alertmanager URL (default: http://localhost:9093)"
            echo "  PROMETHEUS_PUSHGATEWAY - Pushgateway URL (default: http://localhost:9091)"
            echo "  ALERT_WAIT_TIME        - Time to wait for alert to fire (default: 120s)"
            echo "  RECOVERY_WAIT_TIME     - Time to wait for alert to clear (default: 120s)"
            echo "  FLAP_TOLERANCE         - Max state changes allowed (default: 2)"
            exit 1
            ;;
    esac
    
    print_summary
}

# Run main with all arguments
main "$@"
