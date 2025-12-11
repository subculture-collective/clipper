# Security Hardening Documentation

This document describes the security features implemented in the Clipper application.

## Overview

The application implements multiple layers of security protection:

1. **Content Security Policy (CSP)** - Prevents XSS and code injection attacks
2. **CSRF Protection** - Prevents cross-site request forgery attacks
3. **Input Validation** - Validates and sanitizes all user input
4. **Rate Limiting** - Prevents abuse and DoS attacks
5. **Abuse Detection** - Automatically bans abusive IPs

## Content Security Policy (CSP)

### Implementation

CSP headers are set via the `SecurityHeadersMiddleware` in `internal/middleware/security_middleware.go`.

### Policy Details

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://embed.twitch.tv;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https: blob:;
media-src 'self' https://clips-media-assets2.twitch.tv https://clips.twitch.tv https://static.twitchcdn.net;
frame-src 'self' https://clips.twitch.tv https://player.twitch.tv https://embed.twitch.tv;
connect-src 'self' https://api.twitch.tv https://gql.twitch.tv;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
block-all-mixed-content
```

### Twitch Embed Compatibility

The CSP policy is configured to allow Twitch embeds:

- **script-src**: Includes `embed.twitch.tv` for Twitch embed scripts
- **frame-src**: Includes `clips.twitch.tv`, `player.twitch.tv`, and `embed.twitch.tv` for iframe embeds
- **media-src**: Includes `clips-media-assets2.twitch.tv`, `clips.twitch.tv`, and `static.twitchcdn.net` for video content
- **connect-src**: Includes `api.twitch.tv` and `gql.twitch.tv` for API calls

### Testing CSP

To test CSP headers:

```bash
curl -I https://your-domain.com | grep Content-Security-Policy
```

Or use browser DevTools Console to check for CSP violations.

## CSRF Protection

### Implementation

CSRF protection is implemented via the `CSRFMiddleware` in `internal/middleware/csrf_middleware.go`.

### How It Works

1. **Double-Submit Cookie Pattern**: Uses both a cookie and header token
2. **Server-Side Validation**: Tokens are stored in Redis for validation
3. **Selective Enforcement**: Only enforced for cookie-based authentication

### Usage

#### Frontend Integration

1. **Get CSRF Token**: Make a GET request to any endpoint to receive a CSRF token

   ```javascript
   // Token is returned in X-CSRF-Token header
   const response = await fetch('/api/v1/ping');
   const csrfToken = response.headers.get('X-CSRF-Token');
   ```

2. **Include Token in Requests**: Add the token to POST/PUT/DELETE requests

   ```javascript
   await fetch('/api/v1/clips/:id/vote', {
     method: 'POST',
     headers: {
       'X-CSRF-Token': csrfToken,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ vote_type: 'upvote' })
   });
   ```

#### When CSRF Is Enforced

- **Cookie-based auth**: CSRF is enforced when `access_token` cookie is present
- **Bearer token auth**: CSRF is NOT enforced (JWT in Authorization header is immune to CSRF)

#### Configuration

```go
// In cmd/api/main.go
isProduction := cfg.Server.GinMode == "release"
r.Use(middleware.CSRFMiddleware(redisClient, isProduction))
```

- `isProduction`: When true, CSRF cookies are marked as `Secure` (HTTPS only)

### CSRF Token Lifecycle

- **Generation**: On first safe method (GET/HEAD/OPTIONS) request
- **Storage**: In Redis with 24-hour expiration
- **Cookie**: `csrf_token` cookie, HttpOnly, SameSite=Lax
- **Header**: `X-CSRF-Token` header required for state-changing requests

## Input Validation

### Implementation

Input validation is implemented via the `InputValidationMiddleware` in `internal/middleware/validation_middleware.go`.

### Validation Rules

#### Request Validation

- **HTTP Method**: Only standard methods allowed (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- **URL Length**: Maximum 2048 characters
- **Request Body Size**: Maximum 10MB
- **Path Traversal**: Blocks `../` patterns
- **UTF-8**: All strings must be valid UTF-8

#### Query Parameters

- **Parameter Names**: Alphanumeric, underscore, hyphen, and dot only
- **Parameter Values**: Checked for injection patterns

#### Headers

- **Standard Headers**: Allowed without restriction
- **Custom Headers**: Maximum 8192 characters, must be valid UTF-8

### Injection Pattern Detection

#### SQL Injection Patterns

```regex
(?i)(union[\s(]+select|select[\s(]+\*[\s(]+from|insert[\s(]+into|
     delete[\s(]+from|drop[\s(]+table|alter[\s(]+table|
     update[\s(]+\w+[\s(]+set|;[\s]*(drop|insert|delete|update)[\s(]+)
```

Examples caught:

- `' UNION SELECT * FROM users--`
- `; DROP TABLE users;`
- `admin'; INSERT INTO users VALUES('hacker')--`

#### XSS Patterns

```regex
(?i)(<script|javascript:|onerror=|onload=|<iframe|<object|<embed)
```

Examples caught:

- `<script>alert('xss')</script>`
- `javascript:alert('xss')`
- `<img src=x onerror=alert('xss')>`

### Input Sanitization Utilities

The `SanitizeInput` struct provides utility functions:

```go
sanitizer := middleware.NewSanitizer()

// Strip all HTML tags
cleanText := sanitizer.SanitizeHTML("<p>Hello <script>alert(1)</script></p>")
// Result: "Hello"

// Allow safe HTML/Markdown
cleanMarkdown := sanitizer.SanitizeMarkdown("**Bold** <script>alert(1)</script>")
// Result: "**Bold** "

// Validate email
valid := sanitizer.ValidateEmail("user@example.com") // true

// Validate username
valid := sanitizer.ValidateUsername("user_123") // true

// Validate URL
valid := sanitizer.ValidateURL("https://example.com") // true
```

### Configuration

Input validation is applied globally to all requests:

```go
r.Use(middleware.InputValidationMiddleware())
```

## Rate Limiting

### Standard Rate Limiting

Rate limiting is already implemented in `internal/middleware/ratelimit_middleware.go`:

- **Algorithm**: Sliding window with Redis backend
- **Fallback**: In-memory rate limiter when Redis is unavailable
- **Headers**:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets
  - `Retry-After`: Seconds to wait before retry (429 responses)

### Applied Rate Limits

```go
// Authentication endpoints
auth.GET("/twitch", middleware.RateLimitMiddleware(redis, 5, time.Minute))
auth.GET("/twitch/callback", middleware.RateLimitMiddleware(redis, 10, time.Minute))
auth.POST("/refresh", middleware.RateLimitMiddleware(redis, 10, time.Minute))

// Content creation
clips.POST("/:id/comments", middleware.RateLimitMiddleware(redis, 10, time.Minute))
clips.POST("/:id/vote", middleware.RateLimitMiddleware(redis, 20, time.Minute))
clips.POST("/:id/tags", middleware.RateLimitMiddleware(redis, 10, time.Minute))

// Submissions
submissions.POST("", middleware.RateLimitMiddleware(redis, 5, time.Hour))

// Reports
reports.POST("", middleware.RateLimitMiddleware(redis, 10, time.Hour))

// Subscriptions
subscriptions.POST("/checkout", middleware.RateLimitMiddleware(redis, 5, time.Minute))
subscriptions.POST("/portal", middleware.RateLimitMiddleware(redis, 10, time.Minute))
```

### Enhanced Rate Limiting

The `EnhancedRateLimitMiddleware` adds warning headers:

- **X-RateLimit-Warning: approaching-limit** - When at 80% of limit
- **X-RateLimit-Warning: critical** - When at 95% of limit

## Abuse Detection

### Implementation

Abuse detection is implemented via the `AbuseDetectionMiddleware` in `internal/middleware/abuse_detection_middleware.go`.

### Configuration

```go
const (
    abuseDetectionWindow = 1 * time.Hour      // Tracking window
    abuseThreshold       = 100                // Max requests per hour
    abuseBanDuration     = 24 * time.Hour     // Ban duration
)
```

### How It Works

1. **Request Tracking**: Every request is tracked by IP address
2. **Threshold Check**: If IP exceeds 100 requests/hour, it's automatically banned
3. **Ban Storage**: Bans are stored in Redis with 24-hour expiration
4. **Automatic Enforcement**: Banned IPs receive 403 Forbidden responses

### Admin Functions

#### Unban an IP

```go
import "github.com/subculture-collective/clipper/internal/middleware"

err := middleware.UnbanIP(ctx, redisClient, "192.168.1.1")
```

#### Get Banned IPs

```go
bannedIPs, err := middleware.GetBannedIPs(ctx, redisClient)
// Returns: []string{"192.168.1.1", "10.0.0.1", ...}
```

#### Get Abuse Stats

```go
count, err := middleware.GetAbuseStats(ctx, redisClient, "192.168.1.1")
// Returns: Number of requests from this IP in current window
```

### Redis Keys

- **Tracking**: `abuse:track:{ip}` - Request counter, expires after 1 hour
- **Bans**: `abuse:ban:{ip}` - Ban flag, expires after 24 hours

### Response Format

When an IP is banned:

```json
{
  "error": "Access denied due to abusive behavior"
}
```

HTTP Status: `403 Forbidden`

## Security Headers

Additional security headers set by `SecurityHeadersMiddleware`:

### HSTS (HTTP Strict Transport Security)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Forces HTTPS for 1 year (production only).

### X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

Prevents MIME type sniffing.

### X-Frame-Options

```
X-Frame-Options: DENY
```

Prevents clickjacking attacks.

### X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

Enables XSS filter in older browsers.

### Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

Controls referrer information sent with requests.

### Permissions-Policy

```
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

Disables browser features that aren't needed.

## Secure Cookie Configuration

Cookies are configured with secure flags via `GetSecureCookieOptions()`:

```go
type SecureCookieOptions struct {
    HTTPOnly bool      // Prevents JavaScript access
    Secure   bool      // HTTPS only (production)
    SameSite string    // CSRF protection
    MaxAge   int       // Expiration time
    Domain   string    // Cookie domain
    Path     string    // Cookie path
}
```

Default configuration:

- **HTTPOnly**: true (always)
- **Secure**: true (production only)
- **SameSite**: "lax"
- **MaxAge**: 86400 seconds (24 hours)
- **Path**: "/"

## Testing Security Features

### Unit Tests

All security middleware has comprehensive unit tests:

```bash
cd backend
go test ./internal/middleware/... -v
```

### Integration Tests

Integration tests require Redis:

```bash
cd backend
go test ./internal/middleware/... -v
```

Skip integration tests:

```bash
go test ./internal/middleware/... -v -short
```

### Security Linting

Run gosec security linter:

```bash
cd backend
go run github.com/securego/gosec/v2/cmd/gosec@latest ./...
```

### Manual Testing

#### Test CSRF Protection

```bash
# 1. Get CSRF token
curl -v http://localhost:8080/api/v1/ping \
  -c cookies.txt

# 2. Extract token from header
# X-CSRF-Token: <token>

# 3. Try POST without token (should fail)
curl -X POST http://localhost:8080/api/v1/clips/1/vote \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"vote_type":"upvote"}'

# 4. Try POST with token (should succeed)
curl -X POST http://localhost:8080/api/v1/clips/1/vote \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{"vote_type":"upvote"}'
```

#### Test Input Validation

```bash
# Test SQL injection detection
curl "http://localhost:8080/api/v1/search?q='; DROP TABLE users--"

# Test XSS detection
curl "http://localhost:8080/api/v1/search?q=<script>alert('xss')</script>"

# Test path traversal
curl "http://localhost:8080/api/v1/../../etc/passwd"
```

#### Test Rate Limiting

```bash
# Make many rapid requests
for i in {1..25}; do
  curl http://localhost:8080/api/v1/ping
done
```

#### Test Abuse Detection

```bash
# Make many requests to trigger ban (100+ in an hour)
for i in {1..110}; do
  curl http://localhost:8080/api/v1/ping
  sleep 0.1
done
```

## Production Deployment

### Environment Configuration

Set these environment variables:

```bash
# Required
GIN_MODE=release
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# Optional
REDIS_PASSWORD=your-redis-password
```

### Nginx Configuration

If using Nginx as a reverse proxy, ensure it preserves security headers:

```nginx
location /api/ {
    proxy_pass http://backend:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Preserve security headers from backend
    proxy_pass_header X-CSRF-Token;
    proxy_pass_header X-RateLimit-Limit;
    proxy_pass_header X-RateLimit-Remaining;
}
```

### SSL/TLS Configuration

For HSTS to work, ensure SSL/TLS is properly configured:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of config
}
```

### Monitoring

Monitor these metrics in production:

1. **Rate Limit Hits**: Track `X-RateLimit-Remaining` headers
2. **CSRF Failures**: Log 403 responses on state-changing endpoints
3. **Banned IPs**: Monitor abuse detection bans
4. **Input Validation Failures**: Track 400 responses
5. **CSP Violations**: Monitor browser console for CSP reports

### Incident Response

If abuse is detected:

1. **Review Logs**: Check request patterns
2. **Unban Legitimate Users**: Use `UnbanIP()` function
3. **Adjust Thresholds**: Modify `abuseThreshold` if needed
4. **Block at Firewall**: For severe abuse, block at network level

## Best Practices

### For Developers

1. **Always use HTTPS** in production
2. **Never disable security middleware** without review
3. **Validate all user input** at application level
4. **Use parameterized queries** for database operations
5. **Sanitize user content** before rendering
6. **Test security features** regularly

### For Frontend Developers

1. **Store CSRF tokens** in memory, not localStorage
2. **Include CSRF token** in all state-changing requests
3. **Handle 429 responses** with exponential backoff
4. **Display rate limit warnings** to users
5. **Respect CSP restrictions** in custom scripts

### For Operations

1. **Monitor security logs** regularly
2. **Keep dependencies updated** (run `go get -u ./...`)
3. **Run security scans** before deployment
4. **Configure Redis persistence** for rate limiting
5. **Set up alerting** for security events

## Troubleshooting

### CSRF Token Issues

**Problem**: CSRF validation fails
**Solutions**:

- Ensure cookies are enabled
- Check `SameSite` cookie settings
- Verify token is included in `X-CSRF-Token` header
- Check Redis connectivity

### Rate Limiting False Positives

**Problem**: Legitimate users are rate limited
**Solutions**:

- Review rate limit thresholds
- Check if behind proxy (use real IP)
- Verify Redis is working (fallback has lower limits)
- Consider per-user vs per-IP limits

### CSP Violations

**Problem**: Content blocked by CSP
**Solutions**:

- Check browser console for CSP violation reports
- Verify allowed domains in CSP policy
- Add necessary domains to whitelist
- Use nonces for inline scripts (if needed)

### Abuse Detection False Positives

**Problem**: Legitimate traffic banned
**Solutions**:

- Unban IP: `middleware.UnbanIP(ctx, redis, "IP")`
- Increase `abuseThreshold` if needed
- Whitelist trusted IPs at nginx level
- Review traffic patterns

## Security Audit Checklist

- [ ] CSP headers present and correct
- [ ] CSRF protection enabled for cookie auth
- [ ] Input validation catching common attacks
- [ ] Rate limiting configured appropriately
- [ ] Abuse detection working as expected
- [ ] Security headers set correctly
- [ ] Cookies have secure flags
- [ ] HTTPS enforced in production
- [ ] Dependencies up to date
- [ ] Security linter passing
- [ ] Tests passing
- [ ] Monitoring configured

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Rate Limiting Pattern](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
