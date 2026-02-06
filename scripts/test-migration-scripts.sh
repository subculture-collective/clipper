#!/bin/bash
set -e

# Test script for moderation migration scripts
# Performs static sanity checks (existence, permissions, shebangs, help, docs, optional shellcheck) without requiring a database

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    echo -e "\n${BLUE}[TEST]${NC} $1"
}

log_pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}[✓]${NC} $1"
}

log_fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}[✗]${NC} $1"
}

# Test 1: Check script files exist
test_scripts_exist() {
    log_test "Checking migration scripts exist"
    
    local scripts=(
        "preflight-moderation.sh"
        "migrate-moderation.sh"
        "validate-moderation.sh"
        "rollback-moderation.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ]; then
            log_pass "Script exists: $script"
        else
            log_fail "Script missing: $script"
        fi
    done
}

# Test 2: Check scripts are executable
test_scripts_executable() {
    log_test "Checking scripts are executable"
    
    local scripts=(
        "preflight-moderation.sh"
        "migrate-moderation.sh"
        "validate-moderation.sh"
        "rollback-moderation.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -x "$SCRIPT_DIR/$script" ]; then
            log_pass "Script executable: $script"
        else
            log_fail "Script not executable: $script"
        fi
    done
}

# Test 3: Check scripts have proper shebang
test_scripts_shebang() {
    log_test "Checking scripts have proper shebang"
    
    local scripts=(
        "preflight-moderation.sh"
        "migrate-moderation.sh"
        "validate-moderation.sh"
        "rollback-moderation.sh"
    )
    
    for script in "${scripts[@]}"; do
        if head -1 "$SCRIPT_DIR/$script" | grep -q "^#!/bin/bash"; then
            log_pass "Valid shebang: $script"
        else
            log_fail "Invalid shebang: $script"
        fi
    done
}

# Test 4: Check scripts have help option
test_scripts_help() {
    log_test "Checking scripts have help option"
    
    local scripts=(
        "preflight-moderation.sh"
        "migrate-moderation.sh"
        "validate-moderation.sh"
        "rollback-moderation.sh"
    )
    
    for script in "${scripts[@]}"; do
        if bash "$SCRIPT_DIR/$script" --help 2>&1 | grep -q "Usage:"; then
            log_pass "Help option works: $script"
        else
            log_fail "Help option missing: $script"
        fi
    done
}

# Test 5: Check scripts have set -e
test_scripts_error_handling() {
    log_test "Checking scripts have error handling (set -e)"
    
    local scripts=(
        "preflight-moderation.sh"
        "migrate-moderation.sh"
        "validate-moderation.sh"
        "rollback-moderation.sh"
    )
    
    for script in "${scripts[@]}"; do
        if head -5 "$SCRIPT_DIR/$script" | grep -q "set -e"; then
            log_pass "Error handling present: $script"
        else
            log_fail "Error handling missing: $script"
        fi
    done
}

# Test 6: Check migration files exist
test_migration_files() {
    log_test "Checking moderation migration files exist"
    
    local migrations=(
        "000011_add_moderation_audit_logs"
        "000049_add_moderation_queue_system"
        "000050_add_moderation_appeals"
        "000069_add_forum_moderation"
        "000097_update_moderation_audit_logs"
    )
    
    MIGRATIONS_DIR="$PROJECT_ROOT/backend/migrations"
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_fail "Migrations directory not found: $MIGRATIONS_DIR"
        return
    fi
    
    for migration in "${migrations[@]}"; do
        up_file=$(ls "$MIGRATIONS_DIR"/*"${migration}.up.sql" 2>/dev/null | head -1)
        down_file=$(ls "$MIGRATIONS_DIR"/*"${migration}.down.sql" 2>/dev/null | head -1)
        
        if [ -f "$up_file" ] && [ -f "$down_file" ]; then
            log_pass "Migration files exist: $migration"
        else
            log_fail "Migration files missing: $migration"
        fi
    done
}

# Test 7: Check documentation exists
test_documentation() {
    log_test "Checking documentation exists"
    
    if [ -f "$PROJECT_ROOT/docs/deployment/moderation-deployment.md" ]; then
        log_pass "Deployment guide exists"
    else
        log_fail "Deployment guide missing"
    fi
    
    if [ -f "$PROJECT_ROOT/docs/deployment/MODERATION_DEPLOYMENT_CHECKLIST.md" ]; then
        log_pass "Deployment checklist exists"
    else
        log_fail "Deployment checklist missing"
    fi
}

# Test 8: Syntax check (if shellcheck available)
test_script_syntax() {
    log_test "Checking script syntax"
    
    if ! command -v shellcheck >/dev/null 2>&1; then
        log_pass "shellcheck not installed, skipping syntax check"
        return
    fi
    
    local scripts=(
        "preflight-moderation.sh"
        "migrate-moderation.sh"
        "validate-moderation.sh"
        "rollback-moderation.sh"
    )
    
    for script in "${scripts[@]}"; do
        if shellcheck -S error "$SCRIPT_DIR/$script" >/dev/null 2>&1; then
            log_pass "Syntax valid: $script"
        else
            log_fail "Syntax errors: $script"
        fi
    done
}

# Generate summary
generate_summary() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}Test Summary${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo ""
    echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║  Migration Scripts Test Suite v1.0    ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
    
    test_scripts_exist
    test_scripts_executable
    test_scripts_shebang
    test_scripts_help
    test_scripts_error_handling
    test_migration_files
    test_documentation
    test_script_syntax
    
    generate_summary
}

main
