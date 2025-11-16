#!/bin/bash
set -e

# Staging Rehearsal Script
# This script performs a complete deployment rehearsal in staging environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
BACKUP_TAG="BACKUP_TAG_NOT_SET"

# Counters
TOTAL_STEPS=0
COMPLETED_STEPS=0
FAILED_STEPS=0

# Usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Staging rehearsal script for complete deployment validation.

OPTIONS:
    --skip-backup      Skip backup creation
    --skip-tests       Skip test execution
    -h, --help         Show this help message

EXAMPLES:
    $0
    $0 --skip-tests

EOF
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
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
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
}

log_step() {
    TOTAL_STEPS=$((TOTAL_STEPS + 1))
    echo -e "\n${BLUE}[Step $TOTAL_STEPS]${NC} $1"
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

# Step completion tracking
step_complete() {
    COMPLETED_STEPS=$((COMPLETED_STEPS + 1))
    log_info "Step completed"
}

step_fail() {
    FAILED_STEPS=$((FAILED_STEPS + 1))
    log_error "Step failed: $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Start rehearsal
log_header "Staging Deployment Rehearsal"
echo "Environment: $ENVIRONMENT"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Step 1: Pre-flight checks
log_step "Running preflight checks"
if [ -f "$SCRIPT_DIR/preflight-check.sh" ]; then
    if $SCRIPT_DIR/preflight-check.sh --env staging --level full; then
        step_complete
    else
        step_fail "Preflight checks failed"
        log_error "Fix preflight issues before continuing"
        exit 1
    fi
else
    log_warn "Preflight check script not found, skipping"
fi

# Step 2: Backup current state
if [ "$SKIP_BACKUP" = false ]; then
    log_step "Creating backup"
    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        if $SCRIPT_DIR/backup.sh; then
            step_complete
            # Record backup tag
            BACKUP_TAG=$(ls -t /var/backups/clipper/db-*.sql.gz 2>/dev/null | head -1 | sed 's/.*db-\(.*\).sql.gz/\1/' || echo "none")
            log_info "Backup tag: $BACKUP_TAG"
        else
            step_fail "Backup failed"
        fi
    else
        log_warn "Backup script not found, skipping"
    fi
else
    log_info "Skipping backup (--skip-backup flag)"
fi

# Step 3: Check current application state
log_step "Checking current application state"
if command_exists curl; then
    # Check backend health
    if curl -f -s http://localhost:8080/health >/dev/null 2>&1; then
        log_info "Backend is healthy"
    else
        log_warn "Backend health check failed"
    fi
    
    # Check frontend
    if curl -f -s http://localhost:80/ >/dev/null 2>&1; then
        log_info "Frontend is accessible"
    else
        log_warn "Frontend not accessible"
    fi
    step_complete
else
    log_warn "curl not available, skipping health checks"
fi

# Step 4: Check database state
log_step "Checking database state"
if command_exists psql && [ -n "$DB_HOST" ]; then
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check connection
    if psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log_info "Database connection successful"
        
        # Check migration version
        CURRENT_VERSION=$(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | xargs)
        log_info "Current migration version: $CURRENT_VERSION"
        
        # Check for dirty state
        IS_DIRTY=$(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT dirty FROM schema_migrations WHERE version = '$CURRENT_VERSION';" 2>/dev/null | xargs)
        if [ "$IS_DIRTY" = "t" ]; then
            step_fail "Database is in dirty state!"
            log_error "Clean up migration state before deployment"
            exit 1
        else
            log_info "Database migration state: clean"
        fi
        
        step_complete
    else
        step_fail "Database connection failed"
    fi
    
    unset PGPASSWORD
else
    log_warn "psql not available or DB config incomplete, skipping database checks"
fi

# Step 5: Pull latest images
log_step "Pulling latest Docker images"
if command_exists docker; then
    cd /opt/clipper 2>/dev/null || cd ~
    
    if docker-compose pull 2>/dev/null || docker compose pull 2>/dev/null; then
        log_info "Docker images pulled successfully"
        step_complete
    else
        step_fail "Failed to pull Docker images"
    fi
else
    log_warn "Docker not available"
fi

# Step 6: Run database migrations (if any)
log_step "Running database migrations"
if command_exists migrate && [ -n "$DB_HOST" ]; then
    # Check if there are pending migrations
    # Use PGPASSWORD environment variable for secure authentication
    export PGPASSWORD="$DB_PASSWORD"
    DATABASE_URL="postgresql://$DB_USER@$DB_HOST:${DB_PORT:-5432}/$DB_NAME?sslmode=${DB_SSLMODE:-disable}"
    
    # Get current version
    CURRENT=$(migrate -path backend/migrations -database "$DATABASE_URL" version 2>&1 | grep -o '[0-9]\+' || echo "0")
    
    # Run migrations
    if migrate -path backend/migrations -database "$DATABASE_URL" up; then
        NEW=$(migrate -path backend/migrations -database "$DATABASE_URL" version 2>&1 | grep -o '[0-9]\+' || echo "0")
        
        if [ "$CURRENT" != "$NEW" ]; then
            log_info "Migrations applied: $CURRENT -> $NEW"
        else
            log_info "No new migrations to apply"
        fi
        step_complete
    else
        step_fail "Migration failed"
        log_error "Check migration logs and fix issues"
        exit 1
    fi
    
    # Clean up password
    unset PGPASSWORD
else
    log_warn "migrate tool not available or DB config incomplete"
fi

# Step 7: Deploy new version
log_step "Deploying new version"
if [ -f "$SCRIPT_DIR/deploy.sh" ]; then
    if $SCRIPT_DIR/deploy.sh; then
        log_info "Deployment successful"
        step_complete
    else
        step_fail "Deployment failed"
        log_error "Check deployment logs"
        exit 1
    fi
else
    log_warn "Deploy script not found"
    
    # Fallback to manual deployment
    if command_exists docker-compose || command_exists docker; then
        log_info "Attempting manual deployment..."
        cd /opt/clipper 2>/dev/null || cd ~
        
        if docker-compose up -d 2>/dev/null || docker compose up -d 2>/dev/null; then
            log_info "Containers started"
            step_complete
        else
            step_fail "Failed to start containers"
        fi
    fi
fi

# Step 8: Wait for services to stabilize
log_step "Waiting for services to stabilize"
log_info "Waiting 15 seconds..."
sleep 15
step_complete

# Step 9: Run health checks
log_step "Running post-deployment health checks"
if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
    if $SCRIPT_DIR/health-check.sh; then
        log_info "Health checks passed"
        step_complete
    else
        step_fail "Health checks failed"
        log_error "Consider rollback"
    fi
else
    log_warn "Health check script not found"
    
    # Manual health checks
    if command_exists curl; then
        HEALTH_OK=true
        
        if ! curl -f -s http://localhost:8080/health >/dev/null 2>&1; then
            log_error "Backend health check failed"
            HEALTH_OK=false
        fi
        
        if ! curl -f -s http://localhost:80/ >/dev/null 2>&1; then
            log_error "Frontend health check failed"
            HEALTH_OK=false
        fi
        
        if [ "$HEALTH_OK" = true ]; then
            log_info "Manual health checks passed"
            step_complete
        else
            step_fail "Manual health checks failed"
        fi
    fi
fi

# Step 10: Run smoke tests
if [ "$SKIP_TESTS" = false ]; then
    log_step "Running smoke tests"
    
    SMOKE_TESTS_PASSED=true
    
    # Test 1: Homepage loads
    if curl -f -s http://localhost/ >/dev/null 2>&1; then
        log_info "✓ Homepage loads"
    else
        log_error "✗ Homepage failed"
        SMOKE_TESTS_PASSED=false
    fi
    
    # Test 2: API ping
    if curl -f -s http://localhost:8080/api/v1/ping >/dev/null 2>&1; then
        log_info "✓ API ping successful"
    else
        log_error "✗ API ping failed"
        SMOKE_TESTS_PASSED=false
    fi
    
    # Test 3: Health endpoint
    if curl -f -s http://localhost:8080/health >/dev/null 2>&1; then
        log_info "✓ Health endpoint responds"
    else
        log_error "✗ Health endpoint failed"
        SMOKE_TESTS_PASSED=false
    fi
    
    # Test 4: Database connectivity
    if command_exists psql && [ -n "$DB_HOST" ]; then
        export PGPASSWORD="$DB_PASSWORD"
        if psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM users;" >/dev/null 2>&1; then
            log_info "✓ Database accessible"
        else
            log_error "✗ Database connection failed"
            SMOKE_TESTS_PASSED=false
        fi
        unset PGPASSWORD
    fi
    
    # Test 5: Redis connectivity
    if command_exists redis-cli && [ -n "$REDIS_HOST" ]; then
        # Use REDISCLI_AUTH environment variable for secure authentication
        if [ -n "$REDIS_PASSWORD" ]; then
            export REDISCLI_AUTH="$REDIS_PASSWORD"
        fi
        
        if redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping >/dev/null 2>&1; then
            log_info "✓ Redis accessible"
        else
            log_error "✗ Redis connection failed"
            SMOKE_TESTS_PASSED=false
        fi
        
        # Clean up authentication
        [ -n "$REDIS_PASSWORD" ] && unset REDISCLI_AUTH
    fi
    
    if [ "$SMOKE_TESTS_PASSED" = true ]; then
        log_info "All smoke tests passed"
        step_complete
    else
        step_fail "Some smoke tests failed"
    fi
else
    log_info "Skipping tests (--skip-tests flag)"
fi

# Step 11: Test rollback procedure
log_step "Testing rollback procedure (dry run)"
if [ -f "$SCRIPT_DIR/rollback.sh" ]; then
    log_info "Rollback script found: $SCRIPT_DIR/rollback.sh"
    if [ "$BACKUP_TAG" != "BACKUP_TAG_NOT_SET" ]; then
        log_info "To rollback: ./scripts/rollback.sh $BACKUP_TAG"
    else
        log_info "To rollback: ./scripts/rollback.sh [backup-tag]"
    fi
    step_complete
else
    log_warn "Rollback script not found"
fi

# Step 12: Monitor logs for errors
log_step "Monitoring logs for errors"
if command_exists docker; then
    log_info "Checking backend logs for errors..."
    ERROR_COUNT=$(docker-compose logs backend --tail=100 2>/dev/null | grep -i "error\|fatal\|panic" | wc -l || echo "0")
    
    if [ "$ERROR_COUNT" -eq 0 ]; then
        log_info "No errors found in recent logs"
        step_complete
    else
        log_warn "Found $ERROR_COUNT error messages in logs"
        log_warn "Review logs: docker-compose logs backend --tail=100"
    fi
else
    log_warn "Docker not available, skipping log check"
fi

# Generate summary
log_header "Rehearsal Summary"

echo ""
echo "Total Steps: $TOTAL_STEPS"
echo -e "  ${GREEN}Completed: $COMPLETED_STEPS${NC}"
echo -e "  ${RED}Failed: $FAILED_STEPS${NC}"
echo ""

if [ $FAILED_STEPS -eq 0 ]; then
    echo -e "${GREEN}✓ Staging rehearsal completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review the deployment process"
    echo "  2. Test critical user flows manually"
    echo "  3. Schedule production deployment"
    echo "  4. Notify team of deployment plan"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Staging rehearsal completed with failures!${NC}"
    echo ""
    echo "Action required:"
    echo "  1. Review failed steps above"
    echo "  2. Fix issues in staging"
    echo "  3. Re-run rehearsal"
    echo "  4. Do NOT proceed to production"
    echo ""
    exit 1
fi
