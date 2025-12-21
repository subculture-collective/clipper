# Integration Test Compilation Fix Guide

**Status**: 2 of 7 files fixed (29% complete)  
**Date**: December 21, 2025

## Overview

This guide documents the fixes applied to integration tests and provides patterns for fixing the remaining files. The core issues were API mismatches between test code and actual implementation.

## Root Causes Identified

### 1. Redis Config Type Mismatch ✅ FIXED GLOBALLY
**Problem**: Tests used `redispkg.Config` which doesn't exist  
**Solution**: Use `config.RedisConfig` instead  
**Status**: Fixed in all 7 test files

```go
// WRONG
Redis: redispkg.Config{
    Host: "localhost",
    Port: "6380",
}

// CORRECT
Redis: config.RedisConfig{
    Host: "localhost",
    Port: "6380",
}
```

### 2. User Creation API Mismatch ⚠️ PARTIALLY FIXED
**Problem**: Tests called `userRepo.CreateUser(ctx, map[string]interface{})` which doesn't exist  
**Solution**: Use `userRepo.Create(ctx, *models.User)` with proper User struct  
**Status**: Fixed in 2 files, needs fixing in 5 files

```go
// WRONG
testUser := map[string]interface{}{
    "twitch_id": "test123",
    "username": "testuser",
    // ...
}
user, err := userRepo.CreateUser(ctx, testUser)

// CORRECT - Use helper function
user := testutil.CreateTestUser(t, db, "testuser")

// Or manually:
avatarURL := "https://example.com/avatar.png"
email := "test@example.com"
bio := "Test bio"
lastLoginAt := time.Now()

user := &models.User{
    ID:          uuid.New(),
    TwitchID:    "test123",
    Username:    "testuser",
    DisplayName: "Test User",
    AvatarURL:   &avatarURL,  // Pointer!
    Email:       &email,      // Pointer!
    Bio:         &bio,        // Pointer!
    Role:        "user",
    LastLoginAt: &lastLoginAt, // Pointer!
}
err := userRepo.Create(ctx, user)
```

**Important**: Several User fields are pointers:
- `Email *string`
- `AvatarURL *string`
- `Bio *string`
- `LastLoginAt *time.Time`
- `TrustScoreUpdatedAt *time.Time`
- `AccountTypeUpdatedAt *time.Time`
- Other optional fields

### 3. Token Generation API Mismatch ⚠️ PARTIALLY FIXED
**Problem**: Tests called `authService.GenerateTokens(ctx, userID)` which doesn't exist  
**Solution**: Use JWT manager directly via helper function  
**Status**: Fixed in 2 files, needs fixing in 5 files

```go
// WRONG
token, _, err := authService.GenerateTokens(ctx, user.ID)
require.NoError(t, err)

// CORRECT - Use helper function
accessToken, refreshToken := testutil.GenerateTestTokens(t, jwtManager, user.ID, "user")

// Or manually:
accessToken, err := jwtManager.GenerateAccessToken(user.ID, user.Role)
require.NoError(t, err)
refreshToken, err := jwtManager.GenerateRefreshToken(user.ID)
require.NoError(t, err)
```

## Helper Functions Created

### Location: `backend/tests/integration/testutil/helpers.go`

#### 1. CreateTestUser
Creates a test user with proper field types:

```go
user := testutil.CreateTestUser(t, db, "username")
// Returns *models.User with all required fields set
```

#### 2. GenerateTestTokens
Generates JWT access and refresh tokens:

```go
accessToken, refreshToken := testutil.GenerateTestTokens(t, jwtManager, userID, "user")
// Returns both tokens as strings
```

## Files Fixed (2/7)

### ✅ auth/auth_integration_test.go
**Status**: 100% fixed, compiles successfully

**Changes Applied**:
1. ✅ Fixed Redis config type
2. ✅ Fixed user creation (3 occurrences)
3. ✅ Fixed token generation (3 occurrences)
4. ✅ Updated function signatures to return jwtManager
5. ✅ Removed unused imports

**Pattern Used**:
```go
// Setup function returns jwtManager instead of authService
func setupTestRouter(t *testing.T) (*gin.Engine, *services.AuthService, *database.DB, *redispkg.Client, *jwtpkg.Manager)

// Test functions use helpers
user := testutil.CreateTestUser(t, db, "testuser")
token, _ := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)
```

### ✅ submissions/submission_integration_test.go
**Status**: 100% fixed, compiles successfully

**Changes Applied**:
1. ✅ Fixed Redis config type
2. ✅ Fixed user creation (1 occurrence in setup)
3. ✅ Fixed token generation (2 occurrences)
4. ✅ Updated function signatures to return jwtManager
5. ✅ Fixed err variable declarations
6. ✅ Removed unused imports
7. ✅ Commented out non-existent CreateClip route

**Pattern Used**:
```go
// Setup function creates user and returns jwtManager
func setupSubmissionTestRouter(t *testing.T) (*gin.Engine, *jwtpkg.Manager, *database.DB, *redispkg.Client, uuid.UUID)

// Returns user.ID for tests to use
username := fmt.Sprintf("subuser%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
return r, jwtManager, db, redisClient, user.ID
```

## Files Needing Fixes (5/7)

### ⚠️ submissions/submission_repository_test.go
**Estimated Effort**: 30-45 minutes

**Known Issues to Fix**:
- Check if it uses `redispkg.Config` (likely already fixed by global fix)
- Check for `CreateUser` calls - replace with testutil helper
- Check for `GenerateTokens` calls - replace with testutil helper

### ⚠️ engagement/engagement_integration_test.go
**Estimated Effort**: 45-60 minutes

**Known Issues to Fix**:
- ✅ Redis config (already fixed globally)
- ❌ `userRepo.CreateUser()` calls - needs fixing
- ❌ `authService.GenerateTokens()` calls - needs fixing

**Search Results Show**:
```bash
tests/integration/engagement/engagement_integration_test.go:user, err := userRepo.CreateUser(ctx, testUser)
tests/integration/engagement/engagement_integration_test.go:accessToken, _, err := authService.GenerateTokens(ctx, userID)
tests/integration/engagement/engagement_integration_test.go:accessToken, _, err := authService.GenerateTokens(ctx, userID)
```

### ⚠️ premium/premium_integration_test.go
**Estimated Effort**: 45-60 minutes

**Known Issues to Fix**:
- ✅ Redis config (already fixed globally)
- ❌ `userRepo.CreateUser()` calls - needs fixing
- ❌ `authService.GenerateTokens()` calls - needs fixing

**Search Results Show**:
```bash
tests/integration/premium/premium_integration_test.go:user, err := userRepo.CreateUser(ctx, testUser)
tests/integration/premium/premium_integration_test.go:accessToken, _, err := authService.GenerateTokens(ctx, userID)
tests/integration/premium/premium_integration_test.go:accessToken, _, err := authService.GenerateTokens(ctx, userID)
```

### ⚠️ search/search_integration_test.go
**Estimated Effort**: 30-45 minutes

**Known Issues to Fix**:
- ✅ Redis config (already fixed globally)
- Verify if it has user creation or token generation (may not need fixes)

### ⚠️ api/api_integration_test.go
**Estimated Effort**: 30-45 minutes

**Known Issues to Fix**:
- ✅ Redis config (already fixed globally)
- Verify if it has user creation or token generation (may not need fixes)

## Step-by-Step Fix Process

For each remaining test file, follow this process:

### Step 1: Search for Issues
```bash
cd backend
grep -n "CreateUser\|GenerateTokens" tests/integration/<dir>/<file>.go
```

### Step 2: Fix User Creation
Replace all occurrences of:
```go
testUser := map[string]interface{}{...}
user, err := userRepo.CreateUser(ctx, testUser)
```

With:
```go
user := testutil.CreateTestUser(t, db, "username")
```

Or if setup function needs it:
```go
username := fmt.Sprintf("prefix%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
```

### Step 3: Fix Token Generation
Replace all occurrences of:
```go
token, _, err := authService.GenerateTokens(ctx, userID)
```

With:
```go
accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, userID, "user")
```

### Step 4: Update Function Signatures
If setup function returns authService, consider returning jwtManager instead:

```go
// Before
func setupTestRouter(t *testing.T) (*gin.Engine, *services.AuthService, *database.DB, *redispkg.Client)

// After
func setupTestRouter(t *testing.T) (*gin.Engine, *jwtpkg.Manager, *database.DB, *redispkg.Client)
```

And update the return statement:
```go
return r, jwtManager, db, redisClient
```

### Step 5: Fix Test Function Calls
Update test functions that call setup:

```go
// Before
router, authService, db, redisClient := setupTestRouter(t)

// After
router, jwtManager, db, redisClient := setupTestRouter(t)
```

### Step 6: Remove Unused Imports
Remove these if no longer used:
- `"context"` - if not using ctx anywhere
- `"github.com/google/uuid"` - if not manually creating UUIDs
- Other unused imports

### Step 7: Fix Variable Declarations
Ensure all variables are properly declared:
```go
// Wrong
err = json.Unmarshal(...)  // err not declared

// Right
err := json.Unmarshal(...)
```

### Step 8: Compile Test
```bash
cd backend
go test -tags=integration -c ./tests/integration/<dir>/... 2>&1
```

### Step 9: Fix Compilation Errors
Address any compilation errors that appear. Common issues:
- Unused imports
- Undefined variables
- Type mismatches
- Missing methods

## Testing Validation

### Compile All Tests
```bash
cd backend
go test -tags=integration -c ./tests/integration/auth/...
go test -tags=integration -c ./tests/integration/submissions/...
go test -tags=integration -c ./tests/integration/engagement/...
go test -tags=integration -c ./tests/integration/premium/...
go test -tags=integration -c ./tests/integration/search/...
go test -tags=integration -c ./tests/integration/api/...
```

### Run Tests (After Compilation Fixes)
```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Run all integration tests
make test-integration

# Or run individual test suites
make test-integration-auth
make test-integration-submissions
make test-integration-engagement
make test-integration-premium
make test-integration-search
make test-integration-api
```

## Expected Timeline

- **Remaining Files**: 5 files
- **Estimated Time**: 2.5-4 hours
- **Per File Average**: 30-45 minutes

## Success Criteria

- [ ] All 7 test files compile without errors
- [ ] No unused import warnings
- [ ] All tests use helper functions consistently
- [ ] Integration test suite runs successfully
- [ ] 90%+ tests pass (some may need runtime fixes)

## Common Pitfalls

1. **Forgetting Pointer Fields**: User model fields like Email, AvatarURL must be pointers
2. **Unused Imports**: Remember to remove context, uuid if not used
3. **Variable Scope**: Declare err with `:=` in nested scopes
4. **Function Signatures**: Update both function definition and call sites
5. **Setup Return Values**: Keep order consistent when adding jwtManager

## Reference Files

Use these as templates for fixes:
- ✅ `auth/auth_integration_test.go` - Best example, fully fixed
- ✅ `submissions/submission_integration_test.go` - Setup with user creation
- ✅ `testutil/helpers.go` - Helper functions

## Additional Resources

- **User Model**: `backend/internal/models/models.go` - See User struct definition
- **JWT Manager**: `backend/pkg/jwt/jwt.go` - See token generation methods
- **Repository**: `backend/internal/repository/user_repository.go` - See Create method
- **Auth Service**: `backend/internal/services/auth_service.go` - See available methods

---

**Last Updated**: December 21, 2025  
**Progress**: 2/7 files fixed (29%)  
**Next File**: engagement/engagement_integration_test.go
