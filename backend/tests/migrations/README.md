# Migration Tests

This directory contains comprehensive tests for database migrations, specifically focusing on moderation-related migrations.

## Overview

These tests verify that database migrations are applied correctly and can be rolled back cleanly. They test:

- **Schema Creation**: Tables, columns, and data types are created correctly
- **Constraints**: CHECK, UNIQUE, FOREIGN KEY, and NOT NULL constraints are enforced
- **Indexes**: Indexes are created and used efficiently
- **Triggers & Functions**: PostgreSQL triggers and functions work as expected
- **Data Integrity**: Data is preserved through migration operations
- **Rollback Safety**: Migrations can be rolled back cleanly

## Running Tests

### Prerequisites

1. Ensure test environment is set up:
   ```bash
   make test-setup
   ```

2. Install golang-migrate if not already installed:
   ```bash
   go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
   ```

### Run Migration Tests

```bash
# Run all migration tests
go test -v -tags=integration ./tests/migrations/...

# Run specific test
go test -v -tags=integration ./tests/migrations/... -run TestModerationQueueMigration

# Run with coverage
go test -tags=integration ./tests/migrations/... -coverprofile=coverage.out
```

## Test Coverage

The tests cover the following migrations:

### Migration 000011 - Moderation Audit Logs
- ✅ Table creation
- ✅ Column schema
- ✅ Indexes for efficient querying
- ✅ Constraint enforcement

### Migration 000049 - Moderation Queue System
- ✅ moderation_queue table
- ✅ moderation_decisions table
- ✅ CHECK constraints (content_type, status, priority, confidence)
- ✅ UNIQUE constraint on pending queue items
- ✅ Foreign key relationships
- ✅ Indexes for queue filtering
- ✅ Automatic reviewed_at trigger

### Migration 000050 - Moderation Appeals
- ✅ moderation_appeals table
- ✅ Status constraints
- ✅ UNIQUE constraint on pending appeals
- ✅ Foreign key to moderation_decisions
- ✅ Automatic resolved_at trigger

### Migration 000069 - Forum Moderation
- ✅ forum_threads table
- ✅ forum_replies table
- ✅ moderation_actions table
- ✅ user_bans table
- ✅ content_flags table
- ✅ Reply count trigger
- ✅ Flag count trigger

### Migration 000097 - Updated Moderation Audit Logs
- ✅ New columns (actor_id, target_user_id, channel_id, ip_address, user_agent)
- ✅ New indexes
- ✅ Backward compatibility with old columns

## Test Structure

### Helper Functions

- `tableExists()` - Check if table exists
- `columnExists()` - Check if column exists in table
- `indexExists()` - Check if index exists
- `constraintExists()` - Check if constraint exists
- `functionExists()` - Check if PostgreSQL function exists
- `triggerExists()` - Check if trigger exists
- `getColumnType()` - Get data type of column
- `isColumnNullable()` - Check if column allows NULL

### Test Categories

1. **Schema Tests**: Verify tables, columns, and types match migration definitions
2. **Constraint Tests**: Verify all constraints are properly enforced
3. **Index Tests**: Verify indexes exist and are used by query planner
4. **Trigger Tests**: Verify triggers fire correctly and enforce business logic
5. **Data Integrity Tests**: Verify data is preserved and cascade deletes work
6. **Type Tests**: Verify column data types and nullability

## Example Test

```go
t.Run("ModerationQueueStatusConstraint", func(t *testing.T) {
    // Valid status should succeed
    queueID := uuid.New()
    _, err := mh.pool.Exec(ctx, `
        INSERT INTO moderation_queue (id, content_type, content_id, reason, status)
        VALUES ($1, 'comment', $2, 'spam', 'pending')
    `, queueID, uuid.New())
    require.NoError(t, err)

    // Invalid status should fail
    _, err = mh.pool.Exec(ctx, `
        INSERT INTO moderation_queue (id, content_type, content_id, reason, status)
        VALUES ($1, 'comment', $2, 'spam', 'invalid_status')
    `, uuid.New(), uuid.New())
    assert.Error(t, err, "Invalid status should fail constraint check")
})
```

## Adding New Migration Tests

When adding a new migration test:

1. Create a new test function following the naming convention: `TestXXXMigration000NNN`
2. Use the `setupMigrationTest()` helper to get database connections
3. Test schema creation (tables, columns, constraints, indexes)
4. Test constraint enforcement with valid and invalid data
5. Test triggers and functions if applicable
6. Clean up test data properly

## Notes

- Tests use the `//go:build integration` build tag
- Test database is isolated (clipper_test on port 5437)
- Coverage metrics are not applicable as these are schema tests
- All tests should clean up after themselves
- Tests should be idempotent and can run in any order
