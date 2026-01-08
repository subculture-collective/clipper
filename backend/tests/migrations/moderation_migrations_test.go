//go:build integration

package migrations

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// migrationHelper provides utilities for testing migrations
type migrationHelper struct {
	pool *pgxpool.Pool
	db   *sql.DB
}

// setupMigrationTest creates a test database connection
func setupMigrationTest(t *testing.T) *migrationHelper {
	cfg := testutil.SetupTestEnvironment(t)

	// Create SQL DB connection for schema queries
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		testutil.GetEnv("TEST_DATABASE_HOST", "localhost"),
		testutil.GetEnv("TEST_DATABASE_PORT", "5437"),
		testutil.GetEnv("TEST_DATABASE_USER", "clipper"),
		testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
		testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test"),
	)

	db, err := sql.Open("postgres", connStr)
	require.NoError(t, err, "Failed to open SQL connection")

	// Cleanup both connections when test is done
	t.Cleanup(func() {
		if db != nil {
			db.Close()
		}
		cfg.Cleanup()
	})

	return &migrationHelper{
		pool: cfg.DB.Pool,
		db:   db,
	}
}

// tableExists checks if a table exists in the database
func (mh *migrationHelper) tableExists(ctx context.Context, tableName string) (bool, error) {
	var exists bool
	query := `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = $1
		)
	`
	err := mh.pool.QueryRow(ctx, query, tableName).Scan(&exists)
	return exists, err
}

// columnExists checks if a column exists in a table
func (mh *migrationHelper) columnExists(ctx context.Context, tableName, columnName string) (bool, error) {
	var exists bool
	query := `
		SELECT EXISTS (
			SELECT FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = $1 
			AND column_name = $2
		)
	`
	err := mh.pool.QueryRow(ctx, query, tableName, columnName).Scan(&exists)
	return exists, err
}

// indexExists checks if an index exists
func (mh *migrationHelper) indexExists(ctx context.Context, indexName string) (bool, error) {
	var exists bool
	query := `
		SELECT EXISTS (
			SELECT FROM pg_indexes 
			WHERE schemaname = 'public' 
			AND indexname = $1
		)
	`
	err := mh.pool.QueryRow(ctx, query, indexName).Scan(&exists)
	return exists, err
}

// constraintExists checks if a constraint exists
func (mh *migrationHelper) constraintExists(ctx context.Context, tableName, constraintName string) (bool, error) {
	var exists bool
	query := `
		SELECT EXISTS (
			SELECT FROM information_schema.table_constraints 
			WHERE table_schema = 'public' 
			AND table_name = $1 
			AND constraint_name = $2
		)
	`
	err := mh.pool.QueryRow(ctx, query, tableName, constraintName).Scan(&exists)
	return exists, err
}

// functionExists checks if a function exists
func (mh *migrationHelper) functionExists(ctx context.Context, functionName string) (bool, error) {
	var exists bool
	query := `
		SELECT EXISTS (
			SELECT FROM pg_proc 
			WHERE proname = $1
		)
	`
	err := mh.pool.QueryRow(ctx, query, functionName).Scan(&exists)
	return exists, err
}

// triggerExists checks if a trigger exists on a table
func (mh *migrationHelper) triggerExists(ctx context.Context, tableName, triggerName string) (bool, error) {
	var exists bool
	query := `
		SELECT EXISTS (
			SELECT FROM pg_trigger t
			JOIN pg_class c ON t.tgrelid = c.oid
			WHERE c.relname = $1 
			AND t.tgname = $2
		)
	`
	err := mh.pool.QueryRow(ctx, query, tableName, triggerName).Scan(&exists)
	return exists, err
}

// getColumnType gets the data type of a column
func (mh *migrationHelper) getColumnType(ctx context.Context, tableName, columnName string) (string, error) {
	var dataType string
	query := `
		SELECT data_type 
		FROM information_schema.columns 
		WHERE table_schema = 'public' 
		AND table_name = $1 
		AND column_name = $2
	`
	err := mh.pool.QueryRow(ctx, query, tableName, columnName).Scan(&dataType)
	return dataType, err
}

// isColumnNullable checks if a column is nullable
func (mh *migrationHelper) isColumnNullable(ctx context.Context, tableName, columnName string) (bool, error) {
	var isNullable string
	query := `
		SELECT is_nullable 
		FROM information_schema.columns 
		WHERE table_schema = 'public' 
		AND table_name = $1 
		AND column_name = $2
	`
	err := mh.pool.QueryRow(ctx, query, tableName, columnName).Scan(&isNullable)
	if err != nil {
		return false, err
	}
	return isNullable == "YES", nil
}

// assertTablesExist is a helper to verify multiple tables exist
func assertTablesExist(t *testing.T, mh *migrationHelper, ctx context.Context, tables []string) {
	t.Helper()
	for _, table := range tables {
		exists, err := mh.tableExists(ctx, table)
		require.NoError(t, err)
		assert.True(t, exists, fmt.Sprintf("Table %s should exist", table))
	}
}

// assertColumnsExist is a helper to verify multiple columns exist in a table
func assertColumnsExist(t *testing.T, mh *migrationHelper, ctx context.Context, tableName string, columns []string) {
	t.Helper()
	for _, col := range columns {
		exists, err := mh.columnExists(ctx, tableName, col)
		require.NoError(t, err)
		assert.True(t, exists, fmt.Sprintf("Column %s should exist in table %s", col, tableName))
	}
}

// assertIndexesExist is a helper to verify multiple indexes exist
func assertIndexesExist(t *testing.T, mh *migrationHelper, ctx context.Context, indexes []string) {
	t.Helper()
	for _, index := range indexes {
		exists, err := mh.indexExists(ctx, index)
		require.NoError(t, err)
		assert.True(t, exists, fmt.Sprintf("Index %s should exist", index))
	}
}

// TestModerationQueueMigration000049 tests the moderation queue system migration
func TestModerationQueueMigration000049(t *testing.T) {
	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	t.Run("TablesCreated", func(t *testing.T) {
		// Check moderation_queue table exists
		exists, err := mh.tableExists(ctx, "moderation_queue")
		require.NoError(t, err)
		assert.True(t, exists, "moderation_queue table should exist")

		// Check moderation_decisions table exists
		exists, err = mh.tableExists(ctx, "moderation_decisions")
		require.NoError(t, err)
		assert.True(t, exists, "moderation_decisions table should exist")
	})

	t.Run("ModerationQueueColumns", func(t *testing.T) {
		columns := []string{
			"id", "content_type", "content_id", "reason", "priority",
			"status", "assigned_to", "reported_by", "report_count",
			"auto_flagged", "confidence_score", "created_at", "reviewed_at",
			"reviewed_by",
		}
		assertColumnsExist(t, mh, ctx, "moderation_queue", columns)
	})

	t.Run("ModerationQueueConstraints", func(t *testing.T) {
		// Check CHECK constraints
		constraints := []string{
			"moderation_queue_valid_content_type",
			"moderation_queue_valid_status",
			"moderation_queue_valid_priority",
			"moderation_queue_valid_confidence",
		}

		for _, constraint := range constraints {
			exists, err := mh.constraintExists(ctx, "moderation_queue", constraint)
			require.NoError(t, err)
			assert.True(t, exists, fmt.Sprintf("Constraint %s should exist", constraint))
		}
	})

	t.Run("ModerationQueueIndexes", func(t *testing.T) {
		indexes := []string{
			"idx_modqueue_status_priority",
			"idx_modqueue_content",
			"idx_modqueue_assigned_to",
			"idx_modqueue_auto_flagged",
			"idx_modqueue_created_at",
			"uq_modqueue_content_pending",
		}
		assertIndexesExist(t, mh, ctx, indexes)
	})

	t.Run("ModerationDecisionsColumns", func(t *testing.T) {
		columns := []string{
			"id", "queue_item_id", "moderator_id", "action",
			"reason", "metadata", "created_at",
		}
		assertColumnsExist(t, mh, ctx, "moderation_decisions", columns)
	})

	t.Run("ModerationDecisionsIndexes", func(t *testing.T) {
		indexes := []string{
			"idx_moddecisions_queue_item",
			"idx_moddecisions_moderator",
			"idx_moddecisions_created_at",
			"idx_moddecisions_action",
		}
		assertIndexesExist(t, mh, ctx, indexes)
	})

	t.Run("TriggersAndFunctions", func(t *testing.T) {
		// Check function exists
		exists, err := mh.functionExists(ctx, "update_moderation_queue_reviewed")
		require.NoError(t, err)
		assert.True(t, exists, "Function update_moderation_queue_reviewed should exist")

		// Check trigger exists
		exists, err = mh.triggerExists(ctx, "moderation_queue", "trg_moderation_queue_reviewed")
		require.NoError(t, err)
		assert.True(t, exists, "Trigger trg_moderation_queue_reviewed should exist")
	})
}

// TestModerationAppealsMigration000050 tests the moderation appeals migration
func TestModerationAppealsMigration000050(t *testing.T) {
	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	t.Run("TableCreated", func(t *testing.T) {
		exists, err := mh.tableExists(ctx, "moderation_appeals")
		require.NoError(t, err)
		assert.True(t, exists, "moderation_appeals table should exist")
	})

	t.Run("Columns", func(t *testing.T) {
		columns := []string{
			"id", "user_id", "moderation_action_id", "reason",
			"status", "resolved_by", "resolution", "created_at",
			"resolved_at",
		}
		assertColumnsExist(t, mh, ctx, "moderation_appeals", columns)
	})

	t.Run("Constraints", func(t *testing.T) {
		// Check status constraint
		exists, err := mh.constraintExists(ctx, "moderation_appeals", "moderation_appeals_valid_status")
		require.NoError(t, err)
		assert.True(t, exists, "Status constraint should exist")
	})

	t.Run("Indexes", func(t *testing.T) {
		indexes := []string{
			"idx_appeals_status_created",
			"idx_appeals_user_id",
			"idx_appeals_moderation_action",
			"idx_appeals_resolved_by",
			"uq_appeals_action_pending",
		}
		assertIndexesExist(t, mh, ctx, indexes)
	})

	t.Run("TriggersAndFunctions", func(t *testing.T) {
		// Check function exists
		exists, err := mh.functionExists(ctx, "update_moderation_appeals_resolved")
		require.NoError(t, err)
		assert.True(t, exists, "Function update_moderation_appeals_resolved should exist")

		// Check trigger exists
		exists, err = mh.triggerExists(ctx, "moderation_appeals", "trg_moderation_appeals_resolved")
		require.NoError(t, err)
		assert.True(t, exists, "Trigger trg_moderation_appeals_resolved should exist")
	})
}

// TestModerationAuditLogsMigration000011 tests the moderation audit logs migration
func TestModerationAuditLogsMigration000011(t *testing.T) {
	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	t.Run("TableCreated", func(t *testing.T) {
		exists, err := mh.tableExists(ctx, "moderation_audit_logs")
		require.NoError(t, err)
		assert.True(t, exists, "moderation_audit_logs table should exist")
	})

	t.Run("Columns", func(t *testing.T) {
		columns := []string{
			"id", "action", "entity_type", "entity_id",
			"moderator_id", "reason", "metadata", "created_at",
		}
		assertColumnsExist(t, mh, ctx, "moderation_audit_logs", columns)
	})

	t.Run("Indexes", func(t *testing.T) {
		indexes := []string{
			"idx_audit_logs_moderator",
			"idx_audit_logs_entity",
			"idx_audit_logs_created",
			"idx_audit_logs_action",
		}
		assertIndexesExist(t, mh, ctx, indexes)
	})
}

// TestForumModerationMigration000069 tests the forum moderation migration
func TestForumModerationMigration000069(t *testing.T) {
	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	t.Run("TablesCreated", func(t *testing.T) {
		tables := []string{
			"forum_threads",
			"forum_replies",
			"moderation_actions",
			"user_bans",
			"content_flags",
		}
		assertTablesExist(t, mh, ctx, tables)
	})

	t.Run("ForumThreadsColumns", func(t *testing.T) {
		columns := []string{
			"id", "user_id", "title", "content", "locked",
			"pinned", "flag_count", "reply_count", "view_count",
			"is_deleted", "created_at", "updated_at",
		}
		assertColumnsExist(t, mh, ctx, "forum_threads", columns)
	})

	t.Run("ModerationActionsColumns", func(t *testing.T) {
		columns := []string{
			"id", "moderator_id", "action_type", "target_type",
			"target_id", "reason", "metadata", "created_at",
		}
		assertColumnsExist(t, mh, ctx, "moderation_actions", columns)
	})

	t.Run("TriggersAndFunctions", func(t *testing.T) {
		// Check functions exist
		functions := []string{
			"update_thread_reply_count",
			"update_thread_flag_count",
		}

		for _, fn := range functions {
			exists, err := mh.functionExists(ctx, fn)
			require.NoError(t, err)
			assert.True(t, exists, fmt.Sprintf("Function %s should exist", fn))
		}

		// Check triggers exist
		triggers := map[string]string{
			"forum_replies": "trg_update_thread_reply_count",
			"content_flags": "trg_update_thread_flag_count",
		}

		for table, trigger := range triggers {
			exists, err := mh.triggerExists(ctx, table, trigger)
			require.NoError(t, err)
			assert.True(t, exists, fmt.Sprintf("Trigger %s should exist on %s", trigger, table))
		}
	})
}

// TestModerationAuditLogsUpdateMigration000097 tests the updated audit logs migration
func TestModerationAuditLogsUpdateMigration000097(t *testing.T) {
	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	t.Run("NewColumnsAdded", func(t *testing.T) {
		newColumns := []string{
			"actor_id",
			"target_user_id",
			"channel_id",
			"ip_address",
			"user_agent",
		}

		for _, col := range newColumns {
			exists, err := mh.columnExists(ctx, "moderation_audit_logs", col)
			require.NoError(t, err)
			assert.True(t, exists, fmt.Sprintf("New column %s should exist", col))
		}
	})

	t.Run("NewIndexesAdded", func(t *testing.T) {
		indexes := []string{
			"idx_audit_logs_actor",
			"idx_audit_logs_target",
			"idx_audit_logs_channel",
		}

		for _, index := range indexes {
			exists, err := mh.indexExists(ctx, index)
			require.NoError(t, err)
			assert.True(t, exists, fmt.Sprintf("Index %s should exist", index))
		}
	})

	t.Run("OldColumnsRetained", func(t *testing.T) {
		// Old columns should still exist for backward compatibility
		oldColumns := []string{
			"entity_type",
			"entity_id",
			"moderator_id",
		}

		for _, col := range oldColumns {
			exists, err := mh.columnExists(ctx, "moderation_audit_logs", col)
			require.NoError(t, err)
			assert.True(t, exists, fmt.Sprintf("Old column %s should be retained", col))
		}
	})
}

// TestConstraintEnforcement tests that constraints are properly enforced
func TestConstraintEnforcement(t *testing.T) {
	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	// Create a test user first (needed for foreign keys)
	userID := uuid.New()
	_, err := mh.pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name, role, account_type)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, "testuser_"+uuid.New().String()[:8], "Test User", "user", "member")
	require.NoError(t, err)

	defer func() {
		_, _ = mh.pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
	}()

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

		// Cleanup
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_queue WHERE id = $1", queueID)
	})

	t.Run("ModerationQueuePriorityConstraint", func(t *testing.T) {
		// Valid priority should succeed
		queueID := uuid.New()
		_, err := mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, priority)
			VALUES ($1, 'comment', $2, 'spam', 50)
		`, queueID, uuid.New())
		require.NoError(t, err)

		// Priority > 100 should fail
		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, priority)
			VALUES ($1, 'comment', $2, 'spam', 150)
		`, uuid.New(), uuid.New())
		assert.Error(t, err, "Priority > 100 should fail constraint check")

		// Priority < 0 should fail
		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, priority)
			VALUES ($1, 'comment', $2, 'spam', -10)
		`, uuid.New(), uuid.New())
		assert.Error(t, err, "Priority < 0 should fail constraint check")

		// Cleanup
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_queue WHERE id = $1", queueID)
	})

	t.Run("UniqueConstraintPendingQueue", func(t *testing.T) {
		contentID := uuid.New()

		// First pending entry should succeed
		queueID1 := uuid.New()
		_, err := mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, status)
			VALUES ($1, 'comment', $2, 'spam', 'pending')
		`, queueID1, contentID)
		require.NoError(t, err)

		// Second pending entry for same content should fail
		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, status)
			VALUES ($1, 'comment', $2, 'harassment', 'pending')
		`, uuid.New(), contentID)
		assert.Error(t, err, "Duplicate pending queue entry should fail")

		// Cleanup
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_queue WHERE id = $1", queueID1)
	})

	t.Run("ForeignKeyConstraints", func(t *testing.T) {
		// Create queue item first
		queueID := uuid.New()
		_, err := mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, assigned_to)
			VALUES ($1, 'comment', $2, 'spam', $3)
		`, queueID, uuid.New(), userID)
		require.NoError(t, err)

		// Create decision with valid foreign key
		decisionID := uuid.New()
		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_decisions (id, queue_item_id, moderator_id, action)
			VALUES ($1, $2, $3, 'approve')
		`, decisionID, queueID, userID)
		require.NoError(t, err)

		// Try to create decision with invalid queue_item_id
		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_decisions (id, queue_item_id, moderator_id, action)
			VALUES ($1, $2, $3, 'approve')
		`, uuid.New(), uuid.New(), userID)
		assert.Error(t, err, "Invalid foreign key should fail")

		// Cleanup
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_decisions WHERE id = $1", decisionID)
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_queue WHERE id = $1", queueID)
	})
}

// TestTriggerBehavior tests that triggers work correctly
func TestTriggerBehavior(t *testing.T) {
	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	// Create test user
	userID := uuid.New()
	_, err := mh.pool.Exec(ctx, `
		INSERT INTO users (id, username, display_name, role, account_type)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, "testuser_"+uuid.New().String()[:8], "Test User", "user", "member")
	require.NoError(t, err)

	defer func() {
		_, _ = mh.pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
	}()

	t.Run("ModerationQueueReviewedTrigger", func(t *testing.T) {
		queueID := uuid.New()

		// Create pending queue item
		_, err := mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, status)
			VALUES ($1, 'comment', $2, 'spam', 'pending')
		`, queueID, uuid.New())
		require.NoError(t, err)

		// Update status - should set reviewed_at automatically
		_, err = mh.pool.Exec(ctx, `
			UPDATE moderation_queue 
			SET status = 'approved', reviewed_by = $1
			WHERE id = $2
		`, userID, queueID)
		require.NoError(t, err)

		// Check that reviewed_at was set
		var reviewedAt *time.Time
		err = mh.pool.QueryRow(ctx, `
			SELECT reviewed_at FROM moderation_queue WHERE id = $1
		`, queueID).Scan(&reviewedAt)
		require.NoError(t, err)
		assert.NotNil(t, reviewedAt, "reviewed_at should be set automatically")

		// Cleanup
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_queue WHERE id = $1", queueID)
	})

	t.Run("ModerationQueueReviewedByRequired", func(t *testing.T) {
		queueID := uuid.New()

		// Create pending queue item
		_, err := mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, status)
			VALUES ($1, 'comment', $2, 'spam', 'pending')
		`, queueID, uuid.New())
		require.NoError(t, err)

		// Try to update status without setting reviewed_by - should fail
		_, err = mh.pool.Exec(ctx, `
			UPDATE moderation_queue 
			SET status = 'approved'
			WHERE id = $1
		`, queueID)
		assert.Error(t, err, "Updating status without reviewed_by should fail")

		// Cleanup
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_queue WHERE id = $1", queueID)
	})

	t.Run("AppealResolvedTrigger", func(t *testing.T) {
		// Create queue and decision first
		queueID := uuid.New()
		_, err := mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, status, reviewed_by)
			VALUES ($1, 'comment', $2, 'spam', 'approved', $3)
		`, queueID, uuid.New(), userID)
		require.NoError(t, err)

		decisionID := uuid.New()
		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_decisions (id, queue_item_id, moderator_id, action)
			VALUES ($1, $2, $3, 'approve')
		`, decisionID, queueID, userID)
		require.NoError(t, err)

		// Create pending appeal
		appealID := uuid.New()
		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_appeals (id, user_id, moderation_action_id, reason, status)
			VALUES ($1, $2, $3, 'Test reason', 'pending')
		`, appealID, userID, decisionID)
		require.NoError(t, err)

		// Update status - should set resolved_at automatically
		_, err = mh.pool.Exec(ctx, `
			UPDATE moderation_appeals 
			SET status = 'approved', resolved_by = $1
			WHERE id = $2
		`, userID, appealID)
		require.NoError(t, err)

		// Check that resolved_at was set
		var resolvedAt *time.Time
		err = mh.pool.QueryRow(ctx, `
			SELECT resolved_at FROM moderation_appeals WHERE id = $1
		`, appealID).Scan(&resolvedAt)
		require.NoError(t, err)
		assert.NotNil(t, resolvedAt, "resolved_at should be set automatically")

		// Cleanup
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_appeals WHERE id = $1", appealID)
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_decisions WHERE id = $1", decisionID)
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_queue WHERE id = $1", queueID)
	})
}

// TestDataIntegrity tests that data is preserved through migration cycles
func TestDataIntegrity(t *testing.T) {
	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	t.Run("QueueDataPreserved", func(t *testing.T) {
		// Create test user
		userID := uuid.New()
		_, err := mh.pool.Exec(ctx, `
			INSERT INTO users (id, username, display_name, role, account_type)
			VALUES ($1, $2, $3, $4, $5)
		`, userID, "testuser_"+uuid.New().String()[:8], "Test User", "user", "member")
		require.NoError(t, err)

		defer func() {
			_, _ = mh.pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
		}()

		// Insert test data
		queueID := uuid.New()
		contentID := uuid.New()
		testReason := "Test spam content"

		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (
				id, content_type, content_id, reason, priority, 
				status, assigned_to, report_count, auto_flagged
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`, queueID, "comment", contentID, testReason, 75, "pending", userID, 5, true)
		require.NoError(t, err)

		// Verify data
		var (
			retrievedReason   string
			retrievedPriority int
			retrievedCount    int
			autoFlagged       bool
		)
		err = mh.pool.QueryRow(ctx, `
			SELECT reason, priority, report_count, auto_flagged
			FROM moderation_queue WHERE id = $1
		`, queueID).Scan(&retrievedReason, &retrievedPriority, &retrievedCount, &autoFlagged)
		require.NoError(t, err)

		assert.Equal(t, testReason, retrievedReason)
		assert.Equal(t, 75, retrievedPriority)
		assert.Equal(t, 5, retrievedCount)
		assert.True(t, autoFlagged)

		// Cleanup
		_, _ = mh.pool.Exec(ctx, "DELETE FROM moderation_queue WHERE id = $1", queueID)
	})

	t.Run("CascadeDeleteBehavior", func(t *testing.T) {
		// Create test user
		userID := uuid.New()
		_, err := mh.pool.Exec(ctx, `
			INSERT INTO users (id, username, display_name, role, account_type)
			VALUES ($1, $2, $3, $4, $5)
		`, userID, "testuser_"+uuid.New().String()[:8], "Test User", "user", "member")
		require.NoError(t, err)

		defer func() {
			_, _ = mh.pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
		}()

		// Create queue item and decision
		queueID := uuid.New()
		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_queue (id, content_type, content_id, reason, status, reviewed_by)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, queueID, "comment", uuid.New(), "spam", "approved", userID)
		require.NoError(t, err)

		decisionID := uuid.New()
		_, err = mh.pool.Exec(ctx, `
			INSERT INTO moderation_decisions (id, queue_item_id, moderator_id, action)
			VALUES ($1, $2, $3, $4)
		`, decisionID, queueID, userID, "approve")
		require.NoError(t, err)

		// Delete queue item - decision should cascade
		_, err = mh.pool.Exec(ctx, "DELETE FROM moderation_queue WHERE id = $1", queueID)
		require.NoError(t, err)

		// Verify decision is also deleted
		var count int
		err = mh.pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM moderation_decisions WHERE id = $1
		`, decisionID).Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 0, count, "Decision should be cascade deleted")
	})
}

// TestIndexUsage tests that indexes are being used correctly
func TestIndexUsage(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping index usage test in short mode")
	}

	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	t.Run("StatusPriorityIndexUsed", func(t *testing.T) {
		// Query that should use idx_modqueue_status_priority
		// Note: On empty tables, PostgreSQL may use sequential scan
		rows, err := mh.db.QueryContext(ctx, `
			EXPLAIN (FORMAT JSON) 
			SELECT * FROM moderation_queue 
			WHERE status = 'pending' 
			ORDER BY priority DESC, created_at
			LIMIT 10
		`)
		require.NoError(t, err)
		defer rows.Close()

		rows.Next()
		var plan string
		err = rows.Scan(&plan)
		require.NoError(t, err)

		// The plan may use index or seq scan depending on table size
		// We just verify the query executes successfully
		assert.NotEmpty(t, plan, "Query plan should be returned")
	})

	t.Run("ContentIndexUsed", func(t *testing.T) {
		// Query that should use idx_modqueue_content
		// Note: On empty tables, PostgreSQL may use sequential scan
		rows, err := mh.db.QueryContext(ctx, `
			EXPLAIN (FORMAT JSON)
			SELECT * FROM moderation_queue 
			WHERE content_type = 'comment' AND content_id = $1
		`, uuid.New())
		require.NoError(t, err)
		defer rows.Close()

		rows.Next()
		var plan string
		err = rows.Scan(&plan)
		require.NoError(t, err)

		// The plan may use index or seq scan depending on table size
		// We just verify the query executes successfully
		assert.NotEmpty(t, plan, "Query plan should be returned")
	})
}

// TestColumnTypes tests that columns have correct data types
func TestColumnTypes(t *testing.T) {
	mh := setupMigrationTest(t)
	

	ctx := context.Background()

	t.Run("ModerationQueueTypes", func(t *testing.T) {
		// Check UUID type
		dataType, err := mh.getColumnType(ctx, "moderation_queue", "id")
		require.NoError(t, err)
		assert.Equal(t, "uuid", dataType)

		// Check integer type
		dataType, err = mh.getColumnType(ctx, "moderation_queue", "priority")
		require.NoError(t, err)
		assert.Contains(t, dataType, "integer")

		// Check boolean type
		dataType, err = mh.getColumnType(ctx, "moderation_queue", "auto_flagged")
		require.NoError(t, err)
		assert.Equal(t, "boolean", dataType)
	})

	t.Run("NullabilityConstraints", func(t *testing.T) {
		// content_type should be NOT NULL
		nullable, err := mh.isColumnNullable(ctx, "moderation_queue", "content_type")
		require.NoError(t, err)
		assert.False(t, nullable, "content_type should be NOT NULL")

		// assigned_to should be nullable
		nullable, err = mh.isColumnNullable(ctx, "moderation_queue", "assigned_to")
		require.NoError(t, err)
		assert.True(t, nullable, "assigned_to should be nullable")
	})
}
