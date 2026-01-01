#!/bin/bash
# Setup HPA Metrics Infrastructure
# This script installs Metrics Server and Prometheus Adapter for HPA

set -e

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

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if we have cluster access
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot access Kubernetes cluster. Please configure kubectl."
    exit 1
fi

print_info "Setting up HPA Metrics Infrastructure..."

# Install Metrics Server
print_info "Installing Metrics Server..."
kubectl apply -f "$(dirname "$0")/metrics-server.yaml"

# Wait for Metrics Server to be ready
print_info "Waiting for Metrics Server to be ready..."
kubectl rollout status deployment/metrics-server -n kube-system --timeout=300s

# Verify Metrics Server
print_info "Verifying Metrics Server..."
if kubectl get apiservice v1beta1.metrics.k8s.io -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' | grep -q "True"; then
    print_info "✓ Metrics Server is available"
else
    print_warn "⚠ Metrics Server API service is not yet available. This may take a few moments."
fi

# Install Prometheus Adapter
print_info "Installing Prometheus Adapter..."
kubectl apply -f "$(dirname "$0")/prometheus-adapter.yaml"

# Wait for Prometheus Adapter to be ready
print_info "Waiting for Prometheus Adapter to be ready..."
kubectl rollout status deployment/prometheus-adapter -n custom-metrics --timeout=300s

# Verify Prometheus Adapter
print_info "Verifying Prometheus Adapter..."
if kubectl get apiservice v1beta1.custom.metrics.k8s.io -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' | grep -q "True"; then
    print_info "✓ Prometheus Adapter is available"
else
    print_warn "⚠ Prometheus Adapter API service is not yet available. This may take a few moments."
fi

print_info ""
print_info "==================================="
print_info "Installation Complete!"
print_info "==================================="
print_info ""

# Show status
print_info "Component Status:"
echo ""
kubectl get deployment metrics-server -n kube-system
echo ""
kubectl get deployment prometheus-adapter -n custom-metrics
echo ""

# Test metrics
print_info "Testing Metrics Server..."
if kubectl top nodes &> /dev/null; then
    print_info "✓ Resource metrics are working"
    kubectl top nodes | head -5
else
    print_warn "⚠ Resource metrics not yet available. Wait a few moments and try: kubectl top nodes"
fi

echo ""
print_info "Testing Custom Metrics API..."
if kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" &> /dev/null; then
    print_info "✓ Custom metrics API is available"
else
    print_warn "⚠ Custom metrics API not yet available. This is expected if Prometheus hasn't scraped metrics yet."
fi

echo ""
print_info "==================================="
print_info "Next Steps:"
print_info "==================================="
echo ""
echo "1. Deploy applications with HPA enabled (adjust namespace as needed):"
echo "   # For production:"
echo "   helm upgrade --install clipper-backend ./helm/charts/backend -n clipper-production"
echo "   helm upgrade --install clipper-frontend ./helm/charts/frontend -n clipper-production"
echo "   # For staging, use: -n clipper-staging"
echo ""
echo "2. Monitor HPA status:"
echo "   kubectl get hpa -n clipper-production -w"
echo ""
echo "3. Check metrics (replace namespace if using staging):"
echo "   kubectl top pods -n clipper-production"
echo "   kubectl get --raw '/apis/custom.metrics.k8s.io/v1beta1/namespaces/clipper-production/pods/*/http_requests_per_second' | jq ."
echo ""
echo "4. View documentation:"
echo "   cat $(dirname "$0")/README.md"
echo "   cat ../../docs/operations/runbooks/hpa-scaling.md"
echo ""

print_info "Setup complete! 🎉"
