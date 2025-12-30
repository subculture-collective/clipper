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
- Authentication lockout verification
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
