#!/usr/bin/env bash
# Cluster Health Check and Verification Script
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

check_cluster_connectivity() {
    log_info "Checking cluster connectivity..."
    if kubectl cluster-info &> /dev/null; then
        log_info "✓ Cluster is reachable"
        return 0
    else
        log_error "✗ Cannot connect to cluster"
        return 1
    fi
}

check_nodes() {
    log_info "Checking node status..."
    local nodes_ready=$(kubectl get nodes --no-headers | grep -c " Ready " || echo "0")
    local nodes_total=$(kubectl get nodes --no-headers | wc -l)
    
    if [ "$nodes_ready" -eq "$nodes_total" ] && [ "$nodes_total" -gt 0 ]; then
        log_info "✓ All $nodes_total nodes are Ready"
        kubectl get nodes
        return 0
    else
        log_error "✗ $nodes_ready/$nodes_total nodes are Ready"
        kubectl get nodes
        return 1
    fi
}

check_namespaces() {
    log_info "Checking namespaces..."
    local required_namespaces=("clipper-production" "clipper-staging" "clipper-monitoring")
    local all_ok=true
    
    for ns in "${required_namespaces[@]}"; do
        if kubectl get namespace "$ns" &> /dev/null; then
            log_info "✓ Namespace $ns exists"
        else
            log_error "✗ Namespace $ns not found"
            all_ok=false
        fi
    done
    
    [ "$all_ok" = true ]
}

check_ingress_controller() {
    log_info "Checking ingress-nginx controller..."
    
    if ! kubectl get namespace ingress-nginx &> /dev/null; then
        log_error "✗ ingress-nginx namespace not found"
        return 1
    fi
    
    local pods_ready=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$pods_ready" -gt 0 ]; then
        log_info "✓ ingress-nginx is running ($pods_ready pods)"
        
        # Check LoadBalancer IP
        local lb_ip=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        if [ -n "$lb_ip" ]; then
            log_info "✓ LoadBalancer IP: $lb_ip"
        else
            log_warn "⚠ LoadBalancer IP not assigned yet"
        fi
        return 0
    else
        log_error "✗ ingress-nginx pods not running"
        return 1
    fi
}

check_cert_manager() {
    log_info "Checking cert-manager..."
    
    if ! kubectl get namespace cert-manager &> /dev/null; then
        log_error "✗ cert-manager namespace not found"
        return 1
    fi
    
    local pods_ready=$(kubectl get pods -n cert-manager --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$pods_ready" -ge 3 ]; then
        log_info "✓ cert-manager is running ($pods_ready pods)"
        
        # Check ClusterIssuers
        local issuers=$(kubectl get clusterissuer --no-headers 2>/dev/null | wc -l)
        if [ "$issuers" -gt 0 ]; then
            log_info "✓ $issuers ClusterIssuer(s) configured"
            kubectl get clusterissuer
        else
            log_warn "⚠ No ClusterIssuers found"
        fi
        return 0
    else
        log_error "✗ cert-manager pods not all running"
        return 1
    fi
}

check_external_secrets() {
    log_info "Checking External Secrets Operator..."
    
    if ! kubectl get namespace external-secrets-system &> /dev/null; then
        log_error "✗ external-secrets-system namespace not found"
        return 1
    fi
    
    local pods_ready=$(kubectl get pods -n external-secrets-system --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$pods_ready" -gt 0 ]; then
        log_info "✓ External Secrets Operator is running ($pods_ready pods)"
        
        # Check SecretStores
        local stores_prod=$(kubectl get secretstore -n clipper-production --no-headers 2>/dev/null | wc -l)
        local stores_staging=$(kubectl get secretstore -n clipper-staging --no-headers 2>/dev/null | wc -l)
        
        if [ "$stores_prod" -gt 0 ] || [ "$stores_staging" -gt 0 ]; then
            log_info "✓ SecretStores configured (prod: $stores_prod, staging: $stores_staging)"
        else
            log_warn "⚠ No SecretStores configured yet"
        fi
        return 0
    else
        log_error "✗ External Secrets Operator pods not running"
        return 1
    fi
}

check_network_policies() {
    log_info "Checking network policies..."
    
    local policies_prod=$(kubectl get networkpolicy -n clipper-production --no-headers 2>/dev/null | wc -l)
    local policies_staging=$(kubectl get networkpolicy -n clipper-staging --no-headers 2>/dev/null | wc -l)
    
    if [ "$policies_prod" -gt 0 ] || [ "$policies_staging" -gt 0 ]; then
        log_info "✓ Network policies applied (prod: $policies_prod, staging: $policies_staging)"
        return 0
    else
        log_warn "⚠ No network policies found"
        return 1
    fi
}

check_rbac() {
    log_info "Checking RBAC configuration..."
    
    local sa_prod=$(kubectl get serviceaccount -n clipper-production --no-headers 2>/dev/null | wc -l)
    local sa_staging=$(kubectl get serviceaccount -n clipper-staging --no-headers 2>/dev/null | wc -l)
    
    if [ "$sa_prod" -gt 0 ] || [ "$sa_staging" -gt 0 ]; then
        log_info "✓ ServiceAccounts configured (prod: $sa_prod, staging: $sa_staging)"
        return 0
    else
        log_warn "⚠ No ServiceAccounts found"
        return 1
    fi
}

check_applications() {
    log_info "Checking application deployments..."
    
    for ns in clipper-production clipper-staging; do
        if kubectl get namespace "$ns" &> /dev/null; then
            local deployments=$(kubectl get deployments -n "$ns" --no-headers 2>/dev/null | wc -l)
            local running=$(kubectl get pods -n "$ns" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
            
            if [ "$deployments" -gt 0 ]; then
                log_info "✓ $ns: $deployments deployment(s), $running running pod(s)"
            else
                log_warn "⚠ $ns: No deployments found"
            fi
        fi
    done
}

check_metrics_server() {
    log_info "Checking metrics-server..."
    
    if kubectl get deployment metrics-server -n kube-system &> /dev/null; then
        local pods_ready=$(kubectl get pods -n kube-system -l k8s-app=metrics-server --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        
        if [ "$pods_ready" -gt 0 ]; then
            log_info "✓ metrics-server is running"
            
            # Try to get metrics
            if kubectl top nodes &> /dev/null; then
                log_info "✓ Node metrics available"
            else
                log_warn "⚠ Node metrics not available yet (may need a few minutes)"
            fi
            return 0
        else
            log_error "✗ metrics-server pod not running"
            return 1
        fi
    else
        log_warn "⚠ metrics-server not installed"
        return 1
    fi
}

print_summary() {
    log_info ""
    log_info "==================================="
    log_info "Cluster Health Check Summary"
    log_info "==================================="
    log_info ""
    
    if [ "${CHECK_FAILED:-0}" -eq 0 ]; then
        log_info "✓ All checks passed!"
    else
        log_warn "⚠ Some checks failed. Review the output above."
    fi
}

main() {
    log_info "Starting cluster health check..."
    log_info ""
    
    local failed=0
    
    check_cluster_connectivity || failed=1
    check_nodes || failed=1
    check_namespaces || failed=1
    check_ingress_controller || failed=1
    check_cert_manager || failed=1
    check_external_secrets || failed=1
    check_network_policies || failed=1
    check_rbac || failed=1
    check_metrics_server || failed=1
    check_applications
    
    CHECK_FAILED=$failed
    print_summary
    
    exit $failed
}

main "$@"
