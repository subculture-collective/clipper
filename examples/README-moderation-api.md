# Clipper Moderation API - Code Examples

Working code examples for the Clipper Moderation API in multiple languages.

## 📁 Available Examples

- **[Bash](./moderation-api-examples.sh)** - Shell script examples using cURL
- **[JavaScript](./moderation-api-examples.js)** - Node.js/Browser examples
- **[Go](./moderation-api-examples.go)** - Go examples

## 🚀 Quick Start

### Prerequisites

1. **API Token**: Obtain a JWT token from the authentication endpoint
2. **Channel ID**: Your channel UUID
3. **Test User IDs**: UUIDs for testing ban/moderator operations

### Environment Variables

```bash
export API_TOKEN="your_jwt_token_here"
export CHANNEL_ID="your-channel-uuid"
export USER_TO_BAN="user-uuid-for-ban-test"
export USER_TO_MODERATE="user-uuid-for-moderator-test"
```

## 📝 Usage

### Bash (Shell Script)

```bash
# Make executable
chmod +x moderation-api-examples.sh

# Run all examples
./moderation-api-examples.sh
```

**Requirements**: bash, curl, jq

### JavaScript (Node.js)

```bash
# Run all examples
node moderation-api-examples.js

# Or use as a module
const { apiCall, runAllExamples } = require('./moderation-api-examples.js');
await runAllExamples();
```

**Requirements**: Node.js 18+ with fetch support

### Go

```bash
# Run directly
go run moderation-api-examples.go

# Or build and run
go build -o moderation-examples moderation-api-examples.go
./moderation-examples
```

**Requirements**: Go 1.21+

## 📚 Example Coverage

All examples demonstrate:

1. **Sync Bans** - Sync bans from Twitch
2. **List Bans** - Retrieve paginated ban list
3. **Create Ban** - Ban a user from a channel
4. **Get Ban Details** - View specific ban information
5. **List Moderators** - Get channel moderators
6. **Add Moderator** - Add a new moderator
7. **List Audit Logs** - View moderation actions
8. **Export Audit Logs** - Download logs as CSV
9. **Revoke Ban** - Remove a ban
10. **Remove Moderator** - Remove moderator status

## 🔒 Authentication

All examples require a valid JWT Bearer token. To obtain one:

```bash
# Authenticate via Twitch OAuth
curl -X GET https://api.clpr.tv/api/v1/auth/twitch

# Extract token from response
export API_TOKEN="<access_token>"
```

## ⚠️ Important Notes

### Rate Limiting

Be aware of rate limits when running examples:

- Read operations: 60 requests/minute
- Write operations: 10 requests/hour
- Sync operations: 5 requests/hour

### Error Handling

Examples include basic error handling. In production:

- Implement exponential backoff for rate limits
- Add retry logic for transient failures
- Log errors appropriately

### Testing Safely

When testing:

- Use a test channel, not production
- Use test user accounts
- Clean up created resources after testing
- Review audit logs to verify actions

## 🔧 Customization

### Bash Example

Edit variables at the top of `moderation-api-examples.sh`:

```bash
API_BASE="${API_BASE:-https://api.clpr.tv/api/v1/moderation}"
CHANNEL_ID="${CHANNEL_ID:-your-default-channel-id}"
```

### JavaScript Example

Modify constants or pass environment variables:

```javascript
const API_BASE = process.env.API_BASE || 'https://api.clpr.tv/api/v1/moderation';
const channelId = process.env.CHANNEL_ID || 'your-default-channel-id';
```

### Go Example

Update constants in `main()` or use environment variables:

```go
const defaultChannelID = "your-default-channel-id"
channelID := os.Getenv("CHANNEL_ID")
if channelID == "" {
    channelID = defaultChannelID
}
```

## 📊 Example Output

### Successful Ban Creation

```bash
=== Example 3: Create a Ban ===
Ban created: 98765432-e89b-12d3-a456-426614174001
User: user-uuid-to-ban
```

### List Moderators

```bash
=== Example 5: List Moderators ===
Total moderators: 5
  1. mod_user123 (moderator)
  2. mod_user456 (moderator)
  3. admin_user789 (admin)
```

### Error Response

```bash
Error: API Error (403): Permission denied: You must be a channel owner, admin, or moderator to ban users
```

## 🐛 Troubleshooting

### Common Issues

#### 401 Unauthorized

```
Error: Authorization token required
```

**Solution**: Export valid `API_TOKEN`

#### 403 Forbidden

```
Error: Permission denied
```

**Solution**: Ensure your account has required permissions for the channel

#### 404 Not Found

```
Error: Channel not found
```

**Solution**: Verify `CHANNEL_ID` is correct and accessible

#### 429 Rate Limit Exceeded

```
Error: Rate limit exceeded
```

**Solution**: Wait for rate limit window to reset (check `X-RateLimit-Reset` header)

### Debug Mode

Enable verbose output:

**Bash**:
```bash
set -x  # Enable debug mode
./moderation-api-examples.sh
```

**JavaScript**:
```javascript
// Add console.log statements
console.log('Request:', { endpoint, method, body });
```

**Go**:
```go
// Add debug logging
log.Printf("Request: %s %s\n", method, endpoint)
```

## 📖 Documentation

For complete API documentation, see:

- [Moderation API Reference](../docs/backend/moderation-api.md)
- [API Quick Start](../docs/backend/api-moderation-index.md)
- [OpenAPI Specification](../docs/openapi/openapi.yaml)

## 🤝 Contributing

Found an issue with the examples? Please open an issue or submit a pull request:

- [GitHub Issues](https://github.com/subculture-collective/clipper/issues)
- [Contributing Guide](../CONTRIBUTING.md)

## 📜 License

These examples are part of the Clipper project and are licensed under the MIT License.

---

**Last Updated**: 2024-01-15  
**Version**: 1.0.0  
**Maintainer**: team-core
