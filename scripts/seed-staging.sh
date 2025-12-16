#!/bin/bash
set -euo pipefail

# Staging Database Seed Script
# Seeds the staging database with test data for deployment validation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STAGING_DIR="${STAGING_DIR:-/opt/clipper-staging}"
BACKEND_SCRIPTS_DIR="${PROJECT_ROOT}/backend/scripts"
MIGRATIONS_DIR="${PROJECT_ROOT}/backend/migrations"

# Options
INCLUDE_COMMENTS="${INCLUDE_COMMENTS:-true}"
INCLUDE_LOAD_TEST="${INCLUDE_LOAD_TEST:-false}"
CUSTOM_SEED_FILE="${CUSTOM_SEED_FILE:-}"

# Usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Seed staging database with test data.

OPTIONS:
    --staging-dir PATH      Staging directory (default: /opt/clipper-staging)
    --no-comments           Skip comment seed data
    --load-test             Include load test data (large dataset)
    --seed-file PATH        Use custom seed file
    -h, --help              Show this help message

EXAMPLES:
    $0
    $0 --staging-dir /home/deploy/staging
    $0 --load-test
    $0 --seed-file /path/to/custom-seed.sql

PREREQUISITES:
    - Staging environment already set up
    - Database running and accessible
    - .env file configured in staging directory

EOF
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --staging-dir)
            STAGING_DIR="$2"
            shift 2
            ;;
        --no-comments)
            INCLUDE_COMMENTS=false
            shift
            ;;
        --load-test)
            INCLUDE_LOAD_TEST=true
            shift
            ;;
        --seed-file)
            CUSTOM_SEED_FILE="$2"
            shift 2
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
    echo -e "\n${BLUE}[Step]${NC} $1"
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

log_header "Staging Database Seeding"
echo "Staging Directory: $STAGING_DIR"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Step 1: Check prerequisites
log_step "Checking prerequisites"

if [ ! -d "$STAGING_DIR" ]; then
    log_error "Staging directory not found: $STAGING_DIR"
    log_error "Run setup-staging.sh first"
    exit 1
fi

if [ ! -f "$STAGING_DIR/.env" ]; then
    log_error ".env file not found in $STAGING_DIR"
    exit 1
fi

# Load environment variables
log_info "Loading environment from $STAGING_DIR/.env"
set -a
# shellcheck source=/dev/null
source "$STAGING_DIR/.env"
set +a

# Check psql
if ! command_exists psql; then
    log_error "psql is required but not installed"
    log_error "Install with: apt-get install postgresql-client"
    exit 1
fi

log_info "Prerequisites satisfied"

# Step 2: Test database connection
log_step "Testing database connection"

export PGPASSWORD="${DB_PASSWORD}"

# Determine connection method
if [ "${DB_HOST:-}" = "postgres" ] || [ "${DB_HOST:-}" = "localhost" ]; then
    # Using Docker container
    DB_CONTAINER="clipper-staging-postgres"
    
    if docker ps --format '{{.Names}}' | grep -q "$DB_CONTAINER"; then
        log_info "Using Docker container: $DB_CONTAINER"
        PSQL_CMD="docker exec -i $DB_CONTAINER psql -U ${DB_USER} -d ${DB_NAME}"
    else
        log_error "PostgreSQL container not running: $DB_CONTAINER"
        log_error "Start services with: cd $STAGING_DIR && docker compose up -d"
        exit 1
    fi
else
    # Direct connection
    log_info "Connecting to PostgreSQL at ${DB_HOST}:${DB_PORT}"
    PSQL_CMD="psql -h ${DB_HOST} -p ${DB_PORT:-5432} -U ${DB_USER} -d ${DB_NAME}"
fi

# Test connection
if $PSQL_CMD -c "SELECT 1;" >/dev/null 2>&1; then
    log_info "Database connection successful"
else
    log_error "Failed to connect to database"
    exit 1
fi

# Step 3: Check if database is already seeded
log_step "Checking database state"

USER_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")

if [ "$USER_COUNT" -gt 0 ]; then
    log_warn "Database already contains $USER_COUNT users"
    echo -n "Do you want to continue seeding? This may create duplicate data. (y/N): "
    read -r CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        log_info "Seeding cancelled"
        exit 0
    fi
fi

# Step 4: Run migrations (if needed)
log_step "Ensuring migrations are up to date"

if command_exists migrate && [ -d "$MIGRATIONS_DIR" ]; then
    # Use PGPASSWORD for authentication (already set above)
    DATABASE_URL="postgresql://${DB_USER}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}?sslmode=${DB_SSLMODE:-disable}"
    
    log_info "Running migrations..."
    if migrate -path "$MIGRATIONS_DIR" -database "$DATABASE_URL" up; then
        log_info "Migrations applied successfully"
    else
        log_error "Failed to apply migrations"
        exit 1
    fi
else
    log_warn "migrate tool not found, skipping migration check"
fi

# Step 5: Seed base data
log_step "Seeding base data"

if [ -n "$CUSTOM_SEED_FILE" ]; then
    SEED_FILE="$CUSTOM_SEED_FILE"
    log_info "Using custom seed file: $SEED_FILE"
elif [ -f "$MIGRATIONS_DIR/seed.sql" ]; then
    SEED_FILE="$MIGRATIONS_DIR/seed.sql"
    log_info "Using default seed file: $SEED_FILE"
else
    log_error "No seed file found"
    exit 1
fi

if [ -f "$SEED_FILE" ]; then
    log_info "Applying seed data..."
    if $PSQL_CMD < "$SEED_FILE" 2>&1 | grep -v "NOTICE"; then
        log_info "Base seed data applied"
    else
        log_error "Failed to apply seed data"
        exit 1
    fi
else
    log_error "Seed file not found: $SEED_FILE"
    exit 1
fi

# Step 6: Seed comments (optional)
if [ "$INCLUDE_COMMENTS" = true ]; then
    log_step "Seeding comment data"
    
    COMMENTS_SEED="$MIGRATIONS_DIR/seed_comments.sql"
    
    if [ -f "$COMMENTS_SEED" ]; then
        log_info "Applying comment seed data..."
        if $PSQL_CMD < "$COMMENTS_SEED" 2>&1 | grep -v "NOTICE"; then
            log_info "Comment seed data applied"
        else
            log_warn "Failed to apply comment seed data (may already exist)"
        fi
    else
        log_warn "Comment seed file not found: $COMMENTS_SEED"
    fi
fi

# Step 7: Load test data (optional)
if [ "$INCLUDE_LOAD_TEST" = true ]; then
    log_step "Seeding load test data"
    
    LOAD_TEST_SEED="$MIGRATIONS_DIR/seed_load_test.sql"
    
    if [ -f "$LOAD_TEST_SEED" ]; then
        log_warn "Loading test data (this may take several minutes)..."
        if $PSQL_CMD < "$LOAD_TEST_SEED" 2>&1 | grep -v "NOTICE"; then
            log_info "Load test data applied"
        else
            log_error "Failed to apply load test data"
            exit 1
        fi
    else
        log_warn "Load test seed file not found: $LOAD_TEST_SEED"
    fi
fi

# Step 8: Verify seeded data
log_step "Verifying seeded data"

USER_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM users;" | xargs)
SUBMISSION_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM submissions;" | xargs)
COMMENT_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM comments;" | xargs || echo "0")

log_info "Users: $USER_COUNT"
log_info "Submissions: $SUBMISSION_COUNT"
log_info "Comments: $COMMENT_COUNT"

# Step 9: Create test admin user (if not exists)
log_step "Creating test admin user"

ADMIN_EMAIL="admin@staging.clipper.app"
ADMIN_USERNAME="staging_admin"

# Check if admin exists (using safe parameter to avoid SQL injection)
ADMIN_EXISTS=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM users WHERE email = \$\$${ADMIN_EMAIL}\$\$;" | xargs)

if [ "$ADMIN_EXISTS" -eq 0 ]; then
    log_warn "Admin user does not exist in database yet"
    
    # Generate a secure random password (20 characters)
    ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
    
    # Save credentials to secure file instead of logging
    CREDENTIALS_FILE="/var/backups/clipper-staging/admin-credentials.txt"
    mkdir -p /var/backups/clipper-staging
    cat > "$CREDENTIALS_FILE" << EOF
Staging Admin Credentials ($(date '+%Y-%m-%d %H:%M:%S'))
================================================================
Username: $ADMIN_USERNAME
Email: $ADMIN_EMAIL
Password: $ADMIN_PASSWORD

IMPORTANT: 
- The admin user does NOT yet exist in the database
- First, create the user by registering via the application UI using these credentials
- After the user exists, run setup-admin.sh to grant admin privileges
- Delete this file after noting credentials securely
- These are test credentials for staging only
================================================================
EOF
    chmod 600 "$CREDENTIALS_FILE"
    chown deploy:deploy "$CREDENTIALS_FILE"
    
    log_info "Admin credentials saved to: $CREDENTIALS_FILE"
    log_warn "IMPORTANT: User must register via application UI first"
    log_warn "Then run setup-admin.sh to grant admin privileges"
    log_warn "Retrieve credentials with: sudo cat $CREDENTIALS_FILE"
else
    log_info "Admin user already exists: $ADMIN_EMAIL"
fi

# Cleanup
unset PGPASSWORD

# Summary
log_header "Seeding Complete!"

echo ""
echo "Database Statistics:"
echo "  Users: $USER_COUNT"
echo "  Submissions: $SUBMISSION_COUNT"
echo "  Comments: $COMMENT_COUNT"
echo ""
echo "Staging environment ready for testing!"
echo ""
echo "Access the application:"
echo "  URL: https://${STAGING_DOMAIN:-staging.clpr.tv}"
echo "  Health: https://${STAGING_DOMAIN:-staging.clpr.tv}/health"
echo ""
echo "Next steps:"
echo "  1. Verify application is accessible"
echo "  2. Run smoke tests"
echo "  3. Test critical user flows"
echo "  4. Validate API endpoints"
echo ""
