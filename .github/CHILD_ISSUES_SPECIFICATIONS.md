# Child Issues for Voluntary Ban Sync & Community Moderation System

This document contains specifications for all 38 child issues. Each can be created as a separate GitHub issue using the template provided.

---

## EPIC 1: Permission Model Enhancement (P1) - 12-16 hours

### Issue #TBD-1: Add Community Moderator Role to Permission Model
**Effort:** 4-6 hours
**Priority:** P0
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P0

**Description:**
Extend the existing role system to support community moderators (channel-scoped) in addition to the current role hierarchy. Community moderators have permissions limited to their assigned channel(s) only.

**Acceptance Criteria:**
- [ ] Add `AccountTypeCommunityModerator = "community_moderator"` constant
- [ ] Update `IsValidAccountType()` to accept community_moderator
- [ ] Community moderators appear in role/permission hierarchy documentation
- [ ] Existing tests still pass
- [ ] No breaking changes to role validation

**Implementation Details:**
1. Open `/backend/internal/models/roles.go`
2. Add new account type constant after `AccountTypeModerator`:
   ```go
   AccountTypeCommunityModerator = "community_moderator"
   ```
3. Update `IsValidAccountType()` switch statement
4. Update `accountTypePermissions` map (placeholder, detailed in next issue)
5. Add migration guide in comments

**Testing:**
- [ ] Unit test: `TestIsValidAccountType()` includes community_moderator
- [ ] Unit test: community_moderator is recognized as valid
- [ ] Unit test: Unknown types default appropriately

**Definition of Done:**
- Code compiles without warnings
- All existing tests pass
- New constant used consistently
- Documentation updated

---

### Issue #TBD-2: Add Community Moderation Permissions
**Effort:** 4-6 hours
**Priority:** P0
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P0

**Description:**
Define granular permissions for community moderators and integrate with permission system. Community moderators have scoped permissions limited to their assigned channel(s).

**Acceptance Criteria:**
- [ ] New permission constants defined:
  - `PermissionCommunityModerate` = "community:moderate"
  - `PermissionModerateUsers` = "moderate:users" (already exists, community mods can use)
  - `PermissionViewChannelAnalytics` = "view:channel_analytics"
  - `PermissionManageModerators` = "manage:moderators"
- [ ] Community moderators have exactly these 4 permissions
- [ ] Permissions are properly scoped (field on User model added in next issue)
- [ ] Permission hierarchy documented
- [ ] Existing tests still pass

**Implementation Details:**
1. Add new permission constants to `roles.go`
2. Update `accountTypePermissions` map:
   ```go
   AccountTypeCommunityModerator: {
       PermissionCreateSubmission,
       PermissionCreateComment,
       PermissionCreateVote,
       PermissionCreateFollow,
       PermissionCommunityModerate,
       PermissionModerateUsers,
       PermissionViewChannelAnalytics,
       PermissionManageModerators,
   },
   ```
3. Document permission hierarchy in code comments
4. Update permission level documentation

**Testing:**
- [ ] Unit test: community_moderator permissions returned correctly
- [ ] Unit test: admin has all permissions including community permissions
- [ ] Unit test: regular users cannot access community:moderate permission
- [ ] Integration test: permission checking with mocked database

**Definition of Done:**
- All permission constants defined
- Mapping complete and tested
- No duplicate permissions
- Permission levels make sense

---

### Issue #TBD-3: Extend User Model for Moderator Metadata
**Effort:** 2-3 hours
**Priority:** P0
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P0

**Description:**
Add fields to User model to track moderator scope and metadata. This enables distinguishing between global and channel-scoped moderation.

**Acceptance Criteria:**
- [ ] New fields added to User struct:
  - `ModeratorScope` (string: "site" or "community" - required if community_moderator)
  - `ModerationChannels` ([]uuid.UUID - channels user moderates, nil for site mods)
  - `ModerationStartedAt` (*time.Time - when moderation role granted)
- [ ] Database migration creates new columns (handled in EPIC 2)
- [ ] Fields properly tagged with db and json tags
- [ ] Validation logic added for moderator scope
- [ ] Existing tests pass

**Implementation Details:**
1. Open `/backend/internal/models/models.go`
2. Add to User struct after AccountType fields:
   ```go
   ModeratorScope string     `json:"moderator_scope,omitempty" db:"moderator_scope"`
   ModerationChannels []uuid.UUID `json:"moderation_channels,omitempty" db:"moderation_channels"`
   ModerationStartedAt *time.Time `json:"moderation_started_at,omitempty" db:"moderation_started_at"`
   ```
3. Add validation helper method:
   ```go
   func (u *User) IsValidModerator() bool { ... }
   ```

**Testing:**
- [ ] Unit test: moderator scope validated
- [ ] Unit test: channel list validated for community mods
- [ ] Unit test: site mods have empty channel list
- [ ] Unit test: JSON marshaling works correctly

**Definition of Done:**
- All fields present with proper tags
- Validation logic works
- No compilation errors
- Tests passing

---

### Issue #TBD-4: Create Permission Checking Middleware
**Effort:** 2-3 hours
**Priority:** P0
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P0

**Description:**
Implement middleware for checking permissions, including scope validation for community moderators. Used in all moderation endpoints.

**Acceptance Criteria:**
- [ ] Middleware function: `RequirePermission(permission string) middleware.Handler`
- [ ] Middleware checks user has permission
- [ ] Middleware checks scope (community mods limited to their channels)
- [ ] Returns 403 Forbidden for missing permissions
- [ ] Returns 401 Unauthorized for unauthenticated users
- [ ] Logs all permission checks (info level)
- [ ] Logs permission denials (warn level)

**Implementation Details:**
1. Create `/backend/internal/middleware/permission.go`
2. Implement `RequirePermission` function
3. Validate user.Can(permission)
4. For community moderators, validate channel scope
5. Add audit logging

**Testing:**
- [ ] Unit test: admin can access any permission
- [ ] Unit test: community mod denied access to other channels
- [ ] Unit test: unauthenticated user gets 401
- [ ] Unit test: user without permission gets 403
- [ ] Integration test: middleware applied to handlers

**Definition of Done:**
- Middleware compiles and works
- All test cases pass
- Error responses correct
- Logging working

---

## EPIC 2: Database Schema & Models (P1) - 16-20 hours

### Issue #TBD-5: Create Community Moderators Table & Migration
**Effort:** 3-4 hours
**Priority:** P0
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P0

**Description:**
Create database table tracking community moderators and their channel assignments. This is the primary table for managing moderator roles.

**Acceptance Criteria:**
- [ ] Migration file created: `migrations/XXXXXXX_create_community_moderators.sql`
- [ ] Table `community_moderators` created with columns:
  - `id` (UUID, PK)
  - `user_id` (UUID, FK users)
  - `channel_id` (UUID, FK chat_channels)
  - `granted_by` (UUID, FK users - who made them mod)
  - `granted_at` (TIMESTAMP)
  - `revoked_at` (TIMESTAMP NULL)
  - `reason` (TEXT - why they're a moderator)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)
- [ ] Unique constraint: (user_id, channel_id) - one mod per channel per user
- [ ] Indexes created for performance queries
- [ ] Rollback migration verified

**Migration SQL:**
```sql
CREATE TABLE community_moderators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL,
    granted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    granted_at TIMESTAMP NOT NULL DEFAULT now(),
    revoked_at TIMESTAMP,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(user_id, channel_id)
);
CREATE INDEX idx_community_moderators_user ON community_moderators(user_id);
CREATE INDEX idx_community_moderators_channel ON community_moderators(channel_id);
CREATE INDEX idx_community_moderators_active ON community_moderators(revoked_at)
    WHERE revoked_at IS NULL;
```

**Testing:**
- [ ] Migration up applies cleanly
- [ ] Migration down (rollback) works
- [ ] Table structure verified with psql
- [ ] Constraints enforced (UNIQUE, FKs)
- [ ] Indexes created

**Definition of Done:**
- Migration file committed
- Rollback tested
- No data loss on rollback
- Constraints verified

---

### Issue #TBD-6: Create Twitch Bans Sync Table & Migration
**Effort:** 3-4 hours
**Priority:** P0
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P0

**Description:**
Create table to store synced ban data from Twitch API. Tracks which users are banned from which channels and metadata about the ban.

**Acceptance Criteria:**
- [ ] Migration file created: `migrations/XXXXXXX_create_twitch_bans.sql`
- [ ] Table `twitch_bans` created with columns:
  - `id` (UUID, PK)
  - `channel_id` (UUID, FK)
  - `banned_user_id` (UUID, FK users)
  - `reason` (TEXT)
  - `banned_at` (TIMESTAMP)
  - `expires_at` (TIMESTAMP NULL - permanent if NULL)
  - `synced_from_twitch` (BOOLEAN - was this synced from Twitch API)
  - `twitch_ban_id` (TEXT - Twitch's ID for the ban)
  - `last_synced_at` (TIMESTAMP)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)
- [ ] Unique constraint: (channel_id, banned_user_id, expires_at) with partial index
- [ ] Indexes for common queries
- [ ] Rollback migration tested

**Migration SQL:**
```sql
CREATE TABLE twitch_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL,
    banned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    banned_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    synced_from_twitch BOOLEAN DEFAULT false,
    twitch_ban_id TEXT,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(channel_id, banned_user_id)
        WHERE expires_at IS NULL OR expires_at > now()
);
CREATE INDEX idx_twitch_bans_channel ON twitch_bans(channel_id);
CREATE INDEX idx_twitch_bans_user ON twitch_bans(banned_user_id);
CREATE INDEX idx_twitch_bans_active ON twitch_bans(expires_at)
    WHERE expires_at IS NULL OR expires_at > now();
```

**Testing:**
- [ ] Migration up applies cleanly
- [ ] Migration down works correctly
- [ ] Table structure verified
- [ ] Unique constraint prevents duplicates
- [ ] Indexes created for performance

**Definition of Done:**
- Migration committed
- Rollback tested
- Constraints working
- Performance indexes present

---

### Issue #TBD-7: Create Moderation Audit Logs Table & Migration
**Effort:** 3-4 hours
**Priority:** P0
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P0

**Description:**
Create audit log table to track all moderation actions for compliance and accountability.

**Acceptance Criteria:**
- [ ] Migration file created: `migrations/XXXXXXX_create_moderation_audit_logs.sql`
- [ ] Table `moderation_audit_logs` created with columns:
  - `id` (UUID, PK)
  - `actor_id` (UUID, FK users - who took the action)
  - `action` (VARCHAR(50) - ban, unban, sync, etc.)
  - `target_user_id` (UUID, FK users NULL - who action affects)
  - `channel_id` (UUID NULL - which channel)
  - `reason` (TEXT)
  - `metadata` (JSONB - action-specific data)
  - `ip_address` (INET)
  - `user_agent` (TEXT)
  - `created_at` (TIMESTAMP)
- [ ] Indexes for audit log queries
- [ ] Partitioning or archival plan (future)
- [ ] Rollback migration tested

**Migration SQL:**
```sql
CREATE TABLE moderation_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    channel_id UUID,
    reason TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_actor ON moderation_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON moderation_audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_channel ON moderation_audit_logs(channel_id);
CREATE INDEX idx_audit_logs_action ON moderation_audit_logs(action);
CREATE INDEX idx_audit_logs_created ON moderation_audit_logs(created_at DESC);
```

**Testing:**
- [ ] Migration applies cleanly
- [ ] Rollback works
- [ ] Table structure correct
- [ ] Indexes created

**Definition of Done:**
- Migration committed
- Rollback verified
- Audit logging ready

---

### Issue #TBD-8: Create Channel Moderators Association Table
**Effort:** 2-3 hours
**Priority:** P0
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P0

**Description:**
Create junction table linking chat channels to their moderators. Enables efficient querying of "who moderates this channel" and "what channels does this user moderate".

**Acceptance Criteria:**
- [ ] Migration file created: `migrations/XXXXXXX_create_channel_moderators.sql`
- [ ] Table `channel_moderators` created with:
  - `id` (UUID, PK)
  - `channel_id` (UUID, FK)
  - `moderator_id` (UUID, FK users)
  - `is_active` (BOOLEAN)
  - `created_at` (TIMESTAMP)
- [ ] Unique constraint: (channel_id, moderator_id)
- [ ] Indexes for efficient queries
- [ ] Rollback tested

**Testing:**
- [ ] Migration applies
- [ ] Rollback works
- [ ] Constraints enforced

**Definition of Done:**
- Migration committed
- Constraints working
- Indexes present

---

### Issue #TBD-9: Add Database Indexes for Performance
**Effort:** 2-3 hours
**Priority:** P1
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P1

**Description:**
Create additional indexes for common query patterns on moderation tables.

**Acceptance Criteria:**
- [ ] Index on `community_moderators(user_id, revoked_at)` for active mods
- [ ] Index on `twitch_bans(channel_id, banned_user_id)` for ban lookups
- [ ] Index on `moderation_audit_logs(created_at DESC)` for recent actions
- [ ] Index on `moderation_audit_logs(actor_id, created_at)` for user activity
- [ ] All queries use indexes appropriately (verified with EXPLAIN)

**Testing:**
- [ ] Migration applies
- [ ] Index performance verified
- [ ] Query plans use indexes

**Definition of Done:**
- Indexes created
- Query performance verified

---

### Issue #TBD-10: Write Migration Testing & Rollback Tests
**Effort:** 3-4 hours
**Priority:** P0
**Phase:** 1
**Labels:** epic:moderation, kind:feature, area:backend, phase/1, priority/P0

**Description:**
Create comprehensive tests for all migration scripts, including forward and rollback scenarios.

**Acceptance Criteria:**
- [ ] Create `backend/tests/migrations/moderation_migrations_test.go`
- [ ] Test forward migration: tables created with correct schema
- [ ] Test rollback migration: tables dropped cleanly
- [ ] Test constraints: UNIQUE, FK, NOT NULL enforced
- [ ] Test data integrity: no data loss on rollback
- [ ] Test indexes: present and used correctly
- [ ] All tests pass with 100% coverage of migration logic

**Testing:**
- [ ] Run migrations forward
- [ ] Verify schema with SQL queries
- [ ] Rollback migrations
- [ ] Verify schema restored
- [ ] No orphaned objects

**Definition of Done:**
- All migration tests passing
- Coverage > 95%
- No data corruption

---

## EPIC 3: Backend Services (P1) - 40-50 hours

### Issue #TBD-11: Implement TwitchBanSyncService
**Effort:** 12-16 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Implement service to fetch banned users from Twitch API and sync to local database. Handles OAuth, API calls, error recovery, and batch processing.

**Acceptance Criteria:**
- [ ] Service struct created: `TwitchBanSyncService`
- [ ] Method `SyncChannelBans(ctx context.Context, userID, channelID string) error`
- [ ] Validates user owns channel via Twitch OAuth
- [ ] Fetches bans from Twitch `GET /moderation/banned` endpoint
- [ ] Handles pagination for large ban lists
- [ ] Stores bans in `twitch_bans` table
- [ ] Implements exponential backoff for rate limiting (429 responses)
- [ ] Logs all operations and errors
- [ ] Returns meaningful error messages
- [ ] Handles network failures with retry logic
- [ ] Atomic database writes (all or nothing)
- [ ] No breaking changes to existing code

**Implementation Details:**
```go
type TwitchBanSyncService struct {
    twitchClient *twitch.Client
    db *pgx.Conn
    logger *slog.Logger
}

func (s *TwitchBanSyncService) SyncChannelBans(
    ctx context.Context, userID, broadcastID string
) (int, error) { ... }
```

**Error Handling:**
- [ ] TwitchAPIError - handle API failures
- [ ] RateLimitError - retry with backoff
- [ ] DatabaseError - rollback transaction
- [ ] AuthenticationError - user not authenticated
- [ ] AuthorizationError - user doesn't own channel

**Testing:**
- [ ] Unit test: mock Twitch API responses
- [ ] Unit test: pagination handling
- [ ] Unit test: error handling (all error types)
- [ ] Unit test: rate limit backoff
- [ ] Integration test: real database, mocked API
- [ ] Integration test: database state after sync
- [ ] Test large ban lists (1000+ bans)

**Definition of Done:**
- Service implemented and tested
- Twitch API integration working
- Error handling comprehensive
- Logging complete
- Code reviewed and approved

---

### Issue #TBD-12: Implement ModerationService
**Effort:** 12-16 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Implement core moderation operations: banning, unbanning, and managing bans. Includes permission checks and audit logging.

**Acceptance Criteria:**
- [ ] Service struct: `ModerationService`
- [ ] Method `BanUser(ctx context.Context, req BanRequest) error`
  - Validates moderator has permission
  - Checks moderator scope (community vs site)
  - Creates ban record
  - Logs audit event
  - Returns descriptive errors
- [ ] Method `UnbanUser(ctx context.Context, banID string, moderatorID string) error`
  - Validates permission
  - Removes ban record
  - Logs unban action
- [ ] Method `GetBan(ctx context.Context, banID string) (*Ban, error)`
  - With permission checking
- [ ] Method `ListBans(ctx context.Context, filter BanFilter) ([]*Ban, error)`
  - Scoped to moderator's channels
  - Supports pagination
  - Supports filtering (by user, channel, date, etc.)
- [ ] Transaction support for atomic operations
- [ ] Audit logging for all operations
- [ ] Comprehensive error handling
- [ ] No breaking changes

**Error Handling:**
- [ ] UnauthorizedError - user not authenticated
- [ ] ForbiddenError - user lacks permission
- [ ] ScopeError - user trying to access outside channels
- [ ] NotFoundError - ban not found
- [ ] InvalidError - invalid input data

**Testing:**
- [ ] Unit test: ban creation with all scenarios
- [ ] Unit test: permission checking
- [ ] Unit test: scope validation
- [ ] Unit test: unban operation
- [ ] Integration test: database transactions
- [ ] Integration test: audit logging
- [ ] Test pagination in list operations

**Definition of Done:**
- Service fully functional
- All tests passing
- Error handling complete
- Audit logging working

---

### Issue #TBD-13: Implement AuditLogService
**Effort:** 8-10 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Implement service for logging and querying all moderation actions. Provides audit trail for compliance.

**Acceptance Criteria:**
- [ ] Service struct: `AuditLogService`
- [ ] Method `LogAction(ctx context.Context, log AuditLog) error`
  - Stores action in audit_logs table
  - Captures: actor, action, target, reason, metadata
  - Captures: IP address, user agent
  - Timestamp automatic
- [ ] Method `GetLog(ctx context.Context, logID string) (*AuditLog, error)`
- [ ] Method `QueryLogs(ctx context.Context, query QueryLogs) ([]*AuditLog, error)`
  - Filter by: actor_id, action, target_user_id, channel_id, date range
  - Pagination support
  - Sorting options
- [ ] Data retention policy enforced (60+ days)
- [ ] Query performance optimized
- [ ] Secure - cannot delete logs, only archive
- [ ] Comprehensive error handling

**Testing:**
- [ ] Unit test: log creation
- [ ] Unit test: querying with various filters
- [ ] Integration test: database persistence
- [ ] Performance test: large query results

**Definition of Done:**
- Service working end-to-end
- All tests passing
- Query performance acceptable

---

### Issue #TBD-14: Implement PermissionCheckService
**Effort:** 4-6 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Implement service to validate moderator permissions, including scope checking for channel-specific operations.

**Acceptance Criteria:**
- [ ] Service struct: `PermissionCheckService`
- [ ] Method `CanBan(ctx context.Context, moderatorID, targetUserID, channelID string) bool`
  - Returns true if moderator can ban user
  - Checks role and permissions
  - Checks scope (community mods)
  - Prevents self-banning
- [ ] Method `CanUnban(ctx context.Context, moderatorID, banID string) bool`
- [ ] Method `CanModerate(ctx context.Context, moderatorID, channelID string) bool`
- [ ] Method `CanViewAuditLogs(ctx context.Context, userID string) bool`
- [ ] Method `GetModeratorChannels(ctx context.Context, userID string) ([]string, error)`
  - Returns list of channels user moderates
  - Returns empty for non-moderators
  - Site mods get all channels
- [ ] Proper error handling and logging
- [ ] Caching for performance (optional)

**Testing:**
- [ ] Unit test: admin can do anything
- [ ] Unit test: community mod scope checked
- [ ] Unit test: regular user cannot ban
- [ ] Test permission hierarchies

**Definition of Done:**
- Service working
- All tests passing
- Permission logic correct

---

### Issue #TBD-15: Add Service Layer Unit Tests
**Effort:** 4-6 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Create comprehensive unit tests for all backend services.

**Acceptance Criteria:**
- [ ] Create `backend/internal/services/moderation_test.go`
- [ ] Test all public methods of ModerationService
- [ ] Test all public methods of TwitchBanSyncService
- [ ] Test all public methods of AuditLogService
- [ ] Test all public methods of PermissionCheckService
- [ ] Mock external dependencies (database, Twitch API)
- [ ] Test error conditions and edge cases
- [ ] Code coverage > 85% for services
- [ ] All tests pass
- [ ] No flaky tests

**Testing:**
- [ ] Run test suite
- [ ] Check coverage report
- [ ] Run tests multiple times for flakiness

**Definition of Done:**
- All tests passing
- Coverage acceptable
- No flaky tests

---

## EPIC 4: API Endpoints & Handlers (P1) - 32-40 hours

### Issue #TBD-16: Implement Twitch Ban Sync Endpoint
**Effort:** 6-8 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Create API endpoint to initiate ban synchronization from Twitch API.

**Acceptance Criteria:**
- [ ] Endpoint: `POST /api/v1/moderation/sync-bans`
- [ ] Request body:
  ```json
  {
    "channel_id": "uuid",
    "force_refresh": false
  }
  ```
- [ ] Response:
  ```json
  {
    "synced_count": 42,
    "existing_count": 5,
    "timestamp": "2026-01-07T12:34:56Z"
  }
  ```
- [ ] Authentication required
- [ ] Authorization: user must own channel or be site admin
- [ ] Rate limiting: 1 request per channel per minute
- [ ] Returns 403 if user doesn't own channel
- [ ] Returns 400 if invalid input
- [ ] Returns 500 with error details if sync fails
- [ ] Async operation (job queued, returns immediately)
- [ ] Proper error messages
- [ ] Audit logged

**Implementation:**
- [ ] Create handler function in handlers package
- [ ] Validate request
- [ ] Check authorization
- [ ] Queue sync job
- [ ] Return response with job ID (for future polling)

**Testing:**
- [ ] Test authentication required
- [ ] Test authorization (channel ownership)
- [ ] Test valid sync request
- [ ] Test invalid channel
- [ ] Test rate limiting
- [ ] Test response format

**Definition of Done:**
- Endpoint working end-to-end
- All tests passing
- Error handling complete

---

### Issue #TBD-17: Implement Ban Management Endpoints
**Effort:** 8-10 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Create endpoints for managing bans: list, create, delete, view details.

**Acceptance Criteria:**
- [ ] Endpoint: `GET /api/v1/moderation/bans?channel_id=uuid&skip=0&limit=50`
  - List bans for channel(s) user moderates
  - Pagination support
  - Filtering: by user, by channel, by status, by date range
  - Returns array of bans with details
  - Community mods see only their channels

- [ ] Endpoint: `POST /api/v1/moderation/ban`
  - Request body:
    ```json
    {
      "channel_id": "uuid",
      "user_id": "uuid",
      "reason": "spam",
      "expires_in_hours": null
    }
    ```
  - Creates ban record
  - Logs audit event
  - Returns 201 Created with ban details
  - Validates permission and scope

- [ ] Endpoint: `DELETE /api/v1/moderation/ban/:id`
  - Revokes ban
  - Logs unban action
  - Returns 204 No Content
  - Validates permission

- [ ] Endpoint: `GET /api/v1/moderation/ban/:id`
  - Returns ban details
  - Validates permission

- [ ] All endpoints require authentication
- [ ] All endpoints validate authorization
- [ ] Proper error handling
- [ ] All operations audited

**Testing:**
- [ ] Test list with pagination
- [ ] Test create ban
- [ ] Test delete ban
- [ ] Test authorization scoping
- [ ] Test invalid inputs
- [ ] Test error cases

**Definition of Done:**
- All endpoints working
- Tests passing
- Authorization correct

---

### Issue #TBD-18: Implement Moderator Management Endpoints
**Effort:** 8-10 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Create endpoints to manage moderators: list, add, remove, update permissions.

**Acceptance Criteria:**
- [ ] Endpoint: `GET /api/v1/moderation/moderators?channel_id=uuid`
  - List moderators for channel
  - Includes: user info, scope, permissions, date added
  - Returns 403 if user not authorized

- [ ] Endpoint: `POST /api/v1/moderation/moderators`
  - Request body:
    ```json
    {
      "channel_id": "uuid",
      "user_id": "uuid",
      "reason": "trusted content creator"
    }
    ```
  - Adds user as community moderator
  - Returns 201 Created
  - Validates: user exists, channel exists, not already mod
  - Only channel owner or site admin can add

- [ ] Endpoint: `DELETE /api/v1/moderation/moderators/:id`
  - Removes moderator
  - Returns 204 No Content
  - Only channel owner or site admin can remove

- [ ] Endpoint: `PATCH /api/v1/moderation/moderators/:id`
  - Update moderator permissions/scope
  - Request body: `{ "permissions": [...] }`
  - Validates new permissions
  - Logs change

- [ ] All endpoints require authentication
- [ ] All operations audited
- [ ] Proper error messages

**Testing:**
- [ ] Test list moderators
- [ ] Test add moderator
- [ ] Test remove moderator
- [ ] Test authorization
- [ ] Test invalid inputs

**Definition of Done:**
- All endpoints functional
- Authorization correct
- Tests passing

---

### Issue #TBD-19: Implement Audit Log Endpoints
**Effort:** 6-8 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Create endpoints for querying audit logs with comprehensive filtering.

**Acceptance Criteria:**
- [ ] Endpoint: `GET /api/v1/moderation/audit-logs?skip=0&limit=50`
  - Query parameters:
    - `actor_id` - filter by actor
    - `action` - filter by action type
    - `target_user_id` - filter by target
    - `channel_id` - filter by channel
    - `from_date` - start date
    - `to_date` - end date
  - Returns paginated results
  - Returns 403 if user not authorized
  - Community mods see only their channel logs
  - Site admins see all logs

- [ ] Endpoint: `GET /api/v1/moderation/audit-logs/:id`
  - Return specific log entry
  - Includes all metadata
  - Validates authorization

- [ ] Both endpoints require authentication
- [ ] Pagination support
- [ ] Sorting support
- [ ] Proper error handling

**Testing:**
- [ ] Test list with various filters
- [ ] Test pagination
- [ ] Test authorization scoping
- [ ] Test date range filtering

**Definition of Done:**
- Endpoints working
- Filters working correctly
- Tests passing

---

### Issue #TBD-20: Add Handler Unit Tests & Integration Tests
**Effort:** 4-6 hours
**Priority:** P1
**Phase:** 2
**Labels:** epic:moderation, kind:feature, area:backend, phase/2, priority/P1

**Description:**
Create tests for all API handlers with mocked services.

**Acceptance Criteria:**
- [ ] Create `backend/internal/handlers/moderation_handlers_test.go`
- [ ] Test each endpoint with valid requests
- [ ] Test authorization on all endpoints
- [ ] Test error cases (400, 403, 404, 500)
- [ ] Test request validation
- [ ] Test response formats
- [ ] Mock database and services
- [ ] Code coverage > 85%
- [ ] All tests passing

**Testing:**
- [ ] Test suite passes
- [ ] Coverage acceptable

**Definition of Done:**
- All tests passing
- Coverage > 85%

---

## EPIC 5: Frontend UI Components (P2) - 32-40 hours

### ⚠️ CRITICAL: Ban Visibility & Interaction Model for All Components

**Requirement Summary:**
Users banned from a channel should see posts from that channel but be unable to interact with them. Implementation follows **OPTION B**: Content Visible with Disabled Interactions.

**Implementation Rules for ALL Frontend Components:**

#### 1. FeedCard Component (`frontend/src/components/FeedCard.tsx`)
When rendering posts in feed:
```tsx
interface FeedCardProps {
  post: Post;
  // ... other props
}

// Inside component:
const { isBanned, banReason } = useCheckBanStatus(post.channelId);

return (
  <div className="feed-card">
    <PostHeader />
    <PostContent />

    {/* Show ban notice if applicable */}
    {isBanned && (
      <BanNotice reason={banReason} />
    )}

    {/* Interaction buttons - DISABLED if banned */}
    <InteractionButtons
      disabled={isBanned}
      disabledReason={isBanned ? "You're banned from this community" : undefined}
    />
  </div>
);
```

**Acceptance Criteria:**
- [ ] FeedCard checks ban status via `/api/v1/moderation/ban-status?channelId={id}`
- [ ] Post is VISIBLE even if user is banned
- [ ] Ban warning badge shown prominently
- [ ] Interaction buttons disabled with tooltip explanation
- [ ] User cannot click/submit if banned

#### 2. CommentForm Component (`frontend/src/components/CommentForm.tsx`)
When user tries to comment on a post from a banned channel:
```tsx
const handleSubmitComment = async (content: string) => {
  if (isBanned) {
    showNotification({
      type: 'error',
      message: 'You cannot comment because you are banned from this community',
      action: 'Dismiss'
    });
    return; // Don't submit
  }
  // ... normal submit logic
}
```

**Acceptance Criteria:**
- [ ] Form submission prevented if user is banned
- [ ] Clear error message shown
- [ ] API call never sent when banned
- [ ] Text input disabled or read-only
- [ ] User cannot circumvent via keyboard

#### 3. FavoriteButton Component (`frontend/src/components/FavoriteButton.tsx`)
```tsx
interface FavoriteButtonProps {
  postId: string;
  channelId: string;
}

// Inside component:
const { isBanned } = useCheckBanStatus(channelId);

return (
  <button
    onClick={handleFavorite}
    disabled={isBanned}
    title={isBanned ? "You're banned from this community" : "Add to favorites"}
    className={`favorite-btn ${isBanned ? 'disabled' : ''}`}
  >
    {/* ... button content ... */}
  </button>
);
```

**Acceptance Criteria:**
- [ ] Button disabled visually (grayed out)
- [ ] onClick handler not executed when banned
- [ ] Tooltip shows ban reason
- [ ] Keyboard navigation skips disabled button or shows error

#### 4. ShareButton Component (`frontend/src/components/ShareButton.tsx`)
```tsx
interface ShareButtonProps {
  postId: string;
  channelId: string;
  postUrl: string;
}

const handleShare = () => {
  if (isBanned) {
    showNotification({
      type: 'error',
      message: 'Sharing is disabled for banned communities',
    });
    return;
  }
  // ... normal share logic
}
```

**Acceptance Criteria:**
- [ ] Share modal doesn't open if banned
- [ ] Clear explanation provided to user
- [ ] Button disabled and indicates why
- [ ] No sharing attempts sent to server

#### 5. RepostButton Component (if applicable)
Similar rules to ShareButton - disabled if banned.

#### 6. API Responses Include Ban Status
**Backend Requirement (see EPIC 4):**
All endpoints returning post data must include ban status:

```json
{
  "post": {
    "id": "post-123",
    "channelId": "channel-456",
    "content": "...",
    "currentUserBanStatus": {
      "isBanned": true,
      "bannedBy": "moderator-id",
      "reason": "Harassment",
      "bannedAt": "2025-02-15T10:30:00Z",
      "expiresAt": null
    }
  }
}
```

**Frontend Usage:**
All feed/post listing endpoints should include ban status so components can immediately determine disabled state.

#### 7. Accessible Disabled State
For all disabled interaction buttons:
- [ ] Add `aria-disabled="true"` attribute
- [ ] Keyboard Tab key navigation still reaches button
- [ ] Space/Enter shows tooltip explaining why disabled
- [ ] Screen reader announces "Button disabled: You are banned from this community"
- [ ] Tooltip visible on hover and focus

#### 8. Visual Indicators
Add visual styling to show banned state:
```css
.interaction-button.banned {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #dc2626; /* Red border */
}

.ban-notice {
  background-color: #fee2e2; /* Light red */
  border-left: 4px solid #dc2626;
  padding: 12px;
  margin: 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ban-notice__icon {
  color: #dc2626;
  font-size: 1.25rem;
}

.ban-notice__text {
  color: #7f1d1d;
  font-size: 0.875rem;
  font-weight: 500;
}
```

#### 9. Custom Hook: useCheckBanStatus
Create a custom React hook for all components to use:

```tsx
// frontend/src/hooks/useCheckBanStatus.ts
interface UseBanStatusReturn {
  isBanned: boolean;
  banReason?: string;
  bannedAt?: Date;
  expiresAt?: Date | null;
  isLoading: boolean;
  error?: Error;
}

export function useCheckBanStatus(channelId: string): UseBanStatusReturn {
  const [status, setStatus] = useState<UseBanStatusReturn>({
    isBanned: false,
    isLoading: true,
  });

  useEffect(() => {
    // Fetch from GET /api/v1/moderation/ban-status?channelId={id}
    // Cache result to avoid excessive API calls
  }, [channelId]);

  return status;
}
```

**Acceptance Criteria for Hook:**
- [ ] Hook fetches ban status from backend
- [ ] Result cached (don't refetch on every component render)
- [ ] Handles loading and error states
- [ ] Used consistently across all components
- [ ] Type-safe with TypeScript
- [ ] Tested thoroughly

---

### Issue #TBD-21: Implement Moderator Management UI
**Effort:** 8-10 hours
**Priority:** P2
**Phase:** 3
**Labels:** epic:moderation, kind:feature, area:frontend, phase/3, priority/P2

**Description:**
Create UI for managing channel moderators.

**Acceptance Criteria:**
- [ ] Component: `ModeratorManager.tsx`
- [ ] Features:
  - List current moderators
  - Add new moderator (search user, add)
  - Remove moderator
  - Edit moderator permissions
  - Pagination
  - Search/filter
- [ ] Integration with API endpoints
- [ ] Error handling and user feedback
- [ ] Loading states
- [ ] Confirmation dialogs for destructive actions
- [ ] Responsive design
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] TypeScript types
- [ ] Unit tests

**User Flow:**
1. Navigate to channel moderation settings
2. See list of current moderators
3. Search for user to add as moderator
4. Click "Add" and confirm
5. See updated list
6. Can remove moderators with confirmation

**Testing:**
- [ ] Component renders correctly
- [ ] API calls work
- [ ] User interactions work
- [ ] Error states handled

**Definition of Done:**
- Component functional and integrated
- Tests passing
- Accessibility verified

---

### Issue #TBD-22: Implement Ban List Viewer
**Effort:** 6-8 hours
**Priority:** P2
**Phase:** 3
**Labels:** epic:moderation, kind:feature, area:frontend, phase/3, priority/P2

**Description:**
Create UI to view and manage ban lists.

**Acceptance Criteria:**
- [ ] Component: `BanListViewer.tsx`
- [ ] Features:
  - Display all bans for channel
  - Filter by: user, reason, date, status (active/expired)
  - Pagination
  - Sorting
  - Revoke ban (with confirmation)
  - View ban details
  - Export to CSV
- [ ] API integration
- [ ] Proper loading and error states
- [ ] Responsive design
- [ ] Accessibility

**Testing:**
- [ ] Component renders
- [ ] Filtering works
- [ ] Pagination works
- [ ] Revoke action works

**Definition of Done:**
- Component complete and functional

---

### Issue #TBD-23: Implement Sync Bans Modal
**Effort:** 6-8 hours
**Priority:** P2
**Phase:** 3
**Labels:** epic:moderation, kind:feature, area:frontend, phase/3, priority/P2

**Description:**
Create modal to initiate Twitch ban synchronization.

**Acceptance Criteria:**
- [ ] Component: `SyncBansModal.tsx`
- [ ] Features:
  - Select channel to sync from Twitch
  - Show sync progress/status
  - Confirm sync operation
  - Display results (bans added, existing)
  - Handle errors gracefully
  - Polling for async job completion
- [ ] API integration with sync endpoint
- [ ] User confirmation dialog
- [ ] Progress indicator
- [ ] Result summary

**Testing:**
- [ ] Modal renders and opens
- [ ] Form submission works
- [ ] Progress tracking works
- [ ] Error handling

**Definition of Done:**
- Modal functional and integrated

---

### Issue #TBD-24: Implement Audit Log Viewer
**Effort:** 6-8 hours
**Priority:** P2
**Phase:** 3
**Labels:** epic:moderation, kind:feature, area:frontend, phase/3, priority/P2

**Description:**
Create UI to view audit logs of all moderation actions.

**Acceptance Criteria:**
- [ ] Component: `AuditLogViewer.tsx`
- [ ] Features:
  - Timeline view of actions
  - Filter by: action, actor, date range
  - Pagination
  - Search functionality
  - Show details: who, what, when, why
  - Export logs
  - Refresh button
- [ ] API integration
- [ ] Proper formatting of timestamps
- [ ] Icons for different action types
- [ ] Responsive layout

**Testing:**
- [ ] Component renders
- [ ] Filters work
- [ ] Pagination works
- [ ] Export works

**Definition of Done:**
- Component complete

---

### Issue #TBD-25: Add Frontend Tests
**Effort:** 4-6 hours
**Priority:** P2
**Phase:** 3
**Labels:** epic:moderation, kind:feature, area:frontend, phase/3, priority/P2

**Description:**
Create comprehensive tests for all moderation UI components.

**Acceptance Criteria:**
- [ ] Component snapshot tests
- [ ] Integration tests with mocked API
- [ ] User interaction tests
- [ ] Error state tests
- [ ] Accessibility tests
- [ ] Code coverage > 80%
- [ ] All tests passing

**Testing:**
- [ ] Run test suite
- [ ] Check coverage

**Definition of Done:**
- All tests passing
- Coverage acceptable

---

## EPIC 6: Comprehensive Testing (P0) - 48-60 hours

### Issue #TBD-26: Write Unit Tests for Services
**Effort:** 12-16 hours
**Priority:** P0
**Phase:** 4
**Labels:** epic:moderation, kind:test, area:backend, phase/4, priority/P0

**Description:**
Write comprehensive unit tests for all backend services.

**Acceptance Criteria:**
- [ ] Test file: `backend/internal/services/moderation_services_test.go`
- [ ] Tests for ModerationService:
  - BanUser with various inputs
  - UnbanUser
  - Permission validation
  - Scope validation
  - Error conditions
- [ ] Tests for TwitchBanSyncService:
  - Successful sync
  - Rate limiting
  - Pagination
  - Error handling
  - Retry logic
- [ ] Tests for AuditLogService:
  - Logging operations
  - Querying with filters
  - Pagination
- [ ] Tests for PermissionCheckService:
  - Permission validation
  - Scope checking
  - Permission hierarchies
- [ ] All mocked external dependencies
- [ ] Code coverage > 85%
- [ ] All tests passing

**Testing:**
- [ ] Run: `go test ./internal/services -v -cover`
- [ ] Generate coverage report

**Definition of Done:**
- All unit tests passing
- Coverage > 85%
- No flaky tests

---

### Issue #TBD-27: Write Integration Tests
**Effort:** 12-16 hours
**Priority:** P0
**Phase:** 4
**Labels:** epic:moderation, kind:test, area:backend, phase/4, priority/P0

**Description:**
Write integration tests for services with real database.

**Acceptance Criteria:**
- [ ] Test file: `backend/tests/integration/moderation_integration_test.go`
- [ ] Setup test database with schema
- [ ] Test complete workflows:
  - Add moderator → sync bans → list bans → remove ban
  - Test permission boundaries
  - Test transaction rollback on errors
- [ ] Test audit logging end-to-end
- [ ] Test data persistence
- [ ] Test constraints enforcement
- [ ] Cleanup after each test
- [ ] Code coverage > 80%
- [ ] No flaky tests

**Testing:**
- [ ] Run tests against test database
- [ ] Verify data persistence
- [ ] Verify cleanup works

**Definition of Done:**
- Integration tests passing
- Database state clean after tests

---

### Issue #TBD-28: Write RBAC Authorization Tests
**Effort:** 6-8 hours
**Priority:** P0
**Phase:** 4
**Labels:** epic:moderation, kind:test, area:backend, phase/4, priority/P0

**Description:**
Test role-based access control comprehensively.

**Acceptance Criteria:**
- [ ] Test file: `backend/tests/rbac_moderation_test.go`
- [ ] Test matrix:
  - Admin can do everything
  - Site moderator can view all bans
  - Community moderator can only see own channels
  - Regular user cannot moderate
  - Prevent permission escalation
- [ ] Test scope boundaries:
  - Community mod cannot access other channels
  - Cannot modify other mod's bans
  - Cannot grant higher permissions
- [ ] Test all endpoints with different roles
- [ ] Comprehensive error checking

**Test Cases:**
```
Admin:
  - Can ban any user
  - Can unban any user
  - Can view all logs

Site Moderator:
  - Can view all bans
  - Cannot escalate privileges

Community Moderator:
  - Can ban only in own channel
  - Cannot access other channels

Regular User:
  - Cannot moderate
  - Cannot view logs
```

**Testing:**
- [ ] Run test suite
- [ ] Verify all permissions enforced

**Definition of Done:**
- RBAC tests comprehensive
- All tests passing
- No permission leaks

---

### Issue #TBD-29: Write E2E Tests
**Effort:** 12-16 hours
**Priority:** P0
**Phase:** 4
**Labels:** epic:moderation, kind:test, area:frontend, phase/4, priority/P0

**Description:**
Write end-to-end tests for complete user workflows using Playwright.

**Acceptance Criteria:**
- [ ] Test file: `frontend/tests/e2e/moderation.spec.ts`
- [ ] Test scenarios:
  1. Add moderator to channel
  2. Sync bans from Twitch
  3. View ban list
  4. Create manual ban
  5. Revoke ban
  6. View audit logs
- [ ] Test with different user roles
- [ ] Test error scenarios
- [ ] Test on multiple browsers (Chromium, Firefox)
- [ ] All tests passing consistently
- [ ] < 5% flakiness

**E2E Test Flow:**
```
1. Login as channel owner
2. Navigate to moderation settings
3. Add user as moderator
4. Logout, login as moderator
5. Initiate ban sync
6. Verify bans synced
7. View ban list
8. Create new ban
9. Verify audit log
```

**Testing:**
- [ ] Run: `npx playwright test moderation`
- [ ] Verify all scenarios pass
- [ ] Run multiple times for flakiness

**Definition of Done:**
- E2E tests comprehensive
- All tests passing
- < 5% flakiness

---

### Issue #TBD-30: Performance & Load Testing
**Effort:** 4-6 hours
**Priority:** P1
**Phase:** 4
**Labels:** epic:moderation, kind:test, area:backend, phase/4, priority/P1

**Description:**
Test performance of moderation operations with realistic load.

**Acceptance Criteria:**
- [ ] Load test file: `backend/tests/load/moderation_load_test.go`
- [ ] Test scenarios:
  - Sync large ban list (1000+ bans)
  - Query audit logs with date range
  - Concurrent bans from multiple moderators
- [ ] Performance benchmarks:
  - Ban sync: < 5 seconds (1000 bans)
  - Audit log query: < 200ms (100K records)
  - Permission check: < 10ms
  - API endpoint: < 500ms (p99)
- [ ] Identify bottlenecks
- [ ] Optimize if needed
- [ ] Document performance characteristics

**Load Test Commands:**
```bash
# Run benchmark
go test -bench=BenchmarkSync ./tests/load

# Run with profiling
go test -bench=BenchmarkSync -cpuprofile=cpu.prof ./tests/load
```

**Testing:**
- [ ] Run load tests
- [ ] Record baseline metrics
- [ ] Verify performance targets met

**Definition of Done:**
- Performance acceptable
- Benchmarks documented

---

## EPIC 7: Documentation (P1) - 12-16 hours

### Issue #TBD-31: Write API Documentation
**Effort:** 4-6 hours
**Priority:** P1
**Phase:** 5
**Labels:** epic:moderation, kind:docs, area:backend, phase/5, priority/P1

**Description:**
Create comprehensive API documentation for moderation endpoints.

**Acceptance Criteria:**
- [ ] OpenAPI/Swagger spec created: `docs/openapi/moderation.yaml`
- [ ] Document all endpoints:
  - Request parameters and body
  - Response formats
  - Error codes
  - Rate limits
  - Authorization
- [ ] Example requests and responses
- [ ] Error documentation
  - What each code means
  - How to handle
  - Recovery strategies
- [ ] Rate limiting documentation
- [ ] Authentication/OAuth requirements
- [ ] Markdown docs: `docs/backend/moderation-api.md`

**API Doc Structure:**
```
- Overview
- Authentication
- Endpoints (sync, ban, moderators, audit logs)
- Data Models
- Error Handling
- Rate Limiting
- Examples
```

**Definition of Done:**
- API documentation complete
- All endpoints documented
- Examples included

---

### Issue #TBD-32: Write Permission Model Documentation
**Effort:** 3-4 hours
**Priority:** P1
**Phase:** 5
**Labels:** epic:moderation, kind:docs, area:backend, phase/5, priority/P1

**Description:**
Document the permission model and authorization logic.

**Acceptance Criteria:**
- [ ] Documentation file: `docs/backend/permission-model.md`
- [ ] Include:
  - Role hierarchy
  - Permission definitions
  - Scope definitions (site vs community)
  - Authorization examples
  - Common scenarios
  - How to add new permissions
  - How to grant/revoke permissions
- [ ] Diagrams showing permission flow
- [ ] Decision trees for authorization
- [ ] Troubleshooting guide

**Documentation Sections:**
```
- Permission Model Overview
- Role Definitions
  - Site Admin
  - Site Moderator
  - Community Moderator
  - Member
- Permission Definitions
- Scope (Site vs Community)
- How Authorization Works
- Examples
- Adding New Permissions
```

**Definition of Done:**
- Permission model documented clearly

---

### Issue #TBD-33: Write Operational Runbooks
**Effort:** 3-4 hours
**Priority:** P1
**Phase:** 5
**Labels:** epic:moderation, kind:docs, area:backend, phase/5, priority/P1

**Description:**
Create runbooks for operators to manage moderation system.

**Acceptance Criteria:**
- [ ] Runbook file: `docs/operations/moderation-runbook.md`
- [ ] Include:
  - Moderator onboarding steps
  - Troubleshooting ban sync failures
  - Querying audit logs
  - Emergency procedures (rollback, disable)
  - Monitoring and alerting
  - Data retention and archival
  - Disaster recovery
- [ ] Step-by-step procedures
- [ ] Common issues and solutions
- [ ] Contact information

**Runbook Sections:**
```
- Onboarding New Moderators
- Troubleshooting
  - Sync Failures
  - Permission Issues
  - Database Issues
- Emergency Procedures
- Monitoring
- Maintenance
- Support Contacts
```

**Definition of Done:**
- Runbooks complete and practical

---

### Issue #TBD-34: Write Developer Guide
**Effort:** 2-3 hours
**Priority:** P1
**Phase:** 5
**Labels:** epic:moderation, kind:docs, area:backend, phase/5, priority/P1

**Description:**
Create guide for developers extending moderation system.

**Acceptance Criteria:**
- [ ] Guide file: `docs/development/moderation-guide.md`
- [ ] Include:
  - Architecture overview
  - Service interfaces
  - Database schema
  - Testing strategy
  - How to add new permissions
  - How to add new moderation actions
  - Code examples
- [ ] Diagram of service dependencies
- [ ] Common extension scenarios

**Guide Sections:**
```
- Architecture
- Services
- Database
- Testing
- Adding Features
  - New Permissions
  - New Actions
  - New Endpoints
- Code Examples
```

**Definition of Done:**
- Developer guide complete

---

## EPIC 8: Deployment & Monitoring (P1) - 12-16 hours

### Issue #TBD-35: Create Migration Scripts
**Effort:** 3-4 hours
**Priority:** P1
**Phase:** 5
**Labels:** epic:moderation, kind:ops, area:backend, phase/5, priority/P1

**Description:**
Create and test migration scripts for production deployment.

**Acceptance Criteria:**
- [ ] Forward migrations:
  - All 6 table migrations complete
  - All indexes created
  - All constraints working
- [ ] Rollback migrations:
  - Tested and working
  - No data loss
  - Original schema restored
- [ ] Data validation scripts
  - Verify schema integrity
  - Verify data consistency
  - Check for orphaned records
- [ ] Migration documentation
  - When to run
  - What to check after
  - How to rollback

**Testing:**
- [ ] Run forward migration
- [ ] Verify schema
- [ ] Run rollback
- [ ] Verify restored state

**Definition of Done:**
- Migrations ready for production

---

### Issue #TBD-36: Set Up Monitoring & Alerts
**Effort:** 4-6 hours
**Priority:** P1
**Phase:** 5
**Labels:** epic:moderation, kind:ops, area:backend, phase/5, priority/P1

**Description:**
Configure monitoring and alerting for moderation system.

**Acceptance Criteria:**
- [ ] Metrics tracked:
  - Ban sync duration and count
  - API endpoint response times
  - Permission check failures (suspect attacks)
  - Audit log storage size
  - Database query times
- [ ] Alerts configured:
  - Sync job failure
  - High error rate on moderation endpoints
  - Permission denied rate spike
  - Database query timeout
  - Audit log storage near limit
- [ ] Dashboards created:
  - Moderation overview
  - Sync job status
  - API performance
  - Audit log metrics
- [ ] SLA monitoring
  - Uptime
  - Response times
  - Error rates

**Monitoring Setup:**
```
Prometheus metrics:
- moderation_bans_synced_total
- moderation_ban_duration_seconds
- moderation_api_requests_total
- moderation_permission_denials_total
- moderation_audit_logs_size_bytes
```

**Definition of Done:**
- Monitoring configured
- Alerts tested
- Dashboards working

---

### Issue #TBD-37: Implement Feature Flags
**Effort:** 2-3 hours
**Priority:** P1
**Phase:** 5
**Labels:** epic:moderation, kind:ops, area:backend, phase/5, priority/P1

**Description:**
Add feature flags for gradual moderation feature rollout.

**Acceptance Criteria:**
- [ ] Feature flags created:
  - `moderation:enabled` - master killswitch
  - `moderation:ban_sync` - enable/disable Twitch sync
  - `moderation:community_moderators` - enable community mods
- [ ] Flags can be toggled at runtime (no restart)
- [ ] Flags stored in database or config
- [ ] API returns feature status
- [ ] Documentation on flag usage

**Testing:**
- [ ] Flags work correctly
- [ ] Can toggle at runtime
- [ ] No restart required

**Definition of Done:**
- Feature flags implemented

---

### Issue #TBD-38: Create Deployment Guide
**Effort:** 3-4 hours
**Priority:** P1
**Phase:** 5
**Labels:** epic:moderation, kind:docs, area:backend, phase/5, priority/P1

**Description:**
Create comprehensive guide for deploying moderation system.

**Acceptance Criteria:**
- [ ] Deployment guide: `docs/deployment/moderation-deployment.md`
- [ ] Include:
  - Pre-deployment checklist
  - Migration steps
  - Rollback procedures
  - Health check procedures
  - Post-deployment verification
  - Monitoring verification
  - Feature flag toggles
  - Rollout strategy (gradual vs full)
- [ ] Blue-green deployment steps
- [ ] Canary deployment steps
- [ ] Rollback scenarios and procedures
- [ ] Troubleshooting common issues

**Deployment Checklist:**
```
Pre-Deployment:
  - [ ] All tests passing
  - [ ] Code reviewed
  - [ ] Migrations tested
  - [ ] Monitoring configured

Deployment:
  - [ ] Run migrations
  - [ ] Deploy backend
  - [ ] Enable feature flags
  - [ ] Run health checks

Post-Deployment:
  - [ ] Verify migrations complete
  - [ ] Check monitoring
  - [ ] Test endpoints
  - [ ] Monitor for errors
```

**Definition of Done:**
- Deployment guide complete
- Clear steps documented

---

## Summary

**Total Issues:** 38
**Total Effort:** 220-260 hours
**Phases:** 5 (2 weeks each = 10 weeks total)
**Target:** Q2 2026

Each issue is:
- ✅ Scoped for autonomous execution
- ✅ Has detailed acceptance criteria
- ✅ Has implementation details
- ✅ Has testing requirements
- ✅ Has definition of done
- ✅ Includes error handling
- ✅ Includes security considerations
- ✅ Can be assigned to a developer or AI agent

---

**Last Updated:** January 7, 2026
