# Twitch OAuth Authentication

This document describes the Twitch OAuth 2.0 authentication flow implementation for the Clipper backend.

## Overview

The authentication system uses:

- **Twitch OAuth 2.0** for user authentication
- **JWT (RS256)** for access tokens (15 minutes)
- **JWT (RS256)** for refresh tokens (7 days)
- **Redis** for OAuth state storage
- **PostgreSQL** for refresh token storage
- **HTTP-only cookies** for token delivery

## Setup

### 1. Register Twitch Application

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create a new application
3. Add OAuth Redirect URLs:
   - Development: `http://localhost:8080/api/v1/auth/twitch/callback`
   - Production: `https://yourdomain.com/api/v1/auth/twitch/callback`
4. Copy the Client ID and Client Secret

### 2. Generate JWT Keys

Run the key generation script:

```bash
cd backend/scripts
./generate-jwt-keys.sh
```

Copy the output to your `.env` file.

Alternatively, generate keys manually:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update:

```bash
# Twitch OAuth
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
TWITCH_REDIRECT_URI=http://localhost:8080/api/v1/auth/twitch/callback

# JWT Keys (paste entire PEM content including BEGIN/END lines)
JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----

JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----

# Redis (for OAuth state storage)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# CORS (frontend URLs)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Run Database Migrations

```bash
make migrate-up
```

This creates the `refresh_tokens` table.

### 5. Start Services

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Start backend
go run cmd/api/main.go
```

## API Endpoints

### Public Endpoints

#### `GET /api/v1/auth/twitch`

Initiates OAuth flow. Redirects user to Twitch authorization page.

**Rate Limit:** 5 requests/minute per IP

**Response:** HTTP 307 redirect to Twitch

---

#### `GET /api/v1/auth/twitch/callback`

Handles OAuth callback from Twitch.

**Rate Limit:** 10 requests/minute per IP

**Query Parameters:**

- `code` - Authorization code from Twitch
- `state` - CSRF protection state

**Response:**

- Success: HTTP 307 redirect to frontend with cookies set
- Error: HTTP 400/403/500 with error JSON

**Cookies Set:**

- `access_token` - JWT access token (HttpOnly, 15 min)
- `refresh_token` - JWT refresh token (HttpOnly, 7 days)

---

#### `POST /api/v1/auth/refresh`

Refreshes access token using refresh token.

**Rate Limit:** 10 requests/minute per IP

**Request Body (optional if cookie present):**

```json
{
  "refresh_token": "jwt_refresh_token"
}
```

**Response:**

```json
{
  "access_token": "new_jwt_access_token",
  "refresh_token": "new_jwt_refresh_token"
}
```

**Cookies Set:**

- `access_token` - New JWT access token
- `refresh_token` - New JWT refresh token (rotated)

---

#### `POST /api/v1/auth/logout`

Logs out user by revoking refresh token.

**Request Body (optional if cookie present):**

```json
{
  "refresh_token": "jwt_refresh_token"
}
```

**Response:**

```json
{
  "message": "Logged out successfully"
}
```

**Cookies:** Cleared

### Protected Endpoints

#### `GET /api/v1/auth/me`

Returns current authenticated user.

**Authentication:** Required (Bearer token or cookie)

**Response:**

```json
{
  "id": "uuid",
  "twitch_id": "123456",
  "username": "username",
  "display_name": "Display Name",
  "email": "user@example.com",
  "avatar_url": "https://...",
  "bio": "User bio",
  "karma_points": 0,
  "role": "user",
  "is_banned": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "last_login_at": "2024-01-01T00:00:00Z"
}
```

## Authentication Flow

### Initial Login

```
User -> Frontend -> GET /api/v1/auth/twitch
                 -> Redirect to Twitch
                 -> User authorizes
                 -> Twitch redirects back
                 -> GET /api/v1/auth/twitch/callback
                 -> Create/update user
                 -> Generate JWT tokens
                 -> Set cookies
                 -> Redirect to frontend
```

### Subsequent Requests

```
User -> Frontend -> API Request (with cookie or Bearer token)
                 -> Middleware validates JWT
                 -> Attach user to context
                 -> Handle request
```

### Token Refresh

```
User -> Frontend -> POST /api/v1/auth/refresh (with refresh token)
                 -> Validate refresh token
                 -> Check not revoked
                 -> Generate new token pair
                 -> Revoke old refresh token
                 -> Store new refresh token
                 -> Return new tokens
```

## Middleware

### `AuthMiddleware`

Requires authentication. Returns 401 if not authenticated.

```go
auth := v1.Group("/protected")
auth.Use(middleware.AuthMiddleware(authService))
{
    auth.GET("/resource", handler)
}
```

### `OptionalAuthMiddleware`

Attaches user if authenticated, but doesn't fail if not.

```go
v1.GET("/public", middleware.OptionalAuthMiddleware(authService), handler)
```

### `RequireRole`

Requires specific role(s). Must be used after `AuthMiddleware`.

```go
admin := auth.Group("/admin")
admin.Use(middleware.RequireRole("admin", "moderator"))
{
    admin.GET("/users", handler)
}
```

### `RateLimitMiddleware`

Rate limits requests by IP.

```go
auth.POST("/endpoint", 
    middleware.RateLimitMiddleware(redis, 5, time.Minute),
    handler)
```

## Security Features

### CSRF Protection

- OAuth state parameter stored in Redis (5 min expiry)
- State validated on callback
- State deleted after use

### Token Security

- RS256 signing (not HS256)
- 2048-bit RSA keys
- Access tokens: 15 minutes
- Refresh tokens: 7 days
- Refresh token rotation on use
- Refresh tokens hashed in database

### Cookie Security

- `HttpOnly` - Not accessible via JavaScript
- `Secure` - HTTPS only (in production)
- `SameSite=Lax` - CSRF protection

### Rate Limiting

- Auth endpoints rate limited
- Per-IP tracking
- Fail-open if Redis unavailable

### CORS

- Whitelist of allowed origins
- Credentials allowed only for whitelisted origins

## User Roles

- `user` - Regular user (default)
- `moderator` - Can moderate content
- `admin` - Full access

## Database Schema

### `refresh_tokens` table

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    is_revoked BOOLEAN DEFAULT false
);
```

## Testing

### Unit Tests

```bash
# Test JWT utilities
go test ./pkg/jwt -v

# Test all packages
go test ./... -v
```

### Integration Testing

See `docs/auth-testing.md` for integration test examples.

## Troubleshooting

### "JWT private key not provided"

- Ensure `JWT_PRIVATE_KEY` is set in `.env`
- Include entire PEM block with BEGIN/END lines
- Don't add extra whitespace or newlines

### "Failed to connect to Redis"

- Ensure Redis is running: `docker compose up redis -d`
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`

### "Invalid state parameter"

- State expired (5 min limit)
- User took too long to authorize
- Redis connection issue

### "Refresh token has been revoked"

- User logged out
- Token was already used (rotation)
- Token manually revoked

### CORS errors

- Add frontend URL to `CORS_ALLOWED_ORIGINS`
- Ensure format matches exactly (no trailing slash)

## Production Considerations

1. **Key Management**
   - Generate new RSA keys for production
   - Store keys securely (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Rotate keys periodically
   - Keep old keys for token validation during rotation

2. **Redis**
   - Use Redis Cluster for high availability
   - Enable persistence
   - Configure eviction policy

3. **Rate Limiting**
   - Adjust limits based on traffic
   - Consider per-user rate limiting
   - Use Redis for distributed rate limiting

4. **Monitoring**
   - Track authentication failures
   - Monitor token refresh rate
   - Alert on suspicious patterns

5. **Security**
   - Enable HTTPS only (`Secure` cookies)
   - Use short access token expiry
   - Implement token revocation check
   - Add IP-based anomaly detection

## Frontend Integration

See `frontend/docs/auth-integration.md` for frontend implementation guide.

Example usage:

```typescript
// Login
window.location.href = 'http://localhost:8080/api/v1/auth/twitch';

// Check auth status
const response = await fetch('http://localhost:8080/api/v1/auth/me', {
  credentials: 'include'
});

// Logout
await fetch('http://localhost:8080/api/v1/auth/logout', {
  method: 'POST',
  credentials: 'include'
});
```
