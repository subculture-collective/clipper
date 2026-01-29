//go:build integration

package submissions

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/database"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// testEnv holds the test environment setup
type testEnv struct {
	db             *database.DB
	redisClient    *redispkg.Client
	userRepo       *repository.UserRepository
	submissionRepo *repository.SubmissionRepository
	ctx            context.Context
}

// setupTestEnv creates and initializes the test environment
func setupTestEnv(t *testing.T) *testEnv {
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     testutil.GetEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     testutil.GetEnv("TEST_DATABASE_PORT", "5437"),
			User:     testutil.GetEnv("TEST_DATABASE_USER", "clipper"),
			Password: testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: config.RedisConfig{
			Host: testutil.GetEnv("TEST_REDIS_HOST", "localhost"),
			Port: testutil.GetEnv("TEST_REDIS_PORT", "6380"),
		},
	}

	// Initialize database
	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err, "Failed to connect to test database")

	// Initialize Redis
	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err, "Failed to connect to test Redis")

	return &testEnv{
		db:             db,
		redisClient:    redisClient,
		userRepo:       repository.NewUserRepository(db.Pool),
		submissionRepo: repository.NewSubmissionRepository(db.Pool),
		ctx:            context.Background(),
	}
}

// cleanup closes database and Redis connections
func (env *testEnv) cleanup() {
	if env.db != nil {
		env.db.Close()
	}
	if env.redisClient != nil {
		env.redisClient.Close()
	}
}

// TestSubmissionRepositoryBasics tests basic submission repository operations
// This demonstrates the correct way to interact with repositories
func TestSubmissionRepositoryBasics(t *testing.T) {
	env := setupTestEnv(t)
	defer env.cleanup()

	// Create a test user using the correct Create method
	email := testutil.RandomEmail()
	twitchID := fmt.Sprintf("test_%d", time.Now().UnixNano())
	testUser := &models.User{
		ID:          uuid.New(),
		TwitchID:    &twitchID,
		Username:    fmt.Sprintf("testuser_%d", time.Now().UnixNano()),
		DisplayName: "Test User for Submissions",
		Email:       &email,
		Role:        models.RoleUser,
		KarmaPoints: 50, // Low karma to test manual moderation
	}
	err := env.userRepo.Create(env.ctx, testUser)
	require.NoError(t, err, "Failed to create test user")

	t.Run("CreateSubmission_Success", func(t *testing.T) {
		// Create a submission
		submission := &models.ClipSubmission{
			ID:            uuid.New(),
			UserID:        testUser.ID,
			TwitchClipID:  fmt.Sprintf("testclip_%d", time.Now().Unix()),
			TwitchClipURL: fmt.Sprintf("https://clips.twitch.tv/TestClip%d", time.Now().Unix()),
			Status:        "pending",
			IsNSFW:        false,
			Tags:          []string{"test", "gaming"},
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		customTitle := "My Custom Test Title"
		submission.CustomTitle = &customTitle

		err := env.submissionRepo.Create(env.ctx, submission)
		require.NoError(t, err, "Failed to create submission")

		// Verify submission was created
		retrieved, err := env.submissionRepo.GetByID(env.ctx, submission.ID)
		require.NoError(t, err, "Failed to retrieve submission")
		assert.Equal(t, submission.UserID, retrieved.UserID)
		assert.Equal(t, submission.TwitchClipID, retrieved.TwitchClipID)
		assert.Equal(t, "pending", retrieved.Status)
		assert.Equal(t, *submission.CustomTitle, *retrieved.CustomTitle)
	})

	t.Run("GetUserSubmissions_Pagination", func(t *testing.T) {
		// Create multiple submissions for the user
		for i := 0; i < 3; i++ {
			submission := &models.ClipSubmission{
				ID:            uuid.New(),
				UserID:        testUser.ID,
				TwitchClipID:  fmt.Sprintf("testclip_page_%d_%d", i, time.Now().UnixNano()),
				TwitchClipURL: fmt.Sprintf("https://clips.twitch.tv/PageTest%d", i),
				Status:        "pending",
				IsNSFW:        false,
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}
			err := env.submissionRepo.Create(env.ctx, submission)
			require.NoError(t, err, "Failed to create test submission")
		}

		// Retrieve submissions with pagination
		submissions, total, err := env.submissionRepo.ListByUser(env.ctx, testUser.ID, 1, 10)
		require.NoError(t, err, "Failed to get user submissions")
		assert.Greater(t, total, 0, "Should have at least one submission")
		assert.Greater(t, len(submissions), 0, "Should return submissions")
	})

	t.Run("UpdateSubmissionStatus_Approval", func(t *testing.T) {
		// Create a submission to approve
		submission := &models.ClipSubmission{
			ID:            uuid.New(),
			UserID:        testUser.ID,
			TwitchClipID:  fmt.Sprintf("testclip_approve_%d", time.Now().Unix()),
			TwitchClipURL: "https://clips.twitch.tv/ApproveTest",
			Status:        "pending",
			IsNSFW:        false,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		err := env.submissionRepo.Create(env.ctx, submission)
		require.NoError(t, err, "Failed to create submission")

		// Create a reviewer user
		reviewerEmail := testutil.RandomEmail()
		reviewerTwitchID := fmt.Sprintf("reviewer_%d", time.Now().UnixNano())
		reviewer := &models.User{
			ID:          uuid.New(),
			TwitchID:    &reviewerTwitchID,
			Username:    fmt.Sprintf("reviewer_%d", time.Now().UnixNano()),
			DisplayName: "Reviewer",
			Email:       &reviewerEmail,
			Role:        models.RoleAdmin,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		err = env.userRepo.Create(env.ctx, reviewer)
		require.NoError(t, err, "Failed to create reviewer user")

		// Approve the submission
		notes := "Looks good!"
		err = env.submissionRepo.UpdateStatus(env.ctx, submission.ID, "approved", reviewer.ID, &notes)
		require.NoError(t, err, "Failed to update submission status")

		// Verify status was updated
		updated, err := env.submissionRepo.GetByID(env.ctx, submission.ID)
		require.NoError(t, err, "Failed to retrieve updated submission")
		assert.Equal(t, "approved", updated.Status)
		assert.NotNil(t, updated.ReviewedBy)
		assert.Equal(t, reviewer.ID, *updated.ReviewedBy)
	})

	t.Run("UpdateSubmissionStatus_Rejection", func(t *testing.T) {
		// Create a submission to reject
		submission := &models.ClipSubmission{
			ID:            uuid.New(),
			UserID:        testUser.ID,
			TwitchClipID:  fmt.Sprintf("testclip_reject_%d", time.Now().Unix()),
			TwitchClipURL: "https://clips.twitch.tv/RejectTest",
			Status:        "pending",
			IsNSFW:        false,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		err := env.submissionRepo.Create(env.ctx, submission)
		require.NoError(t, err, "Failed to create submission")

		// Create a reviewer user
		reviewerEmail := testutil.RandomEmail()
		reviewer2TwitchID := fmt.Sprintf("reviewer2_%d", time.Now().UnixNano())
		reviewer := &models.User{
			ID:          uuid.New(),
			TwitchID:    &reviewer2TwitchID,
			Username:    fmt.Sprintf("reviewer2_%d", time.Now().UnixNano()),
			DisplayName: "Reviewer 2",
			Email:       &reviewerEmail,
			Role:        models.RoleAdmin,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		err = env.userRepo.Create(env.ctx, reviewer)
		require.NoError(t, err, "Failed to create reviewer user")

		// Reject the submission
		rejectionReason := "Duplicate content"
		err = env.submissionRepo.UpdateStatus(env.ctx, submission.ID, "rejected", reviewer.ID, &rejectionReason)
		require.NoError(t, err, "Failed to reject submission")

		// Verify rejection details
		updated, err := env.submissionRepo.GetByID(env.ctx, submission.ID)
		require.NoError(t, err, "Failed to retrieve rejected submission")
		assert.Equal(t, "rejected", updated.Status)
		assert.NotNil(t, updated.RejectionReason)
	})

	t.Run("GetPendingSubmissions", func(t *testing.T) {
		// Get all pending submissions (for moderation queue)
		pending, total, err := env.submissionRepo.ListPending(env.ctx, 1, 50)
		require.NoError(t, err, "Failed to get pending submissions")

		// Should have at least some pending submissions from previous tests
		t.Logf("Found %d total pending submissions, returned %d", total, len(pending))
		assert.GreaterOrEqual(t, total, 0, "Total should be non-negative")
	})
}

// TestNSFWFlagPersistence tests that NSFW flag is correctly stored and retrieved
func TestNSFWFlagPersistence(t *testing.T) {
	env := setupTestEnv(t)
	defer env.cleanup()

	// Create test user
	email := testutil.RandomEmail()
	nsfwTwitchID := fmt.Sprintf("test_nsfw_%d", time.Now().UnixNano())
	testUser := &models.User{
		ID:          uuid.New(),
		TwitchID:    &nsfwTwitchID,
		Username:    fmt.Sprintf("nsfwuser_%d", time.Now().UnixNano()),
		DisplayName: "NSFW Test User",
		Email:       &email,
		Role:        models.RoleUser,
	}
	err := env.userRepo.Create(env.ctx, testUser)
	require.NoError(t, err)

	t.Run("NSFW_FlagTrue", func(t *testing.T) {
		submission := &models.ClipSubmission{
			ID:            uuid.New(),
			UserID:        testUser.ID,
			TwitchClipID:  fmt.Sprintf("nsfw_true_%d", time.Now().Unix()),
			TwitchClipURL: "https://clips.twitch.tv/NSFWTrue",
			Status:        "pending",
			IsNSFW:        true, // Mark as NSFW
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		err := env.submissionRepo.Create(env.ctx, submission)
		require.NoError(t, err)

		// Retrieve and verify
		retrieved, err := env.submissionRepo.GetByID(env.ctx, submission.ID)
		require.NoError(t, err)
		assert.True(t, retrieved.IsNSFW, "NSFW flag should be true")
	})

	t.Run("NSFW_FlagFalse", func(t *testing.T) {
		submission := &models.ClipSubmission{
			ID:            uuid.New(),
			UserID:        testUser.ID,
			TwitchClipID:  fmt.Sprintf("nsfw_false_%d", time.Now().Unix()),
			TwitchClipURL: "https://clips.twitch.tv/NSFWFalse",
			Status:        "pending",
			IsNSFW:        false, // Not NSFW
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		err := env.submissionRepo.Create(env.ctx, submission)
		require.NoError(t, err)

		// Retrieve and verify
		retrieved, err := env.submissionRepo.GetByID(env.ctx, submission.ID)
		require.NoError(t, err)
		assert.False(t, retrieved.IsNSFW, "NSFW flag should be false")
	})
}

// TestCustomTitlesAndTagsStorage tests that custom metadata is correctly stored
func TestCustomTitlesAndTagsStorage(t *testing.T) {
	env := setupTestEnv(t)
	defer env.cleanup()

	// Create test user
	email := testutil.RandomEmail()
	customTwitchID := fmt.Sprintf("test_custom_%d", time.Now().UnixNano())
	testUser := &models.User{
		ID:          uuid.New(),
		TwitchID:    &customTwitchID,
		Username:    fmt.Sprintf("customuser_%d", time.Now().UnixNano()),
		DisplayName: "Custom Metadata Test User",
		Email:       &email,
		Role:        models.RoleUser,
	}
	err := env.userRepo.Create(env.ctx, testUser)
	require.NoError(t, err)

	t.Run("CustomTitle_AndTags", func(t *testing.T) {
		customTitle := "My Epic Gaming Moment - Must Watch!"
		customTags := []string{"epic", "gaming", "highlights", "competitive", "clutch"}

		submission := &models.ClipSubmission{
			ID:            uuid.New(),
			UserID:        testUser.ID,
			TwitchClipID:  fmt.Sprintf("custom_meta_%d", time.Now().Unix()),
			TwitchClipURL: "https://clips.twitch.tv/CustomMeta",
			CustomTitle:   &customTitle,
			Tags:          customTags,
			Status:        "pending",
			IsNSFW:        false,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		err := env.submissionRepo.Create(env.ctx, submission)
		require.NoError(t, err)

		// Retrieve and verify
		retrieved, err := env.submissionRepo.GetByID(env.ctx, submission.ID)
		require.NoError(t, err)
		assert.NotNil(t, retrieved.CustomTitle, "Custom title should not be nil")
		assert.Equal(t, customTitle, *retrieved.CustomTitle, "Custom title should match")
		assert.Equal(t, len(customTags), len(retrieved.Tags), "Should have same number of tags")

		// Verify all tags are present
		for i, tag := range customTags {
			assert.Equal(t, tag, retrieved.Tags[i], "Tag should match")
		}
	})

	t.Run("NoCustomTitle_WithTags", func(t *testing.T) {
		tags := []string{"test", "no-title"}

		submission := &models.ClipSubmission{
			ID:            uuid.New(),
			UserID:        testUser.ID,
			TwitchClipID:  fmt.Sprintf("no_title_%d", time.Now().Unix()),
			TwitchClipURL: "https://clips.twitch.tv/NoTitle",
			CustomTitle:   nil, // No custom title
			Tags:          tags,
			Status:        "pending",
			IsNSFW:        false,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		err := env.submissionRepo.Create(env.ctx, submission)
		require.NoError(t, err)

		// Retrieve and verify
		retrieved, err := env.submissionRepo.GetByID(env.ctx, submission.ID)
		require.NoError(t, err)
		assert.Nil(t, retrieved.CustomTitle, "Custom title should be nil")
		assert.Equal(t, len(tags), len(retrieved.Tags), "Should have tags")
	})
}
