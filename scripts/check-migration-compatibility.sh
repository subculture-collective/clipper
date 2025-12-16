#!/bin/bash
# Database Migration Backward Compatibility Checker
# Ensures migrations can be applied without breaking the currently running version

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MIGRATIONS_DIR="${MIGRATIONS_DIR:-./backend/migrations}"
DB_CONNECTION="${DB_CONNECTION:-postgresql://clipper:clipper_password@localhost:5432/clipper_db?sslmode=disable}"

# Log functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if migrate tool is available
check_migrate_tool() {
    if ! command -v migrate &> /dev/null; then
        log_error "golang-migrate tool not found"
        log_info "Install with: brew install golang-migrate (macOS) or"
        log_info "  curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xvz"
        return 1
    fi
    return 0
}

# Analyze migration for backward compatibility issues
check_migration_compatibility() {
    local migration_file=$1
    local issues=0
    
    log_info "Analyzing: $(basename "$migration_file")"
    
    # Check for potentially breaking changes
    if grep -qi "DROP TABLE" "$migration_file"; then
        log_error "  ✗ Contains DROP TABLE (breaks old version)"
        issues=$((issues + 1))
    fi
    
    if grep -qi "DROP COLUMN" "$migration_file"; then
        log_error "  ✗ Contains DROP COLUMN (may break old version)"
        issues=$((issues + 1))
    fi
    
    if grep -qi "ALTER TABLE.*ALTER COLUMN.*NOT NULL" "$migration_file"; then
        log_error "  ✗ Makes column NOT NULL (may break old version if no default)"
        issues=$((issues + 1))
    fi
    
    if grep -qi "ALTER TABLE.*RENAME COLUMN" "$migration_file"; then
        log_error "  ✗ Renames column (breaks old version)"
        issues=$((issues + 1))
    fi
    
    if grep -qi "RENAME TABLE" "$migration_file"; then
        log_error "  ✗ Renames table (breaks old version)"
        issues=$((issues + 1))
    fi
    
    # Check for safe operations
    if grep -qi "CREATE TABLE" "$migration_file"; then
        log_success "  ✓ Creates new table (safe)"
    fi
    
    if grep -qi "ADD COLUMN" "$migration_file"; then
        if grep -qi "DEFAULT" "$migration_file"; then
            log_success "  ✓ Adds column with default (safe)"
        else
            log_warn "  ⚠ Adds column without default (old version won't populate)"
        fi
    fi
    
    if grep -qi "CREATE INDEX" "$migration_file"; then
        log_success "  ✓ Creates index (safe)"
    fi
    
    return $issues
}

# Provide recommendations for backward-compatible migrations
show_recommendations() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Backward Compatible Migration Guidelines                     ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "✓ SAFE operations for blue-green deployment:"
    echo "  - CREATE TABLE (new tables)"
    echo "  - ADD COLUMN (with DEFAULT value or NULL allowed)"
    echo "  - CREATE INDEX (improves performance)"
    echo "  - INSERT data (add new reference data)"
    echo ""
    echo "✗ UNSAFE operations (require two-phase migration):"
    echo "  - DROP TABLE"
    echo "  - DROP COLUMN"
    echo "  - RENAME TABLE/COLUMN"
    echo "  - ALTER COLUMN to NOT NULL (without default)"
    echo "  - Change column types"
    echo ""
    echo "🔄 Two-phase migration pattern:"
    echo "  Phase 1 (before old version stops):"
    echo "    - ADD new columns/tables"
    echo "    - Keep old columns/tables"
    echo "    - Update code to write to both old and new"
    echo ""
    echo "  Phase 2 (after new version is stable):"
    echo "    - Remove old columns/tables"
    echo "    - Clean up deprecated code"
    echo ""
}

# Main function
main() {
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Database Migration Compatibility Checker      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Check for migrate tool
    if ! check_migrate_tool; then
        log_warn "Skipping version check, analyzing files only"
    fi
    
    # Check if migrations directory exists
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        exit 1
    fi
    
    log_info "Scanning migrations in: $MIGRATIONS_DIR"
    echo ""
    
    # Find all "up" migration files
    total_issues=0
    migration_count=0
    
    for migration_file in "$MIGRATIONS_DIR"/*.up.sql; do
        if [ -f "$migration_file" ]; then
            migration_count=$((migration_count + 1))
            check_migration_compatibility "$migration_file"
            issues=$?
            total_issues=$((total_issues + issues))
            echo ""
        fi
    done
    
    # Summary
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo ""
    
    if [ $migration_count -eq 0 ]; then
        log_warn "No migration files found"
        exit 0
    fi
    
    log_info "Analyzed $migration_count migration(s)"
    
    if [ $total_issues -eq 0 ]; then
        log_success "No backward compatibility issues detected"
        log_success "Migrations appear safe for blue-green deployment"
        show_recommendations
        exit 0
    else
        log_error "Found $total_issues potential compatibility issue(s)"
        log_warn "Review migrations before blue-green deployment"
        show_recommendations
        exit 1
    fi
}

# Run main function
main "$@"
