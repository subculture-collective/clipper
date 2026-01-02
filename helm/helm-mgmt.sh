#!/bin/bash
# Helm Charts Management Script
# This script provides common operations for managing Clipper Helm charts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHARTS_DIR="$SCRIPT_DIR/charts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed. Please install Helm 3.12+"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl"
        exit 1
    fi
    
    print_info "Prerequisites check passed"
}

# Function to lint all charts
lint_charts() {
    print_info "Linting all charts..."
    
    local failed=0
    for chart in backend frontend postgres redis monitoring clipper; do
        print_info "Linting $chart..."
        if helm lint "$CHARTS_DIR/$chart"; then
            print_info "✓ $chart passed"
        else
            print_error "✗ $chart failed"
            failed=$((failed + 1))
        fi
    done
    
    if [ $failed -eq 0 ]; then
        print_info "All charts passed linting"
        return 0
    else
        print_error "$failed chart(s) failed linting"
        return 1
    fi
}

# Function to test template rendering
test_templates() {
    print_info "Testing template rendering..."
    
    local failed=0
    for chart in backend frontend postgres redis monitoring; do
        print_info "Testing $chart templates..."
        if helm template test "$CHARTS_DIR/$chart" > /dev/null 2>&1; then
            print_info "✓ $chart templates rendered successfully"
        else
            print_error "✗ $chart template rendering failed"
            failed=$((failed + 1))
        fi
    done
    
    if [ $failed -eq 0 ]; then
        print_info "All templates rendered successfully"
        return 0
    else
        print_error "$failed chart(s) failed template rendering"
        return 1
    fi
}

# Function to package charts
package_charts() {
    print_info "Packaging charts..."
    
    local output_dir="${1:-$SCRIPT_DIR/packages}"
    mkdir -p "$output_dir"
    
    for chart in backend frontend postgres redis monitoring clipper; do
        print_info "Packaging $chart..."
        helm package "$CHARTS_DIR/$chart" -d "$output_dir"
    done
    
    print_info "Charts packaged to $output_dir"
}

# Function to show chart versions
show_versions() {
    print_info "Chart versions:"
    
    for chart in backend frontend postgres redis monitoring clipper; do
        version=$(grep "^version:" "$CHARTS_DIR/$chart/Chart.yaml" | awk '{print $2}')
        app_version=$(grep "^appVersion:" "$CHARTS_DIR/$chart/Chart.yaml" | awk '{print $2}' | tr -d '"')
        echo "  $chart: $version (app: $app_version)"
    done
}

# Function to update dependencies for umbrella chart
update_dependencies() {
    print_info "Updating dependencies for umbrella chart..."
    cd "$CHARTS_DIR/clipper"
    helm dependency update
    print_info "Dependencies updated"
}

# Function to install to a namespace
install() {
    local namespace="${1:-clipper-production}"
    local values_file="${2:-}"
    
    print_info "Installing Clipper to namespace: $namespace"
    
    # Check if namespace exists
    if ! kubectl get namespace "$namespace" &> /dev/null; then
        print_warn "Namespace $namespace does not exist. Creating..."
        kubectl create namespace "$namespace"
    fi
    
    local helm_args=("install" "clipper" "$CHARTS_DIR/clipper" "-n" "$namespace")
    
    if [ -n "$values_file" ]; then
        print_info "Using values file: $values_file"
        helm_args+=("-f" "$values_file")
    fi
    
    helm "${helm_args[@]}"
    
    print_info "Installation complete. Checking status..."
    helm status clipper -n "$namespace"
}

# Function to upgrade release
upgrade() {
    local namespace="${1:-clipper-production}"
    local values_file="${2:-}"
    
    print_info "Upgrading Clipper in namespace: $namespace"
    
    local helm_args=("upgrade" "clipper" "$CHARTS_DIR/clipper" "-n" "$namespace")
    
    if [ -n "$values_file" ]; then
        print_info "Using values file: $values_file"
        helm_args+=("-f" "$values_file")
    else
        helm_args+=("--reuse-values")
    fi
    
    helm "${helm_args[@]}"
    
    print_info "Upgrade complete. Checking status..."
    helm status clipper -n "$namespace"
}

# Function to uninstall from namespace
uninstall() {
    local namespace="${1:-clipper-production}"
    
    print_warn "This will uninstall Clipper from namespace: $namespace"
    read -rp "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        print_info "Uninstalling..."
        helm uninstall clipper -n "$namespace"
        print_info "Uninstall complete"
    else
        print_info "Uninstall cancelled"
    fi
}

# Function to show usage
usage() {
    cat << EOF
Clipper Helm Charts Management Script

Usage: $0 <command> [options]

Commands:
    check           Check prerequisites
    lint            Lint all charts
    test            Test template rendering
    package [dir]   Package all charts (optional: output directory)
    versions        Show chart versions
    deps            Update umbrella chart dependencies
    install [ns] [values]    Install to namespace (default: clipper-production)
    upgrade [ns] [values]    Upgrade release in namespace
    uninstall [ns]           Uninstall from namespace

Examples:
    $0 lint
    $0 test
    $0 package ./packages
    $0 install clipper-production ./charts/clipper/examples/values-production.yaml
    $0 upgrade clipper-staging ./charts/clipper/examples/values-staging.yaml
    $0 uninstall clipper-production

EOF
}

# Main script logic
case "${1:-}" in
    check)
        check_prerequisites
        ;;
    lint)
        check_prerequisites
        lint_charts
        ;;
    test)
        check_prerequisites
        test_templates
        ;;
    package)
        check_prerequisites
        package_charts "${2:-}"
        ;;
    versions)
        show_versions
        ;;
    deps)
        check_prerequisites
        update_dependencies
        ;;
    install)
        check_prerequisites
        install "${2:-}" "${3:-}"
        ;;
    upgrade)
        check_prerequisites
        upgrade "${2:-}" "${3:-}"
        ;;
    uninstall)
        check_prerequisites
        uninstall "${2:-}"
        ;;
    *)
        usage
        exit 1
        ;;
esac
