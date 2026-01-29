#!/bin/bash
# Synthetic Signal Generator for Alert Validation
# Generates synthetic metrics to test monitoring alert rules
#
# Usage:
#   ./synthetic-signal-generator.sh <signal-type> [options]
#
# Signal Types:
#   latency         - Generate high latency metrics
#   error-rate      - Generate error rate metrics
#   queue-depth     - Generate queue depth metrics
#   webhook-failure - Generate webhook failure metrics
#   search-failover - Generate search failover metrics
#   cdn-failover    - Generate CDN failover metrics
#   all             - Generate all signal types

set -e

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
PROMETHEUS_PUSHGATEWAY="${PROMETHEUS_PUSHGATEWAY:-http://localhost:9091}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check dependencies
check_dependencies() {
    local missing=0
    
    for cmd in curl jq; do
        if ! command -v $cmd &> /dev/null; then
            log_error "Required command not found: $cmd"
            missing=$((missing + 1))
        fi
    done
    
    if [ $missing -gt 0 ]; then
        log_error "Please install missing dependencies"
        exit 1
    fi
}

# Generate latency synthetic signal
generate_latency_signal() {
    local duration=${1:-60}
    local latency_ms=${2:-150}
    local service=${3:-clipper-backend}
    
    log_info "Generating latency signal: ${latency_ms}ms for ${duration}s"
    
    local end_time=$(($(date +%s) + duration))
    
    while [ "$(date +%s)" -lt $end_time ]; do
        # Generate high latency metric
        cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/${service}/instance/test
# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.005"} 0
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.01"} 0
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.025"} 0
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.05"} 0
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.1"} 0
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.25"} 100
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.5"} 100
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="1"} 100
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="+Inf"} 100
http_request_duration_seconds_sum{path="/api/v1/clips",method="GET"} $(echo "scale=3; $latency_ms / 1000 * 100" | bc)
http_request_duration_seconds_count{path="/api/v1/clips",method="GET"} 100
EOF
        
        log_info "Sent latency signal: ${latency_ms}ms"
        sleep 5
    done
    
    log_success "Latency signal generation complete"
}

# Generate error rate synthetic signal
generate_error_rate_signal() {
    local duration=${1:-60}
    local error_rate=${2:-0.01}
    local service=${3:-clipper-backend}
    
    log_info "Generating error rate signal: ${error_rate} for ${duration}s"
    
    local end_time=$(($(date +%s) + duration))
    local total_requests=1000
    local error_requests=$(echo "$total_requests * $error_rate" | bc | cut -d. -f1)
    local success_requests=$((total_requests - error_requests))
    
    while [ "$(date +%s)" -lt $end_time ]; do
        # Generate error rate metric
        cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/${service}/instance/test
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{status="2xx"} ${success_requests}
http_requests_total{status="5xx"} ${error_requests}
EOF
        
        log_info "Sent error rate signal: ${error_rate} (${error_requests}/${total_requests})"
        sleep 5
    done
    
    log_success "Error rate signal generation complete"
}

# Generate queue depth synthetic signal
generate_queue_depth_signal() {
    local duration=${1:-60}
    local queue_size=${2:-500}
    local queue_name=${3:-webhook_retry_queue}
    
    log_info "Generating queue depth signal: ${queue_size} items for ${duration}s"
    
    local end_time=$(($(date +%s) + duration))
    
    while [ "$(date +%s)" -lt $end_time ]; do
        # Generate queue depth metric
        cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/background-jobs/instance/test
# HELP ${queue_name}_size Current queue size
# TYPE ${queue_name}_size gauge
${queue_name}_size{job_name="webhook_retry"} ${queue_size}
EOF
        
        log_info "Sent queue depth signal: ${queue_size} items"
        sleep 5
    done
    
    log_success "Queue depth signal generation complete"
}

# Generate webhook failure synthetic signal
generate_webhook_failure_signal() {
    local duration=${1:-60}
    local failure_rate=${2:-0.15}
    local service=${3:-clipper-backend}
    
    log_info "Generating webhook failure signal: ${failure_rate} for ${duration}s"
    
    local end_time=$(($(date +%s) + duration))
    local total_deliveries=100
    local failed_deliveries=$(echo "$total_deliveries * $failure_rate" | bc | cut -d. -f1)
    local success_deliveries=$((total_deliveries - failed_deliveries))
    
    while [ "$(date +%s)" -lt $end_time ]; do
        # Generate webhook delivery metrics
        cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/${service}/instance/test
# HELP webhook_delivery_total Total webhook deliveries
# TYPE webhook_delivery_total counter
webhook_delivery_total{status="success"} ${success_deliveries}
webhook_delivery_total{status="failed"} ${failed_deliveries}
EOF
        
        log_info "Sent webhook failure signal: ${failure_rate} (${failed_deliveries}/${total_deliveries})"
        sleep 5
    done
    
    log_success "Webhook failure signal generation complete"
}

# Generate search failover synthetic signal
generate_search_failover_signal() {
    local duration=${1:-60}
    local failover_rate=${2:-10}
    local service=${3:-clipper-search}
    
    log_info "Generating search failover signal: ${failover_rate}/min for ${duration}s"
    
    local end_time=$(($(date +%s) + duration))
    
    while [ "$(date +%s)" -lt $end_time ]; do
        # Generate search failover metrics
        cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/${service}/instance/test
# HELP search_failover_total Total search failovers
# TYPE search_failover_total counter
search_failover_total{from="opensearch",to="postgres"} ${failover_rate}
EOF
        
        log_info "Sent search failover signal: ${failover_rate} failovers"
        sleep 5
        failover_rate=$((failover_rate + 2))
    done
    
    log_success "Search failover signal generation complete"
}

# Generate CDN failover synthetic signal
generate_cdn_failover_signal() {
    local duration=${1:-60}
    local failover_rate=${2:-10}
    local service=${3:-clipper-cdn}
    
    log_info "Generating CDN failover signal: ${failover_rate}/sec for ${duration}s"
    
    local end_time=$(($(date +%s) + duration))
    
    while [ "$(date +%s)" -lt $end_time ]; do
        # Generate CDN failover metrics
        cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/${service}/instance/test
# HELP cdn_failover_total Total CDN failovers to origin
# TYPE cdn_failover_total counter
cdn_failover_total{cdn="cloudflare"} ${failover_rate}

# HELP cdn_failover_duration_ms CDN failover duration in milliseconds
# TYPE cdn_failover_duration_ms histogram
cdn_failover_duration_ms_bucket{le="100"} 0
cdn_failover_duration_ms_bucket{le="250"} 5
cdn_failover_duration_ms_bucket{le="500"} 50
cdn_failover_duration_ms_bucket{le="1000"} 100
cdn_failover_duration_ms_bucket{le="+Inf"} 100
cdn_failover_duration_ms_sum 45000
cdn_failover_duration_ms_count 100
EOF
        
        log_info "Sent CDN failover signal: ${failover_rate} failovers/sec"
        sleep 5
        failover_rate=$((failover_rate + 3))
    done
    
    log_success "CDN failover signal generation complete"
}

# Generate recovery signal (normal metrics)
generate_recovery_signal() {
    local signal_type=$1
    local service=${2:-clipper-backend}
    
    log_info "Generating recovery signal for ${signal_type}"
    
    case $signal_type in
        latency)
            cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/${service}/instance/test
# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.005"} 0
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.01"} 20
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.025"} 70
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.05"} 95
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.1"} 100
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.25"} 100
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="+Inf"} 100
http_request_duration_seconds_sum{path="/api/v1/clips",method="GET"} 3.5
http_request_duration_seconds_count{path="/api/v1/clips",method="GET"} 100
EOF
            ;;
        error-rate)
            cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/${service}/instance/test
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{status="2xx"} 998
http_requests_total{status="5xx"} 2
EOF
            ;;
        queue-depth)
            cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/background-jobs/instance/test
# HELP webhook_retry_queue_size Current queue size
# TYPE webhook_retry_queue_size gauge
webhook_retry_queue_size{job_name="webhook_retry"} 10
EOF
            ;;
        webhook-failure)
            cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/${service}/instance/test
# HELP webhook_delivery_total Total webhook deliveries
# TYPE webhook_delivery_total counter
webhook_delivery_total{status="success"} 95
webhook_delivery_total{status="failed"} 5
EOF
            ;;
        search-failover)
            cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/clipper-search/instance/test
# HELP search_failover_total Total search failovers
# TYPE search_failover_total counter
search_failover_total{from="opensearch",to="postgres"} 1
EOF
            ;;
        cdn-failover)
            cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/clipper-cdn/instance/test
# HELP cdn_failover_total Total CDN failovers to origin
# TYPE cdn_failover_total counter
cdn_failover_total{cdn="cloudflare"} 1
EOF
            ;;
    esac
    
    log_success "Recovery signal sent for ${signal_type}"
}

# Main script
main() {
    echo "================================================"
    echo "Synthetic Signal Generator"
    echo "Monitoring Alert Validation"
    echo "================================================"
    echo ""
    
    check_dependencies
    
    local signal_type=${1:-help}
    local duration=${2:-60}
    local threshold=${3}
    
    case $signal_type in
        latency)
            local latency=${threshold:-150}
            generate_latency_signal $duration $latency
            ;;
        error-rate)
            local error_rate=${threshold:-0.01}
            generate_error_rate_signal $duration $error_rate
            ;;
        queue-depth)
            local queue_size=${threshold:-500}
            generate_queue_depth_signal $duration $queue_size
            ;;
        webhook-failure)
            local failure_rate=${threshold:-0.15}
            generate_webhook_failure_signal $duration $failure_rate
            ;;
        search-failover)
            local failover_rate=${threshold:-10}
            generate_search_failover_signal $duration $failover_rate
            ;;
        cdn-failover)
            local failover_rate=${threshold:-10}
            generate_cdn_failover_signal $duration $failover_rate
            ;;
        all)
            log_info "Running all signal generators..."
            generate_latency_signal 30 150 &
            generate_error_rate_signal 30 0.01 &
            generate_queue_depth_signal 30 500 &
            generate_webhook_failure_signal 30 0.15 &
            generate_search_failover_signal 30 10 &
            generate_cdn_failover_signal 30 10 &
            wait
            log_success "All signal generators complete"
            ;;
        recovery)
            local recovery_type=${2:-all}
            if [ "$recovery_type" = "all" ]; then
                for type in latency error-rate queue-depth webhook-failure search-failover cdn-failover; do
                    generate_recovery_signal $type
                    sleep 1
                done
            else
                generate_recovery_signal $recovery_type
            fi
            ;;
        help|*)
            echo "Usage: $0 <signal-type> [duration] [threshold]"
            echo ""
            echo "Signal Types:"
            echo "  latency           - Generate high latency (default: 150ms)"
            echo "  error-rate        - Generate error rate (default: 0.01)"
            echo "  queue-depth       - Generate queue depth (default: 500 items)"
            echo "  webhook-failure   - Generate webhook failures (default: 0.15)"
            echo "  search-failover   - Generate search failovers (default: 10/min)"
            echo "  cdn-failover      - Generate CDN failovers (default: 10/sec)"
            echo "  all               - Generate all signals"
            echo "  recovery <type>   - Send recovery signal (normal metrics)"
            echo ""
            echo "Examples:"
            echo "  $0 latency 60 200              # Generate 200ms latency for 60s"
            echo "  $0 error-rate 120 0.02         # Generate 2% error rate for 120s"
            echo "  $0 queue-depth 90 1000         # Generate queue of 1000 items for 90s"
            echo "  $0 webhook-failure 60 0.20     # Generate 20% webhook failures for 60s"
            echo "  $0 all                         # Generate all signals for 30s each"
            echo "  $0 recovery latency            # Send recovery signal for latency"
            echo "  $0 recovery all                # Send recovery signals for all types"
            echo ""
            echo "Environment Variables:"
            echo "  PROMETHEUS_PUSHGATEWAY - Pushgateway URL (default: http://localhost:9091)"
            exit 1
            ;;
    esac
    
    echo ""
    echo "================================================"
    log_success "Signal generation completed"
    echo "================================================"
}

# Run main with all arguments
main "$@"
