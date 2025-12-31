# Testing Guide

This document provides an overview of the testing infrastructure for Clipper and how to run tests.

## Test Types

Clipper uses multiple types of tests to ensure code quality and reliability:

1. **Unit Tests**: Test individual functions and methods in isolation
2. **Integration Tests**: Test interactions between components with real database
3. **End-to-End (E2E) Tests**: Test complete user flows through the UI
4. **Load Tests**: Test system performance under load

## Running Tests

### Backend Tests

#### Unit Tests

Run all unit tests:

```bash
cd backend
go test ./...
```

Run tests for a specific package:

```bash
go test ./internal/services
go test ./internal/handlers
```

Run tests with coverage:

```bash
go test -coverprofile=coverage.out -covermode=atomic ./...
go tool cover -html=coverage.out -o coverage.html
```

#### Integration Tests

Integration tests require a test database and Redis instance.

**Setup:**

```bash
# Start test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up
```

**Run tests:**

```bash
cd backend
go test -v -tags=integration ./tests/integration/...
```

**Run specific integration test suite:**

```bash
# DMCA tests
go test -v -tags=integration ./tests/integration/dmca/...

# Auth tests
go test -v -tags=integration ./tests/integration/auth/...

# All integration tests
go test -v -tags=integration ./tests/integration/...
```

**Cleanup:**

```bash
docker compose -f docker-compose.test.yml down
```

### Frontend Tests

```bash
cd frontend
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

### Mobile Tests

```bash
cd mobile
npm run test
```

## Test Coverage Goals

We aim for the following coverage thresholds:

- **Backend Services**: ≥ 80% line and branch coverage
- **Backend Handlers**: ≥ 80% line coverage  
- **Frontend Components**: ≥ 70% coverage
- **Integration Tests**: Cover all critical user workflows
- **E2E Tests**: Cover happy paths and critical error scenarios

## Feature-Specific Testing

### Input Validation Middleware Tests

The validation middleware provides defense-in-depth security against injection attacks:

**Unit Tests** (`backend/internal/middleware/validation_middleware_test.go` & `validation_middleware_security_test.go`):
- Basic SQLi pattern detection (UNION, SELECT, INSERT, DROP, etc.)
- XSS pattern detection (script tags, event handlers, javascript:)
- Path traversal detection (../, ..\\)
- Header validation (UTF-8, length limits)
- Request body size limits
- URL length validation
- Cross-field validation for user inputs
- SQLi/XSS edge cases (case variations, special characters)
- Mixed attack vectors (combined SQLi + XSS)
- Sanitization consistency and idempotency
- Fuzzer smoke test (1000+ random malicious payloads)

**Integration Tests** (`backend/tests/integration/validation/validation_integration_test.go`):
- Validation applied on clip endpoints
- Validation on user management endpoints
- Validation on comment endpoints
- Validation on search endpoints
- Header validation across all endpoints

**Coverage:**
- Unit test coverage: ~95% of validation logic
- Integration test coverage: All critical endpoints
- Fuzzer test: 1000+ payloads with 0 panics, 0% failure rate

**Running validation tests:**

```bash
cd backend

# All validation tests (unit + sanitization)
go test -v ./internal/middleware/ -run "TestInputValidation|TestSanitizeInput"

# Edge case tests
go test -v ./internal/middleware/ -run TestInputValidationMiddleware_SQLInjectionEdgeCases
go test -v ./internal/middleware/ -run TestInputValidationMiddleware_XSSEdgeCases

# Fuzzer smoke test (1000+ payloads)
go test -v ./internal/middleware/ -run TestInputValidationMiddleware_FuzzerSmoke

# Integration tests (requires test database)
docker compose -f docker-compose.test.yml up -d
go test -v -tags=integration ./tests/integration/validation/...
docker compose -f docker-compose.test.yml down
```

**Security Note:** The validation middleware provides defense-in-depth but should not be the only security layer. Always use:
- Parameterized queries/prepared statements for database access
- Context-aware output encoding for HTML/JS/CSS
- Content Security Policy (CSP) headers
- HTTPS for all communications

### DMCA System Tests

The DMCA system has comprehensive test coverage including:

**Unit Tests** (`backend/internal/services/dmca_service_test.go`, `backend/internal/handlers/dmca_handler_test.go`):
- Validation logic (required fields, URL validation, signature matching)
- Fuzzy signature matching algorithm
- Business day calculation for waiting periods
- URL parsing and clip ID extraction
- Authorization checks
- Malformed request handling

**Integration Tests** (`backend/tests/integration/dmca/dmca_integration_test.go`):
- Takedown notice submission workflow
- Admin review and approval process
- Takedown processing and strike issuance
- Counter-notice submission
- User access controls (users can only view own strikes)
- Admin access controls (admins/moderators can manage all notices)
- Audit log creation

**Coverage:**
- Service validation methods: 81-100% coverage
- Handler endpoints: ~60% from unit tests, higher with integration tests
- Critical business logic fully tested

**Running DMCA tests:**

```bash
# Unit tests only
cd backend
go test -v ./internal/services -run "TestValidateTakedownNotice|TestFuzzyMatchSignature|TestValidateCounterNotice|TestDMCAExtractClipIDFromURL"
go test -v ./internal/handlers -run "TestSubmit.*|TestGetUserStrikes.*|TestReviewNotice.*|TestProcessTakedown.*"

# Integration tests
go test -v -tags=integration ./tests/integration/dmca/...
```

### GDPR Account Deletion Lifecycle Tests

The GDPR account deletion system has comprehensive test coverage including:

**Integration Tests** (`backend/tests/integration/gdpr/gdpr_deletion_lifecycle_test.go`, `backend/tests/integration/gdpr/gdpr_hard_delete_test.go`):
- Deletion request creation with 30-day grace period
- Duplicate request prevention
- Cancellation flow and account restoration
- Grace period behavior (data remains accessible)
- Hard delete execution and data removal
- Removal of user-owned resources (favorites, votes, comments, submissions)
- Authentication token deletion (CASCADE)
- User settings deletion (CASCADE)
- Export endpoint validation post-deletion
- Scheduled deletion execution
- Audit log entries for request, cancellation, and completion
- Negative flows and error cases

**Coverage:**
- Full lifecycle: request → grace period → hard delete
- Cancellation and restoration flows
- Data erasure and anonymization
- Auditability of all deletion lifecycle events

**Running GDPR tests:**

```bash
# Setup test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Integration tests
cd backend
go test -v -tags=integration ./tests/integration/gdpr/...

# Cleanup
docker compose -f docker-compose.test.yml down
```

### Admin User Management Authorization Tests

The admin user management system has comprehensive test coverage including:

**Integration Tests** (`backend/tests/integration/admin/admin_user_management_test.go`):
- Authorization enforcement (403 for non-admin, success for admin/moderator)
- Privilege escalation prevention (users cannot self-promote to admin)
- Role management with database persistence verification
- Ban/unban operations with state verification
- Comment privilege suspension (temporary and permanent)
- Audit log creation for all administrative actions
- Karma adjustment operations
- Comment review requirement toggling
- User listing with pagination

**Coverage:**
- Full authorization testing across all admin endpoints
- Role changes persist and apply immediately to permissions
- All operations create appropriate audit log entries
- Negative tests for unauthorized access and privilege escalation
- Database state verification after each operation

**Running Admin Tests:**

```bash
# Setup test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Integration tests
cd backend
go test -v -tags=integration ./tests/integration/admin/...

# Cleanup
docker compose -f docker-compose.test.yml down
```

### Discovery Lists Tests

The Discovery Lists feature (Top/New/Discussed) has comprehensive test coverage:

**Unit Tests** (`backend/internal/handlers/discovery_list_handler_test.go`):
- Pagination parameter validation (limit, offset, boundary values)
- Filter parameters (featured lists)
- Authentication checks for follow/bookmark operations
- Error handling for invalid inputs
- Response structure verification

**Integration Tests** (`backend/tests/integration/discovery/discovery_list_integration_test.go`):
- Pagination with live database fixtures
- Sorting correctness (hot, new, top, discussed)
- Filter combinations (top10k_streamers, timeframe)
- Ordering verification (hot score, vote count, comment count, creation time)
- Database state verification after operations

**Coverage:**
- All major sort options tested (hot, new, top, discussed)
- Pagination edge cases (empty results, boundary values, multi-page)
- Filter parameters (timeframe, top10k_streamers)
- Combined filter testing

**Running Discovery Lists tests:**

```bash
# Unit tests only
cd backend
go test -v ./internal/handlers -run TestDiscoveryList
go test -v ./internal/handlers -run TestListDiscoveryLists
go test -v ./internal/handlers -run TestGetDiscoveryListClips

# Integration tests (requires test database)
docker compose -f docker-compose.test.yml up -d
go test -v -tags=integration ./tests/integration/discovery/...
docker compose -f docker-compose.test.yml down
```

### Live Status Tracking Tests

The Live Status Tracking system has comprehensive integration test coverage:

**Integration Tests** (`backend/tests/integration/live_status/live_status_integration_test.go`):
- Live status persistence and retrieval (UpsertLiveStatus, GetLiveStatus)
- Status transitions (offline → online, online → offline)
- API endpoint testing (GetBroadcasterLiveStatus, ListLiveBroadcasters, GetFollowedLiveBroadcasters)
- Authentication and authorization for protected endpoints
- Sync status tracking and logging
- Error logging for upstream failures
- Cache invalidation via timestamp updates
- Database state verification after all operations

**Coverage:**
- Full CRUD operations on broadcaster live status
- All HTTP API endpoints with proper authentication
- Sync status and sync log creation
- Error handling and logging
- Pagination and ordering of live broadcasters
- User-specific followed broadcaster filtering

**Running Live Status tests:**

```bash
# Setup test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Integration tests
cd backend
go test -v -tags=integration ./tests/integration/live_status/...

# Run specific test suites
go test -v -tags=integration ./tests/integration/live_status/... -run TestLiveStatusPersistence
go test -v -tags=integration ./tests/integration/live_status/... -run TestLiveStatusAPIEndpoints
go test -v -tags=integration ./tests/integration/live_status/... -run TestSyncStatusAndLogging
go test -v -tags=integration ./tests/integration/live_status/... -run TestCacheInvalidationViaTimestamp

# Cleanup
docker compose -f docker-compose.test.yml down
```

### Moderation Workflow E2E Tests

The Moderation Workflow has comprehensive end-to-end test coverage for admin/moderator operations:

**E2E Tests** (`frontend/e2e/tests/moderation-workflow.spec.ts`):
- **Access Control**: Admin-only access enforcement (non-admin blocked, admin/moderator allowed)
- **Single Actions**: Approve/reject individual submissions with rejection reasons
- **Bulk Actions**: Bulk approve/reject multiple submissions
- **Audit Logging**: Verification that all moderation actions create audit log entries
- **Rejection Reason Visibility**: Users can see rejection reasons for their submissions
- **Performance Baseline**: p95 page load time measurement for moderation queue

**Test Coverage:**
- ✅ Non-admin users blocked from accessing moderation queue
- ✅ Admin and moderator users can access moderation queue
- ✅ Single submission approval with audit logging
- ✅ Single submission rejection with reason display and audit logging
- ✅ Bulk approve submissions workflow with audit logs
- ✅ Bulk reject submissions workflow with reason and audit logs
- ✅ Rejection reasons visible to submitting users
- ✅ p95 page load time baseline measurement (< 3s for 50 submissions)
- ✅ Audit log creation for all moderation actions
- ✅ Audit log retrieval with filtering

**Running Moderation Workflow tests:**

```bash
cd frontend

# Run all moderation workflow tests
npm run test:e2e -- moderation-workflow.spec.ts

# Run specific test suites
npm run test:e2e -- moderation-workflow.spec.ts -g "Access Control"
npm run test:e2e -- moderation-workflow.spec.ts -g "Single Submission Actions"
npm run test:e2e -- moderation-workflow.spec.ts -g "Bulk Actions"
npm run test:e2e -- moderation-workflow.spec.ts -g "Audit Logging"
npm run test:e2e -- moderation-workflow.spec.ts -g "Performance Baseline"

# Run in headed mode to see browser
npm run test:e2e -- moderation-workflow.spec.ts --headed

# Run in UI mode for debugging
npm run test:e2e:ui -- moderation-workflow.spec.ts
```

**API Endpoints Tested:**
- `GET /api/admin/submissions` - List pending submissions (moderation queue)
- `POST /api/admin/submissions/:id/approve` - Approve single submission
- `POST /api/admin/submissions/:id/reject` - Reject single submission with reason
- `POST /api/admin/submissions/bulk-approve` - Bulk approve submissions
- `POST /api/admin/submissions/bulk-reject` - Bulk reject submissions with reason
- `GET /api/submissions` - User's own submissions (includes rejection reasons)
- `GET /api/admin/audit-logs` - Retrieve audit logs with filters

**Performance Metrics:**
- p95 page load time for moderation queue with 50 submissions (with mocked API responses): < 3 seconds (baseline)
- Test runs 20 iterations locally (10 iterations in CI) to establish baseline under mocked backend conditions
- Metrics logged: min, max, median, p95, mean load times

**Notes:**
- Tests use mocked API responses for consistent, isolated testing; real-world performance with actual backend latency may differ from these baselines
- Bulk actions are tested via API calls as UI doesn't expose bulk selection yet; these are API integration tests rather than true E2E tests
- Audit logging is verified for every moderation action
- Access control tests verify both blocking (403) and allowing access
- Performance baseline can be adjusted based on actual production requirements and production observability data

## Writing Tests

### Best Practices

1. **Test Independence**: Each test should be independent and not rely on other tests
2. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
4. **Error Cases**: Always test both success and error scenarios
5. **Mock External Dependencies**: Use mocks for external services (email, payment, etc.)
6. **Clean Up**: Always clean up test data after tests complete
7. **Parallel Safety**: Tests should be safe to run in parallel when possible

### Example Test Structure

```go
func TestFeature(t *testing.T) {
    // Setup
    testData := setupTestData(t)
    defer testData.Cleanup()

    t.Run("SuccessCase", func(t *testing.T) {
        // Arrange
        input := createValidInput()
        
        // Act
        result, err := service.DoSomething(input)
        
        // Assert
        assert.NoError(t, err)
        assert.Equal(t, expectedValue, result)
    })

    t.Run("ErrorCase", func(t *testing.T) {
        // Arrange
        input := createInvalidInput()
        
        // Act
        result, err := service.DoSomething(input)
        
        // Assert
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "expected error message")
    })
}
```

## CI/CD Integration

All tests run automatically in CI/CD pipelines:

- **Unit tests**: Run on every commit
- **Integration tests**: Run on pull requests
- **E2E tests**: Run on staging deployments
- **Load tests**: Run before production releases

## Troubleshooting

### Test Database Connection Issues

If integration tests fail to connect to the database:

1. Ensure Docker containers are running: `docker ps`
2. Check database is ready: `docker logs clipper-test-db`
3. Verify connection string matches `docker-compose.test.yml` settings
4. Try restarting containers: `docker compose -f docker-compose.test.yml restart`

### Slow Tests

If tests are running slowly:

1. Use `go test -short` to skip long-running tests during development
2. Run specific test files or packages instead of all tests
3. Consider if tests can be parallelized with `t.Parallel()`
4. Profile tests to identify bottlenecks

### Test Failures

When tests fail:

1. Read the error message carefully
2. Check if test data was properly cleaned up from previous runs
3. Verify all required environment variables are set
4. Look for race conditions if failures are intermittent
5. Check if external dependencies (DB, Redis) are available

## Additional Resources

- [Integration & E2E Testing Guide](./integration-e2e-guide.md)
- [Testing Guide](./testing-guide.md)
- [Feature Test Coverage](../product/feature-test-coverage.md)
- [Backend Integration Tests README](../../backend/tests/integration/README.md)
