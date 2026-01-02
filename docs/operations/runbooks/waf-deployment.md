---
title: "WAF Deployment Runbook"
summary: "Step-by-step deployment procedures for WAF protection"
tags: ['operations', 'security', 'waf', 'runbook', 'deployment']
area: "operations"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2026-01-02
---

# WAF Deployment Runbook

**Purpose**: Step-by-step guide for deploying WAF protection to staging and production environments.

**Prerequisites**:
- Access to production/staging server
- Docker and docker-compose running
- Caddy container running on `web` network
- Backup of current Caddyfile

## Pre-Deployment Checklist

- [ ] Review [WAF Protection Documentation](./waf-protection.md)
- [ ] Test WAF rules in local environment
- [ ] Schedule deployment window (low-traffic period)
- [ ] Notify team in #ops channel
- [ ] Backup current Caddyfile
- [ ] Have rollback plan ready

## Staging Deployment

### Step 1: Backup Current Configuration

```bash
# SSH to staging server
ssh user@staging.clpr.tv

# Backup current Caddyfile
docker exec caddy cat /etc/caddy/Caddyfile > ~/Caddyfile.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -lh ~/Caddyfile.backup.*
```

### Step 2: Deploy WAF Configuration

```bash
# From repository root on staging server
cd /path/to/clipper

# Copy staging WAF config to Caddy container
docker cp Caddyfile.staging caddy:/etc/caddy/Caddyfile

# Verify the file was copied
docker exec caddy cat /etc/caddy/Caddyfile | head -5
```

### Step 3: Validate Configuration

```bash
# Validate Caddy configuration syntax
docker exec caddy caddy validate --config /etc/caddy/Caddyfile

# Expected output: "Valid configuration"
# If errors appear, restore backup and investigate
```

### Step 4: Reload Caddy (Zero-Downtime)

```bash
# Reload configuration (zero-downtime)
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Expected output: "config reloaded"
```

### Step 5: Verify WAF is Active

```bash
# Check for WAF header on legitimate request
curl -I https://staging.clpr.tv/

# Should see: X-WAF-Protection: enabled-staging

# Test SQLi blocking
curl -v "https://staging.clpr.tv/api/v1/clips?id=1'%20UNION%20SELECT%20*"

# Should get: 403 Forbidden
# Header: X-WAF-Block-Reason: SQL Injection Pattern Detected
```

### Step 6: Run Security Tests

```bash
# From repository root
./scripts/test-waf-protection.sh https://staging.clpr.tv

# Review results - all tests should pass
```

### Step 7: Monitor Logs

```bash
# Monitor security log for blocks (5 minutes)
docker exec caddy tail -f /var/log/caddy/staging-security.log

# Monitor access log for any issues
docker exec caddy tail -f /var/log/caddy/staging-access.log | grep -i "403\|500"
```

### Step 8: Test Application Functionality

- [ ] Login to staging application
- [ ] Submit a test clip
- [ ] Search for clips
- [ ] Create a comment
- [ ] Check watch parties
- [ ] Verify no legitimate requests are blocked

### Step 9: Monitor for 24 Hours

- [ ] Check logs periodically for false positives
- [ ] Monitor user feedback channels
- [ ] Review security log for attack attempts
- [ ] Verify application performance metrics

### Staging Rollback (If Needed)

```bash
# Restore backup
docker cp ~/Caddyfile.backup.YYYYMMDD_HHMMSS caddy:/etc/caddy/Caddyfile

# Reload
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Verify
curl -I https://staging.clpr.tv/ | grep X-WAF-Protection
# Should NOT see X-WAF-Protection header
```

## Production Deployment

**IMPORTANT**: Only proceed after 24-48 hours of successful staging deployment.

### Step 1: Pre-Production Review

- [ ] Review staging logs for false positives
- [ ] Confirm no user complaints in staging
- [ ] Review security metrics from staging
- [ ] Update WAF patterns if needed based on staging results
- [ ] Schedule deployment during maintenance window
- [ ] Announce in #ops and #general channels

### Step 2: Production Backup

```bash
# SSH to production server
ssh user@clpr.tv

# Backup current Caddyfile
docker exec caddy cat /etc/caddy/Caddyfile > ~/Caddyfile.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -lh ~/Caddyfile.backup.*

# Test backup restoration (dry run)
docker cp ~/Caddyfile.backup.* /tmp/test.Caddyfile
```

### Step 3: Deploy Production WAF

```bash
# From repository root on production server
cd /path/to/clipper

# Copy production WAF config
docker cp Caddyfile.waf caddy:/etc/caddy/Caddyfile

# Verify
docker exec caddy cat /etc/caddy/Caddyfile | head -5
```

### Step 4: Validate Production Configuration

```bash
# Validate syntax
docker exec caddy caddy validate --config /etc/caddy/Caddyfile

# Expected: "Valid configuration"
```

### Step 5: Reload Production Caddy

```bash
# Reload configuration (zero-downtime)
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Expected: "config reloaded"

# Note the exact time of reload
date
```

### Step 6: Immediate Verification

```bash
# Check WAF header
curl -I https://clpr.tv/

# Should see: X-WAF-Protection: enabled

# Quick security test
curl -v "https://clpr.tv/?q=<script>alert(1)</script>"

# Should get: 403 Forbidden
```

### Step 7: Run Full Security Test Suite

```bash
# From repository root
./scripts/test-waf-protection.sh https://clpr.tv

# All tests should pass
# If any test fails, investigate immediately
```

### Step 8: Production Monitoring (First Hour)

```bash
# Monitor security log in real-time
docker exec caddy tail -f /var/log/caddy/security.log | jq .

# In another terminal, monitor access log
docker exec caddy tail -f /var/log/caddy/access.log | jq . | grep -E "403|500"

# Check block rate (should be low for legitimate traffic)
docker exec caddy bash -c "grep $(date -u +%Y-%m-%d) /var/log/caddy/security.log | wc -l"
```

### Step 9: Application Smoke Tests

- [ ] Visit homepage (as guest)
- [ ] Login (as test user)
- [ ] Submit test clip
- [ ] Search functionality
- [ ] Comment on clip
- [ ] Watch party features
- [ ] Check mobile app connectivity

### Step 10: Metrics Review

Monitor for 4 hours:

```bash
# Check block rate every 15 minutes
watch -n 900 'docker exec caddy bash -c "grep $(date -u +%Y-%m-%d) /var/log/caddy/security.log | wc -l"'

# Check top blocked IPs
docker exec caddy jq -r '.request.remote_ip' /var/log/caddy/security.log | sort | uniq -c | sort -rn | head -10

# Check block reasons
docker exec caddy jq -r '.["X-WAF-Block-Reason"]' /var/log/caddy/security.log | sort | uniq -c
```

### Step 11: Extended Monitoring (24-72 Hours)

- [ ] Daily log review for false positives
- [ ] Monitor support channels for user complaints
- [ ] Track P95 latency impact (should be <1%)
- [ ] Review security metrics in observability platform
- [ ] Document any patterns or issues

### Production Rollback (Emergency)

**If critical issues occur (legitimate traffic blocked, high error rate, performance impact)**:

```bash
# IMMEDIATE ROLLBACK
docker cp ~/Caddyfile.backup.YYYYMMDD_HHMMSS caddy:/etc/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Announce in #ops
echo "WAF rolled back at $(date). Investigating issue."

# Verify rollback
curl -I https://clpr.tv/ | grep X-WAF-Protection
# Should NOT see X-WAF-Protection header

# Monitor for 15 minutes to ensure stability
docker exec caddy tail -f /var/log/caddy/access.log
```

## Post-Deployment

### Success Criteria

- [ ] No increase in 403 errors for legitimate users
- [ ] Security tests pass
- [ ] P95 latency impact <1%
- [ ] No user complaints in support channels
- [ ] Attack patterns are being blocked (if any occur)

### Documentation Updates

- [ ] Update runbook with any issues encountered
- [ ] Document false positives and pattern adjustments
- [ ] Update [WAF Protection](./waf-protection.md) if needed
- [ ] Create post-mortem if significant issues occurred

### Team Communication

```
Subject: WAF Deployment Complete - [Environment]

Date: [Date]
Environment: [Staging/Production]
Deployed by: [Name]
Status: [Success/Partial/Rolled Back]

Changes:
- Deployed WAF with OWASP CRS-inspired rules
- Enabled SQLi, XSS, path traversal protection
- Added bot/scanner detection
- Request size limits enforced

Results:
- Security tests: [Passed/Failed]
- Block rate (first hour): [N] requests
- False positives: [N] (if any)
- Performance impact: [<1%/measure]

Issues:
[List any issues or "None"]

Next Steps:
[List any follow-up tasks or "Monitor for 72 hours"]
```

## Troubleshooting

### Issue: High Block Rate for Legitimate Traffic

**Symptoms**: >10 blocks per minute, user complaints

**Actions**:
1. Check security log for patterns
2. Identify which rule is causing blocks
3. Review specific requests being blocked
4. If widespread false positive: rollback immediately
5. If specific pattern: adjust regex and redeploy

### Issue: No Blocks Showing

**Symptoms**: Security log empty, attacks passing through

**Actions**:
1. Verify WAF config is active: `docker exec caddy cat /etc/caddy/Caddyfile`
2. Test with known attack: `curl "https://clpr.tv/?q=<script>"`
3. Check Caddy logs for errors: `docker logs caddy`
4. Verify pattern syntax
5. Redeploy if needed

### Issue: Performance Degradation

**Symptoms**: Increased latency, high CPU on Caddy

**Actions**:
1. Check Caddy CPU: `docker stats caddy`
2. Review request rate: `wc -l /var/log/caddy/access.log`
3. If high attack volume: scaling may be needed
4. If normal traffic: review regex complexity
5. Consider pattern optimization

## Rate Limiting Plugin (Optional Enhancement)

For additional edge-level rate limiting, consider building custom Caddy:

```bash
# Install xcaddy
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Build Caddy with rate limit plugin
xcaddy build --with github.com/mholt/caddy-ratelimit

# Use custom binary in Docker container
# (requires custom Dockerfile)
```

## Security Best Practices

1. **Test First**: Always test in staging before production
2. **Monitor Closely**: Watch logs during and after deployment
3. **Gradual Rollout**: Consider deploying to subset of traffic first
4. **Document Everything**: Keep detailed deployment logs
5. **Quick Rollback**: Have backup ready and tested
6. **Regular Review**: Review and update patterns quarterly
7. **Stay Current**: Monitor OWASP CRS updates for new patterns

## References

- [WAF Protection Documentation](./waf-protection.md)
- [WAF Quick Reference](./waf-quick-reference.md)
- [Security Scanning](./security-scanning.md)
- [Deployment Guide](./deployment.md)

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-02 | 1.0 | Initial WAF deployment runbook | Team Ops |

---

**For questions or issues**: Contact #ops-security channel or on-call engineer.
