# Blue/Green Deployment Rollout Plan

## Overview

This document describes the blue/green deployment strategy for Clipper, which enables zero-downtime deployments with automated smoke tests and rollback capabilities.

## Table of Contents

1. [Strategy Overview](#strategy-overview)
2. [Architecture](#architecture)
3. [Deployment Methods](#deployment-methods)
4. [Pre-Deployment Checklist](#pre-deployment-checklist)
5. [Deployment Procedures](#deployment-procedures)
6. [Smoke Tests](#smoke-tests)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring and Verification](#monitoring-and-verification)
9. [Troubleshooting](#troubleshooting)

## Strategy Overview

### Blue/Green Deployment

Blue/green deployment is a release management strategy that maintains two identical production environments:

- **Blue Environment**: Currently serving production traffic
- **Green Environment**: Idle, ready to receive the new version

**Benefits:**

- ✅ Zero-downtime deployments
- ✅ Instant rollback capability
- ✅ Production testing before traffic switch
- ✅ Reduced risk of deployment failures
- ✅ Clear separation between versions

### Deployment Flow

```
1. Detect active environment (blue or green)
2. Deploy new version to inactive environment
3. Run health checks on new version
4. Run smoke tests on new version
5. Switch traffic to new version
6. Monitor new version for stability
7. Scale down old version (preserve for rollback)
```

## Architecture

### Docker-based Deployment

```
                    ┌──────────────────┐
                    │   Load Balancer  │
                    │   (Nginx/HAProxy)│
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
         ┌──────────▼────────┐  ┌─────▼──────────┐
         │  Blue Environment │  │ Green Environment│
         │   Port 8080       │  │   Port 8081      │
         │                   │  │                   │
         │  clipper-backend  │  │  clipper-backend │
         │  -blue container  │  │  -green container│
         └───────────────────┘  └──────────────────┘
```

### Kubernetes-based Deployment

```
                    ┌──────────────────┐
                    │   K8s Service    │
                    │  (clipper-backend)│
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │  Selector: version│
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
         ┌──────────▼────────┐  ┌─────▼──────────┐
         │ Blue Deployment   │  │ Green Deployment│
         │  replicas: 2      │  │  replicas: 0/2  │
         │                   │  │                  │
         │  Pod 1  │  Pod 2  │  │  Pod 1  │  Pod 2│
         └───────────────────┘  └──────────────────┘
```

## Deployment Methods

### Method 1: Docker Deployment (Simple)

**Use Case:** Single server or VM deployments

**Script:** `scripts/deploy-blue-green.sh`

**Prerequisites:**
- Docker installed
- Nginx or load balancer configured
- `.env` file with environment variables
- Smoke test script in place

**Command:**
```bash
cd /opt/clipper
ENVIRONMENT=production ./scripts/deploy-blue-green.sh
```

### Method 2: Kubernetes Deployment

**Use Case:** Kubernetes cluster deployments

**Script:** `scripts/deploy-k8s-blue-green.sh`

**Prerequisites:**
- Kubernetes cluster running
- kubectl configured
- Blue and green deployments created
- Service configured

**Command:**
```bash
NAMESPACE=production VERSION=v1.2.3 ./scripts/deploy-k8s-blue-green.sh
```

### Method 3: GitHub Actions (Automated)

**Use Case:** CI/CD pipeline deployments

**Workflow:** `.github/workflows/deploy-blue-green.yml`

**Trigger:**
- Manual workflow dispatch
- Scheduled deployments

**Steps:**
1. Go to GitHub Actions
2. Select "Blue/Green Deployment" workflow
3. Click "Run workflow"
4. Select environment (staging/production)
5. Optionally skip tests (not recommended)
6. Click "Run workflow"

## Pre-Deployment Checklist

Before running a blue/green deployment:

### Infrastructure Checks

- [ ] Docker/Kubernetes cluster is healthy
- [ ] Sufficient resources available (CPU, memory, disk)
- [ ] Load balancer is configured correctly
- [ ] Network connectivity is stable
- [ ] Database migrations are ready (if applicable)

### Code and Build Checks

- [ ] All tests pass in CI
- [ ] Code review completed
- [ ] Security scans passed
- [ ] Docker images built and pushed to registry
- [ ] Version/tag is correctly labeled

### Configuration Checks

- [ ] Environment variables are up to date
- [ ] Secrets are properly configured
- [ ] Database connection strings are correct
- [ ] External service integrations are verified

### Backup and Rollback Checks

- [ ] Recent database backup exists
- [ ] Previous version is preserved for rollback
- [ ] Rollback procedure is documented
- [ ] On-call team is available

### Communication Checks

- [ ] Stakeholders notified of deployment
- [ ] Maintenance window scheduled (if needed)
- [ ] Monitoring alerts configured
- [ ] Incident response team ready

## Deployment Procedures

### Docker Deployment Procedure

#### Step 1: Prepare Environment

```bash
# SSH into deployment server
ssh deploy@production-server

# Navigate to deployment directory
cd /opt/clipper

# Pull latest code/scripts (if needed)
git pull origin main
```

#### Step 2: Set Environment Variables

```bash
# Ensure environment variables are set
export ENVIRONMENT=production
export DEPLOY_DIR=/opt/clipper
export REGISTRY=ghcr.io/subculture-collective/clipper
```

#### Step 3: Run Blue/Green Deployment

```bash
# Execute deployment script
./scripts/deploy-blue-green.sh
```

The script will automatically:
1. Detect active environment
2. Pull new images
3. Start new environment
4. Run health checks
5. Run smoke tests
6. Switch traffic
7. Monitor stability
8. Stop old environment

#### Step 4: Verify Deployment

```bash
# Check container status
docker ps --filter "name=clipper-backend"

# Check logs
docker logs clipper-backend-green  # or blue, depending on active

# Run manual health check
./scripts/health-check.sh

# Run manual smoke tests
./scripts/smoke-tests.sh
```

### Kubernetes Deployment Procedure

#### Step 1: Prepare Deployment

```bash
# Set kubectl context
kubectl config use-context production

# Verify cluster status
kubectl get nodes
kubectl get pods -n production
```

#### Step 2: Update Image Version

```bash
# Set environment variables
export NAMESPACE=production
export VERSION=v1.2.3
export REGISTRY=ghcr.io/subculture-collective/clipper
```

#### Step 3: Run Blue/Green Deployment

```bash
# Execute Kubernetes deployment script
./scripts/deploy-k8s-blue-green.sh
```

#### Step 4: Verify Deployment

```bash
# Check deployment status
kubectl get deployments -n production -l app=clipper-backend

# Check pod status
kubectl get pods -n production -l app=clipper-backend

# Check service selector
kubectl get service clipper-backend -n production -o yaml

# View logs
kubectl logs -n production -l app=clipper-backend,version=green --tail=50
```

## Smoke Tests

### Overview

Smoke tests are automated tests that verify critical functionality after deployment. They run automatically during deployment but can also be run manually.

### Test Categories

1. **Health Checks**
   - `/health` - Basic health endpoint
   - `/health/ready` - Readiness probe
   - `/health/live` - Liveness probe

2. **API Endpoints**
   - `/api/v1/ping` - API availability
   - `/api/v1/clips` - Core functionality
   - `/api/v1/search` - Search functionality
   - `/api/v1/tags` - Tag functionality

3. **Authentication**
   - Protected endpoints return 401
   - Token validation works

4. **Performance**
   - Response times < 1 second
   - No timeout errors

### Running Smoke Tests

#### Automatic (during deployment)

Smoke tests run automatically as part of the deployment script.

#### Manual

```bash
# Test specific environment
BACKEND_URL=http://localhost:8080 ./scripts/smoke-tests.sh

# Test with verbose output
VERBOSE=true BACKEND_URL=http://localhost:8080 ./scripts/smoke-tests.sh

# Test production
BACKEND_URL=https://api.clipper.example.com ./scripts/smoke-tests.sh
```

### Adding New Smoke Tests

Edit `scripts/smoke-tests.sh` and add new tests:

```bash
# Example: Add new endpoint test
run_test "New Feature Check" "/api/v1/new-feature" 200

# Example: Add JSON response test
test_json_response "Feature Status" "/api/v1/status" ".feature.enabled" "true"

# Example: Add performance test
test_response_time "Feature Performance" "/api/v1/feature" 500
```

## Rollback Procedures

### When to Rollback

Rollback should be triggered when:

- ❌ Smoke tests fail
- ❌ Health checks fail after traffic switch
- ❌ Error rate increases significantly
- ❌ Performance degrades below acceptable levels
- ❌ Critical functionality is broken
- ❌ Database issues occur

### Automatic Rollback

The deployment script includes automatic rollback on:
- Health check failure
- Smoke test failure
- Service startup failure

### Manual Rollback - Docker

#### Quick Rollback

```bash
# Restart previous environment
docker start clipper-backend-blue  # or green

# Update load balancer to point to old environment
# (Manual or script-based)
```

#### Complete Rollback

```bash
# Use rollback script
cd /opt/clipper
./scripts/rollback.sh backup-20231207-120000

# Or manually:
# 1. Stop new environment
docker stop clipper-backend-green

# 2. Start old environment
docker start clipper-backend-blue

# 3. Update load balancer
sudo vim /etc/nginx/sites-available/clipper
# Change proxy_pass to point to old port
sudo nginx -t
sudo systemctl reload nginx

# 4. Verify
./scripts/health-check.sh
```

### Manual Rollback - Kubernetes

```bash
# Switch service selector back to previous version
kubectl patch service clipper-backend -n production \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# Scale up previous deployment
kubectl scale deployment/clipper-backend-blue --replicas=2 -n production

# Wait for pods to be ready
kubectl wait --for=condition=available --timeout=60s \
  deployment/clipper-backend-blue -n production

# Scale down new deployment
kubectl scale deployment/clipper-backend-green --replicas=0 -n production

# Verify
kubectl get pods -n production -l app=clipper-backend
```

### Post-Rollback Actions

After a rollback:

1. **Investigate the issue**
   - Review logs: `docker logs` or `kubectl logs`
   - Check error messages
   - Analyze metrics and monitoring data

2. **Document the incident**
   - Record what went wrong
   - Document the rollback process
   - Create post-mortem if needed

3. **Fix the issue**
   - Identify root cause
   - Apply fix
   - Test thoroughly
   - Attempt deployment again

4. **Communicate**
   - Notify stakeholders
   - Update status page
   - Provide ETA for resolution

## Monitoring and Verification

### Real-time Monitoring

During deployment, monitor:

1. **Application Metrics**
   - Response times
   - Error rates
   - Request throughput
   - Active connections

2. **Infrastructure Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

3. **Health Endpoints**
   ```bash
   # Continuous monitoring
   watch -n 5 'curl -s http://localhost:8080/health | jq'
   ```

4. **Container Status**
   ```bash
   # Docker
   watch -n 5 'docker ps --filter "name=clipper-backend"'
   
   # Kubernetes
   watch -n 5 'kubectl get pods -n production -l app=clipper-backend'
   ```

### Post-Deployment Verification

After deployment completes:

1. **Run full smoke tests**
   ```bash
   ./scripts/smoke-tests.sh
   ```

2. **Check application logs**
   ```bash
   # Docker
   docker logs --tail=100 clipper-backend-green
   
   # Kubernetes
   kubectl logs -n production -l app=clipper-backend,version=green --tail=100
   ```

3. **Verify database connectivity**
   ```bash
   # Check database connections
   docker exec clipper-backend-green pg_isready -h db-host -U clipper
   ```

4. **Test critical user flows**
   - User login
   - Clip browsing
   - Search functionality
   - Voting/commenting
   - API integrations

5. **Monitor for 15-30 minutes**
   - Watch for error spikes
   - Check response times
   - Verify no memory leaks
   - Monitor error logs

## Troubleshooting

### Common Issues and Solutions

#### Issue: Health Checks Failing

**Symptoms:**
- Deployment script fails with "Health check failed"
- curl to /health returns error

**Solutions:**
```bash
# Check if container is running
docker ps --filter "name=clipper-backend"

# Check container logs
docker logs clipper-backend-green

# Check if port is bound
netstat -tulpn | grep 8081

# Test health endpoint directly
curl -v http://localhost:8081/health

# Check environment variables
docker exec clipper-backend-green env | grep -E '(DATABASE|REDIS)'
```

#### Issue: Smoke Tests Failing

**Symptoms:**
- Specific API endpoints return errors
- Tests pass locally but fail in deployment

**Solutions:**
```bash
# Run smoke tests with verbose output
VERBOSE=true ./scripts/smoke-tests.sh

# Test individual endpoints
curl -v http://localhost:8081/api/v1/clips

# Check API logs for errors
docker logs clipper-backend-green | grep ERROR

# Verify database migrations
docker exec clipper-backend-green migrate -path /migrations -database $DB_URL version
```

#### Issue: Traffic Not Switching

**Symptoms:**
- Old environment still receiving traffic
- New environment idle

**Solutions:**
```bash
# Check nginx configuration
sudo nginx -t
cat /etc/nginx/sites-available/clipper | grep proxy_pass

# Reload nginx
sudo systemctl reload nginx

# For Kubernetes - check service selector
kubectl get service clipper-backend -n production -o yaml | grep selector

# Manually patch service
kubectl patch service clipper-backend -n production \
  -p '{"spec":{"selector":{"version":"green"}}}'
```

#### Issue: Performance Degradation

**Symptoms:**
- Response times increased
- Timeouts occurring
- High CPU/memory usage

**Solutions:**
```bash
# Check resource usage
docker stats clipper-backend-green

# For Kubernetes
kubectl top pods -n production -l app=clipper-backend

# Check for memory leaks
docker exec clipper-backend-green ps aux

# Review application metrics
curl http://localhost:8081/health/stats

# Check database connection pool
curl http://localhost:8081/health/cache
```

#### Issue: Database Connection Errors

**Symptoms:**
- "connection refused" errors
- "too many connections" errors

**Solutions:**
```bash
# Test database connectivity
docker exec clipper-backend-green pg_isready -h $DB_HOST -p $DB_PORT

# Check connection string
docker exec clipper-backend-green env | grep DATABASE_URL

# Verify database is accepting connections
psql -h $DB_HOST -p $DB_PORT -U clipper -c "SELECT 1"

# Check connection pool settings
docker exec clipper-backend-green curl localhost:8080/health/stats
```

#### Issue: Container Won't Start

**Symptoms:**
- Container exits immediately
- "CrashLoopBackOff" in Kubernetes

**Solutions:**
```bash
# Check container logs
docker logs clipper-backend-green

# Check if image pulled correctly
docker images | grep clipper-backend

# Verify environment variables
docker exec clipper-backend-green env

# Try starting container manually
docker run -it --rm --env-file .env clipper-backend:latest /bin/sh

# For Kubernetes
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production --previous
```

### Getting Help

If issues persist:

1. Check application logs thoroughly
2. Review monitoring dashboards
3. Consult runbook for specific scenarios
4. Contact on-call team
5. Create incident ticket with:
   - Deployment timestamp
   - Error messages
   - Steps already attempted
   - Current system state

## Best Practices

1. **Always test in staging first**
   - Run deployment in staging environment
   - Verify all smoke tests pass
   - Test rollback procedure

2. **Deploy during low-traffic periods**
   - Schedule deployments for off-peak hours
   - Notify users of maintenance window (if needed)

3. **Monitor actively during deployment**
   - Watch logs in real-time
   - Check metrics dashboards
   - Be ready to rollback quickly

4. **Keep old environment for quick rollback**
   - Don't immediately destroy old containers/pods
   - Preserve them for at least 1 hour
   - Clean up after stability is confirmed

5. **Document everything**
   - Record deployment details
   - Note any issues encountered
   - Update runbook with new learnings

6. **Automate where possible**
   - Use CI/CD pipelines
   - Automate smoke tests
   - Automate rollback triggers

7. **Test rollback regularly**
   - Practice rollback in staging
   - Ensure team knows the procedure
   - Keep rollback scripts up to date

## Conclusion

The blue/green deployment strategy provides a safe, reliable way to deploy new versions of Clipper with zero downtime. By following this rollout plan and best practices, deployments should be smooth and issues should be caught early with automated smoke tests and health checks.

For questions or issues, refer to the [Runbook](../docs/operations/runbook.md) or contact the DevOps team.
