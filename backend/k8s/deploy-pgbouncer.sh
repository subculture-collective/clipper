#!/bin/bash
# Deploy PgBouncer to Kubernetes
# Usage: ./deploy-pgbouncer.sh [--rollback]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="${NAMESPACE:-default}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if rollback is requested
if [ "$1" = "--rollback" ]; then
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}PgBouncer Rollback${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""

    print_step "Updating backend to use direct PostgreSQL connection..."
    kubectl patch configmap backend-config -n "$NAMESPACE" \
        -p '{"data":{"DB_HOST":"postgres","DB_PORT":"5432"}}'
    print_success "Backend ConfigMap updated"

    print_step "Restarting backend deployment..."
    kubectl rollout restart deployment/clipper-backend -n "$NAMESPACE"
    kubectl rollout status deployment/clipper-backend -n "$NAMESPACE" --timeout=5m
    print_success "Backend restarted"

    echo ""
    read -p "Do you want to delete PgBouncer resources? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Deleting PgBouncer resources..."
        kubectl delete -f "$SCRIPT_DIR/pgbouncer.yaml" -n "$NAMESPACE" --ignore-not-found=true
        kubectl delete -f "$SCRIPT_DIR/pdb-pgbouncer.yaml" -n "$NAMESPACE" --ignore-not-found=true
        kubectl delete -f "$SCRIPT_DIR/pgbouncer-configmap.yaml" -n "$NAMESPACE" --ignore-not-found=true
        print_success "PgBouncer resources deleted"
    fi

    echo ""
    print_success "Rollback completed"
    echo "Backend is now using direct PostgreSQL connection"
    exit 0
fi

# Deployment
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PgBouncer Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
print_step "Checking prerequisites..."

if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install kubectl."
    exit 1
fi

# Check if PostgreSQL is running
if ! kubectl get statefulset postgres -n "$NAMESPACE" &> /dev/null; then
    print_error "PostgreSQL StatefulSet not found in namespace $NAMESPACE"
    exit 1
fi
print_success "Prerequisites met"

# Check if secret exists
print_step "Checking PgBouncer secret..."
if ! kubectl get secret pgbouncer-secret -n "$NAMESPACE" &> /dev/null; then
    print_warning "PgBouncer secret not found"
    echo ""
    echo "You need to create the pgbouncer-secret with proper authentication."
    echo "See PGBOUNCER_QUICKSTART.md for instructions."
    echo ""
    read -p "Create a placeholder secret for testing? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Creating placeholder secret..."
        cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: pgbouncer-secret
  namespace: $NAMESPACE
  labels:
    app: pgbouncer
type: Opaque
stringData:
  userlist.txt: |
    "clipper" "md5placeholder"
EOF
        print_warning "Placeholder secret created - UPDATE THIS IN PRODUCTION!"
    else
        exit 1
    fi
else
    print_success "PgBouncer secret exists"
fi

# Deploy ConfigMap
print_step "Deploying PgBouncer ConfigMap..."
kubectl apply -f "$SCRIPT_DIR/pgbouncer-configmap.yaml" -n "$NAMESPACE"
print_success "ConfigMap deployed"

# Deploy PgBouncer
print_step "Deploying PgBouncer (Deployment, Service, Secret)..."
kubectl apply -f "$SCRIPT_DIR/pgbouncer.yaml" -n "$NAMESPACE"
print_success "PgBouncer deployed"

# Deploy PDB
print_step "Deploying PodDisruptionBudget..."
kubectl apply -f "$SCRIPT_DIR/pdb-pgbouncer.yaml" -n "$NAMESPACE"
print_success "PDB deployed"

# Wait for pods to be ready
print_step "Waiting for PgBouncer pods to be ready..."
kubectl wait --for=condition=ready pod -l app=pgbouncer -n "$NAMESPACE" --timeout=120s
print_success "PgBouncer pods are ready"

# Show status
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Status${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Pods:"
kubectl get pods -l app=pgbouncer -n "$NAMESPACE"
echo ""

echo "Service:"
kubectl get svc pgbouncer -n "$NAMESPACE"
echo ""

# Test connection
print_step "Testing PgBouncer connectivity..."
if kubectl run test-pgbouncer-conn --rm -i --restart=Never --image=postgres:17 -n "$NAMESPACE" -- \
    psql -h pgbouncer -p 6432 -U clipper -d clipper_db -c "SELECT 1;" &> /dev/null; then
    print_success "PgBouncer connection test passed"
else
    print_warning "PgBouncer connection test failed - check authentication"
fi

# Next steps
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "1. Verify metrics are being exported:"
echo "   kubectl port-forward svc/pgbouncer 9127:9127 -n $NAMESPACE"
echo "   curl http://localhost:9127/metrics | grep pgbouncer_pools"
echo ""

echo "2. Update backend to use PgBouncer:"
echo "   kubectl patch configmap backend-config -n $NAMESPACE \\"
echo "     -p '{\"data\":{\"DB_HOST\":\"pgbouncer\",\"DB_PORT\":\"6432\"}}'"
echo "   kubectl rollout restart deployment/clipper-backend -n $NAMESPACE"
echo ""

echo "3. Import Grafana dashboard:"
echo "   Dashboard file: monitoring/dashboards/pgbouncer-pool.json"
echo ""

echo "4. Run load test validation:"
echo "   cd backend/tests/load && ./validate_pgbouncer.sh"
echo ""

echo "5. Monitor in Grafana and check for alerts"
echo ""

print_success "PgBouncer deployment completed!"
echo ""
echo "Documentation:"
echo "  - Quick Start: backend/k8s/PGBOUNCER_QUICKSTART.md"
echo "  - Full Guide: backend/k8s/PGBOUNCER.md"
echo ""
echo "To rollback: $0 --rollback"
