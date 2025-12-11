<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Testing Guide](#testing-guide)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
    - [Coverage Targets](#coverage-targets)
  - [Backend Testing](#backend-testing)
    - [Running Tests](#running-tests)
    - [Unit Tests](#unit-tests)
    - [Integration Tests](#integration-tests)
    - [Test Fixtures](#test-fixtures)
    - [Mocking](#mocking)
  - [Frontend Testing](#frontend-testing)
    - [Running Tests](#running-tests-1)
    - [Unit Tests](#unit-tests-1)
    - [Integration Tests](#integration-tests-1)
  - [E2E Testing](#e2e-testing)
    - [Running E2E Tests](#running-e2e-tests)
    - [Writing E2E Tests](#writing-e2e-tests)
  - [Load Testing](#load-testing)
    - [Running Load Tests](#running-load-tests)
    - [Available Load Test Scenarios](#available-load-test-scenarios)
    - [Performance Targets](#performance-targets)
  - [CI/CD Integration](#cicd-integration)
    - [GitHub Actions](#github-actions)
    - [Coverage Reports](#coverage-reports)
  - [Best Practices](#best-practices)
    - [Test Structure (AAA Pattern)](#test-structure-aaa-pattern)
    - [Test Naming](#test-naming)
    - [Test Independence](#test-independence)
    - [Mock External Dependencies](#mock-external-dependencies)
    - [Test Error Cases](#test-error-cases)
    - [Keep Tests Fast](#keep-tests-fast)
    - [Test Documentation](#test-documentation)
  - [Troubleshooting](#troubleshooting)
    - [Tests Timing Out](#tests-timing-out)
    - [Flaky Tests](#flaky-tests)
    - [Coverage Not Increasing](#coverage-not-increasing)
  - [Resources](#resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Testing Guide"
summary: "Comprehensive testing strategy covering unit, integration, E2E, and load tests."
tags: ["backend", "testing", "quality"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["tests", "test guide", "qa"]
---

# Testing Guide

This document provides comprehensive information on testing in the Clipper project.

## Table of Contents

- [Overview](#overview)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [E2E Testing](#e2e-testing)
- [Load Testing](#load-testing)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

The Clipper project implements a comprehensive testing strategy covering:

- **Unit Tests**: Test individual functions, components, and modules
- **Integration Tests**: Test interactions between components/modules
- **E2E Tests**: Test complete user workflows
- **Load Tests**: Test performance under various load conditions

### Coverage Targets

- Backend Overall: **>80%**
  - Service Layer: **>90%**
  - Repository Layer: **>85%**
  - Handlers: **>80%**
- Frontend Overall: **>80%**
  - Components: **>80%**
  - Hooks: **>90%**
  - Utilities: **>95%**

## Backend Testing

### Running Tests

```bash
# Run all backend tests
cd backend && go test ./...

# Run tests with coverage
cd backend && go test -coverprofile=coverage.out -covermode=atomic ./...

# View coverage report
cd backend && go tool cover -html=coverage.out

# Run specific package tests
cd backend && go test ./internal/handlers/...

# Run tests with race detection
cd backend && go test -race ./...
```

### Unit Tests

Unit tests use Go's built-in `testing` package with `testify` for assertions.

#### Example

```go
package handlers_test

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

func TestAuthHandler_InitiateOAuth(t *testing.T) {
    // Arrange
    mockService := new(MockAuthService)
    handler := NewAuthHandler(mockService, cfg)
    mockService.On("GenerateAuthURL", mock.Anything).Return("https://...", nil)

    // Act
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    handler.InitiateOAuth(c)

    // Assert
    assert.Equal(t, http.StatusTemporaryRedirect, w.Code)
    mockService.AssertExpectations(t)
}
```

### Integration Tests

Integration tests use a real test database via Docker.

#### Setup

```bash
# Start test database
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Run integration tests
cd backend && go test -v -tags=integration ./...

# Cleanup
docker compose -f docker-compose.test.yml down
```

Or use the Makefile:

```bash
make test-integration
```

### Test Fixtures

Use the `testutil` package for creating test data:

```go
import "github.com/subculture-collective/clipper/internal/testutil"

func TestSomething(t *testing.T) {
    user := testutil.TestUser()
    clip := testutil.TestClip()
    comment := testutil.TestComment(user.ID, clip.ID)
    // ... use in tests
}
```

### Mocking

Use `go.uber.org/mock` for generating mocks:

```bash
# Generate mocks (example)
mockgen -source=internal/repository/user_repository.go -destination=internal/repository/mocks/user_repository_mock.go
```

## Frontend Testing

### Running Tests

```bash
# Run all tests
cd frontend && npm test

# Run tests in watch mode
cd frontend && npm test

# Run tests with coverage
cd frontend && npm run test:coverage

# Run tests with UI
cd frontend && npm run test:ui
```

### Unit Tests

Unit tests use Vitest with React Testing Library.

#### Example Component Test

```tsx
import { render, screen } from '@/test/test-utils';
import { describe, it, expect } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Example Hook Test

```tsx
import { renderHook, waitFor } from '@/test/test-utils';
import { describe, it, expect } from 'vitest';
import { useClips } from './useClips';

describe('useClips', () => {
  it('fetches clips successfully', async () => {
    const { result } = renderHook(() => useClips());
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.clips).toBeDefined();
  });
});
```

### Integration Tests

Integration tests test component interactions and API integration with MSW.

```tsx
import { render, screen, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('ClipFeed', () => {
  it('displays clips from API', async () => {
    render(<ClipFeed />);
    
    await waitFor(() => {
      expect(screen.getByText('Amazing Play')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    server.use(
      http.get('*/api/clips', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<ClipFeed />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## E2E Testing

### Running E2E Tests

```bash
# Install Playwright browsers (first time only)
cd frontend && npx playwright install

# Run E2E tests
cd frontend && npm run test:e2e

# Run E2E tests with UI
cd frontend && npm run test:e2e:ui

# Run specific test file
cd frontend && npx playwright test e2e/clips.spec.ts

# Run tests in specific browser
cd frontend && npx playwright test --project=chromium
```

### Writing E2E Tests

E2E tests use Playwright to test complete user workflows.

```typescript
import { test, expect } from '@playwright/test';

test('user can view and vote on clip', async ({ page }) => {
  // Navigate to home page
  await page.goto('/');
  
  // Wait for clips to load
  await page.waitForSelector('[data-testid="clip-card"]');
  
  // Click on first clip
  await page.click('[data-testid="clip-card"]');
  
  // Verify we're on clip detail page
  await expect(page).toHaveURL(/\/clip\/[a-f0-9-]+/);
  
  // Click upvote button
  await page.click('[data-testid="upvote-button"]');
  
  // Verify vote was registered
  await expect(page.locator('[data-testid="score"]')).toContainText('101');
});
```

## Load Testing

### Running Load Tests

Load tests use k6 to test performance under load. We have comprehensive scenarios covering different user behaviors.

```bash
# Install k6
# macOS: brew install k6
# Linux: See https://k6.io/docs/getting-started/installation/

# Seed test data first
make migrate-seed-load-test

# Run all load tests
make test-load

# Run specific scenarios
make test-load-feed          # Feed browsing
make test-load-clip          # Clip detail views
make test-load-search        # Search functionality
make test-load-comments      # Comment interactions
make test-load-mixed         # Mixed user behavior (recommended)

# Collect baseline metrics
./backend/tests/load/baseline-metrics.sh
```

### Available Load Test Scenarios

1. **Feed Browsing** (`feed_browsing.js`) - Tests feed endpoints with different sorting
   - 100 concurrent users
   - Hot/new/top feed variants
   - p95 target: <100ms

2. **Clip Detail View** (`clip_detail.js`) - Tests individual clip viewing
   - 50 concurrent users
   - Includes related clips, comments, analytics
   - p95 target: <50ms

3. **Search** (`search.js`) - Tests search with filters and suggestions
   - 40 concurrent users
   - Various query types and filters
   - p95 target: <100ms

4. **Comments** (`comments.js`) - Tests comment listing and interactions
   - 25 concurrent users
   - Read and write operations (with auth)
   - p95 target: <50ms

5. **Clip Submission** (`submit.js`) - Tests submission workflow
   - 10 concurrent users
   - Requires authentication
   - p95 target: <200ms

6. **Mixed Behavior** (`mixed_behavior.js`) - Realistic user patterns
   - 100 concurrent users
   - 4 user profiles (browsers, viewers, searchers, engaged users)
   - Overall p95 target: <100ms

See [Load Testing README]([[tests/load/README| for detailed documentation.

### Performance Targets

| Endpoint Type | p95 Target | p99 Target | Concurrent Users |
|--------------|------------|------------|------------------|
| Feed listing | <100ms | <150ms | 100 |
| Clip detail | <50ms | <100ms | 50 |
| Search | <100ms | <200ms | 40 |
| Comments | <50ms | <100ms | 25 |
| Write operations | <100ms | <200ms | 25 |
| Submissions | <200ms | <500ms | 10 |

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- **Every PR**: Backend unit tests, frontend unit tests, linting
- **Merge to develop/main**: All tests including E2E
- **Nightly**: Full test suite including load tests

### Coverage Reports

Coverage reports are uploaded to Codecov:

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    file: ./backend/coverage.out
    flags: backend
    fail_ci_if_error: true
```

## Best Practices

### Test Structure (AAA Pattern)

```go
func TestSomething(t *testing.T) {
    // Arrange - Set up test data and dependencies
    user := testutil.TestUser()
    mockService := new(MockService)
    
    // Act - Execute the code being tested
    result, err := DoSomething(user, mockService)
    
    // Assert - Verify the results
    assert.NoError(t, err)
    assert.Equal(t, expectedValue, result)
}
```

### Test Naming

Use descriptive test names that explain what is being tested:

```go
// Good
func TestAuthHandler_InitiateOAuth_ReturnsRedirectURL(t *testing.T)
func TestUserService_CreateUser_WithInvalidEmail_ReturnsError(t *testing.T)

// Bad
func TestAuth(t *testing.T)
func TestCreateUser(t *testing.T)
```

### Test Independence

- Each test should be independent and not rely on other tests
- Use `t.Cleanup()` or `defer` for teardown
- Reset mocks between tests

### Mock External Dependencies

Always mock external dependencies:

- Database queries
- HTTP clients
- Redis operations
- Time functions
- File system operations

### Test Error Cases

Don't only test the happy path:

```go
func TestSomething(t *testing.T) {
    t.Run("success case", func(t *testing.T) { /* ... */ })
    t.Run("with invalid input", func(t *testing.T) { /* ... */ })
    t.Run("when service fails", func(t *testing.T) { /* ... */ })
    t.Run("when database is down", func(t *testing.T) { /* ... */ })
}
```

### Keep Tests Fast

- Use mocks instead of real dependencies when possible
- Run integration tests separately from unit tests
- Use parallel testing when tests are independent
- Avoid unnecessary sleeps/waits

### Test Documentation

Add comments for complex test scenarios:

```go
// TestComplexScenario tests the edge case where a user attempts
// to vote on their own clip while their account is being deleted
func TestComplexScenario(t *testing.T) {
    // ...
}
```

## Troubleshooting

### Tests Timing Out

- Increase timeout: `go test -timeout 5m ./...`
- Check for hanging goroutines
- Verify test database is running

### Flaky Tests

- Use `waitFor` in frontend tests
- Add proper synchronization
- Avoid relying on exact timing
- Use `t.Parallel()` carefully

### Coverage Not Increasing

- Check if files are excluded
- Verify test files are in correct location
- Run with `-coverprofile` to see what's covered

## Resources

- [Go Testing Package](https://pkg.go.dev/testing)
- [Testify Documentation](https://github.com/stretchr/testify)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)


---

[[../index|← Back to Index]]
