#!/bin/bash
set -e

# Post-Migration Validation Script for Moderation System
# Validates database schema and data integrity after moderation migration

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

Post-migration validation script for moderation system.

OPTIONS:
    -e, --env ENV          Environment (staging|production) [default: staging]
    -r, --report FILE      Generate report to file
    -h, --help             Show this help message

EXAMPLES:
    $0 --env production
    $0 --env staging --report validation-report.txt

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
        -r|--report)
            REPORT_FILE="$2"
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Load environment
load_environment() {
    log_header "Loading Environment"
    
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
        check_fail "No .env file found"
        exit 1
    fi
    
    log_info "Environment: $ENVIRONMENT"
}

# Connect to database
connect_database() {
    if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
        check_fail "Database configuration incomplete"
        exit 1
    fi
    
    if ! command_exists psql; then
        check_fail "psql not installed"
        exit 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Test connection
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        check_fail "Database connection failed"
        unset PGPASSWORD
        exit 1
    fi
}

# Validate tables exist
validate_tables() {
    log_header "Table Validation"
    
    # Core moderation tables
    TABLES=(
        "moderation_audit_logs"
        "moderation_queue"
        "moderation_decisions"
        "moderation_appeals"
    )
    
    for table in "${TABLES[@]}"; do
        log_check "Table: $table"
        
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null | grep -q 't'; then
            # Get row count
            ROW_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
            check_pass "Table exists: $table ($ROW_COUNT rows)"
        else
            check_fail "Table missing: $table"
        fi
    done
}

# Validate table structure
validate_table_structure() {
    log_header "Table Structure Validation"
    
    # Check moderation_queue structure
    log_check "moderation_queue columns"
    EXPECTED_COLUMNS=("id" "content_type" "content_id" "reason" "priority" "status" "assigned_to" "reported_by" "report_count" "auto_flagged" "confidence_score" "created_at" "reviewed_at" "reviewed_by")
    
    MISSING_COLUMNS=()
    for col in "${EXPECTED_COLUMNS[@]}"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'moderation_queue' AND column_name = '$col';" 2>/dev/null | grep -q "$col"; then
            MISSING_COLUMNS+=("$col")
        fi
    done
    
    if [ ${#MISSING_COLUMNS[@]} -eq 0 ]; then
        check_pass "moderation_queue structure valid"
    else
        check_fail "moderation_queue missing columns: ${MISSING_COLUMNS[*]}"
    fi
    
    # Check moderation_decisions structure
    log_check "moderation_decisions columns"
    EXPECTED_COLUMNS=("id" "queue_item_id" "moderator_id" "action" "reason" "metadata" "created_at")
    
    MISSING_COLUMNS=()
    for col in "${EXPECTED_COLUMNS[@]}"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'moderation_decisions' AND column_name = '$col';" 2>/dev/null | grep -q "$col"; then
            MISSING_COLUMNS+=("$col")
        fi
    done
    
    if [ ${#MISSING_COLUMNS[@]} -eq 0 ]; then
        check_pass "moderation_decisions structure valid"
    else
        check_fail "moderation_decisions missing columns: ${MISSING_COLUMNS[*]}"
    fi
    
    # Check moderation_appeals structure
    log_check "moderation_appeals columns"
    EXPECTED_COLUMNS=("id" "moderation_action_id" "user_id" "reason" "status" "created_at" "resolved_at" "resolved_by" "resolution")
    
    MISSING_COLUMNS=()
    for col in "${EXPECTED_COLUMNS[@]}"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'moderation_appeals' AND column_name = '$col';" 2>/dev/null | grep -q "$col"; then
            MISSING_COLUMNS+=("$col")
        fi
    done
    
    if [ ${#MISSING_COLUMNS[@]} -eq 0 ]; then
        check_pass "moderation_appeals structure valid"
    else
        check_fail "moderation_appeals missing columns: ${MISSING_COLUMNS[*]}"
    fi
}

# Validate indexes
validate_indexes() {
    log_header "Index Validation"
    
    # Key indexes for moderation_queue
    INDEXES=(
        "idx_modqueue_status_priority"
        "idx_modqueue_content"
        "idx_modqueue_assigned_to"
        "idx_modqueue_created_at"
    )
    
    for index in "${INDEXES[@]}"; do
        log_check "Index: $index"
        
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT indexname FROM pg_indexes WHERE indexname = '$index';" 2>/dev/null | grep -q "$index"; then
            check_pass "Index exists: $index"
        else
            check_fail "Index missing: $index"
        fi
    done
    
    # Check unique constraint on moderation_queue
    log_check "Unique constraint: uq_modqueue_content_pending"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT indexname FROM pg_indexes WHERE indexname = 'uq_modqueue_content_pending';" 2>/dev/null | grep -q "uq_modqueue_content_pending"; then
        check_pass "Unique constraint exists: uq_modqueue_content_pending"
    else
        check_warn "Unique constraint missing: uq_modqueue_content_pending (may affect duplicate prevention)"
    fi
}

# Validate constraints
validate_constraints() {
    log_header "Constraint Validation"
    
    # Check foreign key constraints
    log_check "Foreign key constraints"
    
    FK_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name IN ('moderation_queue', 'moderation_decisions', 'moderation_appeals');" 2>/dev/null | xargs)
    
    if [ "$FK_COUNT" -ge 4 ]; then
        check_pass "Foreign key constraints present: $FK_COUNT"
    else
        check_warn "Few foreign key constraints found: $FK_COUNT (expected >= 4)"
    fi
    
    # Check check constraints
    log_check "Check constraints"
    
    CHECK_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'CHECK' AND table_name IN ('moderation_queue', 'moderation_decisions', 'moderation_appeals');" 2>/dev/null | xargs)
    
    if [ "$CHECK_COUNT" -ge 3 ]; then
        check_pass "Check constraints present: $CHECK_COUNT"
    else
        check_warn "Few check constraints found: $CHECK_COUNT (expected >= 3)"
    fi
}

# Validate triggers
validate_triggers() {
    log_header "Trigger Validation"
    
    log_check "Moderation triggers"
    
    # Check for moderation_appeals trigger
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT tgname FROM pg_trigger WHERE tgname = 'trg_moderation_appeals_resolved';" 2>/dev/null | grep -q "trg_moderation_appeals_resolved"; then
        check_pass "Trigger exists: trg_moderation_appeals_resolved"
    else
        check_warn "Trigger missing: trg_moderation_appeals_resolved (appeals may not auto-update)"
    fi
}

# Validate data integrity
validate_data_integrity() {
    log_header "Data Integrity Validation"
    
    # Check for orphaned records
    log_check "Orphaned moderation decisions"
    ORPHANED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM moderation_decisions WHERE queue_item_id NOT IN (SELECT id FROM moderation_queue);" 2>/dev/null | xargs)
    
    if [ "$ORPHANED" -eq 0 ]; then
        check_pass "No orphaned moderation decisions"
    else
        check_warn "Found $ORPHANED orphaned moderation decisions"
    fi
    
    # Check for invalid status values
    log_check "Invalid status values"
    INVALID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM moderation_queue WHERE status NOT IN ('pending', 'approved', 'rejected', 'escalated');" 2>/dev/null | xargs)
    
    if [ "$INVALID" -eq 0 ]; then
        check_pass "All status values valid"
    else
        check_fail "Found $INVALID records with invalid status"
    fi
    
    # Check priority ranges
    log_check "Priority value ranges"
    OUT_OF_RANGE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM moderation_queue WHERE priority < 0 OR priority > 100;" 2>/dev/null | xargs)
    
    if [ "$OUT_OF_RANGE" -eq 0 ]; then
        check_pass "All priority values in valid range (0-100)"
    else
        check_fail "Found $OUT_OF_RANGE records with invalid priority"
    fi
}

# Run smoke tests
run_smoke_tests() {
    log_header "Smoke Tests"
    
    # Test insert into moderation_queue
    log_check "Insert test: moderation_queue"
    
    TEST_USER_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM users LIMIT 1;" 2>/dev/null | xargs)
    
    if [ -z "$TEST_USER_ID" ]; then
        check_warn "No users found for smoke test"
    else
        # Try to insert a test record and capture its ID
        TEST_QUEUE_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "INSERT INTO moderation_queue (content_type, content_id, reason, status) VALUES ('comment', gen_random_uuid(), 'spam', 'pending') RETURNING id;" 2>/dev/null | xargs)
        
        if [ -n "$TEST_QUEUE_ID" ]; then
            check_pass "Insert test passed"
            
            # Clean up test record by its specific ID to avoid deleting real data
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM moderation_queue WHERE id = '$TEST_QUEUE_ID';" >/dev/null 2>&1
        else
            check_warn "Insert test failed (may be due to constraints)"
        fi
    fi
}

# Generate summary
generate_summary() {
    log_header "Validation Summary"
    
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo ""
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "  ${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "  ${YELLOW}Warnings: $WARNING_CHECKS${NC}"
    echo -e "  ${RED}Failed: $FAILED_CHECKS${NC}"
    echo ""
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            echo -e "${GREEN}✓ All validation checks passed!${NC}"
            echo "Moderation system is ready for use."
            return 0
        else
            echo -e "${YELLOW}⚠ Validation passed with warnings.${NC}"
            echo "Review warnings but system should be functional."
            return 0
        fi
    else
        echo -e "${RED}✗ Validation failed!${NC}"
        echo "Fix failed checks before using moderation system."
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║ Moderation Validation Script v1.0     ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Redirect output to report file if specified
    if [ -n "$REPORT_FILE" ]; then
        exec > >(tee "$REPORT_FILE")
    fi
    
    # Run validation
    load_environment
    connect_database
    validate_tables
    validate_table_structure
    validate_indexes
    validate_constraints
    validate_triggers
    validate_data_integrity
    run_smoke_tests
    
    # Cleanup
    unset PGPASSWORD
    
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
