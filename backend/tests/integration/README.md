# Integration Tests

This directory contains integration tests for the Clipper backend API. These tests validate end-to-end functionality across multiple system components including database, Redis, and external services.

## Test Structure

```
integration/
├── auth/           # Authentication flow tests
├── submissions/    # Clip submission and management tests
├── engagement/     # Like, comment, follow tests
├── premium/        # Subscription and payment tests
├── search/         # Search functionality tests
└── api/            # General API endpoint tests
```

## Running Integration Tests

### Prerequisites

- PostgreSQL database (test instance)
- Redis server (test instance)
- Go 1.22 or higher

### Setup Test Database

```bash
# Start test database using Docker Compose
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up
```

### Run Tests

```bash
# Run all integration tests
cd backend
go test -v -tags=integration ./tests/integration/...

# Run specific test suite
go test -v -tags=integration ./tests/integration/auth/...

# Run with coverage
go test -v -tags=integration -coverprofile=coverage.out ./tests/integration/...
go tool cover -html=coverage.out
```

### Environment Variables

Set these environment variables to configure test behavior:

- `TEST_DATABASE_HOST` - Database host (default: localhost)
- `TEST_DATABASE_PORT` - Database port (default: 5437)
- `TEST_DATABASE_USER` - Database user (default: clipper)
- `TEST_DATABASE_PASSWORD` - Database password (default: clipper_password)
- `TEST_DATABASE_NAME` - Database name (default: clipper_test)
- `TEST_REDIS_HOST` - Redis host (default: localhost)
- `TEST_REDIS_PORT` - Redis port (default: 6380)

## Test Coverage Goals

- **Authentication**: 90%+ coverage of auth flows
- **Submissions**: 85%+ coverage of CRUD operations
- **Engagement**: 85%+ coverage of interaction features
- **Premium**: 80%+ coverage of subscription flows
- **Search**: 85%+ coverage of search functionality
- **API**: 90%+ endpoint coverage

## Writing Tests

### Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests complete
3. **Parallel Safe**: Tests should be safe to run in parallel
4. **Realistic Data**: Use realistic test data that mimics production scenarios
5. **Error Cases**: Test both success and error scenarios

### Example Test Structure

```go
func TestFeature(t *testing.T) {
    router, authService, db, redisClient := setupTestRouter(t)
    defer db.Close()
    defer redisClient.Close()

    t.Run("SuccessCase", func(t *testing.T) {
        // Test implementation
    })

    t.Run("ErrorCase", func(t *testing.T) {
        // Test implementation
    })
}
```

## CI/CD Integration

These tests run automatically on every pull request via GitHub Actions. See `.github/workflows/ci.yml` for the CI configuration.

### Test Execution in CI

- Tests run against isolated PostgreSQL and Redis containers
- Database migrations are applied automatically
- Test results and coverage are reported
- Failed tests block PR merges

## Performance Targets

- Individual test execution: < 5 seconds
- Full suite execution: < 10 minutes
- Database connection overhead: < 100ms
- API response time assertions: < 2 seconds

## Troubleshooting

### Tests Failing Locally

1. Ensure test database is running: `docker compose -f docker-compose.test.yml ps`
2. Check database migrations are up to date
3. Verify Redis is accessible
4. Check test logs for specific error messages

### Database Connection Issues

```bash
# Test database connection
psql -h localhost -p 5437 -U clipper -d clipper_test

# Check database status
docker compose -f docker-compose.test.yml logs postgres
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -p 6380 ping

# Check Redis status
docker compose -f docker-compose.test.yml logs redis
```

## Mocks for External Dependencies

Interface-based mocks are available in `backend/tests/integration/mocks/` for:

- **Twitch API**: Mock client for clip, user, game, and stream operations
- **Email Service**: Mock for SendGrid/email operations with verification
- **Stripe**: Mock for payment and subscription operations
- **Storage/CDN**: Mock for file upload and storage operations

See `mocks/README.md` for detailed usage examples and patterns.

### Using Mocks in Tests

```go
import "github.com/subculture-collective/clipper/tests/integration/mocks"

func TestWithMocks(t *testing.T) {
    // Create mocks
    mockTwitch := mocks.NewMockTwitchClient()
    mockEmail := mocks.NewMockEmailService()
    mockStripe := mocks.NewMockStripeClient()
    mockStorage := mocks.NewMockStorageService()
    
    // Add test data
    mockTwitch.AddUser(&twitch.User{
        ID: "12345",
        Login: "testuser",
    })
    
    // Use in service/handler initialization
    service := NewMyService(mockTwitch, mockEmail, mockStripe, mockStorage)
    
    // Run tests and verify
    // ...
    
    // Check mock interactions
    assert.Equal(t, 1, mockTwitch.GetUsersCalls)
}
```

## Test Isolation and Parallel Execution

### Test Cleanup

Use `WithTestCleanup` for guaranteed cleanup:

```go
func TestWithCleanup(t *testing.T) {
    testEnv := testutil.SetupTestEnvironment(t)
    defer testEnv.Cleanup()
    
    var userID uuid.UUID
    
    testutil.WithTestCleanup(t, func() func() {
        // Setup: Create test user
        user := testutil.CreateTestUser(t, testEnv.DB, "testuser")
        userID = user.ID
        
        // Return cleanup function
        return func() {
            testutil.CleanupTestData(t, testEnv.DB, []uuid.UUID{userID})
        }
    }, func() {
        // Run your test with the test user
        // Test logic goes here
        // Cleanup is automatically called at the end
    })
}
```

Alternatively, use defer for simple cleanup:

```go
func TestSimpleCleanup(t *testing.T) {
    testEnv := testutil.SetupTestEnvironment(t)
    defer testEnv.Cleanup()
    
    user := testutil.CreateTestUser(t, testEnv.DB, "testuser")
    defer testutil.CleanupTestData(t, testEnv.DB, []uuid.UUID{user.ID})
    
    // Run your test
    // ...
}
```

### Parallel Tests

Mark tests as parallel-safe:

```go
func TestParallel(t *testing.T) {
    testutil.ParallelTest(t) // Marks test as parallel
    
    // Use unique test data per test case
    testUser := fmt.Sprintf("user_%s", uuid.New().String()[:8])
    
    // Run test
    // ...
}
```

### Isolated Tests

Use `IsolatedTest` for automatic Redis cleanup with unique prefix:

```go
func TestIsolated(t *testing.T) {
    testEnv := testutil.SetupTestEnvironment(t)
    defer testEnv.Cleanup()
    
    testutil.IsolatedTest(t, testEnv.DB, testEnv.RedisClient, func(prefix string) {
        // Test implementation
        // Use prefix for Redis keys: prefix + "mykey"
        // Redis keys with test prefix are automatically cleaned up
        ctx := context.Background()
        testEnv.RedisClient.Client.Set(ctx, prefix+"mykey", "value", 0)
    })
}
```

## Coverage Reporting

### Local Coverage

Run integration tests with coverage:

```bash
make test-integration-coverage
```

This generates:
- `backend/coverage-integration.out` - Coverage data
- `backend/coverage-integration.html` - HTML report

### CI Coverage

Integration test coverage is automatically:
- Calculated and reported in CI logs
- Uploaded as artifacts (30-day retention)
- Checked against 70% threshold (warning if below)

### Coverage Target

**Target**: ≥70% coverage for integration tests

Current coverage is reported in CI and can be viewed in artifacts.

## Future Enhancements

- [x] Add interface-based mocks for external dependencies
- [x] Implement transactional test helpers
- [x] Add parallel test execution support
- [x] Implement coverage reporting
- [x] Add CI artifacts for coverage
- [ ] Add more third-party integration tests (Stripe, Twitch)
- [ ] Implement contract testing for external APIs
- [ ] Add performance benchmarks
- [ ] Implement chaos engineering tests
- [ ] Add security vulnerability tests
- [ ] Increase test data coverage
- [ ] Add mutation testing
- [ ] Implement visual regression tests for error responses
