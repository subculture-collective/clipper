# RBAC Moderation Authorization Tests

This document describes the comprehensive RBAC (Role-Based Access Control) authorization tests for the moderation system located in `backend/tests/rbac_moderation_test.go`.

## Overview

These tests validate that the moderation system properly enforces authorization boundaries across different user roles and scopes. The tests ensure that:

- Authorization is properly enforced for all moderation operations
- Role-based permissions are correctly applied
- Scope boundaries prevent unauthorized access
- Permission escalation is prevented
- All error conditions are properly handled

## Test Structure

### Test Roles

The tests validate four distinct user roles:

1. **Admin** (`models.RoleAdmin`)
   - Has unrestricted access to all moderation operations
   - Can moderate any community
   - Can view all logs and bans
   - Highest privilege level

2. **Site Moderator** (`models.AccountTypeModerator` with `models.ModeratorScopeSite`)
   - Can moderate across all communities
   - Cannot escalate privileges
   - Has site-wide scope with no channel restrictions

3. **Community Moderator** (`models.AccountTypeCommunityModerator` with `models.ModeratorScopeCommunity`)
   - Can only moderate assigned channels/communities
   - Scope is limited to specific communities in `ModerationChannels`
   - Cannot access bans in unauthorized communities
   - Must be a member with `CommunityRoleMod` in the community

4. **Regular User** (`models.RoleUser` with `models.AccountTypeMember`)
   - Cannot perform any moderation operations
   - All moderation attempts should return `ErrModerationPermissionDenied`

### Test Coverage Matrix

| Operation | Admin | Site Mod | Community Mod (Authorized) | Community Mod (Unauthorized) | Regular User |
|-----------|-------|----------|---------------------------|------------------------------|--------------|
| Ban User | ✅ | ✅ | ✅ | ❌ | ❌ |
| Unban User | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Bans | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Logs | ✅ | ✅ | ✅ | ❌ | ❌ |

## Test Functions

### Admin Role Tests

#### `TestAdmin_CanBanAnyUser`
Verifies that admins can ban users in any community without restrictions.

**Test Scenarios:**
- Admin bans user in community 1
- Admin bans user in community 2
- Both bans are successful regardless of community

#### `TestAdmin_CanUnbanAnyUser`
Verifies that admins can unban users in any community.

**Test Scenarios:**
- Admin creates a ban
- Admin removes the ban
- Ban is successfully removed

#### `TestAdmin_CanViewAllLogs`
Verifies that admins can view all moderation logs and bans.

**Test Scenarios:**
- Admin creates a ban (generates audit log)
- Admin retrieves all bans
- All bans are visible to admin

### Site Moderator Tests

#### `TestSiteModerator_CanViewAllBans`
Verifies that site moderators can view bans across all communities.

**Test Scenarios:**
- Site moderator creates ban in community 1
- Site moderator views bans in community 1 (sees the ban)
- Site moderator views bans in community 2 (sees no bans)
- Access is granted to both communities

#### `TestSiteModerator_CannotEscalatePrivileges`
Verifies that site moderators cannot grant themselves higher permissions.

**Test Scenarios:**
- Site moderator account type remains `AccountTypeModerator`
- Cannot change to `AccountTypeAdmin`
- Scope remains `ModeratorScopeSite`
- No channel restrictions (empty `ModerationChannels`)

### Community Moderator Tests

#### `TestCommunityModerator_CanOnlyModerateOwnChannels`
Verifies scope enforcement - community moderators can only moderate assigned channels.

**Test Scenarios:**
- Community moderator authorized for community 1
- Can ban user in community 1 ✅
- Cannot ban user in community 2 ❌ (returns `ErrModerationNotAuthorized`)

#### `TestCommunityModerator_CannotSeeOtherChannelBans`
Verifies that community moderators cannot view bans from unauthorized channels.

**Test Scenarios:**
- Site moderator creates ban in community 2
- Community moderator (authorized only for community 1) tries to view bans in community 2
- Access denied with `ErrModerationNotAuthorized`

#### `TestCommunityModerator_ScopeValidationEnforced`
Verifies proper scope validation for community moderators with multiple channels.

**Test Scenarios:**
- Community moderator authorized for communities 1 and 2
- Can moderate community 1 ✅
- Can moderate community 2 ✅
- Cannot moderate community 3 ❌
- `ModerationChannels` contains exactly the authorized channels

### Regular User Tests

#### `TestRegularUser_CannotModerate`
Verifies that regular users cannot perform any moderation operations.

**Test Scenarios:**
- Regular user cannot ban (returns `ErrModerationPermissionDenied`)
- Regular user cannot unban (returns `ErrModerationPermissionDenied`)
- Regular user cannot view bans (returns `ErrModerationPermissionDenied`)

### Permission Escalation Prevention Tests

#### `TestPreventPermissionEscalation_CannotModifyOtherModsBans`
Verifies that moderators can work with bans created by other moderators in the same scope.

**Test Scenarios:**
- Community moderator 1 creates a ban
- Community moderator 2 (same scope) can view the ban
- Community moderator 2 can unban (same scope allows cooperation)

**Note:** Moderators with the same scope can unban users banned by other moderators. This is expected behavior for team-based moderation.

#### `TestPreventPermissionEscalation_CannotGrantHigherPermissions`
Verifies that moderators cannot grant themselves or others higher permissions.

**Test Scenarios:**
- Community moderator cannot grant site moderator permissions
- Community moderator has limited permission set:
  - ✅ Has: `PermissionCommunityModerate`
  - ✅ Has: `PermissionModerateUsers`
  - ✅ Has: `PermissionViewChannelAnalytics`
  - ✅ Has: `PermissionManageModerators`
  - ❌ Does NOT have: `PermissionModerateContent`
  - ❌ Does NOT have: `PermissionCreateDiscoveryLists`
  - ❌ Does NOT have: `PermissionManageUsers`
  - ❌ Does NOT have: `PermissionManageSystem`

### Comprehensive Endpoint Tests

#### `TestAllModerationEndpoints_WithDifferentRoles`
Tests all moderation endpoints with each role to ensure comprehensive coverage.

**Operations Tested:**
- `BanUser`
- `GetBans`
- `UnbanUser`

**For Each Operation:**
- Admin ✅
- Site Moderator ✅
- Community Moderator ✅
- Regular User ❌

### Error Checking Tests

#### `TestComprehensiveErrorChecking`
Validates that appropriate errors are returned for various failure scenarios.

**Test Scenarios:**
- Permission denied returns `ErrModerationPermissionDenied`
- Not authorized returns `ErrModerationNotAuthorized`
- Cannot ban owner returns `ErrModerationCannotBanOwner`
- Unban non-banned user returns `ErrModerationNotBanned`

## Running the Tests

### Prerequisites

1. Start test infrastructure:
```bash
docker compose -f docker-compose.test.yml up -d
```

2. Run migrations:
```bash
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up
```

### Run All RBAC Moderation Tests

```bash
cd backend
go test -v -tags=integration ./tests/rbac_moderation_test.go
```

### Run Specific Test

```bash
cd backend
go test -v -tags=integration ./tests/rbac_moderation_test.go -run TestAdmin_CanBanAnyUser
```

### Run with Coverage

```bash
cd backend
go test -v -tags=integration -coverprofile=coverage.out ./tests/rbac_moderation_test.go
go tool cover -html=coverage.out -o coverage.html
```

## Error Types

The tests validate the following error types from the moderation service:

- `ErrModerationPermissionDenied` - User lacks basic moderation permissions
- `ErrModerationNotAuthorized` - User not authorized for specific community scope
- `ErrModerationCannotBanOwner` - Attempted to ban a community owner
- `ErrModerationNotBanned` - Attempted to unban a user who is not banned
- `ErrModerationCommunityNotFound` - Community does not exist
- `ErrModerationUserNotFound` - User does not exist

## Key Implementation Details

### Scope Validation

Community moderators have their authorized communities stored in `User.ModerationChannels`:
```go
type User struct {
    // ...
    ModeratorScope     string      // "site" or "community"
    ModerationChannels []uuid.UUID // List of authorized community IDs
    // ...
}
```

The service validates scope through two checks:
1. **Permission Check** (`validateModerationPermission`) - Does user have basic moderation rights?
2. **Scope Check** (`validateModerationScope`) - Is user authorized for this specific community?

### Permission Matrix

Permissions are defined by `AccountType`:

```go
// Community Moderator permissions (exactly 4)
PermissionCommunityModerate    = "community:moderate"
PermissionModerateUsers        = "moderate:users"
PermissionViewChannelAnalytics = "view:channel_analytics"
PermissionManageModerators     = "manage:moderators"
```

## Test Data Cleanup

All tests properly clean up test data to avoid conflicts:

1. Bans are deleted from `community_bans`
2. Community members are removed from `community_members`
3. Communities are deleted from `communities`
4. Users are cleaned up using `testutil.CleanupTestUser`

This ensures each test runs in isolation without side effects.

## Maintenance

When adding new moderation operations:

1. Add test cases to `TestAllModerationEndpoints_WithDifferentRoles`
2. Verify scope validation for community moderators
3. Test error conditions in `TestComprehensiveErrorChecking`
4. Update this documentation with new test scenarios

## Related Files

- `backend/internal/services/moderation_service.go` - Moderation service implementation
- `backend/internal/models/roles.go` - Role and permission definitions
- `backend/tests/integration/moderation/moderation_integration_test.go` - Additional moderation tests
- `backend/tests/integration/rbac/rbac_endpoints_test.go` - RBAC endpoint tests

## Success Criteria

All tests should pass with:
- ✅ No scope breaches found
- ✅ Authorization properly enforced
- ✅ All permission boundaries respected
- ✅ Comprehensive error checking validated
- ✅ All role combinations tested
