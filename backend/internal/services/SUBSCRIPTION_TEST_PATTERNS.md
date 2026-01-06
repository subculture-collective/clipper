# Subscription Service Test Patterns

## Overview

The subscription service tests have been refactored to use dependency injection with mock implementations. This provides better encapsulation, faster test execution, and improved testability.

## Test Architecture

### Dependency Injection

The `SubscriptionService` now accepts interfaces instead of concrete repository types:

```go
type SubscriptionService struct {
    repo           repository.SubscriptionRepositoryInterface
    userRepo       repository.UserRepositoryInterface
    webhookRepo    repository.WebhookRepositoryInterface
    cfg            *config.Config
    auditLogSvc    *AuditLogService
    dunningService *DunningService
    emailService   *EmailService
}
```

This allows us to inject mock implementations during testing, avoiding the need for database access.

### Mock Implementations

Mock implementations are defined in `subscription_service_mocks_test.go` using the `testify/mock` library:

- `MockSubscriptionRepository` - Mocks subscription database operations
- `MockUserRepository` - Mocks user database operations
- `MockWebhookRepository` - Mocks webhook database operations
- `MockAuditLogService` - Mocks audit logging
- `MockDunningService` - Mocks dunning/payment failure handling
- `MockEmailService` - Mocks email sending

### Repository Interfaces

Repository interfaces are defined in `repository/interfaces.go`:

- `SubscriptionRepositoryInterface`
- `UserRepositoryInterface`
- `WebhookRepositoryInterface`

The concrete repository types automatically implement these interfaces.

## Test File Organization

### `subscription_service_unit_test.go`

Contains comprehensive unit tests with mocked dependencies:

- **Service Creation Tests**: Test service initialization with various configurations
- **Repository Interaction Tests**: Test methods that interact with repositories
- **Business Logic Tests**: Test subscription status checking, tier verification, etc.
- **Mock Configuration Tests**: Test behavior when Stripe is not configured

### `subscription_service_test.go`

Contains simple validation tests that don't require mocks:

- Notification type constants
- Event structure validation
- Data structure tests

### `subscription_service_mocks_test.go`

Contains all mock implementations for testing.

## Writing New Tests

### Helper Function

To reduce boilerplate, use the `newTestSubscriptionService` helper function:

```go
// Helper creates service with default nil values for optional dependencies
service := newTestSubscriptionService(mockSubRepo, mockUserRepo, mockWebhookRepo, cfg)
```

This is equivalent to:
```go
service := NewSubscriptionService(
    mockSubRepo,
    mockUserRepo,
    mockWebhookRepo,
    cfg,
    nil, // auditLogSvc - can be mocked if needed
    nil, // dunningService - can be mocked if needed  
    nil, // emailService - can be mocked if needed
)
```

### Basic Pattern

```go
func TestMyFeature(t *testing.T) {
    t.Run("test scenario description", func(t *testing.T) {
        // 1. Create mocks
        mockSubRepo := new(MockSubscriptionRepository)
        mockUserRepo := new(MockUserRepository)
        mockWebhookRepo := new(MockWebhookRepository)
        cfg := &config.Config{
            // Configure as needed
        }

        // 2. Set up expectations
        mockSubRepo.On("GetByUserID", ctx, userID).Return(expectedSub, nil)

        // 3. Create service with mocks
        service := NewSubscriptionService(
            mockSubRepo,
            mockUserRepo,
            mockWebhookRepo,
            cfg,
            nil, // auditLogSvc
            nil, // dunningService
            nil, // emailService
        )

        // 4. Call the method under test
        result, err := service.SomeMethod(ctx, params)

        // 5. Assert expectations
        assert.NoError(t, err)
        assert.Equal(t, expected, result)
        mockSubRepo.AssertExpectations(t)
    })
}
```

### Testing Error Scenarios

```go
t.Run("handles error from repository", func(t *testing.T) {
    mockSubRepo := new(MockSubscriptionRepository)
    
    expectedError := errors.New("database error")
    mockSubRepo.On("GetByUserID", ctx, userID).Return(nil, expectedError)
    
    service := NewSubscriptionService(mockSubRepo, nil, nil, cfg, nil, nil, nil)
    
    result, err := service.GetSubscriptionByUserID(ctx, userID)
    
    assert.Error(t, err)
    assert.Nil(t, result)
    assert.Equal(t, expectedError, err)
    mockSubRepo.AssertExpectations(t)
})
```

### Testing with Multiple Dependencies

```go
t.Run("test with multiple dependencies", func(t *testing.T) {
    mockSubRepo := new(MockSubscriptionRepository)
    mockUserRepo := new(MockUserRepository)
    mockAuditLog := new(MockAuditLogService)
    
    // Set up expectations on multiple mocks
    mockSubRepo.On("GetByUserID", ctx, userID).Return(sub, nil)
    mockUserRepo.On("GetByID", ctx, userID).Return(user, nil)
    mockAuditLog.On("LogSubscriptionEvent", ctx, userID, "test", mock.Anything).Return(nil)
    
    service := NewSubscriptionService(
        mockSubRepo,
        mockUserRepo,
        nil,
        cfg,
        mockAuditLog,
        nil,
        nil,
    )
    
    result, err := service.SomeMethod(ctx, userID)
    
    assert.NoError(t, err)
    mockSubRepo.AssertExpectations(t)
    mockUserRepo.AssertExpectations(t)
    mockAuditLog.AssertExpectations(t)
})
```

## Benefits

### 1. No Database Required
Tests run entirely in memory without requiring a test database, making them:
- **Faster**: No database setup/teardown overhead
- **More reliable**: No flaky tests due to database state
- **Easier to run**: No external dependencies

### 2. Better Test Isolation
Each test has complete control over its dependencies:
- Tests don't affect each other
- Easy to test edge cases
- Predictable test behavior

### 3. Easier to Test Edge Cases
Mock implementations make it easy to simulate:
- Error conditions
- Network failures
- Invalid data
- Concurrent operations

### 4. Improved Maintainability
- Clear separation between business logic and data access
- Easy to refactor without breaking tests
- Tests document expected behavior

### 5. Backwards Compatible
The refactoring maintains backward compatibility:
- Concrete repository types still work
- Production code unchanged
- Existing integration tests still valid

## Running Tests

### Run all subscription service tests
```bash
cd backend
go test -v ./internal/services -run ".*Subscription.*"
```

### Run specific test
```bash
go test -v ./internal/services -run "TestHasActiveSubscription"
```

### Run with coverage
```bash
go test -coverprofile=coverage.out ./internal/services
go tool cover -html=coverage.out
```

## Best Practices

1. **Use descriptive test names**: Clearly describe what is being tested
2. **Test one thing per test**: Keep tests focused and simple
3. **Always call AssertExpectations**: Verify that mocks were called as expected
4. **Test error paths**: Don't just test the happy path
5. **Use table-driven tests** for similar test cases with different inputs
6. **Keep mocks simple**: Don't over-complicate mock implementations
7. **Document complex scenarios**: Add comments for non-obvious test setups

## Migration Guide

If you need to add tests for new service methods:

1. **Identify dependencies**: Determine which repositories/services are needed
2. **Create mocks**: Use existing mock types or add new ones if needed
3. **Set expectations**: Use `.On()` to define expected method calls
4. **Test business logic**: Focus on the service's behavior, not implementation details
5. **Verify calls**: Use `AssertExpectations()` to ensure mocks were used correctly

## Future Improvements

Possible enhancements to consider:

1. **Add more mock services**: Create mocks for Stripe API interactions
2. **Test webhook processing**: Add comprehensive webhook handler tests
3. **Test concurrent operations**: Verify thread-safety of service methods
4. **Performance tests**: Benchmark critical service operations
5. **Property-based testing**: Use fuzzing to test edge cases

## References

- [testify/mock documentation](https://pkg.go.dev/github.com/stretchr/testify/mock)
- [Go testing best practices](https://go.dev/doc/tutorial/add-a-test)
- [Dependency injection in Go](https://blog.golang.org/dependency-injection)
