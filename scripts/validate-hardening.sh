#!/bin/bash
# Production Hardening Validation Script
# This script validates that all production hardening measures are properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Function to print test results
print_test() {
    local status=$1
    local message=$2
    
    case $status in
        "PASS")
            echo -e "${GREEN}✓${NC} $message"
            PASS_COUNT=$((PASS_COUNT + 1))
            ;;
        "FAIL")
            echo -e "${RED}✗${NC} $message"
            FAIL_COUNT=$((FAIL_COUNT + 1))
            ;;
        "WARN")
            echo -e "${YELLOW}!${NC} $message"
            WARN_COUNT=$((WARN_COUNT + 1))
            ;;
        "INFO")
            echo -e "${BLUE}i${NC} $message"
            ;;
    esac
}

echo -e "${BLUE}=== Production Hardening Validation ===${NC}"
echo ""

# ============================================================================
# 1. Secrets Management
# ============================================================================
echo -e "${BLUE}[1/7] Checking Secrets Management${NC}"

# Function to validate secure placeholders in env files
validate_env_placeholders() {
    local env_file=$1
    local is_actual_env=${2:-false}
    
    if [ ! -f "$env_file" ]; then
        return
    fi
    
    # For example files, ensure CHANGEME placeholders are present
    if [[ "$env_file" == *.example ]]; then
        if grep -q "CHANGEME" "$env_file"; then
            print_test "PASS" "Contains secure password placeholders in $(basename $env_file)"
        else
            print_test "WARN" "Missing CHANGEME placeholders in $(basename $env_file) - ensure users know to change defaults"
        fi
        
        # Verify critical secrets have CHANGEME markers
        local critical_vars=("PASSWORD" "SECRET" "KEY" "TOKEN")
        for pattern in "${critical_vars[@]}"; do
            while IFS= read -r line; do
                # Extract variable name and value
                if [[ $line =~ ^([A-Z_]+)=(.+)$ ]]; then
                    local var_name="${BASH_REMATCH[1]}"
                    local var_value="${BASH_REMATCH[2]}"
                    
                    # Check if this is a sensitive variable
                    if [[ $var_name == *"$pattern"* ]]; then
                        # Value should contain CHANGEME or be empty/commented
                        if [[ $var_value == *"CHANGEME"* ]] || [[ -z "$var_value" ]] || [[ $var_value == '""' ]]; then
                            # Good - has placeholder or is empty
                            :
                        else
                            # Check if it's a known safe default (like localhost, test values)
                            if [[ $var_value =~ (localhost|127\.0\.0\.1|test|example|sample) ]]; then
                                # Acceptable for examples
                                :
                            else
                                print_test "WARN" "Potential hardcoded secret in $(basename $env_file): $var_name (should use CHANGEME placeholder)"
                            fi
                        fi
                    fi
                fi
            done < <(grep -E "^[A-Z_]+=.+" "$env_file")
        done
    fi
    
    # For actual production env files (if checking deployment), ensure no CHANGEME remains
    if [ "$is_actual_env" = true ]; then
        if grep -q "CHANGEME" "$env_file"; then
            print_test "FAIL" "Production env file $(basename $env_file) still contains CHANGEME placeholders!"
            print_test "FAIL" "Update the following variables before deploying:"
            grep "CHANGEME" "$env_file" | sed 's/=.*//' | while read -r var; do
                print_test "FAIL" "  - $var"
            done
            return 1
        else
            print_test "PASS" "No CHANGEME placeholders in $(basename $env_file)"
        fi
    fi
}

if [ -f ".env.production.example" ]; then
    print_test "PASS" "Production environment example exists"
    
    # Validate placeholders in example file
    validate_env_placeholders ".env.production.example" false
    
    # Check for required security variables
    for var in "REDIS_PASSWORD" "JWT_PRIVATE_KEY" "TWITCH_CLIENT_SECRET"; do
        if grep -q "$var" ".env.production.example"; then
            print_test "PASS" "Contains $var configuration"
        else
            print_test "FAIL" "Missing $var configuration"
        fi
    done
else
    print_test "FAIL" "Production environment example not found"
fi

# Also validate staging environment example
if [ -f ".env.staging.example" ]; then
    print_test "PASS" "Staging environment example exists"
    validate_env_placeholders ".env.staging.example" false
fi

# Check actual production env file if it exists (for deployment validation)
if [ -f ".env.production" ]; then
    print_test "INFO" "Validating actual production environment file"
    validate_env_placeholders ".env.production" true
elif [ -f ".env" ] && [ "${ENVIRONMENT:-}" = "production" ]; then
    print_test "INFO" "Validating actual environment file"
    validate_env_placeholders ".env" true
fi

if [ -f "docs/SECRETS_MANAGEMENT.md" ]; then
    print_test "PASS" "Secrets management documentation exists"
else
    print_test "FAIL" "Secrets management documentation missing"
fi

echo ""

# ============================================================================
# 2. Security Configuration
# ============================================================================
echo -e "${BLUE}[2/7] Checking Security Configuration${NC}"

if [ -f "backend/internal/middleware/security_middleware.go" ]; then
    print_test "PASS" "Security middleware exists"
    
    # Check for security headers
    if grep -q "Strict-Transport-Security" "backend/internal/middleware/security_middleware.go"; then
        print_test "PASS" "HSTS header configured"
    else
        print_test "FAIL" "HSTS header not configured"
    fi
    
    if grep -q "Content-Security-Policy" "backend/internal/middleware/security_middleware.go"; then
        print_test "PASS" "CSP header configured"
    else
        print_test "FAIL" "CSP header not configured"
    fi
    
    if grep -q "X-Frame-Options" "backend/internal/middleware/security_middleware.go"; then
        print_test "PASS" "X-Frame-Options configured"
    else
        print_test "FAIL" "X-Frame-Options not configured"
    fi
    
    # Check for secure cookie implementation
    if grep -q "HTTPOnly" "backend/internal/middleware/security_middleware.go"; then
        print_test "PASS" "HTTPOnly cookie flag configured"
    else
        print_test "FAIL" "HTTPOnly cookie flag not configured"
    fi
else
    print_test "FAIL" "Security middleware not found"
fi

# Check for security middleware tests
if [ -f "backend/internal/middleware/security_middleware_test.go" ]; then
    print_test "PASS" "Security middleware tests exist"
else
    print_test "FAIL" "Security middleware tests missing"
fi

echo ""

# ============================================================================
# 3. Observability
# ============================================================================
echo -e "${BLUE}[3/7] Checking Observability Configuration${NC}"

if [ -f "backend/pkg/utils/logger.go" ]; then
    print_test "PASS" "Structured logger exists"
    
    if grep -q "json.Marshal" "backend/pkg/utils/logger.go"; then
        print_test "PASS" "JSON logging configured"
    else
        print_test "FAIL" "JSON logging not configured"
    fi
else
    print_test "FAIL" "Structured logger not found"
fi

if [ -f "docs/OBSERVABILITY.md" ]; then
    print_test "PASS" "Observability documentation exists"
else
    print_test "FAIL" "Observability documentation missing"
fi

# Check for Prometheus alerts
if [ -f "monitoring/alerts.yml" ]; then
    print_test "PASS" "Alert rules exist"
    
    # Check for SLO-based alerts
    if grep -q "SLOAvailabilityBreach\|SLOErrorRateBreach\|SLOLatencyBreach" "monitoring/alerts.yml"; then
        print_test "PASS" "SLO-based alerts configured"
    else
        print_test "WARN" "SLO-based alerts may not be configured"
    fi
    
    # Check for error budget alerts
    if grep -q "ErrorBudget" "monitoring/alerts.yml"; then
        print_test "PASS" "Error budget alerts configured"
    else
        print_test "WARN" "Error budget alerts may not be configured"
    fi
else
    print_test "FAIL" "Alert rules not found"
fi

# Check for Grafana dashboards
if [ -d "monitoring/dashboards" ] && [ "$(ls -A monitoring/dashboards/*.json 2>/dev/null | wc -l)" -gt 0 ]; then
    print_test "PASS" "Grafana dashboards exist"
else
    print_test "WARN" "No Grafana dashboards found"
fi

echo ""

# ============================================================================
# 4. Backup & Recovery
# ============================================================================
echo -e "${BLUE}[4/7] Checking Backup Configuration${NC}"

if [ -f "scripts/backup-automated.sh" ]; then
    print_test "PASS" "Automated backup script exists"
    
    if [ -x "scripts/backup-automated.sh" ]; then
        print_test "PASS" "Backup script is executable"
    else
        print_test "FAIL" "Backup script is not executable"
    fi
    
    # Check for retention policy
    if grep -q "RETENTION_DAYS" "scripts/backup-automated.sh"; then
        print_test "PASS" "Retention policy configured"
    else
        print_test "FAIL" "Retention policy not configured"
    fi
    
    # Check for notifications
    if grep -q "SLACK_WEBHOOK\|NOTIFY_EMAIL" "scripts/backup-automated.sh"; then
        print_test "PASS" "Backup notifications configured"
    else
        print_test "WARN" "Backup notifications not configured"
    fi
else
    print_test "FAIL" "Automated backup script not found"
fi

if [ -f "scripts/restore-test.sh" ]; then
    print_test "PASS" "Restore test script exists"
    
    if [ -x "scripts/restore-test.sh" ]; then
        print_test "PASS" "Restore test script is executable"
    else
        print_test "FAIL" "Restore test script is not executable"
    fi
else
    print_test "FAIL" "Restore test script not found"
fi

if [ -f "scripts/setup-cron.sh" ]; then
    print_test "PASS" "Cron setup script exists"
    
    if [ -x "scripts/setup-cron.sh" ]; then
        print_test "PASS" "Cron setup script is executable"
    else
        print_test "FAIL" "Cron setup script is not executable"
    fi
else
    print_test "FAIL" "Cron setup script not found"
fi

echo ""

# ============================================================================
# 5. Caching Strategy
# ============================================================================
echo -e "${BLUE}[5/7] Checking Caching Configuration${NC}"

if [ -f "docs/CACHING_STRATEGY.md" ]; then
    print_test "PASS" "Caching strategy documentation exists"
    
    # Check for TTL configuration
    if grep -q "TTL" "docs/CACHING_STRATEGY.md"; then
        print_test "PASS" "TTL strategy documented"
    else
        print_test "WARN" "TTL strategy may not be documented"
    fi
else
    print_test "FAIL" "Caching strategy documentation missing"
fi

# Check Redis configuration in production
if [ -f ".env.production.example" ]; then
    if grep -q "REDIS_MAX_MEMORY\|REDIS_EVICTION_POLICY" ".env.production.example"; then
        print_test "PASS" "Redis memory management configured"
    else
        print_test "WARN" "Redis memory management not explicitly configured"
    fi
fi

echo ""

# ============================================================================
# 6. Runbook & SLOs
# ============================================================================
echo -e "${BLUE}[6/7] Checking Runbook & SLOs${NC}"

if [ -f "docs/RUNBOOK.md" ]; then
    print_test "PASS" "Runbook exists"
    
    # Check for SLO documentation
    if grep -q "Service Level Objectives\|SLO" "docs/RUNBOOK.md"; then
        print_test "PASS" "SLOs documented in runbook"
    else
        print_test "FAIL" "SLOs not documented in runbook"
    fi
    
    # Check for on-call procedures
    if grep -q "On-Call" "docs/RUNBOOK.md"; then
        print_test "PASS" "On-call procedures documented"
    else
        print_test "FAIL" "On-call procedures not documented"
    fi
    
    # Check for error budget documentation
    if grep -q "Error Budget" "docs/RUNBOOK.md"; then
        print_test "PASS" "Error budget documented"
    else
        print_test "FAIL" "Error budget not documented"
    fi
    
    # Check for incident response procedures
    if grep -q "Incident" "docs/RUNBOOK.md"; then
        print_test "PASS" "Incident response procedures documented"
    else
        print_test "FAIL" "Incident response procedures not documented"
    fi
else
    print_test "FAIL" "Runbook not found"
fi

echo ""

# ============================================================================
# 7. CORS Configuration
# ============================================================================
echo -e "${BLUE}[7/7] Checking CORS Configuration${NC}"

if [ -f ".env.production.example" ]; then
    if grep -q "CORS_ALLOWED_ORIGINS" ".env.production.example"; then
        print_test "PASS" "CORS origins configured"
        
        # Check that it's not using wildcards or localhost in example
        if grep "CORS_ALLOWED_ORIGINS" ".env.production.example" | grep -q "localhost"; then
            print_test "WARN" "Example shows localhost - ensure production uses actual domains"
        else
            print_test "PASS" "CORS example uses production domains"
        fi
    else
        print_test "FAIL" "CORS origins not configured"
    fi
fi

if [ -f "backend/internal/middleware/cors_middleware.go" ]; then
    print_test "PASS" "CORS middleware exists"
else
    print_test "FAIL" "CORS middleware not found"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}=== Validation Summary ===${NC}"
echo ""
echo -e "Tests Passed:  ${GREEN}$PASS_COUNT${NC}"
echo -e "Tests Failed:  ${RED}$FAIL_COUNT${NC}"
echo -e "Warnings:      ${YELLOW}$WARN_COUNT${NC}"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASS_COUNT * 100 / TOTAL))
    echo -e "Success Rate: ${SUCCESS_RATE}%"
fi

echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ Production hardening validation passed!${NC}"
    if [ $WARN_COUNT -gt 0 ]; then
        echo -e "${YELLOW}! Some warnings detected - review recommended${NC}"
    fi
    exit 0
else
    echo -e "${RED}✗ Production hardening validation failed${NC}"
    echo -e "${RED}  Fix the failures above before deploying to production${NC}"
    exit 1
fi
