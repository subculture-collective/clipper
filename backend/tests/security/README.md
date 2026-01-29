# Security Tests

## Overview

This directory contains comprehensive security tests for the Clipper application, focusing on preventing IDOR (Insecure Direct Object Reference) vulnerabilities and ensuring proper authorization controls.

**Threat Coverage:** API-I-04 (Authorization Bypass / IDOR)  
**Risk Level:** HIGH  
**Last Updated:** 2025-12-16

## Test Suites

### IDOR Vulnerability Tests (`idor_test.go`)

Comprehensive tests to prevent unauthorized access to user resources.

**Test Coverage:**
- ✅ Comment operations (create, read, update, delete)
- ✅ User settings and profile access
- ✅ Clip metadata operations
- ✅ Favorite/bookmark operations
- ✅ Subscription management
- ✅ Role-based access (admin, moderator, user)
- ✅ Account type permissions

**Test Statistics:**
- Total Test Cases: 31
- Test Suites: 6
- Pass Rate: 100%
- Execution Time: ~10ms

## Running Tests

### Quick Start

```bash
# Run all security tests
make test-security

# Run only IDOR tests
make test-idor

# Run from backend directory
cd backend
go test -v ./tests/security/

# Run specific test suite
go test -v ./tests/security/ -run TestIDORComment
```

### Individual Test Suites

```bash
# Comment authorization tests
go test -v ./tests/security/ -run TestIDORCommentUpdate
go test -v ./tests/security/ -run TestIDORCommentDelete

# User settings access tests
go test -v ./tests/security/ -run TestIDORUserSettings

# Clip operations tests
go test -v ./tests/security/ -run TestIDORClipOperations

# Favorite operations tests
go test -v ./tests/security/ -run TestIDORFavoriteOperations

# Subscription access tests
go test -v ./tests/security/ -run TestIDORSubscriptionAccess
```

### With Coverage

```bash
cd backend
go test -coverprofile=coverage.out ./tests/security/
go tool cover -html=coverage.out
```

## Test Scenarios

### 1. Comment Update Authorization

**Scenarios Tested:**
- ✅ Owner can update own comment
- ✅ Non-owner CANNOT update other's comment (IDOR prevention)
- ✅ Admin can update any comment
- ✅ Moderator cannot update content of other's comments

### 2. Comment Delete Authorization

**Scenarios Tested:**
- ✅ Owner can delete own comment
- ✅ Non-owner CANNOT delete other's comment (IDOR prevention)
- ✅ Moderator can delete any comment
- ✅ Admin can delete any comment

### 3. User Settings Access

**Scenarios Tested:**
- ✅ User can access own settings
- ✅ User can view other's public profile
- ✅ User can update own profile
- ✅ User CANNOT update other's profile (IDOR prevention)
- ✅ User can delete own account
- ✅ User CANNOT delete other's account (IDOR prevention)
- ✅ Admin can delete any account

### 4. Clip Operations

**Scenarios Tested:**
- ✅ Submitter can update own clip metadata
- ✅ Non-submitter CANNOT update other's clip (IDOR prevention)
- ✅ Admin can update any clip
- ✅ Even submitter cannot delete clips (admin-only)
- ✅ Admin can delete any clip

### 5. Favorite Operations

**Scenarios Tested:**
- ✅ User can create own favorites
- ✅ User can view own favorites
- ✅ User CANNOT view other's favorites (IDOR prevention)
- ✅ User can delete own favorites
- ✅ User CANNOT delete other's favorites (IDOR prevention)

### 6. Subscription Access

**Scenarios Tested:**
- ✅ User can view own subscription
- ✅ User CANNOT view other's subscription (IDOR prevention)
- ✅ User can update own subscription
- ✅ User CANNOT update other's subscription (IDOR prevention)
- ✅ User can cancel own subscription
- ✅ User CANNOT cancel other's subscription (IDOR prevention)
- ✅ Admin can cancel any subscription

## CI/CD Integration

These tests run automatically on:
- Every pull request
- Every push to main/develop
- Pre-deployment validation

**GitHub Actions Workflow:**
```yaml
- name: Run Security Tests
  run: |
    cd backend
    go test -v ./tests/security/
```

**Status Checks:**
- ✅ All security tests must pass before merge
- ✅ No new IDOR vulnerabilities allowed
- ✅ Authorization framework tests included

## Adding New Tests

When adding new endpoints that access user resources:

### 1. Add Test to `idor_test.go`

```go
func TestIDORNewResourceOperations(t *testing.T) {
    ownerID := uuid.New()
    otherUserID := uuid.New()
    resourceID := uuid.New()

    tests := []struct {
        name           string
        userID         uuid.UUID
        role           string
        expectedAccess bool
        description    string
    }{
        {
            name:           "Owner can access",
            userID:         ownerID,
            role:           models.RoleUser,
            expectedAccess: true,
            description:    "Resource owner should have access",
        },
        {
            name:           "Non-owner denied",
            userID:         otherUserID,
            role:           models.RoleUser,
            expectedAccess: false,
            description:    "Non-owner should NOT have access (IDOR)",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test authorization...
        })
    }
}
```

### 2. Update Permission Matrix

Add rule to `internal/middleware/authorization.go`:

```go
{
    Resource:         ResourceTypeNewResource,
    Action:           ActionUpdate,
    RequiresOwner:    true,
    AllowedRoles:     []string{models.RoleAdmin},
}
```

### 3. Run Tests

```bash
go test -v ./tests/security/ -run TestIDORNewResource
```

## Best Practices

### ✅ DO

1. **Test ownership requirements**
   ```go
   // Test that non-owner is denied
   expectedAccess: false
   description: "Non-owner should NOT access (IDOR)"
   ```

2. **Test role-based access**
   ```go
   // Test admin override
   role: models.RoleAdmin
   expectedAccess: true
   ```

3. **Use descriptive test names**
   ```go
   name: "Non-owner_cannot_update_other's_comment"
   ```

4. **Add clear descriptions**
   ```go
   description: "User should NOT be able to update another user's comment (IDOR)"
   ```

### ❌ DON'T

1. **Don't skip edge cases**
   - Test suspended users
   - Test deleted resources
   - Test different account types

2. **Don't hardcode user IDs**
   ```go
   // ❌ Bad
   userID := uuid.MustParse("123...")
   
   // ✅ Good
   userID := uuid.New()
   ```

3. **Don't test implementation details**
   - Test behavior, not internal state
   - Test authorization outcome, not internal logic

## Troubleshooting

### Tests Fail After Code Change

1. Check if permission matrix rules changed
2. Verify user roles are set correctly
3. Review authorization logic in services
4. Check if test mocks match actual behavior

### Adding New Resource Type

1. Add resource type constant to `authorization.go`
2. Add ownership checker implementation
3. Add permission rules to matrix
4. Add test suite to `idor_test.go`
5. Run tests to verify

### Performance Issues

If tests are slow:
1. Use mocks instead of real database
2. Parallelize test execution
3. Cache test fixtures
4. Profile test execution

## Security Metrics

### Current Coverage

- **Resource Types Covered:** 5 (Comment, Clip, User, Favorite, Subscription)
- **Actions Covered:** 4 (Create, Read, Update, Delete)
- **Role Types Tested:** 3 (User, Moderator, Admin)
- **Account Types Tested:** 4 (Member, Broadcaster, Moderator, Admin)
- **Test Cases:** 31
- **Pass Rate:** 100%

### Goals

- ✅ 100% of resource endpoints have IDOR tests
- ✅ All critical operations covered
- ✅ Tests run in <1 second
- ✅ Zero false positives
- ✅ Integrated in CI/CD

## Related Documentation

- [Authorization Framework](../../docs/AUTHORIZATION_FRAMEWORK.md) - Complete framework documentation
- [Security Testing Runbook](../../docs/SECURITY_TESTING_RUNBOOK.md) - Daily operations guide
- [Authorization Status](../../docs/AUTHORIZATION_STATUS.md) - Implementation status
- [Threat Model](../../docs/product/threat-model.md) - Security threat analysis

## Support

For questions or issues:
- Review documentation first
- Create issue with `security` label
- Contact security team
- Slack: #security channel

---

**Remember:** Security is everyone's responsibility. When in doubt, deny access and ask for review.
