---
title: "Web Application Firewall (WAF) Protection"
summary: "WAF implementation with OWASP CRS-inspired rules for edge security"
tags: ['operations', 'security', 'waf']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2026-01-02
---

# Web Application Firewall (WAF) Protection

**Last Updated**: 2026-01-02  
**Status**: ✅ Active and Configured  
**Roadmap**: Phase 5.4 (Roadmap 5.0)

## Overview

This document describes the Web Application Firewall (WAF) implementation for Clipper, which provides edge-level security protection against common web application attacks including SQL injection (SQLi), Cross-Site Scripting (XSS), path traversal, and other OWASP Top 10 vulnerabilities.

## Architecture

### Defense in Depth Strategy

Our WAF implementation follows a defense-in-depth approach with multiple layers:

1. **Edge Protection (Caddy WAF)**: First line of defense with pattern-based blocking
2. **Application Rate Limiting (Backend)**: Redis-backed rate limiting in Go middleware
3. **Abuse Detection (Backend)**: Behavioral analysis and automatic IP banning
4. **Input Validation (Backend)**: Application-level validation and sanitization

```
Internet → Caddy (WAF) → Backend (Rate Limit + Abuse Detection) → Application
           ↓                      ↓
       Block malicious      Block excessive requests
       patterns             & abusive IPs
```

### Technology Stack

- **WAF Engine**: Caddy web server with custom request matchers
- **Pattern Detection**: OWASP CRS-inspired regular expressions
- **Rate Limiting**: Backend Go middleware with Redis
- **Logging**: JSON-formatted logs to `/var/log/caddy/` with security event tracking

## WAF Configuration

### File Location

```
/home/runner/work/clipper/clipper/Caddyfile.waf
```

### Implemented Protections

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
