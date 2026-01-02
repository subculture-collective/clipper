#!/bin/bash
# Test Alert Rules and Routing
# This script validates alert rule syntax and tests alert firing in staging
#
# Usage:
#   ./test-alerts.sh [validate|test-critical|test-warning|test-security|test-all]
#
# Prerequisites:
#   - Prometheus running and accessible
#   - Alertmanager running and accessible
#   - curl and jq installed

set -e

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
ALERTMANAGER_API="${ALERTMANAGER_URL}/api/v1"
PROMETHEUS_API="${PROMETHEUS_URL}/api/v1"

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

# Check if Prometheus is accessible
check_prometheus() {
    log_info "Checking Prometheus connectivity..."
    if ! curl -s "${PROMETHEUS_URL}/-/healthy" > /dev/null 2>&1; then
        log_error "Cannot connect to Prometheus at ${PROMETHEUS_URL}"
        log_error "Make sure Prometheus is running or set PROMETHEUS_URL environment variable"
        exit 1
    fi
    log_success "Prometheus is accessible"
}

# Check if Alertmanager is accessible
check_alertmanager() {
    log_info "Checking Alertmanager connectivity..."
    if ! curl -s "${ALERTMANAGER_URL}/-/healthy" > /dev/null 2>&1; then
        log_error "Cannot connect to Alertmanager at ${ALERTMANAGER_URL}"
        log_error "Make sure Alertmanager is running or set ALERTMANAGER_URL environment variable"
        exit 1
    fi
    log_success "Alertmanager is accessible"
}

# Validate alert rules syntax
validate_rules() {
    log_info "Validating alert rules syntax..."
    
    if [ ! -f "alerts.yml" ]; then
        log_error "alerts.yml not found. Run this script from the monitoring directory."
        exit 1
    fi
    
    # Use promtool to validate if available
    if command -v promtool &> /dev/null; then
        log_info "Using promtool to validate rules..."
        if promtool check rules alerts.yml; then
            log_success "Alert rules are valid"
        else
            log_error "Alert rules validation failed"
            exit 1
        fi
    else
        log_warning "promtool not found, skipping syntax validation"
        log_info "Install Prometheus locally to enable syntax validation"
    fi
    
    # Check for required alert labels
    log_info "Checking alert labels..."
    required_labels=("severity")
    for label in "${required_labels[@]}"; do
        if ! grep -q "${label}:" alerts.yml; then
            log_error "Missing required label: $label"
            exit 1
        fi
    done
    log_success "Required labels present"
    
    # Count alerts by severity
    critical_count=$(grep -c "severity: critical" alerts.yml || echo 0)
    warning_count=$(grep -c "severity: warning" alerts.yml || echo 0)
    info_count=$(grep -c "severity: info" alerts.yml || echo 0)
    security_count=$(grep -c "security: true" alerts.yml || echo 0)
    
    log_info "Alert counts:"
    echo "  - Critical: $critical_count"
    echo "  - Warning: $warning_count"
    echo "  - Info: $info_count"
    echo "  - Security: $security_count"
}

# Get current alerts from Prometheus
get_alerts() {
    log_info "Fetching current alerts from Prometheus..."
    curl -s "${PROMETHEUS_API}/alerts" | jq -r '.data.alerts[] | "\(.labels.alertname) - \(.state)"'
}

# Get alerts from Alertmanager
get_alertmanager_alerts() {
    log_info "Fetching alerts from Alertmanager..."
    curl -s "${ALERTMANAGER_API}/alerts" | jq -r '.data[] | "\(.labels.alertname) - \(.status.state)"'
}

# Send test alert to Alertmanager
send_test_alert() {
    local alertname=$1
    local severity=$2
    local security=${3:-false}
    
    log_info "Sending test alert: $alertname (severity: $severity)"
    
    local alert_json=$(cat <<EOF
[{
  "labels": {
    "alertname": "$alertname",
    "severity": "$severity",
    "service": "test",
    "security": "$security"
  },
  "annotations": {
    "summary": "Test alert for $alertname",
    "description": "This is a test alert to verify routing and notification channels",
    "runbook": "docs/operations/runbooks/test.md"
  },
  "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "generatorURL": "${PROMETHEUS_URL}/test"
}]
EOF
)
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$alert_json" \
        "${ALERTMANAGER_API}/alerts")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Test alert sent successfully"
        log_info "Check Slack/PagerDuty for notification"
        log_info "Alert should appear in Alertmanager UI: ${ALERTMANAGER_URL}"
    else
        log_error "Failed to send test alert (HTTP $http_code)"
        echo "$response" | head -n-1
        exit 1
    fi
}

# Test critical alerts
test_critical_alerts() {
    log_info "Testing critical alert routing..."
    echo ""
    
    log_info "This will send test alerts to PagerDuty and Slack #incidents"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Test cancelled"
        return
    fi
    
    send_test_alert "TestCriticalAlert" "critical" "false"
    
    log_info "Waiting 5 seconds..."
    sleep 5
    
    log_info "Verify the following:"
    echo "  1. Check PagerDuty for incident creation"
    echo "  2. Check Slack #incidents channel for alert"
    echo "  3. Check Alertmanager UI: ${ALERTMANAGER_URL}"
}

# Test warning alerts
test_warning_alerts() {
    log_info "Testing warning alert routing..."
    echo ""
    
    log_info "This will send test alerts to Slack #alerts"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Test cancelled"
        return
    fi
    
    send_test_alert "TestWarningAlert" "warning" "false"
    
    log_info "Waiting 5 seconds..."
    sleep 5
    
    log_info "Verify the following:"
    echo "  1. Check Slack #alerts channel for alert"
    echo "  2. Verify NO PagerDuty incident was created"
    echo "  3. Check Alertmanager UI: ${ALERTMANAGER_URL}"
}

# Test security alerts
test_security_alerts() {
    log_info "Testing security alert routing..."
    echo ""
    
    log_info "This will send test alerts to PagerDuty Security and Slack #security"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Test cancelled"
        return
    fi
    
    send_test_alert "TestSecurityAlert" "critical" "true"
    
    log_info "Waiting 5 seconds..."
    sleep 5
    
    log_info "Verify the following:"
    echo "  1. Check PagerDuty Security service for incident"
    echo "  2. Check Slack #security channel for alert"
    echo "  3. Check Alertmanager UI: ${ALERTMANAGER_URL}"
}

# Test SLO breach alerts
test_slo_alerts() {
    log_info "Testing SLO breach alert routing..."
    echo ""
    
    log_info "This will send test SLO breach alert"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Test cancelled"
        return
    fi
    
    local alert_json=$(cat <<EOF
[{
  "labels": {
    "alertname": "SLOAvailabilityBreach",
    "severity": "critical",
    "slo": "availability"
  },
  "annotations": {
    "summary": "Test SLO availability breach",
    "description": "Service availability is 99.3%, target is 99.5%",
    "runbook": "docs/operations/playbooks/slo-breach-response.md"
  },
  "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "generatorURL": "${PROMETHEUS_URL}/test"
}]
EOF
)
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$alert_json" \
        "${ALERTMANAGER_API}/alerts" > /dev/null
    
    log_success "SLO breach test alert sent"
    
    log_info "Verify the following:"
    echo "  1. Check PagerDuty SLO service for incident"
    echo "  2. Check Slack #incidents channel for alert"
    echo "  3. Verify runbook link is included"
}

# Test alert inhibition
test_inhibition() {
    log_info "Testing alert inhibition rules..."
    echo ""
    
    log_info "This will send a ServiceDown alert followed by a HighErrorRate alert"
    log_info "The HighErrorRate alert should be inhibited by ServiceDown"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Test cancelled"
        return
    fi
    
    # Send ServiceDown alert
    local service_down=$(cat <<EOF
[{
  "labels": {
    "alertname": "ServiceDown",
    "severity": "critical",
    "job": "test-service"
  },
  "annotations": {
    "summary": "Test service is down",
    "description": "Test alert for inhibition"
  },
  "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}]
EOF
)
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$service_down" \
        "${ALERTMANAGER_API}/alerts" > /dev/null
    
    log_success "Sent ServiceDown alert"
    sleep 2
    
    # Send HighErrorRate alert (should be inhibited)
    local error_rate=$(cat <<EOF
[{
  "labels": {
    "alertname": "HighErrorRate",
    "severity": "warning",
    "job": "test-service"
  },
  "annotations": {
    "summary": "Test high error rate",
    "description": "Test alert for inhibition"
  },
  "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}]
EOF
)
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$error_rate" \
        "${ALERTMANAGER_API}/alerts" > /dev/null
    
    log_success "Sent HighErrorRate alert (should be inhibited)"
    
    log_info "Verify in Alertmanager UI that HighErrorRate is inhibited by ServiceDown"
    echo "  Alertmanager UI: ${ALERTMANAGER_URL}"
}

# Check alert rule coverage
check_coverage() {
    log_info "Checking alert coverage..."
    echo ""
    
    required_alerts=(
        "ServiceDown"
        "DatabaseDown"
        "RedisDown"
        "HighErrorRate"
        "CriticalErrorRate"
        "SLOAvailabilityBreach"
        "SLOErrorRateBreach"
        "SLOLatencyBreach"
        "FailedAuthenticationSpike"
        "HighMemoryUsage"
        "LowDiskSpace"
    )
    
    missing=0
    for alert in "${required_alerts[@]}"; do
        if grep -q "alert: $alert" alerts.yml; then
            log_success "✓ $alert"
        else
            log_error "✗ $alert (MISSING)"
            ((missing++))
        fi
    done
    
    if [ $missing -eq 0 ]; then
        log_success "All required alerts are configured"
    else
        log_error "$missing required alerts are missing"
        exit 1
    fi
}

# Main script
main() {
    echo "================================================"
    echo "Alert Testing and Validation Script"
    echo "Clipper Monitoring Stack"
    echo "================================================"
    echo ""
    
    case "${1:-validate}" in
        validate)
            check_prometheus
            check_alertmanager
            validate_rules
            check_coverage
            ;;
        test-critical)
            check_prometheus
            check_alertmanager
            test_critical_alerts
            ;;
        test-warning)
            check_prometheus
            check_alertmanager
            test_warning_alerts
            ;;
        test-security)
            check_prometheus
            check_alertmanager
            test_security_alerts
            ;;
        test-slo)
            check_prometheus
            check_alertmanager
            test_slo_alerts
            ;;
        test-inhibition)
            check_prometheus
            check_alertmanager
            test_inhibition
            ;;
        test-all)
            check_prometheus
            check_alertmanager
            validate_rules
            check_coverage
            echo ""
            test_critical_alerts
            echo ""
            test_warning_alerts
            echo ""
            test_security_alerts
            echo ""
            test_slo_alerts
            echo ""
            test_inhibition
            ;;
        status)
            check_prometheus
            check_alertmanager
            echo ""
            get_alerts
            echo ""
            get_alertmanager_alerts
            ;;
        *)
            echo "Usage: $0 [validate|test-critical|test-warning|test-security|test-slo|test-inhibition|test-all|status]"
            echo ""
            echo "Commands:"
            echo "  validate         - Validate alert rules syntax and coverage (default)"
            echo "  test-critical    - Send test critical alert"
            echo "  test-warning     - Send test warning alert"
            echo "  test-security    - Send test security alert"
            echo "  test-slo         - Send test SLO breach alert"
            echo "  test-inhibition  - Test alert inhibition rules"
            echo "  test-all         - Run all tests"
            echo "  status           - Show current alerts"
            echo ""
            echo "Environment Variables:"
            echo "  PROMETHEUS_URL   - Prometheus URL (default: http://localhost:9090)"
            echo "  ALERTMANAGER_URL - Alertmanager URL (default: http://localhost:9093)"
            exit 1
            ;;
    esac
    
    echo ""
    echo "================================================"
    log_success "Test completed"
    echo "================================================"
}

# Run main with all arguments
main "$@"
