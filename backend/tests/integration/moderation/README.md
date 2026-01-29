# Moderation Integration Tests

This directory contains comprehensive integration tests for the moderation service, validating complete workflows with a real database.

## Test Coverage

### Complete Workflows (TestModerationWorkflow_CompleteFlow)
Tests the complete moderation workflow:
1. Site moderator bans a user from a community
2. List bans to verify ban was created
3. Unban the user
4. Verify ban list is empty after unban

### Permission Boundary Tests
- **Site Moderator** (TestModerationPermissions_SiteModerator): Can moderate any community
- **Community Moderator** (TestModerationPermissions_CommunityModerator): Can only moderate authorized communities
- **Admin User** (TestModerationPermissions_AdminUser): Can moderate any community
- **Regular User** (TestModerationPermissions_RegularUser): Cannot perform moderation actions

### Scope Validation Tests
- Community moderators can only moderate communities in their authorized scope
- Unauthorized community moderators receive `ErrModerationNotAuthorized`

### Error Cases and Constraints
- **Cannot Ban Owner** (TestModerationConstraints_CannotBanOwner): Community owners cannot be banned
- **Unban Non-Banned User** (TestModerationConstraints_UnbanNonBannedUser): Returns `ErrModerationNotBanned`
- **Foreign Key Constraints** (TestModerationConstraints_ForeignKeys): Validates database integrity

### Audit Logging
- **Ban Audit Log** (TestModerationAuditLog_BanUser): Verifies audit log creation for ban actions
- **Unban Audit Log** (TestModerationAuditLog_UnbanUser): Verifies audit log creation for unban actions
- Validates metadata includes community ID, banned user ID, and moderator scope

### Data Persistence
- **Service Restart** (TestModerationPersistence_BanSurvivesServiceRestart): Bans persist after service restart
- Simulates creating a new service instance and verifying data integrity

### Pagination
- **List Bans Pagination** (TestModerationPagination_ListBans): Tests pagination with multiple bans
- Validates page 1 and page 2 results

### Concurrency
- **Concurrent Bans** (TestModerationConcurrency_MultipleBans): Multiple concurrent ban operations
- Validates database handles concurrent writes correctly

## Running Tests

### Prerequisites
The integration tests require a running test database and Redis instance.

### Start Test Infrastructure
```bash
cd backend
make test-setup
```

This starts Docker containers for:
- PostgreSQL (test database)
- Redis
- OpenSearch (if needed)

### Run Moderation Integration Tests
```bash
# Run only moderation integration tests
cd backend
INTEGRATION=1 go test -v -tags=integration ./tests/integration/moderation/... -timeout 5m

# Run all integration tests
INTEGRATION=1 ./run-tests-verbose.sh
```

### Stop Test Infrastructure
```bash
cd backend
make test-teardown
```

## Test Data Cleanup

All tests use the `cleanupTestData` helper function to ensure:
- Community bans are deleted
- Community members are removed
- Communities are deleted
- Test users are cleaned up

Each test uses `defer cleanupTestData(...)` to guarantee cleanup even if tests fail.

## Code Quality

### Test Isolation
- Each test creates its own test data with unique IDs
- Tests can run in parallel without conflicts
- Cleanup is guaranteed via defer statements

### No Flaky Tests
- No time-sensitive assertions (except audit log timestamps with 5s tolerance)
- No sleep-based waits
- Deterministic test data generation

### Coverage Goals
These tests provide comprehensive coverage of:
- Moderation service business logic (>80%)
- Permission validation flows
- Database interactions
- Audit logging end-to-end
- Error handling and edge cases

## Related Files

- **Service**: `internal/services/moderation_service.go`
- **Repository**: `internal/repository/community_repository.go`, `internal/repository/audit_log_repository.go`
- **Models**: `internal/models/models.go` (CommunityBan, ModerationAuditLog)
- **Unit Tests**: `internal/services/moderation_service_test.go`
