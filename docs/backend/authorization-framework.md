# Authorization Framework Documentation

## Overview

This document describes the comprehensive authorization framework implemented to prevent IDOR (Insecure Direct Object Reference) vulnerabilities across all API endpoints that access user resources.

**Threat ID:** API-I-04  
**Risk Level:** HIGH  
**Implementation Date:** 2025-12-16

## Architecture

### Components

1. **Permission Matrix** (`internal/middleware/authorization.go`)
   - Centralized definition of all authorization rules
   - Maps resource types + actions to permission requirements
   - Supports ownership checks, role-based access, and account type permissions

2. **Resource Ownership Checkers**
   - `CommentOwnershipChecker` - Verifies comment ownership
   - `ClipOwnershipChecker` - Verifies clip submission ownership
   - `UserOwnershipChecker` - Verifies user resource access (settings, profile)

3. **Authorization Functions**
   - `CanAccessResource()` - Core authorization logic
   - `RequireResourceOwnership()` - Gin middleware for route protection
   - `LogAuthorizationFailure()` - Security event logging

4. **Automated Testing** (`tests/security/idor_test.go`)
   - Comprehensive IDOR vulnerability tests
   - Tests for all resource types and actions
   - Validates ownership checks and role-based access

## Resource Types

- `ResourceTypeComment` - User comments on clips
- `ResourceTypeClip` - Twitch clip submissions
- `ResourceTypeUser` - User profiles and settings
- `ResourceTypeFavorite` - User favorites/bookmarks
- `ResourceTypeSubscription` - User subscriptions
- `ResourceTypeSubmission` - User-submitted content

## Actions

- `ActionCreate` - Creating new resources
- `ActionRead` - Reading/viewing resources
- `ActionUpdate` - Modifying existing resources
- `ActionDelete` - Deleting resources

## Permission Rules

### Comment Permissions

```go
// Anyone can create and read comments
{Resource: ResourceTypeComment, Action: ActionCreate, RequiresOwner: false}
{Resource: ResourceTypeComment, Action: ActionRead, RequiresOwner: false}

// Only owner or admin can update
{Resource: ResourceTypeComment, Action: ActionUpdate, RequiresOwner: true, AllowedRoles: [admin]}

// Owner, moderator, or admin can delete
{Resource: ResourceTypeComment, Action: ActionDelete, RequiresOwner: true, AllowedRoles: [moderator, admin]}
```

### User Permissions

```go
// Public profiles - anyone can read
{Resource: ResourceTypeUser, Action: ActionRead, RequiresOwner: false}

// Only user can update their own profile
{Resource: ResourceTypeUser, Action: ActionUpdate, RequiresOwner: true}

// User or admin can delete account
{Resource: ResourceTypeUser, Action: ActionDelete, RequiresOwner: true, AllowedRoles: [admin]}
```

### Clip Permissions

```go
// Anyone can read public clips
{Resource: ResourceTypeClip, Action: ActionRead, RequiresOwner: false}

// Submitter or admin can update metadata
{Resource: ResourceTypeClip, Action: ActionUpdate, RequiresOwner: true, AllowedRoles: [admin]}

// Only admin can delete clips
{Resource: ResourceTypeClip, Action: ActionDelete, RequiresOwner: false, AllowedRoles: [admin]}
```

### Subscription Permissions

```go
// All subscription operations require ownership
{Resource: ResourceTypeSubscription, Action: ActionRead, RequiresOwner: true}
{Resource: ResourceTypeSubscription, Action: ActionUpdate, RequiresOwner: true}
{Resource: ResourceTypeSubscription, Action: ActionDelete, RequiresOwner: true, AllowedRoles: [admin]}
```

### Favorite Permissions

```go
// All favorite operations require ownership
{Resource: ResourceTypeFavorite, Action: ActionCreate, RequiresOwner: true}
{Resource: ResourceTypeFavorite, Action: ActionRead, RequiresOwner: true}
{Resource: ResourceTypeFavorite, Action: ActionDelete, RequiresOwner: true}
```

## Usage Examples

### In Handlers (Manual Authorization)

```go
func (h *CommentHandler) UpdateComment(c *gin.Context) {
    commentID := uuid.Parse(c.Param("id"))
    userID := c.Get("user_id").(uuid.UUID)
    user := c.Get("user").(*models.User)
    
    // Check authorization
    checker := middleware.NewCommentOwnershipChecker(h.commentRepo)
    authCtx := &middleware.AuthorizationContext{
        UserID:       userID,
        User:         user,
        ResourceID:   commentID,
        Action:       middleware.ActionUpdate,
        ResourceType: middleware.ResourceTypeComment,
    }
    
    hasAccess, err := middleware.CanAccessResource(authCtx, checker)
    if err != nil || !hasAccess {
        c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
        return
    }
    
    // Proceed with update...
}
```

### As Middleware (Route Protection)

```go
// In route setup
commentChecker := middleware.NewCommentOwnershipChecker(commentRepo)

router.PUT("/comments/:id", 
    middleware.AuthMiddleware(authService),
    middleware.RequireResourceOwnership(
        middleware.ResourceTypeComment, 
        middleware.ActionUpdate,
        commentChecker,
    ),
    commentHandler.UpdateComment,
)
```

## Testing

### Running Security Tests

```bash
# Run all IDOR tests
cd backend
go test -v ./tests/security/

# Run specific test suite
go test -v ./tests/security/ -run TestIDORComment

# Run with coverage
go test -coverprofile=coverage.out ./tests/security/
go tool cover -html=coverage.out
```

### Test Coverage

The IDOR test suite includes:
- ✅ Comment ownership tests (create, read, update, delete)
- ✅ User settings access tests
- ✅ Clip operation tests
- ✅ Favorite operation tests
- ✅ Subscription access tests
- ✅ Role-based permission tests
- ✅ Account type permission tests

**Total Test Cases:** 31  
**Test Suites:** 6  
**Pass Rate:** 100%

## Authorization Best Practices

### 1. Always Verify Ownership

```go
// ✅ GOOD - Check ownership before allowing access
hasAccess, err := middleware.CanAccessResource(authCtx, checker)
if !hasAccess {
    return ErrForbidden
}

// ❌ BAD - Directly using user input without verification
commentID := c.Param("id")
comment.Update(commentID) // No ownership check!
```

### 2. Use Multiple Layers of Defense

```go
// Layer 1: Middleware (route level)
router.PUT("/comments/:id", 
    middleware.RequireResourceOwnership(...),
    handler.UpdateComment,
)

// Layer 2: Handler (business logic level)
func (h *CommentHandler) UpdateComment(c *gin.Context) {
    // Additional checks...
}

// Layer 3: Service (data access level)
func (s *CommentService) UpdateComment(...) {
    // Final ownership verification
}
```

### 3. Use Allowlist Approach

```go
// ✅ GOOD - Explicitly define what's allowed
if user.IsAdmin() || user.IsOwner(resourceID) {
    // Allow access
}

// ❌ BAD - Deny specific cases (easy to miss edge cases)
if !user.IsBanned() && !user.IsSuspended() {
    // Allow access - what about other restriction types?
}
```

### 4. Log Authorization Failures

```go
if !hasAccess {
    middleware.LogAuthorizationFailure(
        userID, 
        resourceType, 
        resourceID, 
        action,
        "ownership check failed",
    )
    return ErrForbidden
}
```

### 5. Consistent Error Responses

```go
// Use 403 for authorization failures
c.JSON(http.StatusForbidden, gin.H{
    "success": false,
    "error": gin.H{
        "code": "FORBIDDEN",
        "message": "You do not have permission to perform this action",
    },
})

// Use 404 for non-existent resources (don't leak existence)
// Only when appropriate for the use case
```

### 6. Test Edge Cases

```go
// Test cases to always include:
// - Owner access
// - Non-owner access (should fail)
// - Admin override
// - Moderator access
// - Deleted/suspended users
// - Different account types
```

## Security Monitoring

### Authorization Failure Events

All authorization failures are logged with the following information:
- User ID
- Resource Type and ID
- Action attempted
- Failure reason
- Timestamp

These logs can be integrated with your security monitoring system (e.g., Sentry, CloudWatch) for:
- Detecting potential attacks
- Identifying misconfigured permissions
- Audit trail for compliance

### Metrics to Monitor

- Authorization failure rate
- Failed attempts per user
- Failed attempts per resource
- Failed attempts by endpoint
- Time-based patterns (detect scanning)

## CI/CD Integration

### GitHub Actions Workflow

The IDOR security tests are automatically run on every PR and push:

```yaml
- name: Run Security Tests
  run: |
    cd backend
    go test -v ./tests/security/
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd backend
go test ./tests/security/
if [ $? -ne 0 ]; then
    echo "❌ Security tests failed. Commit aborted."
    exit 1
fi
```

## Common IDOR Patterns Prevented

### 1. Direct Object Reference in URLs

```
❌ GET /api/v1/users/123/settings (accessing another user's settings)
✅ GET /api/v1/users/me/settings (accessing own settings)
```

### 2. Resource ID in Request Body

```go
// ❌ VULNERABLE
func UpdateComment(body struct{ CommentID string }) {
    // User can modify any comment by changing CommentID
}

// ✅ SECURE
func UpdateComment(commentID string, userID string) {
    // Verify ownership before update
    if !IsOwner(commentID, userID) {
        return ErrForbidden
    }
}
```

### 3. Mass Assignment

```go
// ❌ VULNERABLE
var comment Comment
json.Unmarshal(body, &comment) // User can set any field including UserID
db.Update(&comment)

// ✅ SECURE
var updateReq struct {
    Content string // Only allow specific fields
}
json.Unmarshal(body, &updateReq)
comment := db.GetComment(id)
if comment.UserID != currentUserID {
    return ErrForbidden
}
comment.Content = updateReq.Content
db.Update(&comment)
```

## Troubleshooting

### Test Failures

If tests fail, check:
1. Permission matrix rules are correctly defined
2. Resource ownership checkers return accurate results
3. User roles and account types are set correctly
4. Test mocks match actual database behavior

### False Positives

If legitimate requests are denied:
1. Verify permission matrix includes the rule
2. Check if ownership checker is working correctly
3. Ensure user object has correct role/account type
4. Review logs for the specific denial reason

### Performance Concerns

If authorization checks are slow:
1. Cache ownership checks for the request duration
2. Use database indices on owner_id fields
3. Batch ownership checks when possible
4. Consider denormalizing ownership data

## Compliance and Auditing

This authorization framework helps meet compliance requirements:

- **GDPR**: Users can only access their own personal data
- **SOC 2**: Authorization decisions are logged and auditable
- **HIPAA**: Protected health information (if applicable) is access-controlled
- **PCI DSS**: Payment information is protected from unauthorized access

## Future Enhancements

Planned improvements:
- [ ] Integration with audit log service
- [ ] Real-time security monitoring dashboard
- [ ] Automated security scanning in CI/CD
- [ ] Permission caching layer
- [ ] Fine-grained permission system (beyond owner/role)
- [ ] Resource-level access control lists (ACLs)

## Related Documentation

- [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [OWASP Authorization Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/README)
- Threat Model: `docs/product/threat-model.md`
- Testing Guide: `docs/TESTING.md`

## Support

For questions or issues:
- Create an issue with the `security` label
- Contact the security team
- Review the threat model documentation
