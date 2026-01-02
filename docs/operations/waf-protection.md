---
title: "Web Application Firewall (WAF) Protection"
summary: "WAF implementation leveraging existing backend protections and Caddy configuration guidance"
tags: ['operations', 'security', 'waf']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2026-01-02
---

# Web Application Firewall (WAF) Protection

**Last Updated**: 2026-01-02  
**Status**: ✅ Active (Backend Rate Limiting + Abuse Detection)  
**Roadmap**: Phase 5.4 (Roadmap 5.0)

## Overview

This document describes the Web Application Firewall (WAF) capabilities in Clipper, which provide protection against common web application attacks including SQL injection (SQLi), Cross-Site Scripting (XSS), and rate limiting abuse.

**Important Note**: Caddy runs in a separate container managed outside this repository. This document focuses on the application-level WAF protections already implemented in the backend and provides guidance for configuring edge-level protections in the external Caddy container.

## Architecture

### Current Implementation: Defense in Depth

The application already implements comprehensive security protections at the backend level:

1. **Application Rate Limiting (Backend)**: Redis-backed rate limiting in Go middleware ✅
2. **Abuse Detection (Backend)**: Behavioral analysis and automatic IP banning ✅
3. **Input Validation (Backend)**: Application-level validation and sanitization ✅
4. **CSRF Protection (Backend)**: Token-based CSRF protection ✅
5. **Security Headers (Caddy - External)**: Configured in external Caddy container

```
Internet → Caddy (External Container) → Backend (Rate Limit + Abuse Detection) → Application
           ↓ Security Headers              ↓ Pattern blocking, rate limiting
       Configured separately          ✅ Already implemented
```

### Technology Stack

- **Backend Rate Limiting**: Go middleware with Redis (`backend/internal/middleware/ratelimit_middleware.go`)
- **Abuse Detection**: Go middleware with Redis (`backend/internal/middleware/abuse_detection_middleware.go`)
- **CSRF Protection**: Go middleware (`backend/internal/middleware/csrf_middleware.go`)
- **Input Validation**: Application-level validation throughout handlers
- **Edge Protection (External)**: Caddy container managed separately

## Backend WAF Protections (Already Implemented)

### 1. Rate Limiting ✅

**Implementation**: `backend/internal/middleware/ratelimit_middleware.go`

**Features**:
- Redis-backed sliding window algorithm
- Per-endpoint rate limits
- Per-user and per-IP rate limiting
- Subscription tier-aware (premium users get 5x limits)
- Admin bypass
- IP whitelist support
- Fallback to in-memory rate limiting if Redis fails

**Configured Limits**:
- **Submission endpoint**: 10 requests/hour per user (50/hour for premium)
- **Metadata endpoint**: 100 requests/hour per user (500/hour for premium)
- **Watch party create**: 10 requests/hour per user (50/hour for premium)
- **Watch party join**: 30 requests/hour per user (150/hour for premium)
- **Search endpoint**: Configurable per user tier

**Headers Returned**:
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1641024000
Retry-After: 3600
```

**Testing**: Load tests exist at `backend/tests/load/scenarios/rate_limiting.js`

### 2. Abuse Detection ✅

**Implementation**: `backend/internal/middleware/abuse_detection_middleware.go`

**Features**:
- Tracks requests per IP over time window
- Automatic IP banning when threshold exceeded
- 24-hour ban duration
- Admin functions to unban IPs and view ban list

**Thresholds**:
- Detection window: 1 hour
- Abuse threshold: 1000 requests/hour per IP
- Ban duration: 24 hours
- Exempt paths: health checks, auth endpoints

**Admin Functions**:
```go
UnbanIP(ctx, redis, ip)           // Remove ban
GetBannedIPs(ctx, redis)          // List banned IPs  
GetAbuseStats(ctx, redis, ip)     // View IP request count
```

### 3. CSRF Protection ✅

**Implementation**: `backend/internal/middleware/csrf_middleware.go`

**Features**:
- Token-based CSRF protection
- SameSite cookie policy
- Secure cookie flags in production

### 4. Input Validation ✅

**Implementation**: Throughout backend handlers and models

**Protections**:
- SQL injection prevention via parameterized queries
- XSS prevention via HTML sanitization
- Path traversal prevention via path validation
- File upload size limits
- Content-Type validation

## External Caddy Configuration Guidance

Since Caddy runs in a separate container/directory, edge-level WAF protections should be configured there. Here's guidance for what to configure:

### Recommended Caddy WAF Features

#### 1. Security Headers

Configure in external Caddyfile:

```caddyfile
header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    X-XSS-Protection "1; mode=block"
    Referrer-Policy "strict-origin-when-cross-origin"
    Content-Security-Policy "default-src 'self'; ..."
    Permissions-Policy "geolocation=(), microphone=(), camera=()"
    -Server
}
```

#### 2. Request Size Limits

```caddyfile
request_body {
    max_size 10MB
}
```

#### 3. Pattern-Based Blocking (Optional)

For additional edge protection, consider adding matchers:

```caddyfile
@sqli_attempt {
    query_regexp "(?i)(union.*select|insert.*into|delete.*from)"
}

handle @sqli_attempt {
    respond "Blocked" 403
}
```

#### 4. Edge Rate Limiting (Optional Plugin)

For additional edge-level rate limiting:
- Plugin: https://github.com/mholt/caddy-ratelimit
- Build custom Caddy with: `xcaddy build --with github.com/mholt/caddy-ratelimit`

**Note**: Backend rate limiting is already comprehensive, so edge rate limiting is optional for additional defense in depth.

## Monitoring and Logging

### Backend Logging

Rate limiting and abuse detection events are logged by the backend:

**Rate Limit Events**:
```json
{
  "level": "info",
  "msg": "rate limit exceeded",
  "ip": "203.0.113.42",
  "endpoint": "/api/v1/submissions",
  "limit": 10,
  "window": "1h"
}
```

**Abuse Detection Events**:
```json
{
  "level": "warn",
  "msg": "IP banned for abuse",
  "ip": "203.0.113.42",
  "request_count": 1000,
  "window": "1h"
}
```

### Monitoring Metrics

**Key Metrics to Track**:

1. **Rate Limit Hit Rate**:
   ```bash
   # Check backend logs for rate limit events
   grep "rate limit exceeded" /path/to/backend/logs
   ```

2. **Abuse Detection Bans**:
   ```bash
   # Check Redis for banned IPs
   redis-cli KEYS "abuse:ban:*"
   ```

3. **Request Patterns**: Monitor for suspicious patterns in access logs

### Alerting Thresholds

**Recommended Alerts**:

- **High Rate Limit Hit Rate**: >100 rate limits/minute (possible attack)
- **Multiple IP Bans**: >10 IPs banned in 1 hour (DDoS attempt)
- **Abuse Threshold Near Max**: IP approaching 1000 req/hour
- **Redis Failure**: Backend falls back to in-memory rate limiting

## Testing

### Backend Rate Limiting Tests

**Test Suite**: `backend/tests/load/scenarios/rate_limiting.js`

**Run Tests**:
```bash
# Test rate limiting accuracy and performance
k6 run backend/tests/load/scenarios/rate_limiting.js

# Test with authentication
k6 run -e AUTH_TOKEN=your_token backend/tests/load/scenarios/rate_limiting.js
```

**Test Coverage**:
- Submission endpoint rate limiting
- Metadata endpoint rate limiting
- Watch party rate limiting
- Premium user tier multipliers
- Rate limit header accuracy
- Fallback rate limiting

### Manual Testing

#### Test Rate Limiting:
```bash
# Make multiple requests to trigger rate limit
for i in {1..15}; do
  curl -X POST https://clpr.tv/api/v1/submissions \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"url":"https://clips.twitch.tv/test"}' \
    && echo "Request $i"
done

# Should see 429 responses after 10 requests
```

#### Test Abuse Detection:
```bash
# Simulate high request volume (do NOT do this in production!)
# This is for staging/testing only
ab -n 1100 -c 10 https://staging.clpr.tv/api/v1/clips

# Should result in IP ban after 1000 requests
```

## Configuration

### Rate Limit Whitelist

To whitelist trusted IPs (monitoring systems, CI/CD):

**Environment Variable**: `RATE_LIMIT_WHITELIST_IPS`

```yaml
# docker-compose.yml
environment:
  - RATE_LIMIT_WHITELIST_IPS=10.0.0.5,10.0.0.6,192.168.1.100
```

**Default Whitelist**: `127.0.0.1`, `::1` (localhost)

### Subscription-Aware Rate Limiting

Rate limits automatically adjust based on user subscription tier:

- **Admin**: Unlimited (bypasses rate limits)
- **Premium (Pro)**: 5x multiplier (e.g., 50 submissions/hour)
- **Basic (Free)**: 1x multiplier (e.g., 10 submissions/hour)
- **Unauthenticated**: IP-based rate limiting

### Abuse Detection Configuration

**Constants** (in `abuse_detection_middleware.go`):

```go
abuseDetectionWindow = 1 * time.Hour    // Detection window
abuseThreshold       = 1000             // Requests per window
abuseBanDuration     = 24 * time.Hour   // Ban duration
```

To adjust, modify constants and rebuild backend.

## Best Practices

### Development

1. **Use Whitelist**: Add development IPs to `RATE_LIMIT_WHITELIST_IPS`
2. **Test in Staging**: Validate rate limits don't block legitimate traffic
3. **Monitor Logs**: Check for false positives
4. **Use Premium Test Accounts**: Test higher rate limits

### Operations

1. **Monitor Ban List**: Regularly review banned IPs
2. **Adjust Thresholds**: Tune based on traffic patterns
3. **Unban Legitimate IPs**: Use `UnbanIP` function for false positives
4. **Track Metrics**: Monitor rate limit and abuse detection metrics

### Security

1. **Defense in Depth**: Rely on multiple layers (edge + backend)
2. **Regular Review**: Audit rate limits quarterly
3. **Incident Response**: Have procedure for handling attacks
4. **Log Analysis**: Regularly analyze logs for patterns

## Troubleshooting

### Issue: Legitimate Users Rate Limited

**Symptoms**: Users report 429 errors during normal usage

**Resolution**:
1. Check rate limit logs for the user/IP
2. Verify their tier (basic vs premium)
3. If legitimate high usage: upgrade to premium or adjust limits
4. If development: add to whitelist
5. If misconfigured: adjust rate limit thresholds

### Issue: Abuse Detection False Positive

**Symptoms**: Legitimate IP banned

**Resolution**:
```bash
# Unban the IP via backend admin function
# Or directly in Redis:
redis-cli DEL "abuse:ban:203.0.113.42"

# Check their request pattern:
redis-cli GET "abuse:track:203.0.113.42"

# If consistently high but legitimate:
# Add to rate limit whitelist or adjust threshold
```

### Issue: Redis Failure

**Symptoms**: Backend logs show "using in-memory fallback"

**Resolution**:
1. Check Redis container health: `docker ps | grep redis`
2. Check Redis logs: `docker logs clipper-redis`
3. Restart Redis if needed: `docker-compose restart redis`
4. Backend will automatically recover and use Redis again

### Issue: High Attack Volume

**Symptoms**: Many IPs being banned, high request rate

**Resolution**:
1. Monitor abuse detection: `redis-cli KEYS "abuse:ban:*" | wc -l`
2. Review attack patterns in logs
3. Consider lowering abuse threshold temporarily
4. Add edge-level rate limiting in Caddy (if not already present)
5. Contact hosting provider if DDoS

## External Caddy Container Configuration

Since Caddy runs separately, work with your ops team to:

1. **Review Current Caddy Configuration**: Check what security features are already configured
2. **Add Missing Headers**: Ensure security headers are present
3. **Consider Edge Rate Limiting**: Evaluate if the caddy-ratelimit plugin adds value
4. **Configure Request Limits**: Set appropriate request body size limits
5. **Enable Logging**: Ensure Caddy logs security events

**Configuration Location**: External to this repository (contact ops team)

## Performance Impact

### Backend Rate Limiting

- **Latency**: <1ms overhead per request (Redis lookup)
- **CPU**: <1% at normal traffic levels
- **Memory**: ~10MB for in-memory fallback
- **Overall Impact**: Negligible (<0.1% P95 latency)

### Abuse Detection

- **Latency**: <1ms overhead per request (Redis increment)
- **CPU**: <1% at normal traffic levels  
- **Memory**: Minimal (Redis storage)
- **Overall Impact**: Negligible

## References

- **Backend Rate Limiting**: `backend/internal/middleware/ratelimit_middleware.go`
- **Abuse Detection**: `backend/internal/middleware/abuse_detection_middleware.go`
- **CSRF Protection**: `backend/internal/middleware/csrf_middleware.go`
- **Load Tests**: `backend/tests/load/scenarios/rate_limiting.js`
- [OWASP Core Rule Set](https://coreruleset.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Caddy Rate Limit Plugin](https://github.com/mholt/caddy-ratelimit)

## Support

For WAF-related issues:
1. Check backend logs for rate limiting and abuse detection
2. Review Redis for banned IPs: `redis-cli KEYS "abuse:ban:*"`
3. Check application metrics in observability platform
4. Contact ops team for Caddy configuration (external)
5. Create incident ticket for critical issues

---

**Related Documentation**:
- [Security Scanning](./security-scanning.md)
- [Secrets Management](./secrets-management.md)
- [Deployment Guide](./deployment.md)
- [Monitoring](./monitoring.md)

#### 1. SQL Injection (SQLi) Protection

**Rule**: Blocks requests containing SQL injection patterns

**Patterns Detected**:
- `UNION SELECT` attacks
- `INSERT INTO` / `DELETE FROM` / `DROP TABLE`
- `exec()` function calls
- SQL keywords in query strings and paths

**Example Blocked Request**:
```
GET /api/v1/clips?id=1' UNION SELECT * FROM users--
Response: 403 Forbidden
X-WAF-Block-Reason: SQL Injection Pattern Detected
```

#### 2. Cross-Site Scripting (XSS) Protection

**Rule**: Blocks requests containing XSS attack vectors

**Patterns Detected**:
- `<script>`, `<iframe>`, `<object>`, `<embed>` tags
- `javascript:` protocol
- Event handlers: `onerror=`, `onload=`
- `eval()` and `expression()` functions

**Example Blocked Request**:
```
POST /api/v1/comments
Body: {"text": "<script>alert('XSS')</script>"}
Response: 403 Forbidden
X-WAF-Block-Reason: XSS Pattern Detected
```

#### 3. Path Traversal Protection

**Rule**: Prevents directory traversal attacks

**Patterns Detected**:
- `../` and `..\` sequences
- `/etc/passwd`, `/etc/shadow` references
- Windows path indicators: `c:\`

**Example Blocked Request**:
```
GET /api/v1/files?path=../../etc/passwd
Response: 403 Forbidden
X-WAF-Block-Reason: Path Traversal Attempt Detected
```

#### 4. Bot and Scanner Detection

**Rule**: Blocks known security scanners and malicious bots

**User Agents Blocked**:
- Security scanners: `sqlmap`, `nikto`, `nmap`, `acunetix`, `burp`
- Scrapers: `httrack`, `wget/`, `curl/` (with no version)
- Automated tools: `python-requests/`, `Go-http-client`

**Example Blocked Request**:
```
GET / HTTP/1.1
User-Agent: sqlmap/1.0
Response: 403 Forbidden
X-WAF-Block-Reason: Suspicious User Agent Detected
```

#### 5. HTTP Method Filtering

**Rule**: Only allows standard HTTP methods

**Allowed Methods**:
- GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

**Blocked Methods**:
- TRACE, CONNECT, PROPFIND, and custom methods

#### 6. Request Size Limits

**Rule**: Prevents DoS attacks via large payloads

**Limits**:
- General requests: 10MB maximum
- API requests: 5MB maximum (Content-Length header check)

### Security Headers

The WAF automatically adds security headers to all responses:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Permissions-Policy: geolocation=(), microphone=(), camera=(), ...
X-WAF-Protection: enabled
```

## Rate Limiting

### Backend Rate Limiting (Primary)

Rate limiting is primarily handled by the backend Go middleware with Redis backing:

- **Submission endpoint**: 10 requests/hour per user
- **Metadata endpoint**: 100 requests/hour per user  
- **Watch party create**: 10 requests/hour per user
- **Watch party join**: 30 requests/hour per user
- **Search endpoint**: Configurable per user tier
- **Abuse detection**: 1000 requests/hour per IP (auto-ban at threshold)

See: `backend/internal/middleware/ratelimit_middleware.go`

### Edge Rate Limiting (Optional)

For additional edge-level rate limiting, consider using the Caddy rate limit plugin:
- Plugin: https://github.com/mholt/caddy-ratelimit
- Installation: Build custom Caddy with plugin using `xcaddy`

**Example configuration with plugin**:
```caddyfile
rate_limit {
    zone api {
        key {remote_host}
        events 100
        window 1m
    }
}
```

## Logging and Monitoring

### Log Files

1. **Access Log**: `/var/log/caddy/access.log`
   - All requests with response codes
   - JSON format with timestamps
   - Includes: IP, method, path, status, duration

2. **Security Log**: `/var/log/caddy/security.log`
   - Blocked requests only
   - Includes: User-Agent, Referer, block reason
   - Retention: 20 files × 50MB each

### Log Format

```json
{
  "ts": "2026-01-02T10:15:30.123Z",
  "level": "INFO",
  "msg": "handled request",
  "request": {
    "remote_ip": "203.0.113.42",
    "proto": "HTTP/2.0",
    "method": "GET",
    "host": "clpr.tv",
    "uri": "/api/v1/clips",
    "headers": {
      "User-Agent": ["Mozilla/5.0..."]
    }
  },
  "status": 403,
  "X-WAF-Block-Reason": "SQL Injection Pattern Detected"
}
```

### Monitoring Metrics

**Key Metrics to Track**:

1. **WAF Block Rate**:
   ```bash
   grep "X-WAF-Block-Reason" /var/log/caddy/security.log | wc -l
   ```

2. **Block Reasons Distribution**:
   ```bash
   jq -r '.["X-WAF-Block-Reason"]' /var/log/caddy/security.log | sort | uniq -c
   ```

3. **Top Blocked IPs**:
   ```bash
   jq -r '.request.remote_ip' /var/log/caddy/security.log | sort | uniq -c | sort -rn | head -10
   ```

4. **False Positive Rate**: Monitor legitimate user complaints

### Alerting Thresholds

**Recommended Alerts**:

- **High Block Rate**: >100 blocks/minute (possible attack or misconfiguration)
- **Single IP High Blocks**: >50 blocks from one IP in 5 minutes
- **Unusual User Agents**: New scanner patterns not in block list
- **Request Size Abuse**: Multiple 413 responses

## Tuning and False Positives

### Identifying False Positives

1. **Monitor Security Logs**:
   ```bash
   tail -f /var/log/caddy/security.log | jq .
   ```

2. **Check Block Reasons**: Look for patterns in legitimate traffic

3. **User Reports**: Track user complaints about blocked requests

### Whitelist Management

#### IP Whitelist (Backend)

For trusted IPs (monitoring systems, CI/CD):
```bash
# Environment variable in docker-compose
RATE_LIMIT_WHITELIST_IPS=10.0.0.5,10.0.0.6,192.168.1.100
```

#### Pattern Exceptions (Caddy)

To exclude specific patterns from WAF checks:

```caddyfile
# Example: Allow internal health checks with curl
@internal_health {
    remote_ip 10.0.0.0/8
    header User-Agent *curl*
}

handle @internal_health {
    # Skip WAF checks
    reverse_proxy clipper-backend:8080
}
```

### Tuning Regular Expressions

**Location**: `Caddyfile.waf` - matchers section

**Testing Changes**:
1. Test regex patterns with sample payloads
2. Deploy to staging first
3. Monitor for 24-48 hours
4. Gradually roll out to production

**Example: Relax SQLi Pattern**:
```caddyfile
# Before (strict)
query_regexp "(?i)(union.*select)"

# After (more specific)
query_regexp "(?i)(union\\s+select|union\\s+all\\s+select)"
```

## Deployment

### Production Deployment

1. **Review Configuration**:
   ```bash
   cd /home/runner/work/clipper/clipper
   cat Caddyfile.waf
   ```

2. **Validate Syntax** (if Caddy is installed locally):
   ```bash
   caddy validate --config Caddyfile.waf
   ```

3. **Deploy to Caddy Container**:
   ```bash
   # Copy WAF config as main Caddyfile
   docker cp Caddyfile.waf caddy:/etc/caddy/Caddyfile
   
   # Reload Caddy (zero-downtime)
   docker exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

4. **Monitor Logs**:
   ```bash
   docker exec caddy tail -f /var/log/caddy/security.log
   ```

### Staging Deployment

Use `Caddyfile.staging` with relaxed rules for testing:
- Lower thresholds for pattern matching
- Additional logging for debugging
- Whitelist development IPs

### Rollback Procedure

If WAF causes issues:

1. **Immediate Rollback**:
   ```bash
   docker cp Caddyfile caddy:/etc/caddy/Caddyfile
   docker exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

2. **Disable Specific Rules**: Comment out problematic matchers

3. **Backend-Only Mode**: Use original Caddyfile, rely on backend rate limiting

## Testing

### Security Test Suite

Located in: `backend/tests/load/scenarios/rate_limiting.js`

**Run Tests**:
```bash
# Test rate limiting accuracy
k6 run backend/tests/load/scenarios/rate_limiting.js

# Test with authentication
k6 run -e AUTH_TOKEN=your_token backend/tests/load/scenarios/rate_limiting.js
```

### Manual WAF Testing

#### Test SQLi Protection:
```bash
# Should be blocked (403)
curl -v "https://clpr.tv/api/v1/clips?id=1'%20UNION%20SELECT%20*%20FROM%20users--"

# Should succeed (200)
curl -v "https://clpr.tv/api/v1/clips?id=123"
```

#### Test XSS Protection:
```bash
# Should be blocked (403)
curl -X POST https://clpr.tv/api/v1/comments \
  -H "Content-Type: application/json" \
  -d '{"text":"<script>alert(1)</script>"}'

# Should succeed (200/201)
curl -X POST https://clpr.tv/api/v1/comments \
  -H "Content-Type: application/json" \
  -d '{"text":"This is a normal comment"}'
```

#### Test User Agent Blocking:
```bash
# Should be blocked (403)
curl -v -A "sqlmap/1.0" https://clpr.tv/

# Should succeed (200)
curl -v -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" https://clpr.tv/
```

#### Test Request Size Limits:
```bash
# Should be blocked (413)
dd if=/dev/zero bs=1M count=11 | curl -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @- https://clpr.tv/api/v1/upload

# Should succeed
dd if=/dev/zero bs=1M count=2 | curl -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @- https://clpr.tv/api/v1/upload
```

## Performance Impact

### Latency

- **Pattern Matching**: <5ms overhead per request
- **Header Processing**: <1ms overhead
- **Overall Impact**: <1% increase in P95 latency

### Resource Usage

- **CPU**: +5-10% during attack mitigation
- **Memory**: ~50MB additional for Caddy with WAF rules
- **Disk**: Log rotation handles growth (max ~1GB for security logs)

## Best Practices

### Development

1. **Use Staging**: Always test WAF changes in staging first
2. **Whitelist Dev IPs**: Add development IPs to rate limit whitelist
3. **Log Review**: Check logs daily for false positives
4. **Pattern Testing**: Test regex patterns offline before deployment

### Operations

1. **Monitor Block Rate**: Set up alerts for unusual blocking patterns
2. **Regular Tuning**: Review and update patterns quarterly
3. **Update Scanners**: Add new scanner User-Agents as discovered
4. **Document Changes**: Log all WAF rule modifications

### Security

1. **Defense in Depth**: Don't rely solely on WAF - validate at application level
2. **Regular Updates**: Keep patterns aligned with OWASP CRS updates
3. **Incident Response**: Have rollback procedure ready
4. **Testing**: Run security tests before major releases

## Troubleshooting

### Issue: Legitimate Requests Blocked

**Symptoms**: Users report 403 errors for normal requests

**Resolution**:
1. Check security log for block reason
2. Review the regex pattern causing false positive
3. Either whitelist the IP or adjust the pattern
4. Test thoroughly before deploying fix

### Issue: High CPU Usage

**Symptoms**: Caddy CPU usage >50%

**Resolution**:
1. Check if under attack (high request rate)
2. Review regex complexity - simplify if possible
3. Consider adding edge rate limiting plugin
4. Scale Caddy horizontally if needed

### Issue: Logs Filling Disk

**Symptoms**: Disk space alerts

**Resolution**:
1. Verify log rotation is working
2. Reduce log retention: `roll_keep 10` → `roll_keep 5`
3. Archive old logs to external storage
4. Monitor block rate - high rate indicates attack

### Issue: WAF Not Blocking Known Attacks

**Symptoms**: Security scans passing through WAF

**Resolution**:
1. Verify Caddyfile.waf is active: `docker exec caddy cat /etc/caddy/Caddyfile`
2. Check pattern syntax: `caddy validate --config Caddyfile.waf`
3. Test patterns with curl commands
4. Review and update regex patterns

## References

- [OWASP Core Rule Set](https://coreruleset.org/)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- Backend Rate Limiting: `backend/internal/middleware/ratelimit_middleware.go`
- Abuse Detection: `backend/internal/middleware/abuse_detection_middleware.go`
- Load Tests: `backend/tests/load/scenarios/rate_limiting.js`

## Support

For WAF-related issues:
1. Check this documentation
2. Review security logs
3. Contact ops team via #ops-security channel
4. Create incident ticket for critical issues

---

**Related Documentation**:
- [Security Scanning](./security-scanning.md)
- [Secrets Management](./secrets-management.md)
- [Deployment Guide](./deployment.md)
- [Monitoring](./monitoring.md)
