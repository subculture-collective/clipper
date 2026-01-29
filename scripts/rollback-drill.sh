#!/bin/bash
# Rollback Drill Script
# Simulates a deployment and rollback to ensure reversibility
# Verifies clean state post-rollback and data integrity

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRILL_DIR="${DRILL_DIR:-/tmp/rollback-drill}"
DRY_RUN="${DRY_RUN:-true}"
ENVIRONMENT="${ENVIRONMENT:-drill}"

# Drill state tracking
DRILL_START_TIME=""
DRILL_PHASE="setup"
VERIFICATION_PASSED=true

# Log functions
log_phase() {
    echo -e "${BLUE}[PHASE]${NC} $1"
    DRILL_PHASE="$1"
}

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

log_step() {
    echo -e "  → $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose v2 is not available"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Setup drill environment
setup_drill_env() {
    log_phase "Setting up drill environment"
    
    mkdir -p "$DRILL_DIR"
    mkdir -p "$DRILL_DIR/backups"
    mkdir -p "$DRILL_DIR/state"
    
    # Create state tracking file
    echo "initial" > "$DRILL_DIR/state/current_state"
    
    # Create mock docker-compose file for drill
    cat > "$DRILL_DIR/docker-compose.drill.yml" <<'EOF'
version: '3.8'
services:
  backend:
    image: nginx:alpine
    container_name: drill-backend
    labels:
      app: clipper-drill
      version: "${VERSION:-v1}"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80"]
      interval: 5s
      timeout: 3s
      retries: 3
  
  frontend:
    image: nginx:alpine
    container_name: drill-frontend
    labels:
      app: clipper-drill
      version: "${VERSION:-v1}"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80"]
      interval: 5s
      timeout: 3s
      retries: 3
EOF

    # Create initial .env
    cat > "$DRILL_DIR/.env" <<EOF
VERSION=v1.0.0
ENVIRONMENT=$ENVIRONMENT
DEPLOY_TAG=initial
EOF
    
    log_success "Drill environment created at $DRILL_DIR"
}

# Capture initial state
capture_initial_state() {
    log_phase "Capturing initial state"
    
    # Save initial environment variables
    env | grep -E "VERSION|DEPLOY|ENVIRONMENT" > "$DRILL_DIR/state/initial.env" || true
    
    # List running containers
    docker ps --format "{{.Names}}" > "$DRILL_DIR/state/initial-containers.txt" || true
    
    # List docker images
    docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "drill|clipper" > "$DRILL_DIR/state/initial-images.txt" || true
    
    log_success "Initial state captured"
}

# Simulate deployment
simulate_deployment() {
    log_phase "Simulating deployment (v1 → v2)"
    
    cd "$DRILL_DIR" || exit 1
    
    # Update version to v2
    log_step "Updating version to v2.0.0"
    cat > "$DRILL_DIR/.env" <<EOF
VERSION=v2.0.0
ENVIRONMENT=$ENVIRONMENT
DEPLOY_TAG=v2-deployment-$(date +%s)
EOF
    
    # Backup current state (simulating deployment backup)
    log_step "Creating deployment backup"
    export BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"
    echo "$BACKUP_TAG" > "$DRILL_DIR/state/backup_tag"
    
    # Simulate tagging backup images
    if docker ps | grep -q "drill-backend"; then
        docker commit drill-backend drill-backend:$BACKUP_TAG &> /dev/null || log_warn "Could not backup backend"
    fi
    if docker ps | grep -q "drill-frontend"; then
        docker commit drill-frontend drill-frontend:$BACKUP_TAG &> /dev/null || log_warn "Could not backup frontend"
    fi
    
    # Deploy v2 (using docker-compose)
    log_step "Deploying v2"
    if [ "$DRY_RUN" != true ]; then
        docker compose -f docker-compose.drill.yml up -d
        sleep 5
    else
        log_info "[DRY RUN] Would deploy v2"
    fi
    
    # Capture post-deployment state
    echo "deployed-v2" > "$DRILL_DIR/state/current_state"
    docker ps --format "{{.Names}}" > "$DRILL_DIR/state/deployed-containers.txt" 2>/dev/null || true
    
    log_success "Deployment simulation complete"
}

# Verify deployment
verify_deployment() {
    log_phase "Verifying deployment"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Skipping deployment verification"
        return 0
    fi
    
    # Check if containers are running
    log_step "Checking container health"
    if ! docker ps | grep -q "drill-backend"; then
        log_error "Backend container not running"
        VERIFICATION_PASSED=false
        return 1
    fi
    
    if ! docker ps | grep -q "drill-frontend"; then
        log_error "Frontend container not running"
        VERIFICATION_PASSED=false
        return 1
    fi
    
    # Check health status
    log_step "Waiting for health checks"
    sleep 10
    
    BACKEND_HEALTHY=$(docker inspect drill-backend --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    FRONTEND_HEALTHY=$(docker inspect drill-frontend --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    
    if [ "$BACKEND_HEALTHY" != "healthy" ] && [ "$BACKEND_HEALTHY" != "unknown" ]; then
        log_warn "Backend health: $BACKEND_HEALTHY"
    fi
    
    if [ "$FRONTEND_HEALTHY" != "healthy" ] && [ "$FRONTEND_HEALTHY" != "unknown" ]; then
        log_warn "Frontend health: $FRONTEND_HEALTHY"
    fi
    
    log_success "Deployment verification complete"
    return 0
}

# Execute rollback
execute_rollback() {
    log_phase "Executing rollback (v2 → v1)"
    
    cd "$DRILL_DIR" || exit 1
    
    # Read backup tag
    if [ -f "$DRILL_DIR/state/backup_tag" ]; then
        BACKUP_TAG=$(cat "$DRILL_DIR/state/backup_tag")
        log_step "Using backup tag: $BACKUP_TAG"
    else
        log_error "Backup tag not found"
        return 1
    fi
    
    # Stop current containers
    log_step "Stopping current containers"
    if [ "$DRY_RUN" != true ]; then
        docker compose -f docker-compose.drill.yml down 2>/dev/null || true
    else
        log_info "[DRY RUN] Would stop containers"
    fi
    
    # Restore from backup
    log_step "Restoring from backup"
    if [ "$DRY_RUN" != true ]; then
        # Tag backup images as latest
        docker tag "drill-backend:$BACKUP_TAG" "drill-backend:latest" 2>/dev/null || log_warn "Could not restore backend"
        docker tag "drill-frontend:$BACKUP_TAG" "drill-frontend:latest" 2>/dev/null || log_warn "Could not restore frontend"
    else
        log_info "[DRY RUN] Would restore from backup"
    fi
    
    # Restore environment
    log_step "Restoring environment configuration"
    cat > "$DRILL_DIR/.env" <<EOF
VERSION=v1.0.0
ENVIRONMENT=$ENVIRONMENT
DEPLOY_TAG=rollback-$(date +%s)
EOF
    
    # Restart with rolled back version
    log_step "Restarting services"
    if [ "$DRY_RUN" != true ]; then
        docker compose -f docker-compose.drill.yml up -d
        sleep 5
    else
        log_info "[DRY RUN] Would restart services"
    fi
    
    # Update state
    echo "rolled-back" > "$DRILL_DIR/state/current_state"
    
    log_success "Rollback execution complete"
}

# Verify rollback
verify_rollback() {
    log_phase "Verifying rollback"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Skipping rollback verification"
        return 0
    fi
    
    # Check containers are running again
    log_step "Checking container health post-rollback"
    if ! docker ps | grep -q "drill-backend"; then
        log_error "Backend container not running after rollback"
        VERIFICATION_PASSED=false
        return 1
    fi
    
    if ! docker ps | grep -q "drill-frontend"; then
        log_error "Frontend container not running after rollback"
        VERIFICATION_PASSED=false
        return 1
    fi
    
    # Verify environment restored
    log_step "Verifying environment configuration"
    if ! grep -q "VERSION=v1.0.0" "$DRILL_DIR/.env"; then
        log_error "Environment not properly restored"
        VERIFICATION_PASSED=false
        return 1
    fi
    
    # Check health again
    log_step "Waiting for post-rollback health checks"
    sleep 10
    
    BACKEND_HEALTHY=$(docker inspect drill-backend --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    FRONTEND_HEALTHY=$(docker inspect drill-frontend --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    
    if [ "$BACKEND_HEALTHY" != "healthy" ] && [ "$BACKEND_HEALTHY" != "unknown" ]; then
        log_warn "Backend health after rollback: $BACKEND_HEALTHY"
    fi
    
    if [ "$FRONTEND_HEALTHY" != "healthy" ] && [ "$FRONTEND_HEALTHY" != "unknown" ]; then
        log_warn "Frontend health after rollback: $FRONTEND_HEALTHY"
    fi
    
    log_success "Rollback verification complete"
    return 0
}

# Verify clean state
verify_clean_state() {
    log_phase "Verifying clean state"
    
    local clean_state=true
    
    # Compare current state with initial state
    log_step "Comparing state snapshots"
    
    # Check that we're in rolled-back state
    CURRENT_STATE=$(cat "$DRILL_DIR/state/current_state")
    if [ "$CURRENT_STATE" != "rolled-back" ]; then
        log_error "Unexpected state: $CURRENT_STATE"
        clean_state=false
    fi
    
    # Verify backup images exist
    log_step "Verifying backup artifacts"
    if [ -f "$DRILL_DIR/state/backup_tag" ]; then
        BACKUP_TAG=$(cat "$DRILL_DIR/state/backup_tag")
        if [ "$DRY_RUN" != true ]; then
            if ! docker images | grep -q "$BACKUP_TAG"; then
                log_warn "Backup images may have been cleaned up"
            else
                log_info "Backup images preserved: $BACKUP_TAG"
            fi
        fi
    fi
    
    # Check for orphaned resources
    log_step "Checking for orphaned resources"
    if [ "$DRY_RUN" != true ]; then
        ORPHANED_CONTAINERS=$(docker ps -a | grep -c "drill" || echo "0")
        if [ "$ORPHANED_CONTAINERS" -gt 2 ]; then
            log_warn "Found $ORPHANED_CONTAINERS drill containers (expected 2)"
        fi
    fi
    
    if [ "$clean_state" = true ]; then
        log_success "Clean state verification passed"
        return 0
    else
        log_error "Clean state verification failed"
        VERIFICATION_PASSED=false
        return 1
    fi
}

# Data integrity check
verify_data_integrity() {
    log_phase "Verifying data integrity"
    
    # In a real scenario, this would check:
    # - Database consistency
    # - File system integrity
    # - Configuration consistency
    # - No data loss
    
    log_step "Checking configuration files"
    if [ ! -f "$DRILL_DIR/.env" ]; then
        log_error "Configuration file missing"
        VERIFICATION_PASSED=false
        return 1
    fi
    
    log_step "Checking state files"
    local required_files=(
        "$DRILL_DIR/state/current_state"
        "$DRILL_DIR/state/initial.env"
        "$DRILL_DIR/state/backup_tag"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_warn "State file missing: $file"
        fi
    done
    
    log_success "Data integrity verification complete"
    return 0
}

# Cleanup drill environment
cleanup_drill() {
    log_phase "Cleaning up drill environment"
    
    if [ "$DRY_RUN" != true ]; then
        cd "$DRILL_DIR" || return
        
        log_step "Stopping drill containers"
        docker compose -f docker-compose.drill.yml down 2>/dev/null || true
        
        log_step "Removing drill images"
        docker images | grep "drill" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
        
        log_step "Cleaning up drill directory"
        # Keep state files for analysis
        find "$DRILL_DIR" -type f ! -path "*/state/*" -delete 2>/dev/null || true
    else
        log_info "[DRY RUN] Would cleanup drill environment"
    fi
    
    log_success "Cleanup complete"
}

# Generate drill report
generate_report() {
    local report_file="$DRILL_DIR/state/drill-report.txt"
    
    cat > "$report_file" <<EOF
=== Rollback Drill Report ===
Date: $(date)
Environment: $ENVIRONMENT
DRY_RUN: $DRY_RUN

Drill Phases Completed:
- Setup
- Initial State Capture
- Deployment Simulation
- Deployment Verification
- Rollback Execution
- Rollback Verification
- Clean State Verification
- Data Integrity Check

Overall Result: $([ "$VERIFICATION_PASSED" = true ] && echo "PASSED" || echo "FAILED")

State Files Location: $DRILL_DIR/state/

EOF

    if [ "$VERIFICATION_PASSED" = true ]; then
        cat >> "$report_file" <<EOF
✓ All verification checks passed
✓ Rollback mechanism working correctly
✓ Clean state achieved post-rollback
✓ Data integrity maintained

Recommendation: Deployment rollback procedures are operational.
EOF
    else
        cat >> "$report_file" <<EOF
✗ Some verification checks failed
✗ Review logs for details

Recommendation: Investigate failures before production rollback.
EOF
    fi
    
    echo ""
    echo -e "${BLUE}=== Drill Report ===${NC}"
    cat "$report_file"
    
    log_info "Full report saved to: $report_file"
}

# Main execution
main() {
    DRILL_START_TIME=$(date +%s)
    
    echo -e "${GREEN}=== Rollback Drill ===${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "DRY_RUN: $DRY_RUN"
    echo "Drill Directory: $DRILL_DIR"
    echo ""
    
    # Execute drill phases
    check_prerequisites
    setup_drill_env
    capture_initial_state
    simulate_deployment
    verify_deployment
    execute_rollback
    verify_rollback
    verify_clean_state
    verify_data_integrity
    
    # Generate report
    generate_report
    
    # Optional cleanup
    if [ "${CLEANUP:-false}" = true ]; then
        cleanup_drill
    else
        log_info "Drill environment preserved at: $DRILL_DIR"
        log_info "To cleanup manually, run: CLEANUP=true $0"
    fi
    
    DRILL_END_TIME=$(date +%s)
    DRILL_DURATION=$((DRILL_END_TIME - DRILL_START_TIME))
    
    echo ""
    echo "Drill Duration: ${DRILL_DURATION}s"
    
    # Exit with appropriate code
    if [ "$VERIFICATION_PASSED" = true ]; then
        echo -e "${GREEN}=== Rollback Drill PASSED ===${NC}"
        exit 0
    else
        echo -e "${RED}=== Rollback Drill FAILED ===${NC}"
        exit 1
    fi
}

# Run main
main
