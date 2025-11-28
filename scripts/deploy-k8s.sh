#!/usr/bin/env bash
# deploy-k8s.sh - Build and deploy clipper backend to Kubernetes
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Building backend Docker image..."
docker build -t clipper-backend:latest -f backend/Dockerfile backend/

echo "==> Building frontend Docker image..."
docker build -t clipper-frontend:latest -f frontend/Dockerfile frontend/

echo "==> Importing backend image to k3s..."
docker save clipper-backend:latest | sudo k3s ctr images import -

echo "==> Importing frontend image to k3s..."
docker save clipper-frontend:latest | sudo k3s ctr images import -

echo "==> Applying Kubernetes manifests..."
kubectl apply -f backend/k8s/cert-issuer.yaml
kubectl apply -f backend/k8s/postgres.yaml
kubectl apply -f backend/k8s/redis.yaml
kubectl apply -f backend/k8s/opensearch.yaml
kubectl apply -f backend/k8s/configmap-backend.yaml
kubectl apply -f backend/k8s/secret-backend.yaml
kubectl apply -f backend/k8s/deployment-backend.yaml
kubectl apply -f backend/k8s/service-backend.yaml
kubectl apply -f backend/k8s/hpa-backend.yaml
kubectl apply -f backend/k8s/pdb-backend.yaml
kubectl apply -f backend/k8s/networkpolicy-backend.yaml
kubectl apply -f frontend/k8s/deployment-frontend.yaml
kubectl apply -f frontend/k8s/service-frontend.yaml
kubectl apply -f backend/k8s/ingress-backend.yaml

echo "==> Rolling out deployment..."
kubectl rollout restart deployment/clipper-backend
kubectl rollout status deployment/clipper-backend --timeout=5m
kubectl rollout restart deployment/clipper-frontend
kubectl rollout status deployment/clipper-frontend --timeout=5m

echo "==> Deployment complete!"
echo ""
echo "Check status:"
echo "  kubectl get pods"
echo "  kubectl get svc"
echo "  kubectl get ingress"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/clipper-backend"
