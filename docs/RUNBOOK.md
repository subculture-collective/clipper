# Deployment Runbook

This runbook provides step-by-step procedures for common deployment and operational tasks.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Standard Deployment](#standard-deployment)
- [Emergency Rollback](#emergency-rollback)
- [Database Migration](#database-migration)
- [Configuration Changes](#configuration-changes)
- [Scaling Operations](#scaling-operations)
- [Troubleshooting Guide](#troubleshooting-guide)

## Pre-Deployment Checklist

Before any production deployment, verify:

### Code Quality

- [ ] All CI checks passing (linting, tests, build)
- [ ] Code reviewed and approved
- [ ] No known critical bugs
- [ ] Security scans passed (CodeQL, Trivy)
- [ ] Documentation updated

### Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing (if applicable)
- [ ] Smoke tests prepared
- [ ] Tested on staging environment

### Infrastructure

- [ ] Server resources sufficient (CPU, memory, disk)
- [ ] Database backup completed
- [ ] Monitoring and alerts active
- [ ] Health checks configured
- [ ] SSL certificates valid

### Communication

- [ ] Team notified of deployment
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback plan prepared
- [ ] On-call engineer assigned

### Environment

- [ ] Environment variables configured
- [ ] Secrets updated (if needed)
- [ ] External dependencies available
- [ ] DNS records correct

## Standard Deployment

### Automated Deployment (Recommended)

#### Via GitHub Actions

1. **Trigger Deployment**:

   ```bash
   # Push to main branch
   git push origin main
   
   # Or create version tag
   git tag -a v1.2.3 -m "Release version 1.2.3"
   git push origin v1.2.3
   ```

2. **Monitor Workflow**:
   - Go to GitHub Actions tab
   - Watch deployment progress
   - Review logs for any errors

3. **Approve Production Deployment**:
   - Production requires manual approval
   - Review changes in PR
   - Click "Review deployments"
   - Approve deployment

4. **Verify Deployment**:

   ```bash
   # Check health endpoints
   curl https://clipper.example.com/health
   
   # Test API endpoints
   curl https://clipper.example.com/api/v1/ping
   
   # Check logs
   ssh deploy@production-server
   cd /opt/clipper
   docker-compose logs -f --tail=100
   ```

### Manual Deployment

#### Step 1: Connect to Server

```bash
# SSH to production server
ssh deploy@production-server

# Navigate to deployment directory
cd /opt/clipper
```

#### Step 2: Backup Current State

```bash
# Run backup script
./scripts/backup.sh

# Verify backup completed
ls -lh /var/backups/clipper/
```

#### Step 3: Pull Latest Changes

```bash
# Pull latest Docker images
docker-compose pull

# Or build locally (if needed)
docker-compose build --no-cache
```

#### Step 4: Run Migrations (if needed)

```bash
# Backup database first
./scripts/backup.sh

# Run migrations
# (Add your migration command here)
```

#### Step 5: Deploy

```bash
# Deploy using the deployment script
./scripts/deploy.sh

# Or manually:
docker-compose down
docker-compose up -d
```

#### Step 6: Health Check

```bash
# Wait for services to start
sleep 10

# Run health checks
./scripts/health-check.sh

# Check logs for errors
docker-compose logs -f --tail=50
```

#### Step 7: Smoke Tests

```bash
# Test homepage
curl -I https://clipper.example.com

# Test API
curl https://clipper.example.com/api/v1/ping

# Test authentication (if applicable)
# curl -X POST https://clipper.example.com/api/v1/login -d '...'
```

#### Step 8: Monitor

```bash
# Monitor logs for 5-10 minutes
docker-compose logs -f

# Watch resource usage
docker stats

# Check error rates
# (Use your monitoring tool)
```

## Emergency Rollback

### Quick Rollback

If deployment fails immediately:

```bash
# SSH to server
ssh deploy@production-server
cd /opt/clipper

# Run rollback script with backup tag
./scripts/rollback.sh backup-20240101-120000

# Or use automatic rollback (uses latest backup)
./scripts/rollback.sh

# Verify health
./scripts/health-check.sh
```

### Rollback via GitHub Actions

1. Navigate to Actions > Deploy to Production
2. Find last successful deployment run
3. Click "Re-run jobs"
4. Approve deployment
5. Monitor completion

### Rollback to Specific Version

```bash
# SSH to server
ssh deploy@production-server
cd /opt/clipper

# List available versions
docker images | grep clipper

# Tag specific version as latest
docker tag ghcr.io/subculture-collective/clipper/backend:v1.2.3 clipper-backend:latest
docker tag ghcr.io/subculture-collective/clipper/frontend:v1.2.3 clipper-frontend:latest

# Restart containers
docker-compose down
docker-compose up -d

# Verify
./scripts/health-check.sh
```

### Database Rollback

If database migration needs rollback:

```bash
# Restore from backup
cd /opt/clipper
BACKUP_FILE="/var/backups/clipper/db-20240101-120000.sql.gz"

# Stop backend to prevent new connections
docker-compose stop backend

# Restore database
gunzip < $BACKUP_FILE | docker-compose exec -T postgres psql -U clipper -d clipper

# Start backend
docker-compose start backend

# Verify
./scripts/health-check.sh
```

## Database Migration

### Before Migration

1. **Backup Database**:

   ```bash
   ./scripts/backup.sh
   ```

2. **Test on Staging**:

   ```bash
   # Run migration on staging first
   # Verify application works
   # Check for performance issues
   ```

3. **Plan Downtime** (if needed):
   - Schedule maintenance window
   - Notify users
   - Prepare rollback plan

### Zero-Downtime Migration

For non-breaking changes:

```bash
# 1. Deploy new code with backward-compatible migration
./scripts/deploy.sh

# 2. Run migration
# (Add migration command)

# 3. Verify both old and new code work

# 4. Remove backward compatibility in next release
```

### Migration with Downtime

For breaking changes:

```bash
# 1. Enable maintenance mode (if applicable)
# (Add maintenance mode command)

# 2. Backup database
./scripts/backup.sh

# 3. Stop backend
docker-compose stop backend

# 4. Run migration
# (Add migration command)

# 5. Deploy new code
docker-compose pull
docker-compose up -d

# 6. Verify
./scripts/health-check.sh

# 7. Disable maintenance mode
```

## Configuration Changes

### Environment Variables

```bash
# SSH to server
ssh deploy@production-server
cd /opt/clipper

# Edit .env file
nano .env

# Restart services to apply changes
docker-compose restart

# Verify
./scripts/health-check.sh
```

### Nginx Configuration

```bash
# Copy new configuration
sudo cp nginx/nginx-ssl.conf /etc/nginx/sites-available/clipper

# Test configuration
sudo nginx -t

# Reload Nginx (no downtime)
sudo systemctl reload nginx

# Or restart if needed
sudo systemctl restart nginx
```

### Docker Compose Configuration

```bash
# Edit docker-compose.yml
nano docker-compose.yml

# Validate syntax
docker-compose config

# Apply changes
docker-compose up -d

# Verify
docker-compose ps
./scripts/health-check.sh
```

## Scaling Operations

### Vertical Scaling (Increase Resources)

#### Increase Server Resources

1. **Cloud Provider**:
   - Resize instance in cloud console
   - Reboot server
   - Verify services restart

2. **Docker Resources**:

   ```yaml
   # Edit docker-compose.yml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 4G
           reservations:
             cpus: '1'
             memory: 2G
   ```

### Horizontal Scaling (Add Servers)

#### Add Backend Instance

1. **Set up Load Balancer**:

   ```nginx
   upstream backend {
       least_conn;
       server backend1:8080 max_fails=3 fail_timeout=30s;
       server backend2:8080 max_fails=3 fail_timeout=30s;
       server backend3:8080 max_fails=3 fail_timeout=30s;
   }
   ```

2. **Deploy to New Server**:

   ```bash
   # Same deployment process on new server
   # Ensure shared database and Redis
   ```

3. **Update Load Balancer**:

   ```bash
   # Add new server to upstream
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Troubleshooting Guide

### Service Not Starting

**Symptoms**: Container exits immediately

**Steps**:

```bash
# Check logs
docker-compose logs backend

# Check configuration
docker-compose config

# Validate environment variables
cat .env

# Try starting manually for debugging
docker-compose run --rm backend /bin/sh
```

### High Memory Usage

**Symptoms**: Server becoming slow, OOM errors

**Steps**:

```bash
# Check memory usage
free -h
docker stats

# Identify culprit
docker stats --no-stream

# Check for memory leaks
docker-compose logs backend | grep -i "memory\|oom"

# Restart service if needed
docker-compose restart backend
```

### High CPU Usage

**Symptoms**: Slow response times, high load average

**Steps**:

```bash
# Check CPU usage
top
htop

# Check per-container usage
docker stats

# Check for tight loops or deadlocks
docker-compose logs backend

# Scale if needed (add more instances)
```

### Database Connection Issues

**Symptoms**: "connection refused", "too many connections"

**Steps**:

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Check connections
docker-compose exec postgres psql -U clipper -c "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
docker-compose exec postgres psql -U clipper -c "SHOW max_connections;"

# Restart if needed
docker-compose restart postgres
```

### SSL Certificate Issues

**Symptoms**: Certificate expired, browser warnings

**Steps**:

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# Check Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Disk Space Full

**Symptoms**: "no space left on device"

**Steps**:

```bash
# Check disk usage
df -h

# Find large files/directories
du -sh /* | sort -h

# Clean Docker
docker system prune -a
docker volume prune

# Clean logs
sudo journalctl --vacuum-time=7d

# Remove old backups
find /var/backups -mtime +30 -delete
```

### Network Issues

**Symptoms**: Slow response, timeouts

**Steps**:

```bash
# Check network connectivity
ping 8.8.8.8

# Check DNS
nslookup clipper.example.com

# Check ports
sudo netstat -tlnp | grep -E '80|443|8080'

# Check firewall
sudo ufw status

# Test from inside container
docker-compose exec backend wget -O- http://localhost:8080/health
```

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Primary On-Call | TBD | TBD | 24/7 |
| Secondary On-Call | TBD | TBD | 24/7 |
| Database Admin | TBD | TBD | Business hours |
| DevOps Lead | TBD | TBD | Business hours |

## Post-Deployment

### Verification Checklist

After deployment, verify:

- [ ] Health checks passing
- [ ] All endpoints responding
- [ ] Authentication working
- [ ] Database queries working
- [ ] Cache working (Redis)
- [ ] Static assets loading
- [ ] No errors in logs
- [ ] Response times normal
- [ ] Error rates normal
- [ ] No memory leaks
- [ ] Monitoring showing green
- [ ] Alerts not firing

### Monitoring Period

- Monitor for 15-30 minutes after deployment
- Watch for:
  - Error rate spikes
  - Slow response times
  - Memory leaks
  - Unusual traffic patterns
  - Failed health checks

### Rollback Decision

Rollback if:

- Error rate > 5%
- P95 response time > 2x normal
- Critical functionality broken
- Database corruption
- Security vulnerability exposed
- User reports of major issues

### Documentation

After deployment:

- Update deployment log
- Document any issues encountered
- Update runbook if needed
- Share learnings with team

## Appendix

### Quick Command Reference

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f --tail=100 SERVICE_NAME

# Restart service
docker-compose restart SERVICE_NAME

# Update service
docker-compose pull SERVICE_NAME && docker-compose up -d SERVICE_NAME

# Run health check
./scripts/health-check.sh

# Backup
./scripts/backup.sh

# Deploy
./scripts/deploy.sh

# Rollback
./scripts/rollback.sh BACKUP_TAG
```

### Useful Monitoring Commands

```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Check memory
free -h

# Check CPU load
uptime

# Check processes
top

# Check network
netstat -tlnp
```
