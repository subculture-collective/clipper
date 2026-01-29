#!/bin/bash
# Dashboard Validation Test Suite
# Validates that dashboard panels display accurate metrics matching synthetic signals
#
# Usage:
#   ./dashboard-validation-test.sh [dashboard-type]
#
# Dashboard Types:
#   slo             - Validate SLO dashboard panels
#   webhooks        - Validate webhook monitoring dashboard
#   background-jobs - Validate background jobs dashboard
#   search          - Validate search performance dashboard
#   cdn             - Validate CDN failover dashboard
#   all             - Validate all dashboards

set -e

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
PROMETHEUS_API="${PROMETHEUS_URL}/api/v1"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
PROMETHEUS_PUSHGATEWAY="${PROMETHEUS_PUSHGATEWAY:-http://localhost:9091}"

# Test configuration
METRIC_TOLERANCE=${METRIC_TOLERANCE:-0.05}  # 5% tolerance for metric comparison

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

# Query Prometheus metric
query_metric() {
    local query=$1
    local result=$(curl -s "${PROMETHEUS_API}/query" --data-urlencode "query=${query}" | jq -r '.data.result[0].value[1] // empty')
    echo "$result"
}

# Compare metric values
compare_metrics() {
    local expected=$1
    local actual=$2
    local metric_name=$3
    
    if [ -z "$actual" ]; then
        log_error "No data found for metric: $metric_name"
        return 1
    fi
    
    local diff=$(echo "scale=4; ($actual - $expected) / $expected" | bc -l)
    local abs_diff=$(echo "scale=4; if ($diff < 0) -$diff else $diff" | bc -l)
    
    local is_within_tolerance=$(echo "$abs_diff <= $METRIC_TOLERANCE" | bc -l)
    
    log_info "Metric: $metric_name"
    log_info "  Expected: $expected"
    log_info "  Actual:   $actual"
    log_info "  Diff:     $(echo "scale=2; $diff * 100" | bc)%"
    
    if [ "$is_within_tolerance" -eq 1 ]; then
        log_success "Metric is within tolerance (${METRIC_TOLERANCE})"
        return 0
    else
        log_error "Metric exceeds tolerance (${METRIC_TOLERANCE})"
        return 1
    fi
}

# Test SLO dashboard panels
test_slo_dashboard() {
    log_test "SLO Dashboard Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate synthetic signal for latency
    log_info "Generating synthetic latency signal..."
    bash "$generator" latency 30 150 > /dev/null 2>&1 &
    local gen_pid=$!
    
    sleep 35
    
    # Query latency metric
    log_info "Querying latency metric..."
    local latency_p95=$(query_metric 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{path=~"/api/v1/clips"}[5m])) by (le))')
    
    # Expected P95 latency around 0.15s (150ms)
    if [ -n "$latency_p95" ]; then
        if compare_metrics "0.15" "$latency_p95" "P95 Latency"; then
            pass_test "SLO dashboard latency metric accurate"
        else
            fail_test "SLO dashboard latency metric inaccurate"
        fi
    else
        fail_test "SLO dashboard latency metric not available"
    fi
    
    # Clean up
    kill $gen_pid 2>/dev/null || true
    bash "$generator" recovery latency > /dev/null 2>&1
}

# Test webhook dashboard panels
test_webhook_dashboard() {
    log_test "Webhook Dashboard Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate synthetic webhook failure signal
    log_info "Generating synthetic webhook failure signal..."
    bash "$generator" webhook-failure 30 0.15 > /dev/null 2>&1 &
    local gen_pid=$!
    
    sleep 35
    
    # Query webhook failure rate metric
    log_info "Querying webhook failure rate..."
    local failure_rate=$(query_metric 'sum(rate(webhook_delivery_total{status="failed"}[5m])) / sum(rate(webhook_delivery_total[5m]))')
    
    # Expected failure rate around 0.15 (15%)
    if [ -n "$failure_rate" ]; then
        if compare_metrics "0.15" "$failure_rate" "Webhook Failure Rate"; then
            pass_test "Webhook dashboard failure rate metric accurate"
        else
            fail_test "Webhook dashboard failure rate metric inaccurate"
        fi
    else
        fail_test "Webhook dashboard failure rate metric not available"
    fi
    
    # Clean up
    kill $gen_pid 2>/dev/null || true
    bash "$generator" recovery webhook-failure > /dev/null 2>&1
}

# Test background jobs dashboard panels
test_background_jobs_dashboard() {
    log_test "Background Jobs Dashboard Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate synthetic queue depth signal
    log_info "Generating synthetic queue depth signal..."
    bash "$generator" queue-depth 30 500 > /dev/null 2>&1 &
    local gen_pid=$!
    
    sleep 35
    
    # Query queue size metric
    log_info "Querying queue size..."
    local queue_size=$(query_metric 'webhook_retry_queue_size{job_name="webhook_retry"}')
    
    # Expected queue size around 500
    if [ -n "$queue_size" ]; then
        if compare_metrics "500" "$queue_size" "Queue Size"; then
            pass_test "Background jobs dashboard queue size metric accurate"
        else
            fail_test "Background jobs dashboard queue size metric inaccurate"
        fi
    else
        fail_test "Background jobs dashboard queue size metric not available"
    fi
    
    # Clean up
    kill $gen_pid 2>/dev/null || true
    bash "$generator" recovery queue-depth > /dev/null 2>&1
}

# Test search dashboard panels
test_search_dashboard() {
    log_test "Search Dashboard Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate synthetic search failover signal
    log_info "Generating synthetic search failover signal..."
    bash "$generator" search-failover 30 10 > /dev/null 2>&1 &
    local gen_pid=$!
    
    sleep 35
    
    # Query search failover metric
    log_info "Querying search failover rate..."
    local failover_rate=$(query_metric 'rate(search_failover_total[5m])')
    
    # Expected failover rate around 10/min
    if [ -n "$failover_rate" ]; then
        log_info "Search failover rate: $failover_rate/sec"
        pass_test "Search dashboard failover metric available"
    else
        fail_test "Search dashboard failover metric not available"
    fi
    
    # Clean up
    kill $gen_pid 2>/dev/null || true
    bash "$generator" recovery search-failover > /dev/null 2>&1
}

# Test CDN dashboard panels
test_cdn_dashboard() {
    log_test "CDN Dashboard Validation"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local generator="${script_dir}/../tools/synthetic-signal-generator.sh"
    
    # Generate synthetic CDN failover signal
    log_info "Generating synthetic CDN failover signal..."
    bash "$generator" cdn-failover 30 10 > /dev/null 2>&1 &
    local gen_pid=$!
    
    sleep 35
    
    # Query CDN failover metric
    log_info "Querying CDN failover rate..."
    local failover_rate=$(query_metric 'rate(cdn_failover_total[5m])')
    
    # Expected failover rate around 10/sec
    if [ -n "$failover_rate" ]; then
        log_info "CDN failover rate: $failover_rate/sec"
        pass_test "CDN dashboard failover metric available"
    else
        fail_test "CDN dashboard failover metric not available"
    fi
    
    # Clean up
    kill $gen_pid 2>/dev/null || true
    bash "$generator" recovery cdn-failover > /dev/null 2>&1
}

# Print summary
print_summary() {
    echo ""
    echo "================================================"
    echo "Dashboard Validation Summary"
    echo "================================================"
    echo -e "Total Tests:  ${TESTS_TOTAL}"
    echo -e "${GREEN}Passed:${NC}       ${TESTS_PASSED}"
    echo -e "${RED}Failed:${NC}       ${TESTS_FAILED}"
    echo "================================================"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "All dashboard validation tests passed!"
        return 0
    else
        log_error "${TESTS_FAILED} dashboard validation test(s) failed"
        return 1
    fi
}

# Main script
main() {
    echo "================================================"
    echo "Dashboard Validation Test Suite"
    echo "Monitoring Dashboard Panel Validation"
    echo "================================================"
    echo ""
    
    local dashboard_type=${1:-all}
    
    case $dashboard_type in
        slo)
            test_slo_dashboard
            ;;
        webhooks)
            test_webhook_dashboard
            ;;
        background-jobs)
            test_background_jobs_dashboard
            ;;
        search)
            test_search_dashboard
            ;;
        cdn)
            test_cdn_dashboard
            ;;
        all)
            test_slo_dashboard
            test_webhook_dashboard
            test_background_jobs_dashboard
            test_search_dashboard
            test_cdn_dashboard
            ;;
        help|*)
            echo "Usage: $0 [dashboard-type]"
            echo ""
            echo "Dashboard Types:"
            echo "  slo             - Validate SLO dashboard panels"
            echo "  webhooks        - Validate webhook monitoring dashboard"
            echo "  background-jobs - Validate background jobs dashboard"
            echo "  search          - Validate search performance dashboard"
            echo "  cdn             - Validate CDN failover dashboard"
            echo "  all             - Validate all dashboards (default)"
            echo ""
            echo "Environment Variables:"
            echo "  PROMETHEUS_URL         - Prometheus URL (default: http://localhost:9090)"
            echo "  GRAFANA_URL           - Grafana URL (default: http://localhost:3000)"
            echo "  PROMETHEUS_PUSHGATEWAY - Pushgateway URL (default: http://localhost:9091)"
            echo "  METRIC_TOLERANCE       - Tolerance for metric comparison (default: 0.05)"
            exit 1
            ;;
    esac
    
    print_summary
}

# Run main with all arguments
main "$@"
