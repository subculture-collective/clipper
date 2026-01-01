#!/usr/bin/env bash
# Kubernetes Cluster Bootstrap Script
# Supports GKE, EKS, and AKS provisioning
set -euo pipefail

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-clipper-prod}"
ENVIRONMENT="${ENVIRONMENT:-production}"
CLOUD_PROVIDER="${CLOUD_PROVIDER:-}"  # gke, eks, aks
REGION="${REGION:-us-east-1}"
NODE_COUNT="${NODE_COUNT:-3}"
NODE_TYPE="${NODE_TYPE:-}"
K8S_VERSION="${K8S_VERSION:-1.31}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
    
    if [ -z "$CLOUD_PROVIDER" ]; then
        log_error "CLOUD_PROVIDER is required. Set to 'gke', 'eks', or 'aks'"
        exit 1
    fi
    
    case $CLOUD_PROVIDER in
        gke)
            if ! command -v gcloud &> /dev/null; then
                log_error "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
                exit 1
            fi
            ;;
        eks)
            if ! command -v aws &> /dev/null; then
                log_error "aws CLI not found. Install from: https://aws.amazon.com/cli/"
                exit 1
            fi
            if ! command -v eksctl &> /dev/null; then
                log_error "eksctl not found. Install from: https://eksctl.io/"
                exit 1
            fi
            ;;
        aks)
            if ! command -v az &> /dev/null; then
                log_error "az CLI not found. Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
                exit 1
            fi
            ;;
        *)
            log_error "Invalid CLOUD_PROVIDER: $CLOUD_PROVIDER. Must be 'gke', 'eks', or 'aks'"
            exit 1
            ;;
    esac
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Install from: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi
    
    if ! command -v helm &> /dev/null; then
        log_error "helm not found. Install from: https://helm.sh/docs/intro/install/"
        exit 1
    fi
}

provision_gke_cluster() {
    log_info "Provisioning GKE cluster: $CLUSTER_NAME"
    
    local project_id="${GCP_PROJECT_ID:-clipper-prod}"
    local node_type="${NODE_TYPE:-e2-standard-4}"
    
    gcloud container clusters create "$CLUSTER_NAME" \
        --project="$project_id" \
        --region="$REGION" \
        --num-nodes="$NODE_COUNT" \
        --machine-type="$node_type" \
        --disk-size=100 \
        --disk-type=pd-standard \
        --cluster-version="$K8S_VERSION" \
        --enable-autoscaling \
        --min-nodes=2 \
        --max-nodes=10 \
        --enable-autorepair \
        --enable-autoupgrade \
        --enable-ip-alias \
        --enable-stackdriver-kubernetes \
        --addons=HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
        --workload-pool="$project_id.svc.id.goog" \
        --enable-shielded-nodes \
        --shielded-secure-boot \
        --shielded-integrity-monitoring \
        --labels="environment=$ENVIRONMENT,managed-by=clipper-ops"
    
    # Get credentials
    gcloud container clusters get-credentials "$CLUSTER_NAME" \
        --region="$REGION" \
        --project="$project_id"
    
    log_info "GKE cluster created successfully"
    log_info "Estimated monthly cost: \$200-400 USD (3x e2-standard-4 nodes + networking)"
}

provision_eks_cluster() {
    log_info "Provisioning EKS cluster: $CLUSTER_NAME"
    
    local node_type="${NODE_TYPE:-t3.large}"
    
    cat > "/tmp/eksctl-$CLUSTER_NAME.yaml" <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: $CLUSTER_NAME
  region: $REGION
  version: "$K8S_VERSION"
  tags:
    environment: $ENVIRONMENT
    managed-by: clipper-ops

iam:
  withOIDC: true

managedNodeGroups:
  - name: clipper-nodes
    instanceType: $node_type
    minSize: 2
    maxSize: 10
    desiredCapacity: $NODE_COUNT
    volumeSize: 100
    volumeType: gp3
    labels:
      role: worker
      environment: $ENVIRONMENT
    tags:
      nodegroup-name: clipper-nodes
    iam:
      withAddonPolicies:
        autoScaler: true
        externalDNS: true
        certManager: true
        ebs: true
        efs: true
        albIngress: true
        cloudWatch: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver
    serviceAccountRoleARN: arn:aws:iam::\${AWS_ACCOUNT_ID}:role/AmazonEKS_EBS_CSI_DriverRole
    # Note: Set AWS_ACCOUNT_ID environment variable or create the IAM role manually
EOF
    
    eksctl create cluster -f "/tmp/eksctl-$CLUSTER_NAME.yaml"
    
    # Update kubeconfig
    aws eks update-kubeconfig \
        --region "$REGION" \
        --name "$CLUSTER_NAME"
    
    log_info "EKS cluster created successfully"
    log_info "Estimated monthly cost: \$220-450 USD (control plane + 3x t3.large nodes + networking)"
}

provision_aks_cluster() {
    log_info "Provisioning AKS cluster: $CLUSTER_NAME"
    
    local resource_group="${AZURE_RESOURCE_GROUP:-clipper-rg}"
    local node_type="${NODE_TYPE:-Standard_D4s_v3}"
    
    # Create resource group if it doesn't exist
    az group create \
        --name "$resource_group" \
        --location "$REGION"
    
    # Create AKS cluster
    az aks create \
        --resource-group "$resource_group" \
        --name "$CLUSTER_NAME" \
        --location "$REGION" \
        --kubernetes-version "$K8S_VERSION" \
        --node-count "$NODE_COUNT" \
        --node-vm-size "$node_type" \
        --node-osdisk-size 100 \
        --enable-cluster-autoscaler \
        --min-count 2 \
        --max-count 10 \
        --enable-addons monitoring \
        --enable-managed-identity \
        --enable-workload-identity \
        --enable-oidc-issuer \
        --network-plugin azure \
        --network-policy azure \
        --tags "environment=$ENVIRONMENT" "managed-by=clipper-ops"
    
    # Get credentials
    az aks get-credentials \
        --resource-group "$resource_group" \
        --name "$CLUSTER_NAME"
    
    log_info "AKS cluster created successfully"
    log_info "Estimated monthly cost: \$240-480 USD (3x Standard_D4s_v3 nodes + networking)"
}

verify_cluster() {
    log_info "Verifying cluster connectivity..."
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Failed to connect to cluster"
        exit 1
    fi
    
    log_info "Cluster is accessible"
    kubectl get nodes
}

main() {
    log_info "Starting Kubernetes cluster provisioning"
    log_info "Cluster: $CLUSTER_NAME"
    log_info "Environment: $ENVIRONMENT"
    log_info "Provider: $CLOUD_PROVIDER"
    log_info "Region: $REGION"
    
    check_prerequisites
    
    case $CLOUD_PROVIDER in
        gke)
            provision_gke_cluster
            ;;
        eks)
            provision_eks_cluster
            ;;
        aks)
            provision_aks_cluster
            ;;
    esac
    
    verify_cluster
    
    log_info "Cluster provisioning completed successfully!"
    log_info "Next steps:"
    log_info "  1. Run ./infrastructure/k8s/bootstrap/setup-cluster.sh to configure the cluster"
    log_info "  2. Review and apply namespaces, RBAC, and network policies"
    log_info "  3. Install ingress-nginx and cert-manager"
    log_info "  4. Configure External Secrets Operator"
}

main "$@"
