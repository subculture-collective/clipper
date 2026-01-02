---
title: "Kubernetes Troubleshooting Guide"
summary: "Comprehensive troubleshooting guide for Kubernetes deployments including common issues, debugging techniques, and incident resolution."
tags: ["operations", "kubernetes", "troubleshooting", "debugging"]
area: "operations"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2026-01-01
aliases: ["k8s-troubleshooting", "kubernetes debugging", "k8s issues"]
---

# Kubernetes Troubleshooting Guide

Complete guide to diagnosing and resolving common issues with Clipper's Kubernetes deployment.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Pod Issues](#pod-issues)
- [Service & Networking](#service--networking)
- [Ingress & TLS](#ingress--tls)
- [Storage & Persistence](#storage--persistence)
- [Performance Issues](#performance-issues)
- [External Secrets](#external-secrets)
- [Database Connection Issues](#database-connection-issues)
- [Resource Constraints](#resource-constraints)
- [Debugging Techniques](#debugging-techniques)
- [Incident Response Workflows](#incident-response-workflows)

---

## Quick Diagnostics

### Initial Health Check

```bash
# Check all resources in namespace
kubectl get all -n clipper-production

# Check pod status
kubectl get pods -n clipper-production -o wide

# Check recent events
kubectl get events -n clipper-production --sort-by='.lastTimestamp' | tail -20

# Check cluster health
kubectl get nodes
kubectl top nodes
```

### Common Issues Quick Reference

| Symptom | Likely Cause | Quick Fix |
|---------|-------------|-----------|
| Pods in `ImagePullBackOff` | Wrong image name/tag or auth issue | Check image name, verify credentials |
| Pods in `CrashLoopBackOff` | Application crash on startup | Check logs: `kubectl logs <pod>` |
| Pods in `Pending` | Insufficient resources | Check node capacity, scale cluster |
| Service not reachable | Service/endpoint misconfiguration | Check endpoints: `kubectl get endpoints` |
| Ingress 404 | Ingress rules not matching | Check ingress: `kubectl describe ingress` |
| TLS certificate not working | cert-manager issue | Check certificate: `kubectl get certificate` |
| External secret not syncing | SecretStore misconfiguration | Check ExternalSecret: `kubectl describe externalsecret` |

---

## Pod Issues

### Pods Not Starting

#### ImagePullBackOff

**Symptom**: Pod shows `ImagePullBackOff` or `ErrImagePull`

```bash
# Check pod events
kubectl describe pod <pod-name> -n clipper-production

# Common errors:
# - "Failed to pull image... manifest unknown"
# - "Failed to pull image... unauthorized"
```

**Solutions**:

1. **Verify image exists**:
   ```bash
   # Option 1: Using Docker CLI (requires Docker installed and logged in to ghcr.io)
   docker manifest inspect ghcr.io/subculture-collective/clipper-backend:v1.2.3
   
   # Option 2: Using GHCR HTTP API (no Docker required)
   # Requires a GHCR token with read access to the image
   curl -H "Authorization: Bearer <GHCR_TOKEN>" \
     https://ghcr.io/v2/subculture-collective/clipper-backend/manifests/v1.2.3
   ```

2. **Check image pull secret**:
   ```bash
   # Verify secret exists
   kubectl get secret ghcr-auth -n clipper-production
   
   # Create if missing
   kubectl create secret docker-registry ghcr-auth \
     --docker-server=ghcr.io \
     --docker-username=<username> \
     --docker-password=<token> \
     -n clipper-production
   
   # Patch service account
   kubectl patch serviceaccount clipper-backend -n clipper-production \
     -p '{"imagePullSecrets":[{"name":"ghcr-auth"}]}'
   ```

3. **Check image name in deployment**:
   ```bash
   kubectl get deployment clipper-backend -n clipper-production -o yaml | grep image:
   ```

#### CrashLoopBackOff

**Symptom**: Pod repeatedly crashes and restarts

```bash
# Check container logs
kubectl logs <pod-name> -n clipper-production

# Check previous container logs (if restarted)
kubectl logs <pod-name> -n clipper-production --previous

# Check all containers in pod
kubectl logs <pod-name> -c <container-name> -n clipper-production
```

**Common Causes**:

1. **Application error on startup**:
   - Missing environment variables
   - Database connection failure
   - Configuration error
   
   **Solution**: Check logs for error messages, verify configuration

2. **Health probe failing**:
   ```bash
   kubectl describe pod <pod-name> -n clipper-production | grep -A 10 Liveness
   ```
   
   **Solution**: Adjust probe delays or thresholds:
   ```bash
   kubectl patch deployment clipper-backend -n clipper-production -p \
     '{"spec":{"template":{"spec":{"containers":[{"name":"backend","livenessProbe":{"initialDelaySeconds":30}}]}}}}'
   ```

3. **Missing dependencies**:
   - Database not ready
   - Redis not available
   - External service unreachable
   
   **Solution**: Check service dependencies, verify network policies

#### Pods Pending

**Symptom**: Pods stuck in `Pending` state

```bash
kubectl describe pod <pod-name> -n clipper-production
```

**Common Causes**:

1. **Insufficient CPU/Memory**:
   ```
   Events:
     Warning  FailedScheduling  0/3 nodes are available: 3 Insufficient cpu.
   ```
   
   **Solutions**:
   ```bash
   # Option 1: Scale cluster
   gcloud container clusters resize clipper-prod --num-nodes 5
   
   # Option 2: Reduce pod resource requests
   kubectl patch deployment clipper-backend -n clipper-production -p \
     '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"requests":{"cpu":"100m"}}}]}}}}'
   ```

2. **Node selector mismatch**:
   ```
   Events:
     Warning  FailedScheduling  0/3 nodes match node selector
   ```
   
   **Solution**: Remove or update node selector:
   ```bash
   kubectl patch deployment clipper-backend -n clipper-production --type json \
     -p='[{"op": "remove", "path": "/spec/template/spec/nodeSelector"}]'
   ```

3. **Persistent Volume not available**:
   ```
   Events:
     Warning  FailedScheduling  pod has unbound immediate PersistentVolumeClaims
   ```
   
   **Solution**: Check PVC status and storage class:
   ```bash
   kubectl get pvc -n clipper-production
   kubectl describe pvc <pvc-name> -n clipper-production
   ```

#### OOMKilled (Out of Memory)

**Symptom**: Pod terminated with `OOMKilled` status

```bash
# Check pod status
kubectl get pods -n clipper-production

# View termination reason
kubectl describe pod <pod-name> -n clipper-production | grep -A 5 "Last State"
```

**Solutions**:

1. **Increase memory limits**:
   ```bash
   helm upgrade clipper ./helm/charts/clipper \
     -n clipper-production \
     --set backend.resources.limits.memory=2Gi \
     --reuse-values
   ```

2. **Investigate memory leak**:
   ```bash
   # Check memory usage before crash
   kubectl top pod <pod-name> -n clipper-production
   
   # Profile application (if profiling enabled)
   kubectl port-forward <pod-name> 6060:6060 -n clipper-production
   go tool pprof http://localhost:6060/debug/pprof/heap
   ```

3. **Add HPA to scale horizontally** instead of vertically

---

## Service & Networking

### Service Not Reachable

**Symptom**: Cannot connect to service from within cluster

```bash
# Test from debug pod
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://clipper-backend.clipper-production.svc.cluster.local/health/ready
```

**Diagnostics**:

```bash
# Check service exists
kubectl get svc -n clipper-production

# Check service endpoints
kubectl get endpoints clipper-backend -n clipper-production

# If endpoints are empty, pods aren't matching selector
kubectl get pods -n clipper-production --show-labels
kubectl get svc clipper-backend -n clipper-production -o yaml | grep selector -A 5
```

**Solutions**:

1. **No endpoints (selector mismatch)**:
   ```bash
   # Check pod labels
   kubectl get pods -n clipper-production --show-labels | grep clipper-backend
   
   # Update service selector if needed
   kubectl patch svc clipper-backend -n clipper-production -p \
     '{"spec":{"selector":{"app":"clipper-backend"}}}'
   ```

2. **Port mismatch**:
   ```bash
   # Verify service port matches container port
   kubectl get svc clipper-backend -n clipper-production -o yaml | grep -A 3 ports
   kubectl get deployment clipper-backend -n clipper-production -o yaml | grep containerPort
   ```

### Network Policy Blocking Traffic

**Symptom**: Connection timeouts between services

```bash
# Check network policies
kubectl get networkpolicy -n clipper-production

# Describe specific policy
kubectl describe networkpolicy clipper-backend -n clipper-production
```

**Solutions**:

1. **Temporarily disable network policy** (testing only):
   ```bash
   kubectl delete networkpolicy clipper-backend -n clipper-production
   ```

2. **Update network policy** to allow traffic:
   ```bash
   # Allow traffic from specific namespace
   kubectl patch networkpolicy clipper-backend -n clipper-production -p \
     '{"spec":{"ingress":[{"from":[{"namespaceSelector":{"matchLabels":{"name":"ingress-nginx"}}}]}]}}'
   ```

### DNS Resolution Issues

**Symptom**: Cannot resolve service names

```bash
# Test DNS from pod
kubectl exec -it deployment/clipper-backend -n clipper-production -- \
  nslookup postgres.clipper-production.svc.cluster.local

# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

**Solutions**:

1. **Restart CoreDNS**:
   ```bash
   kubectl rollout restart deployment/coredns -n kube-system
   ```

2. **Check DNS config**:
   ```bash
   kubectl get configmap coredns -n kube-system -o yaml
   ```

---

## Ingress & TLS

### Ingress Returns 404

**Symptom**: Ingress configured but returns 404

```bash
# Check ingress configuration
kubectl get ingress -n clipper-production
kubectl describe ingress clipper-backend -n clipper-production

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=100
```

**Common Issues**:

1. **Path mismatch**:
   ```yaml
   # Incorrect (no trailing slash)
   path: /api
   
   # Correct (with trailing slash or prefix)
   path: /api/
   pathType: Prefix
   ```

2. **Backend service not found**:
   ```bash
   # Verify backend service exists
   kubectl get svc clipper-backend -n clipper-production
   
   # Check ingress backend reference
   kubectl get ingress clipper-backend -n clipper-production -o yaml | grep -A 5 backend
   ```

3. **Ingress class mismatch**:
   ```bash
   # Check ingress class annotation
   kubectl get ingress clipper-backend -n clipper-production -o yaml | grep ingressClassName
   
   # Should match: nginx
   ```

### TLS Certificate Not Working

**Symptom**: HTTPS returns certificate error or not issued

```bash
# Check certificate status
kubectl get certificate -n clipper-production
kubectl describe certificate clipper-tls -n clipper-production

# Check certificate request
kubectl get certificaterequest -n clipper-production
kubectl describe certificaterequest <request-name> -n clipper-production

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager --tail=100
```

**Common Issues**:

1. **Certificate pending (DNS challenge)**:
   ```bash
   # Check if DNS records are correct
   dig clpr.tv
   dig _acme-challenge.clpr.tv TXT
   ```
   
   **Solution**: Verify DNS records point to correct LoadBalancer IP

2. **Rate limit (Let's Encrypt)**:
   ```
   Error: too many certificates already issued for exact set of domains
   ```
   
   **Solution**: Wait 1 week or use staging issuer temporarily:
   ```bash
   kubectl patch ingress clipper-backend -n clipper-production -p \
     '{"metadata":{"annotations":{"cert-manager.io/cluster-issuer":"letsencrypt-staging"}}}'
   ```

3. **ClusterIssuer not found**:
   ```bash
   # Check ClusterIssuer exists
   kubectl get clusterissuer
   
   # Create if missing (see kubernetes-runbook.md for full configuration)
   kubectl apply -f infrastructure/k8s/base/cert-manager.yaml
   ```

### Manual Certificate Renewal

```bash
# Delete certificate to force renewal
kubectl delete certificate clipper-tls -n clipper-production

# Certificate will be automatically recreated by cert-manager
kubectl get certificate -n clipper-production -w
```

---

## Storage & Persistence

### PVC Not Binding

**Symptom**: PersistentVolumeClaim stuck in `Pending`

```bash
# Check PVC status
kubectl get pvc -n clipper-production
kubectl describe pvc postgres-data -n clipper-production
```

**Common Issues**:

1. **Storage class not found**:
   ```bash
   # List available storage classes
   kubectl get storageclass
   
   # Use correct storage class
   kubectl patch pvc postgres-data -n clipper-production -p \
     '{"spec":{"storageClassName":"standard"}}'
   ```

2. **Insufficient storage capacity**:
   ```bash
   # Check available storage
   kubectl get pv
   
   # Reduce PVC size or provision more storage
   ```

3. **Access mode mismatch**:
   ```bash
   # Check PVC access mode
   kubectl get pvc postgres-data -n clipper-production -o yaml | grep accessModes
   
   # Should be ReadWriteOnce for StatefulSets
   ```

### Data Loss After Pod Restart

**Symptom**: Data not persisted after pod restart

```bash
# Check if pod is using PVC
kubectl describe pod <pod-name> -n clipper-production | grep -A 5 Volumes

# Verify PVC is mounted
kubectl exec -it <pod-name> -n clipper-production -- df -h
```

**Solutions**:

1. **Enable persistence in Helm values**:
   ```yaml
   persistence:
     enabled: true
     size: 50Gi
   ```

2. **Verify volume mount path**:
   ```bash
   # PostgreSQL data should be at /var/lib/postgresql/data
   kubectl exec -it statefulset/postgres -n clipper-production -- ls -la /var/lib/postgresql/data
   ```

---

## Performance Issues

### High Latency

**Symptom**: API requests are slow

```bash
# Check pod resource usage
kubectl top pods -n clipper-production

# Check pod count
kubectl get pods -n clipper-production | grep clipper-backend | wc -l

# Check HPA status
kubectl get hpa -n clipper-production
```

**Diagnostics**:

1. **CPU/Memory throttling**:
   ```bash
   # Check if pods are hitting limits
   kubectl describe pod <pod-name> -n clipper-production | grep -A 10 "Limits:"
   
   # Check metrics
   kubectl top pod <pod-name> -n clipper-production
   ```

2. **Database performance**:
   ```bash
   # Check database connections
   kubectl exec -it statefulset/postgres -n clipper-production -- \
     psql -U clipper -d clipper_db -c \
     "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
   
   # Check slow queries
   kubectl exec -it statefulset/postgres -n clipper-production -- \
     psql -U clipper -d clipper_db -c \
     "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
   ```

3. **Network latency**:
   ```bash
   # Test latency between pods
   kubectl exec -it deployment/clipper-backend -n clipper-production -- \
     ping postgres.clipper-production.svc.cluster.local
   ```

**Solutions**:

1. **Scale horizontally**:
   ```bash
   kubectl scale deployment clipper-backend --replicas=10 -n clipper-production
   ```

2. **Increase resource limits**:
   ```bash
   helm upgrade clipper ./helm/charts/clipper \
     -n clipper-production \
     --set backend.resources.limits.cpu=2000m \
     --set backend.resources.limits.memory=2Gi \
     --reuse-values
   ```

3. **Enable connection pooling** (PgBouncer) - see [[kubernetes-scaling|Scaling Guide]]

### Pod Eviction

**Symptom**: Pods being evicted due to resource pressure

```bash
# Check node conditions
kubectl describe nodes | grep -A 5 Conditions

# Check pod events
kubectl get events -n clipper-production --sort-by='.lastTimestamp' | grep Evicted
```

**Common Causes**:

1. **Disk pressure**: Node running out of disk space
2. **Memory pressure**: Node running out of memory
3. **PID pressure**: Too many processes

**Solutions**:

```bash
# Clean up unused images
# Note: kubectl node-shell requires the kubectl-node_shell plugin
# Install from: https://github.com/kvaps/kubectl-node-shell
kubectl get nodes -o json | \
  jq -r '.items[].metadata.name' | \
  xargs -I {} kubectl node-shell {} -- docker system prune -af

# Increase node resources or add more nodes
gcloud container clusters resize clipper-prod --num-nodes 5
```

---

## External Secrets

### ExternalSecret Not Syncing

**Symptom**: External secret not creating Kubernetes secret

```bash
# Check ExternalSecret status
kubectl get externalsecret -n clipper-production
kubectl describe externalsecret backend-secrets -n clipper-production

# Check SecretStore
kubectl get secretstore -n clipper-production
kubectl describe secretstore aws-secrets-manager -n clipper-production

# Check External Secrets Operator logs
kubectl logs -n external-secrets-system deployment/external-secrets --tail=100
```

**Common Issues**:

1. **SecretStore authentication failure**:
   ```
   Error: failed to get secret: AccessDenied
   ```
   
   **Solution**: Verify IAM permissions for service account:
   ```bash
   # AWS: Check IRSA annotation
   kubectl get serviceaccount clipper-backend -n clipper-production -o yaml | grep eks.amazonaws.com/role-arn
   
   # Verify IAM role has correct permissions
   aws iam get-role --role-name <role-name>
   ```

2. **Secret not found in secret manager**:
   ```
   Error: ResourceNotFoundException
   ```
   
   **Solution**: Create secret in cloud provider:
   ```bash
   # AWS
   aws secretsmanager create-secret \
     --name clipper/production/database \
     --secret-string '{"password":"secure-password"}'
   ```

3. **RefreshInterval too long**:
   ```bash
   # Force immediate sync
   kubectl annotate externalsecret backend-secrets \
     -n clipper-production \
     force-sync="$(date +%s)" --overwrite
   ```

---

## Database Connection Issues

### Backend Cannot Connect to Database

**Symptom**: Application logs show database connection errors

```bash
# Check backend logs
kubectl logs -f deployment/clipper-backend -n clipper-production | grep -i database

# Common errors:
# - "connection refused"
# - "no such host"
# - "authentication failed"
```

**Diagnostics**:

```bash
# Test database connectivity
kubectl exec -it deployment/clipper-backend -n clipper-production -- \
  nc -zv postgres.clipper-production.svc.cluster.local 5432

# Test database login
kubectl exec -it deployment/clipper-backend -n clipper-production -- \
  sh -c 'echo "SELECT 1" | psql $DATABASE_URL'

# Check database is running
kubectl get pods -n clipper-production | grep postgres
```

**Solutions**:

1. **Database not ready**:
   ```bash
   # Check database pod status
   kubectl describe pod <postgres-pod> -n clipper-production
   
   # Check database logs
   kubectl logs <postgres-pod> -n clipper-production
   ```

2. **Wrong credentials**:
   ```bash
   # Verify database secret
   kubectl get secret backend-secrets -n clipper-production -o yaml
   
   # Check DATABASE_URL environment variable
   kubectl exec -it deployment/clipper-backend -n clipper-production -- env | grep DATABASE_URL
   ```

3. **Network policy blocking traffic**:
   ```bash
   # Check network policies
   kubectl get networkpolicy -n clipper-production
   
   # Temporarily disable for testing
   kubectl delete networkpolicy clipper-backend -n clipper-production
   ```

### Database Connection Pool Exhausted

**Symptom**: `too many connections` error

```bash
# Check current connections
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U clipper -d clipper_db -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U clipper -d clipper_db -c "SHOW max_connections;"
```

**Solutions**:

1. **Increase max_connections**:
   ```yaml
   # Update PostgreSQL ConfigMap
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: postgres-config
   data:
     max_connections: "200"
   ```

2. **Implement connection pooling** with PgBouncer (see [[kubernetes-scaling|Scaling Guide]])

3. **Fix connection leaks** in application code

---

## Resource Constraints

### Cluster Out of Capacity

**Symptom**: Cannot schedule new pods

```bash
# Check node resources
kubectl top nodes
kubectl describe nodes | grep -A 5 "Allocated resources"
```

**Solutions**:

1. **Enable cluster autoscaler** (see [[kubernetes-scaling|Scaling Guide]])

2. **Manually scale cluster**:
   ```bash
   # GKE
   gcloud container clusters resize clipper-prod --num-nodes 5
   
   # EKS
   eksctl scale nodegroup --cluster=clipper-prod --nodes=5 standard-workers
   
   # AKS
   az aks scale --resource-group clipper-rg --name clipper-prod --node-count 5
   ```

3. **Reduce resource requests** for non-critical pods

### Namespace ResourceQuota Exceeded

**Symptom**: Cannot create new pods in namespace

```bash
# Check ResourceQuota
kubectl get resourcequota -n clipper-production
kubectl describe resourcequota -n clipper-production
```

**Solution**: Increase quota or reduce resource usage:

```bash
# Increase CPU quota
kubectl patch resourcequota compute-quota -n clipper-production -p \
  '{"spec":{"hard":{"requests.cpu":"20","limits.cpu":"40"}}}'
```

---

## Debugging Techniques

### Interactive Debugging

```bash
# Execute shell in running pod
kubectl exec -it deployment/clipper-backend -n clipper-production -- /bin/sh

# Run debug pod in same namespace
kubectl run -it --rm debug --image=nicolaka/netshoot -n clipper-production --restart=Never -- /bin/bash

# Port forward to local machine
kubectl port-forward deployment/clipper-backend 8080:8080 -n clipper-production
curl http://localhost:8080/health/ready
```

### Log Aggregation

```bash
# Stream logs from all backend pods
kubectl logs -f -l app=clipper-backend -n clipper-production

# Get logs from previous hour
kubectl logs --since=1h deployment/clipper-backend -n clipper-production

# Export logs to file
kubectl logs deployment/clipper-backend -n clipper-production > backend.log
```

### Resource Debugging

```bash
# Get YAML for all resources
kubectl get all -n clipper-production -o yaml > all-resources.yaml

# Describe all pods
kubectl describe pods -n clipper-production

# Get events sorted by time
kubectl get events -n clipper-production --sort-by='.lastTimestamp'
```

### Network Debugging

```bash
# Test connectivity from debug pod
kubectl run -it --rm debug --image=nicolaka/netshoot -n clipper-production --restart=Never -- /bin/bash

# Inside debug pod:
curl -v http://clipper-backend.clipper-production.svc.cluster.local/health/ready
nslookup postgres.clipper-production.svc.cluster.local
ping postgres.clipper-production.svc.cluster.local
telnet postgres.clipper-production.svc.cluster.local 5432
```

---

## Incident Response Workflows

### High Error Rate

1. **Identify source**:
   ```bash
   kubectl logs -f deployment/clipper-backend -n clipper-production | grep ERROR
   ```

2. **Check recent changes**:
   ```bash
   kubectl rollout history deployment/clipper-backend -n clipper-production
   ```

3. **Rollback if needed**:
   ```bash
   kubectl rollout undo deployment/clipper-backend -n clipper-production
   ```

4. **Scale up if traffic spike**:
   ```bash
   kubectl scale deployment clipper-backend --replicas=10 -n clipper-production
   ```

### Database Down

1. **Verify database status**:
   ```bash
   kubectl get pods -n clipper-production | grep postgres
   kubectl logs statefulset/postgres -n clipper-production --tail=100
   ```

2. **Check PVC and storage**:
   ```bash
   kubectl get pvc -n clipper-production
   ```

3. **Restart database** (if needed):
   ```bash
   kubectl rollout restart statefulset/postgres -n clipper-production
   ```

4. **Restore from backup** (if corrupted) - see [[kubernetes-disaster-recovery|DR Guide]]

### Certificate Expired

1. **Check certificate status**:
   ```bash
   kubectl get certificate -n clipper-production
   ```

2. **Force renewal**:
   ```bash
   kubectl delete certificate clipper-tls -n clipper-production
   ```

3. **Monitor renewal**:
   ```bash
   kubectl get certificate -n clipper-production -w
   ```

---

## Related Documentation

- [[kubernetes-runbook|Kubernetes Operations Runbook]] - Operational procedures
- [[kubernetes-scaling|Kubernetes Scaling Guide]] - Scaling strategies
- [[kubernetes-disaster-recovery|Disaster Recovery Guide]] - Backup and restore
- [[monitoring|Monitoring & Observability]] - Metrics and alerting

## Related Issues

- [#852 - Kubernetes Cluster Setup](https://github.com/subculture-collective/clipper/issues/852)
- [#853 - Application Helm Charts](https://github.com/subculture-collective/clipper/issues/853)
- [#854 - Kubernetes Documentation](https://github.com/subculture-collective/clipper/issues/854)
- [#805 - Roadmap 5.0 Master Tracker](https://github.com/subculture-collective/clipper/issues/805)

---

[[index|← Back to Operations]]
