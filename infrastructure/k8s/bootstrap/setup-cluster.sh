#!/usr/bin/env bash
# Cluster Setup and Configuration Script
# Installs required operators and configures the cluster
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found"
        exit 1
    fi
    
    if ! command -v helm &> /dev/null; then
        log_error "helm not found"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to cluster. Run provision-cluster.sh first"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

setup_namespaces() {
    log_info "Creating namespaces..."
    kubectl apply -f ../base/namespaces.yaml
    log_info "Namespaces created"
}

setup_rbac() {
    log_info "Setting up RBAC..."
    kubectl apply -f ../base/rbac.yaml
    log_info "RBAC configured"
}

setup_network_policies() {
    log_info "Applying network policies..."
    kubectl apply -f ../base/network-policies.yaml
    log_info "Network policies applied"
}

install_ingress_nginx() {
    log_info "Installing ingress-nginx..."
    
    # Add Helm repository
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    # Install ingress-nginx with pinned version
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --version 4.11.3 \
        --set controller.service.type=LoadBalancer \
        --set controller.metrics.enabled=true \
        --set controller.podAnnotations."prometheus\.io/scrape"=true \
        --set controller.podAnnotations."prometheus\.io/port"=10254 \
        --wait
    
    log_info "ingress-nginx installed successfully"
    
    # Label the namespace for network policies
    kubectl label namespace ingress-nginx name=ingress-nginx --overwrite
    
    # Wait for LoadBalancer IP
    log_info "Waiting for LoadBalancer external IP..."
    timeout=300
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        external_ip=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        if [ -n "$external_ip" ]; then
            log_info "LoadBalancer external IP: $external_ip"
            log_info "Update your DNS records to point to this IP"
            break
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done
}

install_cert_manager() {
    log_info "Installing cert-manager..."
    
    # Install CRDs
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.crds.yaml
    
    # Add Helm repository
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Install cert-manager
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --version v1.16.2 \
        --wait
    
    log_info "cert-manager installed successfully"
    
    # Apply ClusterIssuers
    log_info "Creating ClusterIssuers..."
    kubectl apply -f ../base/cert-manager.yaml
    log_info "ClusterIssuers created"
}

install_external_secrets() {
    log_info "Installing External Secrets Operator..."
    
    # Add Helm repository
    helm repo add external-secrets https://charts.external-secrets.io
    helm repo update
    
    # Install External Secrets Operator with pinned version
    helm upgrade --install external-secrets external-secrets/external-secrets \
        --namespace external-secrets-system \
        --create-namespace \
        --version 0.11.0 \
        --set installCRDs=true \
        --wait
    
    log_info "External Secrets Operator installed successfully"
    log_info "To configure SecretStores, edit and apply:"
    log_info "  - ../external-secrets/secret-stores.yaml"
    log_info "  - ../external-secrets/external-secrets.yaml"
}

install_metrics_server() {
    log_info "Installing metrics-server for HPA support..."
    
    # Apply local manifest for version control and customization
    kubectl apply -f ../base/metrics-server.yaml
    
    # Wait for deployment
    log_info "Waiting for metrics-server to be ready..."
    kubectl rollout status deployment/metrics-server -n kube-system --timeout=300s || log_warn "Metrics server deployment timeout"
    
    log_info "metrics-server installed"
}

install_prometheus_adapter() {
    log_info "Installing Prometheus Adapter for custom HPA metrics..."
    
    # Apply local manifest
    kubectl apply -f ../base/prometheus-adapter.yaml
    
    # Wait for deployment
    log_info "Waiting for Prometheus Adapter to be ready..."
    kubectl rollout status deployment/prometheus-adapter -n custom-metrics --timeout=300s || log_warn "Prometheus Adapter deployment timeout"
    
    log_info "Prometheus Adapter installed"
    log_info "Note: Prometheus Adapter requires Prometheus to be installed and accessible at http://prometheus.clipper-monitoring.svc:9090"
}

verify_installation() {
    log_info "Verifying installation..."
    
    log_info "Checking namespaces..."
    kubectl get namespaces | grep clipper || log_warn "Clipper namespaces not found"
    
    log_info "Checking ingress-nginx..."
    kubectl get pods -n ingress-nginx || log_warn "ingress-nginx pods not found"
    
    log_info "Checking cert-manager..."
    kubectl get pods -n cert-manager || log_warn "cert-manager pods not found"
    
    log_info "Checking External Secrets Operator..."
    kubectl get pods -n external-secrets-system || log_warn "External Secrets pods not found"
    
    log_info "Checking metrics-server..."
    kubectl get deployment metrics-server -n kube-system || log_warn "metrics-server not found"
    
    log_info "Checking Prometheus Adapter..."
    kubectl get deployment prometheus-adapter -n custom-metrics || log_warn "Prometheus Adapter not found"
    
    log_info "Verification complete"
}

print_next_steps() {
    log_info ""
    log_info "==================================="
    log_info "Cluster setup completed successfully!"
    log_info "==================================="
    log_info ""
    log_info "Next steps:"
    log_info "1. Configure cloud provider credentials for External Secrets:"
    log_info "   - For AWS: Set up IRSA (IAM Roles for Service Accounts)"
    log_info "   - For GCP: Configure Workload Identity"
    log_info "   - For Azure: Set up Workload Identity"
    log_info ""
    log_info "2. Create secrets in your secret manager (AWS Secrets Manager, GCP Secret Manager, etc.)"
    log_info ""
    log_info "3. Apply SecretStores and ExternalSecrets:"
    log_info "   kubectl apply -f ../external-secrets/secret-stores.yaml"
    log_info "   kubectl apply -f ../external-secrets/external-secrets.yaml"
    log_info ""
    log_info "4. Deploy applications:"
    log_info "   kubectl apply -k ../overlays/production/"
    log_info "   # or for staging:"
    log_info "   kubectl apply -k ../overlays/staging/"
    log_info ""
    log_info "5. Verify deployments:"
    log_info "   kubectl get pods -n clipper-production"
    log_info "   kubectl get ingress -n clipper-production"
    log_info "   kubectl get certificate -n clipper-production"
    log_info ""
    log_info "6. Update DNS records to point to LoadBalancer IP"
    log_info ""
    log_info "For troubleshooting, see: docs/operations/kubernetes-runbook.md"
}

main() {
    log_info "Starting cluster setup..."
    
    check_prerequisites
    setup_namespaces
    setup_rbac
    setup_network_policies
    install_ingress_nginx
    install_cert_manager
    install_external_secrets
    install_metrics_server
    install_prometheus_adapter
    verify_installation
    print_next_steps
}

main "$@"
