<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Test Coverage Roadmap](#test-coverage-roadmap)
  - [Current Status (as of implementation)](#current-status-as-of-implementation)
    - [Backend Coverage: ~15%](#backend-coverage-15%25)
    - [Frontend Coverage: Infrastructure Ready](#frontend-coverage-infrastructure-ready)
  - [Testing Infrastructure ✅](#testing-infrastructure-)
  - [Priority Tasks](#priority-tasks)
    - [Phase 1: Critical Backend Tests (P0)](#phase-1-critical-backend-tests-p0)
    - [Phase 2: Critical Frontend Tests (P0)](#phase-2-critical-frontend-tests-p0)
    - [Phase 3: Integration Tests](#phase-3-integration-tests)
    - [Phase 4: E2E Tests](#phase-4-e2e-tests)
    - [Phase 5: Load Tests](#phase-5-load-tests)
  - [Test Writing Guidelines](#test-writing-guidelines)
    - [Backend Unit Test Template](#backend-unit-test-template)
    - [Frontend Component Test Template](#frontend-component-test-template)
    - [Integration Test Template](#integration-test-template)
  - [Coverage Thresholds](#coverage-thresholds)
  - [Performance Targets](#performance-targets)
    - [API Endpoints](#api-endpoints)
    - [Load Capacity](#load-capacity)
  - [Resources](#resources)
  - [Progress Tracking](#progress-tracking)
    - [Completed (as of initial implementation)](#completed-as-of-initial-implementation)
    - [Next Steps](#next-steps)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Test Coverage Roadmap"
summary: "This document tracks the progress of implementing comprehensive test coverage across the Clipper pro"
tags: ['backend', 'testing']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Test Coverage Roadmap

This document tracks the progress of implementing comprehensive test coverage across the Clipper project.

## Current Status (as of implementation)

### Backend Coverage: ~15%

| Module | Current | Target | Status | Priority |
|--------|---------|--------|--------|----------|
| JWT | 80% | >80% | ✅ Complete | - |
| Utils | 100% | >95% | ✅ Complete | - |
| Scheduler | 81.8% | >80% | ✅ Complete | - |
| Middleware | 19.9% | >80% | 🔄 In Progress | P1 |
| Services | 4.3% | >90% | 🔴 Critical | P0 |
| Repository | 1.1% | >85% | 🔴 Critical | P0 |
| Handlers | 0% | >80% | 🔴 Critical | P0 |
| Models | 0% | >80% | 🟡 Needed | P1 |
| Config | 0% | >70% | 🟡 Needed | P2 |

### Frontend Coverage: Infrastructure Ready

| Module | Current | Target | Status | Priority |
|--------|---------|--------|--------|----------|
| Components | Sample | >80% | 🔄 Started | P0 |
| Hooks | 0% | >90% | 🔴 Critical | P0 |
| Services | 0% | >85% | 🔴 Critical | P1 |
| Utilities | 0% | >95% | 🟡 Needed | P1 |
| Pages | 0% | >75% | 🟡 Needed | P2 |

## Testing Infrastructure ✅

- [x] Vitest + React Testing Library setup
- [x] MSW for API mocking
- [x] Playwright for E2E tests
- [x] k6 for load testing
- [x] Test utilities and fixtures
- [x] Docker test database setup
- [x] CI/CD integration
- [x] Coverage reporting (Codecov)

## Priority Tasks

### Phase 1: Critical Backend Tests (P0)

#### Services (4.3% → >90%)

Priority order:

1. **AuthService** - Authentication logic
2. **ClipService** - Core clip operations
3. **CommentService** - Comment operations
4. **CacheService** - Caching logic
5. **SubmissionService** - User submissions
6. **AutoTagService** - Auto-tagging

#### Repository (1.1% → >85%)

Priority order:

1. **UserRepository** - User CRUD operations
2. **ClipRepository** - Clip CRUD operations
3. **CommentRepository** - Comment CRUD operations
4. **VoteRepository** - Vote operations
5. **FavoriteRepository** - Favorite operations
6. **TagRepository** - Tag operations (has some tests)

#### Handlers (0% → >80%)

Priority order:

1. **AuthHandler** - Authentication endpoints
2. **ClipHandler** - Clip endpoints
3. **CommentHandler** - Comment endpoints
4. **SearchHandler** - Search endpoints
5. **SubmissionHandler** - Submission endpoints
6. **ReportHandler** - Moderation endpoints

### Phase 2: Critical Frontend Tests (P0)

#### Components

Priority order:

1. **ClipCard** - ✅ Sample test exists
2. **ClipFeed** - Feed display logic
3. **CommentList** - Comment rendering
4. **CommentForm** - Comment submission
5. **AuthButton** - Authentication UI
6. **Navigation** - Nav component

#### Hooks

Priority order:

1. **useClips** - Clip fetching and caching
2. **useAuth** - Authentication state
3. **useComments** - Comment operations
4. **useVote** - Voting operations
5. **useFavorite** - Favorite operations

### Phase 3: Integration Tests

#### Backend Integration Tests

- [ ] Authentication flow (login, callback, refresh)
- [ ] Clip CRUD operations
- [ ] Comment CRUD operations
- [ ] Vote operations
- [ ] Search functionality
- [ ] Submission workflow
- [ ] Report and moderation

#### Frontend Integration Tests

- [ ] Feed loading and pagination
- [ ] Clip detail page
- [ ] Comment thread interactions
- [ ] Vote interactions
- [ ] Authentication flow
- [ ] Search functionality

### Phase 4: E2E Tests

Extend existing E2E tests:

- [ ] Complete user registration/login flow
- [ ] Clip browsing with filters
- [ ] Clip voting and favoriting
- [ ] Comment posting and replies
- [ ] Search functionality
- [ ] User profile management
- [ ] Admin moderation (if admin)

### Phase 5: Load Tests

Extend existing feed load test:

- [ ] Vote endpoint load test
- [ ] Comment endpoint load test
- [ ] Search endpoint load test
- [ ] Clip detail endpoint load test
- [ ] Authentication endpoint load test

## Test Writing Guidelines

### Backend Unit Test Template

```go
package service_test

import (
    "context"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/subculture-collective/clipper/internal/testutil"
)

func TestServiceName_MethodName(t *testing.T) {
    t.Run("success case", func(t *testing.T) {
        // Arrange
        mockRepo := new(MockRepository)
        service := NewService(mockRepo)
        testData := testutil.TestEntity()
        mockRepo.On("Method", mock.Anything, testData.ID).Return(testData, nil)
        
        // Act
        result, err := service.Method(context.Background(), testData.ID)
        
        // Assert
        assert.NoError(t, err)
        assert.Equal(t, testData.Field, result.Field)
        mockRepo.AssertExpectations(t)
    })
    
    t.Run("error case", func(t *testing.T) {
        // Test error scenarios
    })
}
```

### Frontend Component Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    // Arrange
    const props = { /* test props */ };
    
    // Act
    render(<ComponentName {...props} />);
    
    // Assert
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('handles user interaction', async () => {
    // Test interactions
  });
});
```

### Integration Test Template

```go
//go:build integration
// +build integration

package integration_test

import (
    "context"
    "testing"
    
    "github.com/subculture-collective/clipper/internal/testutil"
)

func TestIntegrationScenario(t *testing.T) {
    // Setup test database
    pool := testutil.SetupTestDB(t)
    defer testutil.CleanupTestDB(t, pool)
    
    // Clean tables before test
    testutil.TruncateTables(t, pool, "users", "clips")
    
    // Run integration test
    // ...
}
```

## Coverage Thresholds

Current thresholds in CI:

- Backend: 15% (will increase as tests are added)
- Frontend: Not yet enforced

Gradual increase plan:

1. Month 1: 15% → 30%
2. Month 2: 30% → 50%
3. Month 3: 50% → 70%
4. Month 4: 70% → 80%+

## Performance Targets

### API Endpoints

- Feed endpoint: <100ms (p95) ⏱️
- Single clip: <50ms (p95) ⏱️
- Vote operation: <30ms (p95) ⏱️
- Comment post: <50ms (p95) ⏱️
- Search: <200ms (p95) ⏱️

### Load Capacity

- Concurrent users: 1000+ 👥
- Requests/second: 100+ 📊
- Database connections: Handle pool efficiently 🗄️

## Resources

- [Testing Guide](./TESTING.md) - Comprehensive testing documentation
- [Contributing Guide](../CONTRIBUTING.md) - Contribution guidelines including testing
- [CI Workflow](../.github/workflows/ci.yml) - Automated testing pipeline

## Progress Tracking

Update this section as tests are added:

### Completed (as of initial implementation)

- ✅ Testing infrastructure setup
- ✅ Test utilities and fixtures
- ✅ Sample component test (ClipCard)
- ✅ Sample E2E tests
- ✅ Load test for feed endpoint
- ✅ CI/CD integration
- ✅ Documentation

### Next Steps

1. Implement handler tests (high priority)
2. Implement service tests (high priority)
3. Implement repository integration tests
4. Add more component tests
5. Add hook tests
6. Expand E2E test coverage
7. Add more load tests

---

**Note**: This is a living document. Update coverage percentages and priorities as progress is made.
