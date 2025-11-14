#!/bin/bash
set -e

# Preflight Check Script for Clipper Deployment
# This script validates all critical configurations and dependencies before deployment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"
CHECK_LEVEL="${CHECK_LEVEL:-full}"
REPORT_FILE=""

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Preflight check script for production deployment validation.

OPTIONS:
    -e, --env ENV          Environment to check (staging|production) [default: staging]
    -l, --level LEVEL      Check level (quick|full) [default: full]
    -r, --report FILE      Generate report to file
    -h, --help             Show this help message
    --install              Install required dependencies
    --version              Show version

EXAMPLES:
    $0 --env production --level full
    $0 --env staging --level quick --report preflight.txt
    $0 --install

EOF
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -l|--level)
            CHECK_LEVEL="$2"
            shift 2
            ;;
        -r|--report)
            REPORT_FILE="$2"
            shift 2
            ;;
        --install)
            install_dependencies
            exit 0
            ;;
        --version)
            echo "Clipper Preflight Check v1.0.0"
            exit 0
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Logging functions
log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_check() {
    echo -e "${BLUE}[•]${NC} Checking: $1"
}

# Check result tracking
check_pass() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    log_info "$1"
}

check_fail() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    log_error "$1"
}

check_warn() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    log_warn "$1"
}

# Install dependencies
install_dependencies() {
    log_header "Installing Dependencies"
    
    # Check for package managers
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        sudo apt-get install -y curl wget postgresql-client redis-tools jq
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y curl wget postgresql redis jq
    elif command -v brew >/dev/null 2>&1; then
        brew install postgresql redis jq
    else
        log_error "No supported package manager found"
        exit 1
    fi
    
    log_info "Dependencies installed successfully"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Load environment variables
load_environment() {
    log_header "Loading Environment"
    
    # Check for .env file
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        log_info "Loading environment from backend/.env"
        set -a
        source "$PROJECT_ROOT/backend/.env"
        set +a
    elif [ -f "$PROJECT_ROOT/.env" ]; then
        log_info "Loading environment from .env"
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    else
        check_warn "No .env file found, using system environment variables"
    fi
    
    log_info "Environment: $ENVIRONMENT"
}

# Check system requirements
check_system_requirements() {
    log_header "System Requirements"
    
    # Check Docker
    log_check "Docker installation"
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
        check_pass "Docker installed: $DOCKER_VERSION"
    else
        check_fail "Docker not installed"
    fi
    
    # Check Docker Compose
    log_check "Docker Compose installation"
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        if command_exists docker-compose; then
            COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
        else
            COMPOSE_VERSION=$(docker compose version --short)
        fi
        check_pass "Docker Compose installed: $COMPOSE_VERSION"
    else
        check_fail "Docker Compose not installed"
    fi
    
    # Check disk space
    log_check "Disk space"
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        check_pass "Disk space: ${DISK_USAGE}% used (>20% free)"
    else
        check_fail "Disk space: ${DISK_USAGE}% used (<20% free) - cleanup required"
    fi
    
    # Check memory
    log_check "Available memory"
    if command_exists free; then
        AVAILABLE_MEM=$(free -m | awk 'NR==2 {print $7}')
        if [ "$AVAILABLE_MEM" -gt 2000 ]; then
            check_pass "Available memory: ${AVAILABLE_MEM}MB (>2GB)"
        else
            check_warn "Available memory: ${AVAILABLE_MEM}MB (<2GB) - may impact performance"
        fi
    else
        check_warn "Cannot check memory (free command not available)"
    fi
}

# Check required environment variables
check_environment_variables() {
    log_header "Environment Variables"
    
    # Database variables
    log_check "Database configuration"
    required_vars=("DB_HOST" "DB_PORT" "DB_USER" "DB_PASSWORD" "DB_NAME")
    all_present=true
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            check_fail "$var not set"
            all_present=false
        fi
    done
    
    if [ "$all_present" = true ]; then
        check_pass "Database variables configured"
        
        # Check SSL mode for production
        if [ "$ENVIRONMENT" = "production" ]; then
            if [ "${DB_SSLMODE:-disable}" != "require" ]; then
                check_warn "DB_SSLMODE should be 'require' in production (current: ${DB_SSLMODE:-disable})"
            else
                check_pass "Database SSL mode: require"
            fi
        fi
    fi
    
    # Redis variables
    log_check "Redis configuration"
    if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
        check_pass "Redis variables configured"
        
        if [ "$ENVIRONMENT" = "production" ] && [ -z "$REDIS_PASSWORD" ]; then
            check_warn "REDIS_PASSWORD should be set in production"
        fi
    else
        check_fail "Redis variables incomplete"
    fi
    
    # JWT variables
    log_check "JWT configuration"
    if [ -n "$JWT_PRIVATE_KEY" ] && [ -n "$JWT_PUBLIC_KEY" ]; then
        check_pass "JWT keys configured"
    else
        check_fail "JWT keys not configured"
    fi
    
    # Twitch API variables
    log_check "Twitch API configuration"
    if [ -n "$TWITCH_CLIENT_ID" ] && [ -n "$TWITCH_CLIENT_SECRET" ]; then
        check_pass "Twitch API credentials configured"
    else
        check_fail "Twitch API credentials not configured"
    fi
    
    # CORS configuration
    log_check "CORS configuration"
    if [ -n "$CORS_ALLOWED_ORIGINS" ]; then
        check_pass "CORS origins configured"
        if [ "$ENVIRONMENT" = "production" ] && [[ "$CORS_ALLOWED_ORIGINS" == *"localhost"* ]]; then
            check_warn "CORS_ALLOWED_ORIGINS contains localhost in production"
        fi
    else
        check_warn "CORS_ALLOWED_ORIGINS not configured"
    fi
    
    # Monitoring (optional but recommended)
    if [ "$CHECK_LEVEL" = "full" ]; then
        log_check "Monitoring configuration"
        if [ -n "$SENTRY_DSN" ]; then
            check_pass "Sentry DSN configured"
        else
            check_warn "Sentry DSN not configured (recommended for production)"
        fi
    fi
}

# Check database connectivity
check_database() {
    log_header "Database Connectivity"
    
    if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
        check_fail "Database configuration incomplete, skipping checks"
        return
    fi
    
    # Check if psql is available
    if ! command_exists psql; then
        check_warn "psql not installed, skipping database checks"
        return
    fi
    
    # Build connection string
    export PGPASSWORD="$DB_PASSWORD"
    
    # Test connection
    log_check "Database connection"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        check_pass "Database connection successful"
    else
        check_fail "Database connection failed"
        unset PGPASSWORD
        return
    fi
    
    # Check database version
    log_check "Database version"
    DB_VERSION=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SHOW server_version;" 2>/dev/null | xargs)
    if [ -n "$DB_VERSION" ]; then
        check_pass "PostgreSQL version: $DB_VERSION"
    else
        check_warn "Could not determine database version"
    fi
    
    # Check migration status
    if [ "$CHECK_LEVEL" = "full" ]; then
        log_check "Migration status"
        MIGRATION_VERSION=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | xargs)
        if [ -n "$MIGRATION_VERSION" ]; then
            check_pass "Current migration version: $MIGRATION_VERSION"
            
            # Check if dirty
            IS_DIRTY=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT dirty FROM schema_migrations WHERE version = '$MIGRATION_VERSION';" 2>/dev/null | xargs)
            if [ "$IS_DIRTY" = "t" ]; then
                check_fail "Database migration is in dirty state!"
            else
                check_pass "Migration state: clean"
            fi
        else
            check_warn "Could not determine migration version (schema_migrations table may not exist)"
        fi
    fi
    
    unset PGPASSWORD
}

# Check Redis connectivity
check_redis() {
    log_header "Redis Connectivity"
    
    if [ -z "$REDIS_HOST" ] || [ -z "$REDIS_PORT" ]; then
        check_fail "Redis configuration incomplete, skipping checks"
        return
    fi
    
    # Check if redis-cli is available
    if ! command_exists redis-cli; then
        check_warn "redis-cli not installed, skipping Redis checks"
        return
    fi
    
    # Test connection
    log_check "Redis connection"
    REDIS_AUTH_ARGS=""
    if [ -n "$REDIS_PASSWORD" ]; then
        REDIS_AUTH_ARGS="-a $REDIS_PASSWORD"
    fi
    
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $REDIS_AUTH_ARGS ping >/dev/null 2>&1; then
        check_pass "Redis connection successful"
    else
        check_fail "Redis connection failed"
        return
    fi
    
    # Check Redis info
    if [ "$CHECK_LEVEL" = "full" ]; then
        log_check "Redis info"
        REDIS_VERSION=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $REDIS_AUTH_ARGS info server 2>/dev/null | grep "redis_version" | cut -d':' -f2 | tr -d '\r')
        if [ -n "$REDIS_VERSION" ]; then
            check_pass "Redis version: $REDIS_VERSION"
        fi
        
        # Check memory usage
        REDIS_MEMORY=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $REDIS_AUTH_ARGS info memory 2>/dev/null | grep "used_memory_human" | cut -d':' -f2 | tr -d '\r')
        if [ -n "$REDIS_MEMORY" ]; then
            check_pass "Redis memory usage: $REDIS_MEMORY"
        fi
    fi
}

# Check external services
check_external_services() {
    log_header "External Services"
    
    # Check Twitch API
    log_check "Twitch API reachability"
    if curl -f -s -m 5 https://api.twitch.tv/helix/users >/dev/null 2>&1 || [ $? -eq 22 ]; then
        check_pass "Twitch API reachable"
    else
        check_warn "Twitch API not reachable (may be network issue)"
    fi
    
    # Check Stripe API (if configured)
    if [ -n "$STRIPE_SECRET_KEY" ]; then
        log_check "Stripe API reachability"
        if curl -f -s -m 5 https://api.stripe.com/v1 >/dev/null 2>&1 || [ $? -eq 22 ]; then
            check_pass "Stripe API reachable"
        else
            check_warn "Stripe API not reachable"
        fi
    fi
}

# Check security configurations
check_security() {
    log_header "Security Configuration"
    
    # Check GIN_MODE for production
    if [ "$ENVIRONMENT" = "production" ]; then
        log_check "GIN_MODE setting"
        if [ "${GIN_MODE:-debug}" = "release" ]; then
            check_pass "GIN_MODE set to release"
        else
            check_fail "GIN_MODE should be 'release' in production (current: ${GIN_MODE:-debug})"
        fi
    fi
    
    # Check for development credentials
    log_check "Production credentials"
    if [ "$ENVIRONMENT" = "production" ]; then
        if [[ "$DB_PASSWORD" == *"CHANGEME"* ]] || [[ "$DB_PASSWORD" == *"password"* ]]; then
            check_fail "Database password appears to be default/insecure"
        else
            check_pass "Database password appears secure"
        fi
    fi
    
    # Check SSL/TLS if URL provided
    if [ -n "$BASE_URL" ]; then
        log_check "SSL/TLS configuration"
        if [[ "$BASE_URL" == https://* ]]; then
            check_pass "Base URL uses HTTPS"
        else
            if [ "$ENVIRONMENT" = "production" ]; then
                check_fail "Base URL should use HTTPS in production"
            else
                check_warn "Base URL not using HTTPS"
            fi
        fi
    fi
}

# Check backups
check_backups() {
    if [ "$CHECK_LEVEL" != "full" ]; then
        return
    fi
    
    log_header "Backup Validation"
    
    BACKUP_DIR="${BACKUP_DIR:-/var/backups/clipper}"
    
    log_check "Backup directory"
    if [ -d "$BACKUP_DIR" ]; then
        check_pass "Backup directory exists: $BACKUP_DIR"
        
        # Check for recent backups
        log_check "Recent backups"
        RECENT_BACKUP=$(find "$BACKUP_DIR" -name "db-*.sql.gz" -mtime -1 2>/dev/null | head -1)
        if [ -n "$RECENT_BACKUP" ]; then
            BACKUP_SIZE=$(du -h "$RECENT_BACKUP" | cut -f1)
            check_pass "Recent backup found: $(basename "$RECENT_BACKUP") ($BACKUP_SIZE)"
        else
            check_warn "No recent backup found (within 24 hours)"
        fi
    else
        check_warn "Backup directory not found: $BACKUP_DIR"
    fi
}

# Generate summary
generate_summary() {
    log_header "Preflight Check Summary"
    
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Check Level: $CHECK_LEVEL"
    echo ""
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "  ${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "  ${YELLOW}Warnings: $WARNING_CHECKS${NC}"
    echo -e "  ${RED}Failed: $FAILED_CHECKS${NC}"
    echo ""
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            echo -e "${GREEN}✓ All preflight checks passed!${NC}"
            echo "Deployment may proceed."
            return 0
        else
            echo -e "${YELLOW}⚠ Preflight checks passed with warnings.${NC}"
            echo "Review warnings before proceeding with deployment."
            return 0
        fi
    else
        echo -e "${RED}✗ Preflight checks failed!${NC}"
        echo "Fix all failed checks before deploying to $ENVIRONMENT."
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║   Clipper Preflight Check v1.0.0      ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Redirect output to report file if specified
    if [ -n "$REPORT_FILE" ]; then
        exec > >(tee "$REPORT_FILE")
    fi
    
    # Run checks
    load_environment
    check_system_requirements
    check_environment_variables
    check_database
    check_redis
    
    if [ "$CHECK_LEVEL" = "full" ]; then
        check_external_services
        check_security
        check_backups
    fi
    
    # Generate summary
    generate_summary
    EXIT_CODE=$?
    
    if [ -n "$REPORT_FILE" ]; then
        echo ""
        echo "Report saved to: $REPORT_FILE"
    fi
    
    exit $EXIT_CODE
}

# Run main function
main
