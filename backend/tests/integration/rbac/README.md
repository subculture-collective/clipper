# RBAC & Admin Authorization Regression Suite

This directory contains comprehensive integration tests for Role-Based Access Control (RBAC) and admin authorization across all protected endpoints.

## Overview

The RBAC regression suite validates access matrices for different user roles (guest/user/moderator/admin) to ensure:
- Correct authorization enforcement
- No privilege escalation vulnerabilities
- Proper audit logging for admin/moderation actions
- Consistent error responses (401/403)

## Test Structure

### Core Files

- **`rbac_regression_test.go`**: Reusable test framework with table-driven tests
  - `TestContext`: Holds all test dependencies
  - `AccessMatrix`: Defines expected status codes per role
  - `EndpointTestCase`: Test case structure
  - `runEndpointTest()`: Executes tests for all roles
  - Helper functions for requests and audit log verification

- **`rbac_endpoints_test.go`**: Comprehensive test cases for protected endpoints
  - `TestRBACRegressionSuite()`: Main test suite covering all protected endpoints
  - `TestPrivilegeEscalation()`: Tests privilege escalation prevention
  - `TestNegativeCases()`: Tests unauthorized access rejection

## Covered Endpoints

### Clip Management
- `PUT /clips/:id` - Update clip (admin/moderator only)
- `DELETE /clips/:id` - Delete clip (admin only)

### Watch Party Admin Actions
- `POST /watch-parties/:id/kick` - Kick participant (host only)
- `POST /watch-parties/:id/end` - End watch party (host only)

### Chat Moderation
- `POST /chat/channels/:id/ban` - Ban user (admin/moderator)
- `POST /chat/channels/:id/mute` - Mute user (admin/moderator)
- `POST /chat/channels/:id/timeout` - Timeout user (admin/moderator)
- `DELETE /chat/channels/:id/ban/:user_id` - Unban user (admin/moderator)

### Admin User Management
- `GET /admin/users` - List users
- `POST /admin/users/:id/ban` - Ban user
- `POST /admin/users/:id/unban` - Unban user
- `PATCH /admin/users/:id/role` - Update role
- `PATCH /admin/users/:id/karma` - Update karma

### Webhook DLQ Admin
- `GET /admin/webhooks/dlq` - Get dead letter queue
- `POST /admin/webhooks/dlq/:id/replay` - Replay failed webhook
- `DELETE /admin/webhooks/dlq/:id` - Delete DLQ item

### Discovery Lists Admin
- `POST /admin/discovery-lists` - Create list
- `PUT /admin/discovery-lists/:id` - Update list
- `DELETE /admin/discovery-lists/:id` - Delete list
- `POST /admin/discovery-lists/:id/clips` - Add clip
- `DELETE /admin/discovery-lists/:id/clips/:clipId` - Remove clip

### Forum Moderation
- `POST /admin/forum/threads/:id/lock` - Lock thread
- `POST /admin/forum/threads/:id/pin` - Pin thread
- `POST /admin/forum/threads/:id/delete` - Delete thread
- `POST /admin/forum/users/:id/ban` - Ban user from forum

## Access Matrix

| Endpoint Type | Guest | User | Moderator | Admin |
|--------------|-------|------|-----------|-------|
| Public Read | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| User Actions | ❌ 401 | ✅ 200 | ✅ 200 | ✅ 200 |
| Moderation | ❌ 401 | ❌ 403 | ✅ 200 | ✅ 200 |
| Admin Only | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 200 |

## Running Tests

### Prerequisites

```bash
# Start test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up
```

### Run All RBAC Tests

```bash
cd backend
go test -v -tags=integration ./tests/integration/rbac/...
```

### Run Specific Test Suites

```bash
# Main regression suite
go test -v -tags=integration ./tests/integration/rbac -run TestRBACRegressionSuite

# Privilege escalation tests
go test -v -tags=integration ./tests/integration/rbac -run TestPrivilegeEscalation

# Negative test cases
go test -v -tags=integration ./tests/integration/rbac -run TestNegativeCases
```

### Run with Coverage

```bash
go test -v -tags=integration -coverprofile=coverage.out ./tests/integration/rbac/...
go tool cover -html=coverage.out -o coverage.html
```

### Cleanup

```bash
docker compose -f docker-compose.test.yml down
```

## Test Output

The tests output clear failure messages indicating:
- Which endpoint failed
- Which role failed (Guest/User/Moderator/Admin)
- Expected vs actual status code
- Endpoint name and method

Example output:
```
=== RUN   TestRBACRegressionSuite/DELETE_/clips/:id_-_Delete_Clip/User
    rbac_regression_test.go:245: User access failed for DELETE Delete Clip: expected 403, got 200
```

## Audit Logging Verification

Tests automatically verify audit logs for admin/moderation actions:
- Checks that audit log entries are created
- Validates action, entity ID, and moderator ID
- Confirms timestamp is recent
- Verifies reason is captured

## Adding New Tests

To add tests for a new protected endpoint:

1. Add test case to `testCases` array in `TestRBACRegressionSuite()`:

```go
{
    Name:   "POST /admin/new-endpoint - Description",
    Method: "POST",
    Path:   "/api/v1/admin/new-endpoint/%s",
    Body:   map[string]interface{}{"field": "value"},
    AccessMatrix: AccessMatrix{
        Guest:     http.StatusUnauthorized, // 401
        User:      http.StatusForbidden,    // 403
        Moderator: http.StatusOK,           // 200
        Admin:     http.StatusOK,           // 200
    },
    SetupData: func(t *testing.T, db *database.DB) map[string]uuid.UUID {
        // Create test data
        return map[string]uuid.UUID{"id": uuid.New()}
    },
    CleanupData: func(t *testing.T, db *database.DB, ids map[string]uuid.UUID) {
        // Cleanup test data
    },
    RequiresAudit: true,
    AuditAction:   "action_name",
},
```

2. Update this README with the new endpoint
3. Run tests to verify

## CI Integration

These tests run automatically in CI on:
- Every pull request
- Merges to main branch
- Release builds

## Troubleshooting

### Tests Failing to Connect

If tests can't connect to database or Redis:
1. Ensure Docker containers are running: `docker ps`
2. Check logs: `docker logs clipper-test-db`
3. Verify ports match configuration (5437 for DB, 6380 for Redis)

### Authorization Failures

If tests report unexpected authorization failures:
1. Check middleware configuration in `cmd/api/main.go`
2. Verify role/permission assignments in `internal/models/roles.go`
3. Review handler implementations for authorization checks

### Audit Log Failures

If audit log verification fails:
1. Check that handler creates audit log entries
2. Verify audit log table schema
3. Ensure correct action names are used

## Best Practices

1. **Keep tests focused**: Each test case should validate one endpoint
2. **Use setup/cleanup**: Always clean up test data to avoid conflicts
3. **Test all roles**: Ensure guest, user, moderator, and admin are all tested
4. **Verify audit logs**: For admin actions, always verify audit log creation
5. **Document expectations**: Use clear status codes and comments
6. **Handle edge cases**: Test with missing data, invalid IDs, etc.

## Related Documentation

- [Authorization Framework](../../../docs/backend/authorization-framework.md)
- [Testing Guide](../../../docs/testing/TESTING.md)
- [Integration Test README](../README.md)
- [Feature Test Coverage](../../../docs/product/feature-test-coverage.md)
