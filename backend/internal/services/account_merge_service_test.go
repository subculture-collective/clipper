//go:build integration

package services

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/database"
	"github.com/subculture-collective/clipper/config"
)

// setupTestDB creates a test database connection
func setupTestDB(t *testing.T) *database.DB {
	// Use environment variables for test database configuration
	host := os.Getenv("TEST_DATABASE_HOST")
	if host == "" {
		host = "localhost"
	}
	
	port := os.Getenv("TEST_DATABASE_PORT")
	if port == "" {
		port = "5437" // Default test database port
	}
	portInt, err := strconv.Atoi(port)
	require.NoError(t, err, "Invalid TEST_DATABASE_PORT")
	
	user := os.Getenv("TEST_DATABASE_USER")
	if user == "" {
		user = "clipper"
	}
	
	password := os.Getenv("TEST_DATABASE_PASSWORD")
	if password == "" {
		password = "clipper_password"
	}
	
	dbName := os.Getenv("TEST_DATABASE_NAME")
	if dbName == "" {
		dbName = "clipper_test"
	}
	
	cfg := &config.DatabaseConfig{
		Host:     host,
		Port:     portInt,
		User:     user,
		Password: password,
		Database: dbName,
		SSLMode:  "disable",
	}

	db, err := database.NewDB(cfg)
	require.NoError(t, err, "Failed to connect to test database")

	return db
}

// createTestUser creates a test user with specified account status
func createTestUser(t *testing.T, db *database.DB, username string, accountStatus string) *models.User {
	user := &models.User{
		ID:            uuid.New(),
		Username:      username,
		DisplayName:   fmt.Sprintf("Test User %s", username),
		Email:         stringPtr(fmt.Sprintf("%s@test.com", username)),
		Role:          "user",
		AccountType:   models.AccountTypeMember,
		AccountStatus: accountStatus,
	}

	query := `
		INSERT INTO users (
			id, username, display_name, email, role, account_type, account_status
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := db.Pool.Exec(context.Background(), query,
		user.ID, user.Username, user.DisplayName, user.Email, user.Role, user.AccountType, user.AccountStatus,
	)
	require.NoError(t, err, "Failed to create test user")

	return user
}

// createTestClip creates a test clip submitted by a user
func createTestClip(t *testing.T, db *database.DB, userID uuid.UUID) uuid.UUID {
	clipID := uuid.New()
	query := `
		INSERT INTO clips (
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, broadcaster_name, submitted_by_user_id, submitted_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
	`

	_, err := db.Pool.Exec(context.Background(), query,
		clipID, fmt.Sprintf("clip_%s", clipID), "https://test.tv/clip", "https://test.tv/embed",
		"Test Clip", "TestCreator", "TestBroadcaster", userID,
	)
	require.NoError(t, err, "Failed to create test clip")

	return clipID
}

// createTestVote creates a test vote
func createTestVote(t *testing.T, db *database.DB, userID, clipID uuid.UUID, voteType int16) {
	query := `
		INSERT INTO votes (user_id, clip_id, vote_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, clip_id) DO NOTHING
	`

	_, err := db.Pool.Exec(context.Background(), query, userID, clipID, voteType)
	require.NoError(t, err, "Failed to create test vote")
}

// createTestFavorite creates a test favorite
func createTestFavorite(t *testing.T, db *database.DB, userID, clipID uuid.UUID) {
	query := `
		INSERT INTO favorites (user_id, clip_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, clip_id) DO NOTHING
	`

	_, err := db.Pool.Exec(context.Background(), query, userID, clipID)
	require.NoError(t, err, "Failed to create test favorite")
}

// createTestComment creates a test comment
func createTestComment(t *testing.T, db *database.DB, userID, clipID uuid.UUID) uuid.UUID {
	commentID := uuid.New()
	query := `
		INSERT INTO comments (id, clip_id, user_id, content)
		VALUES ($1, $2, $3, $4)
	`

	_, err := db.Pool.Exec(context.Background(), query, commentID, clipID, userID, "Test comment")
	require.NoError(t, err, "Failed to create test comment")

	return commentID
}

// countUserVotes counts votes for a user
func countUserVotes(t *testing.T, db *database.DB, userID uuid.UUID) int {
	var count int
	err := db.Pool.QueryRow(context.Background(),
		"SELECT COUNT(*) FROM votes WHERE user_id = $1", userID).Scan(&count)
	require.NoError(t, err)
	return count
}

// countUserFavorites counts favorites for a user
func countUserFavorites(t *testing.T, db *database.DB, userID uuid.UUID) int {
	var count int
	err := db.Pool.QueryRow(context.Background(),
		"SELECT COUNT(*) FROM favorites WHERE user_id = $1", userID).Scan(&count)
	require.NoError(t, err)
	return count
}

// countUserComments counts comments for a user
func countUserComments(t *testing.T, db *database.DB, userID uuid.UUID) int {
	var count int
	err := db.Pool.QueryRow(context.Background(),
		"SELECT COUNT(*) FROM comments WHERE user_id = $1", userID).Scan(&count)
	require.NoError(t, err)
	return count
}

// getAccountStatus gets the account status for a user
func getAccountStatus(t *testing.T, db *database.DB, userID uuid.UUID) string {
	var status string
	err := db.Pool.QueryRow(context.Background(),
		"SELECT account_status FROM users WHERE id = $1", userID).Scan(&status)
	require.NoError(t, err)
	return status
}

// stringPtr returns a pointer to a string
func stringPtr(s string) *string {
	return &s
}

func TestAccountMergeService_CompleteMerge(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)
	voteRepo := repository.NewVoteRepository(db.Pool)
	favoriteRepo := repository.NewFavoriteRepository(db.Pool)
	commentRepo := repository.NewCommentRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)
	watchHistoryRepo := repository.NewWatchHistoryRepository(db.Pool)

	// Initialize service
	service := NewAccountMergeService(
		db.Pool,
		userRepo,
		auditLogRepo,
		voteRepo,
		favoriteRepo,
		commentRepo,
		clipRepo,
		watchHistoryRepo,
	)

	t.Run("CompleteSuccessfulMerge", func(t *testing.T) {
		ctx := context.Background()

		// Create test users
		unclaimedUser := createTestUser(t, db, fmt.Sprintf("unclaimed_%d", time.Now().UnixNano()), "unclaimed")
		authUser := createTestUser(t, db, fmt.Sprintf("authenticated_%d", time.Now().UnixNano()), "active")

		// Create test data for unclaimed user
		clip1 := createTestClip(t, db, unclaimedUser.ID)
		clip2 := createTestClip(t, db, unclaimedUser.ID)
		createTestVote(t, db, unclaimedUser.ID, clip1, 1)
		createTestVote(t, db, unclaimedUser.ID, clip2, -1)
		createTestFavorite(t, db, unclaimedUser.ID, clip1)
		createTestComment(t, db, unclaimedUser.ID, clip1)

		// Verify initial counts
		assert.Equal(t, 2, countUserVotes(t, db, unclaimedUser.ID))
		assert.Equal(t, 1, countUserFavorites(t, db, unclaimedUser.ID))
		assert.Equal(t, 1, countUserComments(t, db, unclaimedUser.ID))
		assert.Equal(t, 0, countUserVotes(t, db, authUser.ID))

		// Perform merge
		result, err := service.MergeAccounts(ctx, unclaimedUser.ID, authUser.ID)
		require.NoError(t, err, "Merge should succeed")
		require.NotNil(t, result)
		assert.True(t, result.Success)

		// Verify merge results
		assert.Equal(t, 2, result.VotesMerged, "Should merge 2 votes")
		assert.Equal(t, 1, result.FavoritesMerged, "Should merge 1 favorite")
		assert.Equal(t, 1, result.CommentsMerged, "Should merge 1 comment")
		assert.Equal(t, 2, result.ClipsMerged, "Should merge 2 clips")

		// Verify data was transferred
		assert.Equal(t, 2, countUserVotes(t, db, authUser.ID))
		assert.Equal(t, 1, countUserFavorites(t, db, authUser.ID))
		assert.Equal(t, 1, countUserComments(t, db, authUser.ID))
		assert.Equal(t, 0, countUserVotes(t, db, unclaimedUser.ID))

		// Verify unclaimed account is marked as merged
		status := getAccountStatus(t, db, unclaimedUser.ID)
		assert.Equal(t, "merged", status)

		// Cleanup
		_, _ = db.Pool.Exec(ctx, "DELETE FROM comments WHERE user_id = $1", authUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM favorites WHERE user_id = $1", authUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM votes WHERE user_id = $1", authUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id IN ($1, $2)", clip1, clip2)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM users WHERE id IN ($1, $2)", unclaimedUser.ID, authUser.ID)
	})

	t.Run("MergeWithDuplicateVotes", func(t *testing.T) {
		ctx := context.Background()

		// Create test users
		unclaimedUser := createTestUser(t, db, fmt.Sprintf("unclaimed_%d", time.Now().UnixNano()), "unclaimed")
		authUser := createTestUser(t, db, fmt.Sprintf("authenticated_%d", time.Now().UnixNano()), "active")

		// Create shared clip
		clip1 := createTestClip(t, db, unclaimedUser.ID)

		// Both users vote on same clip (authenticated user upvoted, unclaimed downvoted)
		createTestVote(t, db, authUser.ID, clip1, 1)
		createTestVote(t, db, unclaimedUser.ID, clip1, -1)

		// Create additional vote for unclaimed user
		clip2 := createTestClip(t, db, unclaimedUser.ID)
		createTestVote(t, db, unclaimedUser.ID, clip2, 1)

		// Verify initial state
		assert.Equal(t, 1, countUserVotes(t, db, authUser.ID))
		assert.Equal(t, 2, countUserVotes(t, db, unclaimedUser.ID))

		// Perform merge
		result, err := service.MergeAccounts(ctx, unclaimedUser.ID, authUser.ID)
		require.NoError(t, err, "Merge should succeed")

		// Verify duplicate was skipped and authenticated vote was kept
		assert.Equal(t, 1, result.VotesMerged, "Should merge only 1 non-duplicate vote")
		assert.Equal(t, 1, result.DuplicatesSkipped, "Should skip 1 duplicate vote")
		assert.Equal(t, 2, countUserVotes(t, db, authUser.ID), "Auth user should have 2 votes total")
		assert.Equal(t, 0, countUserVotes(t, db, unclaimedUser.ID), "Unclaimed user should have 0 votes")

		// Verify the authenticated user's original vote is preserved
		var voteType int16
		err = db.Pool.QueryRow(ctx,
			"SELECT vote_type FROM votes WHERE user_id = $1 AND clip_id = $2",
			authUser.ID, clip1).Scan(&voteType)
		require.NoError(t, err)
		assert.Equal(t, int16(1), voteType, "Auth user's upvote should be preserved")

		// Cleanup
		_, _ = db.Pool.Exec(ctx, "DELETE FROM votes WHERE user_id = $1", authUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id IN ($1, $2)", clip1, clip2)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM users WHERE id IN ($1, $2)", unclaimedUser.ID, authUser.ID)
	})

	t.Run("MergeWithDuplicateFavorites", func(t *testing.T) {
		ctx := context.Background()

		// Create test users
		unclaimedUser := createTestUser(t, db, fmt.Sprintf("unclaimed_%d", time.Now().UnixNano()), "unclaimed")
		authUser := createTestUser(t, db, fmt.Sprintf("authenticated_%d", time.Now().UnixNano()), "active")

		// Create clips
		clip1 := createTestClip(t, db, unclaimedUser.ID)
		clip2 := createTestClip(t, db, unclaimedUser.ID)
		clip3 := createTestClip(t, db, unclaimedUser.ID)

		// Both users favorite clip1 and clip2, only unclaimed favorites clip3
		createTestFavorite(t, db, authUser.ID, clip1)
		createTestFavorite(t, db, authUser.ID, clip2)
		createTestFavorite(t, db, unclaimedUser.ID, clip1)
		createTestFavorite(t, db, unclaimedUser.ID, clip2)
		createTestFavorite(t, db, unclaimedUser.ID, clip3)

		// Verify initial state
		assert.Equal(t, 2, countUserFavorites(t, db, authUser.ID))
		assert.Equal(t, 3, countUserFavorites(t, db, unclaimedUser.ID))

		// Perform merge
		result, err := service.MergeAccounts(ctx, unclaimedUser.ID, authUser.ID)
		require.NoError(t, err, "Merge should succeed")

		// Verify union of favorites (2 duplicates removed, 1 new added)
		assert.Equal(t, 1, result.FavoritesMerged, "Should merge 1 unique favorite")
		assert.Equal(t, 2, result.DuplicatesSkipped, "Should skip 2 duplicate favorites")
		assert.Equal(t, 3, countUserFavorites(t, db, authUser.ID), "Auth user should have 3 favorites total")
		assert.Equal(t, 0, countUserFavorites(t, db, unclaimedUser.ID))

		// Cleanup
		_, _ = db.Pool.Exec(ctx, "DELETE FROM favorites WHERE user_id = $1", authUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id IN ($1, $2, $3)", clip1, clip2, clip3)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM users WHERE id IN ($1, $2)", unclaimedUser.ID, authUser.ID)
	})

	t.Run("MergeEmptyAccount", func(t *testing.T) {
		ctx := context.Background()

		// Create test users
		unclaimedUser := createTestUser(t, db, fmt.Sprintf("unclaimed_%d", time.Now().UnixNano()), "unclaimed")
		authUser := createTestUser(t, db, fmt.Sprintf("authenticated_%d", time.Now().UnixNano()), "active")

		// Don't create any data for unclaimed user

		// Perform merge
		result, err := service.MergeAccounts(ctx, unclaimedUser.ID, authUser.ID)
		require.NoError(t, err, "Merge should succeed even with empty account")
		require.NotNil(t, result)
		assert.True(t, result.Success)

		// Verify no data was transferred
		assert.Equal(t, 0, result.VotesMerged)
		assert.Equal(t, 0, result.FavoritesMerged)
		assert.Equal(t, 0, result.CommentsMerged)
		assert.Equal(t, 0, result.ClipsMerged)

		// Verify unclaimed account is still marked as merged
		status := getAccountStatus(t, db, unclaimedUser.ID)
		assert.Equal(t, "merged", status)

		// Cleanup
		_, _ = db.Pool.Exec(ctx, "DELETE FROM users WHERE id IN ($1, $2)", unclaimedUser.ID, authUser.ID)
	})

	t.Run("MergeAlreadyMergedAccount", func(t *testing.T) {
		ctx := context.Background()

		// Create test users
		unclaimedUser := createTestUser(t, db, fmt.Sprintf("unclaimed_%d", time.Now().UnixNano()), "merged")
		authUser := createTestUser(t, db, fmt.Sprintf("authenticated_%d", time.Now().UnixNano()), "active")

		// Create some data
		clip1 := createTestClip(t, db, unclaimedUser.ID)
		createTestVote(t, db, unclaimedUser.ID, clip1, 1)

		// Attempt merge (should still succeed but operate on already-merged account)
		result, err := service.MergeAccounts(ctx, unclaimedUser.ID, authUser.ID)
		require.NoError(t, err, "Merge should succeed")
		require.NotNil(t, result)

		// Data should still be transferred (status check is not part of merge logic)
		assert.Equal(t, 1, countUserVotes(t, db, authUser.ID))

		// Cleanup
		_, _ = db.Pool.Exec(ctx, "DELETE FROM votes WHERE user_id = $1", authUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = $1", clip1)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM users WHERE id IN ($1, $2)", unclaimedUser.ID, authUser.ID)
	})

	t.Run("TransactionRollbackOnError", func(t *testing.T) {
		ctx := context.Background()

		// Create test users
		unclaimedUser := createTestUser(t, db, fmt.Sprintf("unclaimed_%d", time.Now().UnixNano()), "unclaimed")
		authUser := createTestUser(t, db, fmt.Sprintf("authenticated_%d", time.Now().UnixNano()), "active")

		// Create test data
		clip1 := createTestClip(t, db, unclaimedUser.ID)
		createTestVote(t, db, unclaimedUser.ID, clip1, 1)

		// Verify initial state
		assert.Equal(t, 1, countUserVotes(t, db, unclaimedUser.ID))
		assert.Equal(t, 0, countUserVotes(t, db, authUser.ID))

		// Force an error by using invalid UUID (this should cause rollback)
		invalidUserID := uuid.Nil
		_, err := service.MergeAccounts(ctx, unclaimedUser.ID, invalidUserID)
		
		// Should get an error
		require.Error(t, err, "Merge should fail with invalid user ID")

		// Verify rollback - data should remain unchanged
		assert.Equal(t, 1, countUserVotes(t, db, unclaimedUser.ID), "Unclaimed votes should not be transferred")
		assert.Equal(t, 0, countUserVotes(t, db, invalidUserID), "Invalid user should have no votes")
		assert.Equal(t, "unclaimed", getAccountStatus(t, db, unclaimedUser.ID), "Status should not change")

		// Cleanup
		_, _ = db.Pool.Exec(ctx, "DELETE FROM votes WHERE user_id = $1", unclaimedUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = $1", clip1)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM users WHERE id = $1", unclaimedUser.ID)
	})

	t.Run("AuditLogVerification", func(t *testing.T) {
		ctx := context.Background()

		// Create test users
		unclaimedUser := createTestUser(t, db, fmt.Sprintf("unclaimed_%d", time.Now().UnixNano()), "unclaimed")
		authUser := createTestUser(t, db, fmt.Sprintf("authenticated_%d", time.Now().UnixNano()), "active")

		// Create test data
		clip1 := createTestClip(t, db, unclaimedUser.ID)
		createTestVote(t, db, unclaimedUser.ID, clip1, 1)
		createTestFavorite(t, db, unclaimedUser.ID, clip1)

		// Perform merge
		result, err := service.MergeAccounts(ctx, unclaimedUser.ID, authUser.ID)
		require.NoError(t, err, "Merge should succeed")
		require.NotNil(t, result)

		// Verify audit log was created
		var auditCount int
		err = db.Pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM moderation_audit_logs 
			 WHERE action = 'account_merged' 
			 AND entity_id = $1 
			 AND entity_type = 'user'`,
			authUser.ID).Scan(&auditCount)
		require.NoError(t, err)
		assert.Equal(t, 1, auditCount, "Should have 1 audit log entry")

		// Cleanup
		_, _ = db.Pool.Exec(ctx, "DELETE FROM moderation_audit_logs WHERE entity_id = $1", authUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM favorites WHERE user_id = $1", authUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM votes WHERE user_id = $1", authUser.ID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = $1", clip1)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM users WHERE id IN ($1, $2)", unclaimedUser.ID, authUser.ID)
	})
}
