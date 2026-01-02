---
title: "Web Application Firewall (WAF) Protection"
summary: "WAF implementation leveraging existing backend protections and Caddy configuration guidance"
tags: ['operations', 'security', 'waf']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2026-01-02
related_issues: ["#861", "#862", "#805"]
---

# Web Application Firewall (WAF) Protection

**Last Updated**: 2026-01-02  
**Status**: ✅ Active (Backend Rate Limiting + Abuse Detection)  
**Roadmap**: Phase 5.4 (Roadmap 5.0)

## Overview

This document describes the Web Application Firewall (WAF) capabilities in Clipper, which provide protection against common web application attacks including SQL injection (SQLi), Cross-Site Scripting (XSS), and rate limiting abuse.

**Important Note**: Caddy runs in a separate container managed outside this repository. This document focuses on the application-level WAF protections already implemented in the backend and provides guidance for configuring edge-level protections in the external Caddy container.

**Related Documentation**:
- **[DDoS Protection](./ddos-protection.md)** - Comprehensive DDoS mitigation with edge rate limiting and traffic analytics (Roadmap 5.0 Phase 5.4 - #862)
- [Security Scanning](./security-scanning.md) - Security vulnerability scanning
- [Secrets Management](./secrets-management.md) - Secure secrets handling

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
    # Content-Security-Policy should be customized for your application
    # WARNING: 'unsafe-inline' weakens XSS protection - use nonces/hashes in production
    Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'"
    Permissions-Policy "geolocation=(), microphone=(), camera=()"
    -Server
}
```

**Note**: The Content-Security-Policy example above is a starting point. For production:
- Ensure 'unsafe-inline' is not used; use nonces or hashes for inline scripts/styles if needed
- Customize based on your application's requirements (CDN domains, analytics, etc.)
- Test thoroughly to avoid breaking functionality

#### 2. Request Size Limits

```caddyfile
request_body {
    max_size 10MB
}
```

#### 3. Pattern-Based Blocking (Optional - Not Recommended)

**Note**: Edge-level pattern matching is **optional and potentially redundant** since the backend already implements comprehensive input validation with parameterized queries. Consider the following before implementing:

**Why Backend Validation is Sufficient**:
- Backend uses parameterized queries (prevents SQLi)
- Application-level XSS sanitization already implemented
- Path validation prevents traversal attacks
- CSRF tokens prevent cross-site attacks

**If You Still Want Edge Patterns**:
- Use OWASP Core Rule Set for comprehensive coverage
- Be aware of high false positive rates with simple patterns
- Test extensively to avoid blocking legitimate traffic
- Understand that this is **defense in depth**, not primary defense

**Basic Example (Testing Only)**:
```caddyfile
@sqli_attempt {
    # WARNING: Simplistic patterns - high false positive rate
    # Backend validation is the primary defense
    query_regexp "(?i)(union.*select|insert.*into|delete.*from)"
}

handle @sqli_attempt {
    respond "Blocked" 403
}
```

**Recommendation**: Rely on backend validation (already implemented) rather than edge patterns.

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
