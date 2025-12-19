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

## Future Enhancements

- [ ] Add more third-party integration tests (Stripe, Twitch)
- [ ] Implement contract testing for external APIs
- [ ] Add performance benchmarks
- [ ] Implement chaos engineering tests
- [ ] Add security vulnerability tests
- [ ] Increase test data coverage
- [ ] Add mutation testing
- [ ] Implement visual regression tests for error responses
