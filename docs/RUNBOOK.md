# Deployment Runbook

This runbook provides step-by-step procedures for common deployment and operational tasks.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Standard Deployment](#standard-deployment)
- [Emergency Rollback](#emergency-rollback)
- [Database Migration](#database-migration)
- [Configuration Changes](#configuration-changes)
- [Scaling Operations](#scaling-operations)
- [Error Monitoring and Triage](#error-monitoring-and-triage)
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

## Error Monitoring and Triage

This section covers how to use Sentry for error monitoring and incident triage.

### Accessing Sentry

1. **Log in to Sentry**: <https://sentry.io>
2. **Select Project**:
   - `clipper-backend` for backend errors
   - `clipper-frontend` for frontend errors

### Understanding Sentry Issues

#### Issue Details

Each Sentry issue contains:

- **Error Message**: Description of what went wrong
- **Stack Trace**: Where in the code the error occurred
- **Breadcrumbs**: User actions leading to the error
- **Tags**: Metadata (environment, release, route, request_id)
- **User Context**: Hashed user ID (for privacy)
- **Request Context**: HTTP method, URL, headers (sensitive data scrubbed)

#### Issue Severity

- **Fatal**: Application crash or data loss
- **Error**: Exception that prevented operation completion
- **Warning**: Unexpected behavior but operation completed
- **Info**: Informational events

### Triage Process

#### Step 1: Assess Severity

1. Check the **issue frequency** (events per hour)
2. Check **affected users** count
3. Review **error message** and **stack trace**
4. Determine impact:
   - **P0 Critical**: Data loss, security breach, complete service outage
   - **P1 High**: Feature broken for all users, major degradation
   - **P2 Medium**: Feature broken for some users, minor degradation
   - **P3 Low**: Edge case, minor issue affecting few users

#### Step 2: Gather Context

1. **Check Tags**:
   - `environment`: Which environment (production, staging, development)?
   - `release`: Which version is affected?
   - `route`: Which API endpoint or page?
   - `request_id`: Unique identifier for request (use for log correlation)

2. **Review Breadcrumbs**:
   - User actions before error
   - API calls made
   - Navigation history

3. **Check User Context**:
   - Is it affecting specific users or random?
   - Pattern in user roles or permissions?

#### Step 3: Correlate with Logs

Use the `request_id` tag to find related logs:

```bash
# Backend logs (structured JSON)
docker-compose logs backend | grep "request_id\":\"<REQUEST_ID>"

# Or using jq for better formatting
docker-compose logs backend --no-color | \
  grep "<REQUEST_ID>" | \
  jq '.' 2>/dev/null || cat
```

Example structured log fields:

- `timestamp`: When the event occurred
- `level`: Log level (debug, info, warn, error)
- `message`: Log message
- `trace_id`/`request_id`: Request identifier
- `user_id`: Hashed user ID (matches Sentry)
- `method`, `path`, `status_code`: HTTP request details
- `error`: Error message if present

#### Step 4: Investigate Root Cause

1. **Examine Stack Trace**:
   - Find the origin of the error
   - Check if it's in application code or dependencies

2. **Check Recent Changes**:
   - In Sentry, click "Releases" to see if error started after a deployment
   - Review git commits for the affected release

3. **Look for Patterns**:
   - Time of day (load-related?)
   - Specific routes or features
   - User agent or browser (frontend issues)
   - Database queries (check slow query logs)

#### Step 5: Take Action

Based on severity:

**P0 Critical**:

1. Page on-call engineer immediately
2. Consider emergency rollback
3. Communicate to stakeholders
4. Fix immediately

**P1 High**:

1. Notify team in Slack
2. Assign to engineer
3. Create hotfix PR
4. Deploy within hours

**P2 Medium**:

1. Create GitHub issue
2. Add to sprint backlog
3. Fix in next release

**P3 Low**:

1. Create GitHub issue
2. Add to backlog
3. Fix when capacity allows

### Common Error Patterns

#### High Error Rate (> 5%)

**Investigate**:

- Recent deployments
- Database connection issues
- External API failures (Twitch, Stripe)
- Rate limiting triggered

**Actions**:

- Check service health: `/health/ready` endpoint
- Review database stats: `/health/stats` endpoint
- Check external service status pages
- Consider scaling resources

#### Performance Degradation

**Symptoms**: Slow response times, timeouts

**Investigate**:

- Database slow queries (check Sentry transaction spans)
- N+1 query problems
- Missing indexes
- Large payload sizes
- Memory leaks

**Actions**:

- Check database connection pool: `/health/stats`
- Review slow query logs
- Use `EXPLAIN ANALYZE` on suspicious queries
- Monitor memory usage: `docker stats`

#### Authentication Errors

**Symptoms**: Spike in 401/403 errors

**Investigate**:

- JWT token expiration issues
- Session store (Redis) problems
- Twitch OAuth token refresh failures

**Actions**:

- Check Redis connectivity: `/health/cache/check`
- Verify JWT configuration (keys not rotated unexpectedly)
- Check Twitch API status

#### Frontend JavaScript Errors

**Symptoms**: React errors, hydration mismatches

**Investigate**:

- Browser compatibility issues
- React version conflicts
- State management bugs
- API response format changes

**Actions**:

- Check browser and version from Sentry tags
- Review recent component changes
- Test in affected browser
- Check API contract hasn't changed

### Sentry Workflow Management

#### Resolving Issues

Mark issue as resolved when:

- Fix is deployed to production
- Verified no new occurrences
- Root cause is addressed

To resolve:

1. Click "Resolve" in Sentry
2. Select "In the next release" or specific version
3. Add resolution note explaining fix

#### Ignoring Issues

Ignore issues that are:

- False positives
- Browser extension errors
- Known third-party library bugs with no fix
- Expected errors (e.g., 404s for bots)

To ignore:

1. Click "Ignore"
2. Select condition (forever, until condition met, etc.)
3. Add reason for ignoring

#### Setting Up Alerts

Configure alerts for critical patterns:

1. **High Error Rate**:
   - Condition: > 50 events in 5 minutes
   - Action: Notify Slack channel, email on-call

2. **New Issue**:
   - Condition: First seen in production
   - Action: Notify team channel

3. **Regression**:
   - Condition: Resolved issue occurs again
   - Action: Notify original resolver, create GitHub issue

### Best Practices

1. **Triage Daily**: Review new issues at least once per day
2. **Monitor Releases**: Check Sentry after each deployment
3. **Set Ownership**: Assign issues to specific team members
4. **Document Patterns**: Update this runbook with new patterns
5. **PII Protection**: Never log sensitive user data
6. **Context is Key**: Always add breadcrumbs for user actions
7. **Release Tracking**: Always deploy with release tags
8. **Test Error Tracking**: Periodically test Sentry integration

### Testing Error Tracking

To verify Sentry is working:

**Backend**:

```bash
# Trigger test error (only in non-production)
curl -X POST http://localhost:8080/api/v1/test/sentry-error
```

**Frontend**:

```javascript
// In browser console (non-production only)
throw new Error('Test Sentry error');
```

Check Sentry dashboard within 30 seconds to confirm error appears.

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

## Service Level Objectives (SLOs)

### Availability SLO

**Target**: 99.5% uptime (21.6 hours downtime per month)

- Measured via health check endpoint (`/health`)
- Calculated over rolling 30-day window
- Excludes planned maintenance windows

### Latency SLO

**Target**: 95% of requests complete within specified latency targets

| Endpoint Type | P95 Latency Target | P99 Latency Target |
|---------------|-------------------|-------------------|
| Health checks | 50ms | 100ms |
| List/Feed endpoints | 100ms | 200ms |
| Detail endpoints | 50ms | 100ms |
| Write operations | 200ms | 500ms |
| Search operations | 200ms | 500ms |

### Error Rate SLO

**Target**: < 0.5% error rate (5xx responses)

- Measured as percentage of all requests
- Calculated over rolling 1-hour window
- Excludes user errors (4xx responses)

### Data Durability SLO

**Target**: 99.99% durability

- Daily automated backups
- Weekly restore testing
- 30-day backup retention
- Verified backup integrity

## Error Budgets

Error budgets allow for controlled service degradation while maintaining SLOs:

### Monthly Error Budget

Based on 99.5% availability SLO:

- **Total Budget**: 21.6 hours of downtime per month
- **Budget Burn Rate**: Track remaining budget daily

### Budget Consumption Policy

| Budget Remaining | Actions |
|------------------|---------|
| > 75% | Normal operations, continue feature development |
| 50-75% | Review incidents, consider stability improvements |
| 25-50% | Feature freeze, focus on reliability |
| < 25% | Emergency: Stop all non-critical changes, focus on stability |

### Burn Rate Alerts

- **Fast Burn**: Alert if consuming > 10% budget in 1 hour
- **Medium Burn**: Alert if consuming > 25% budget in 6 hours
- **Slow Burn**: Alert if consuming > 50% budget in 3 days

## On-Call Procedures

### On-Call Schedule

- Primary on-call: 24/7 rotation, 1-week shifts
- Secondary on-call: Backup escalation, same schedule
- Handoff: Mondays at 10:00 AM local time

### On-Call Responsibilities

1. **Respond to Alerts**:
   - Acknowledge within 5 minutes
   - Provide initial assessment within 15 minutes
   - Begin mitigation immediately

2. **Incident Management**:
   - Create incident ticket
   - Communicate status updates
   - Coordinate with team members
   - Document actions taken

3. **Escalation**:
   - Escalate to secondary if unresponsive
   - Escalate to team lead for critical issues
   - Engage specialists as needed

### Alert Response Times

| Severity | Target Response Time | Target Resolution Time |
|----------|---------------------|----------------------|
| Critical | 5 minutes | 1 hour |
| High | 15 minutes | 4 hours |
| Medium | 30 minutes | 24 hours |
| Low | Next business day | 1 week |

### Alert Severity Definitions

**Critical**: Service is completely down or major functionality broken

- Examples: Database down, all requests failing, security breach

**High**: Significant degradation affecting multiple users

- Examples: High error rate, slow response times, partial outage

**Medium**: Minor degradation or potential future problem

- Examples: High resource usage, degraded cache, elevated error rate

**Low**: Informational or minor issue

- Examples: Certificate expiring soon, low cache hit rate

### Common Incident Scenarios

#### Scenario 1: Service Down

**Symptoms**: Health checks failing, all requests timing out

**Response**:

1. Check server status: `ssh deploy@production-server`
2. Check Docker containers: `docker-compose ps`
3. Check logs: `docker-compose logs -f --tail=100`
4. Restart if needed: `docker-compose restart`
5. Verify recovery: `./scripts/health-check.sh`
6. If not resolved, escalate and prepare rollback

**Escalation**: If unresolved in 15 minutes, roll back to last known good version

#### Scenario 2: High Error Rate

**Symptoms**: Error rate > 5% for more than 5 minutes

**Response**:

1. Check error logs: `docker-compose logs backend | grep -i error`
2. Identify error pattern (database, API, etc.)
3. Check dependency health (database, Redis, Twitch API)
4. Apply fix or rollback if recent deployment
5. Monitor error rate for 15 minutes after fix

**Escalation**: If error rate doesn't improve in 20 minutes, roll back

#### Scenario 3: High Response Time

**Symptoms**: P95 latency > 2x normal for more than 5 minutes

**Response**:

1. Check resource usage: `docker stats`
2. Check database connections: `docker-compose exec postgres psql -U clipper -c "SELECT count(*) FROM pg_stat_activity;"`
3. Check for slow queries in logs
4. Check cache hit rate: `curl localhost:8080/health/cache`
5. Scale up resources if needed
6. Investigate and optimize slow operations

**Escalation**: If latency doesn't improve in 30 minutes, escalate to database admin

#### Scenario 4: Database Connection Issues

**Symptoms**: "too many connections", connection timeouts

**Response**:

1. Check connection count: See [Database Connection Issues](#database-connection-issues)
2. Restart backend to clear leaked connections: `docker-compose restart backend`
3. Increase max_connections if needed
4. Identify connection leaks in code

**Escalation**: If connections don't decrease, escalate to database admin

#### Scenario 5: Disk Space Critical

**Symptoms**: < 10% disk space remaining

**Response**:

1. Identify large files: `du -sh /* | sort -h`
2. Clean Docker: `docker system prune -a -f`
3. Clean logs: `sudo journalctl --vacuum-time=7d`
4. Clean old backups: `find /var/backups -mtime +30 -delete`
5. Add more disk space if needed

**Escalation**: If disk space < 5%, stop non-critical services immediately

### Incident Communication

#### Internal Communication

1. **Slack**: Post to #incidents channel

   ```
   🚨 INCIDENT: [Severity] - [Brief Description]
   Impact: [User-facing impact]
   Status: [Investigating/Mitigating/Resolved]
   ETA: [Expected resolution time]
   ```

2. **Status Updates**: Every 15 minutes for critical, 30 minutes for high

3. **Resolution**: Post resolution summary with root cause

#### External Communication

1. **Status Page**: Update <https://status.clipper.example.com>
2. **Twitter**: Post updates for major incidents
3. **Email**: Notify affected users if data loss or security issue

### Post-Incident Review

Within 48 hours of incident resolution:

1. **Write Post-Mortem**:
   - Timeline of events
   - Root cause analysis
   - Impact assessment
   - Actions taken
   - Lessons learned
   - Action items

2. **Team Review**:
   - Schedule review meeting
   - Discuss what went well
   - Discuss what could improve
   - Assign action items

3. **Documentation Updates**:
   - Update runbook
   - Update monitoring
   - Update alerts
   - Share learnings

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Primary On-Call | TBD | TBD | 24/7 |
| Secondary On-Call | TBD | TBD | 24/7 |
| Database Admin | TBD | TBD | Business hours + on-call |
| DevOps Lead | TBD | TBD | Business hours + on-call |
| Security Team | <security@example.com> | Email/Slack | 24/7 for critical |
| Infrastructure Provider | TBD | Support portal | 24/7 |

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
