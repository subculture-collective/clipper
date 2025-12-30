//go:build integration

package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/middleware"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// setupAdminTestRouter creates a test router with admin user management routes
func setupAdminTestRouter(t *testing.T) (*gin.Engine, *services.AuthService, *database.DB, *redispkg.Client, *jwtpkg.Manager, *repository.AuditLogRepository) {
	gin.SetMode(gin.TestMode)

	// Load test configuration
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
		JWT: config.JWTConfig{
			PrivateKey: testutil.GenerateTestJWTKey(t),
		},
	}

	// Initialize database
	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err, "Failed to connect to test database")

	// Initialize Redis
	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err, "Failed to connect to test Redis")

	// Initialize JWT manager
	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err, "Failed to initialize JWT manager")

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	// Initialize handlers
	adminUserHandler := handlers.NewAdminUserHandler(userRepo, auditLogRepo, authService)

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	// Admin user management routes
	admin := r.Group("/api/v1/admin/users")
	admin.Use(middleware.AuthMiddleware(authService))
	admin.Use(middleware.RequirePermission(models.PermissionManageUsers))
	{
		admin.GET("", adminUserHandler.ListUsers)
		admin.POST("/:id/ban", adminUserHandler.BanUser)
		admin.POST("/:id/unban", adminUserHandler.UnbanUser)
		admin.PATCH("/:id/role", adminUserHandler.UpdateUserRole)
		admin.PATCH("/:id/karma", adminUserHandler.UpdateUserKarma)
		admin.POST("/:id/suspend-comments", adminUserHandler.SuspendCommentPrivileges)
		admin.POST("/:id/lift-comment-suspension", adminUserHandler.LiftCommentSuspension)
		admin.GET("/:id/comment-suspension-history", adminUserHandler.GetCommentSuspensionHistory)
		admin.POST("/:id/toggle-comment-review", adminUserHandler.ToggleCommentReview)
	}

	return r, authService, db, redisClient, jwtManager, auditLogRepo
}

// verifyAuditLog checks that an audit log entry was created with expected values
func verifyAuditLog(t *testing.T, db *database.DB, auditLogRepo *repository.AuditLogRepository, action string, entityID uuid.UUID, moderatorID uuid.UUID) {
	ctx := context.Background()
	
	// Query audit logs for this specific action and entity
	var logs []*models.ModerationAuditLog
	query := `
		SELECT id, action, entity_type, entity_id, moderator_id, reason, created_at
		FROM moderation_audit_logs
		WHERE action = $1 AND entity_id = $2 AND moderator_id = $3
		ORDER BY created_at DESC
		LIMIT 1
	`
	rows, err := db.Pool.Query(ctx, query, action, entityID, moderatorID)
	require.NoError(t, err, "Failed to query audit logs")
	defer rows.Close()

	for rows.Next() {
		var log models.ModerationAuditLog
		err := rows.Scan(&log.ID, &log.Action, &log.EntityType, &log.EntityID, &log.ModeratorID, &log.Reason, &log.CreatedAt)
		require.NoError(t, err, "Failed to scan audit log")
		logs = append(logs, &log)
	}

	require.NotEmpty(t, logs, "Expected audit log entry not found for action: %s", action)
	
	log := logs[0]
	assert.Equal(t, action, log.Action, "Audit log action mismatch")
	assert.Equal(t, "user", log.EntityType, "Audit log entity type should be 'user'")
	assert.Equal(t, entityID, log.EntityID, "Audit log entity ID mismatch")
	assert.Equal(t, moderatorID, log.ModeratorID, "Audit log moderator ID mismatch")
	assert.NotNil(t, log.Reason, "Audit log reason should not be nil")
	assert.WithinDuration(t, time.Now(), log.CreatedAt, 5*time.Second, "Audit log should be recent")
}

// ==============================================================================
// Authorization Tests
// ==============================================================================

func TestAdminUserManagement_Authorization(t *testing.T) {
	router, _, db, redisClient, jwtManager, _ := setupAdminTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("NonAdmin_Receives403", func(t *testing.T) {
		// Create a regular user (non-admin)
		regularUser := testutil.CreateTestUser(t, db, fmt.Sprintf("regularuser%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, regularUser.ID)

		// Create a target user to try to modify
		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("targetuser%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate token for regular user
		token, _ := testutil.GenerateTestTokens(t, jwtManager, regularUser.ID, regularUser.Role)

		// Try to ban a user (should fail with 403)
		reqBody := map[string]string{"reason": "Test ban"}
		body, _ := json.Marshal(reqBody)
		
		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/v1/admin/users/%s/ban", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code, "Regular user should receive 403 Forbidden")
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "error")
	})

	t.Run("AdminAccountType_HasAccess", func(t *testing.T) {
		// Create an admin user (using account_type = 'admin' which grants PermissionManageUsers)
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		// Create a target user to modify
		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate token for admin user
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Try to list users (should succeed)
		req, _ := http.NewRequest("GET", "/api/v1/admin/users", nil)
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Admin should be able to list users")
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "users")
	})

	t.Run("ModeratorAccountType_HasAccess", func(t *testing.T) {
		// Create a moderator user (account_type = 'moderator' also has PermissionManageUsers)
		moderatorUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("moderator%d", time.Now().UnixNano()), "moderator")
		defer testutil.CleanupTestUser(t, db, moderatorUser.ID)

		// Create a target user to modify
		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate token for moderator user
		token, _ := testutil.GenerateTestTokens(t, jwtManager, moderatorUser.ID, moderatorUser.Role)

		// Try to list users (should succeed)
		req, _ := http.NewRequest("GET", "/api/v1/admin/users", nil)
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Moderator should be able to list users")
	})

	t.Run("PrivilegeEscalation_Rejected", func(t *testing.T) {
		// Create a regular user who will try to escalate privileges
		regularUser := testutil.CreateTestUser(t, db, fmt.Sprintf("escalator%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, regularUser.ID)

		// Create an admin to perform the actual operation
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("legitadmin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		// Regular user tries to change their own role to admin (should fail with 403)
		token, _ := testutil.GenerateTestTokens(t, jwtManager, regularUser.ID, regularUser.Role)

		reqBody := map[string]string{
			"role":   "admin",
			"reason": "Self-promotion attempt",
		}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("PATCH", fmt.Sprintf("/api/v1/admin/users/%s/role", regularUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code, "User should not be able to self-escalate privileges")

		// Verify the user's role did not change
		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)
		updatedUser, err := userRepo.GetByID(ctx, regularUser.ID)
		require.NoError(t, err)
		assert.Equal(t, "user", updatedUser.Role, "User role should remain unchanged")
	})

	t.Run("Unauthenticated_Receives401", func(t *testing.T) {
		// Try to access admin endpoint without authentication
		req, _ := http.NewRequest("GET", "/api/v1/admin/users", nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code, "Unauthenticated request should receive 401")
	})
}

// ==============================================================================
// Role Management Tests
// ==============================================================================

func TestAdminUserManagement_RoleManagement(t *testing.T) {
	router, _, db, redisClient, jwtManager, auditLogRepo := setupAdminTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("UpdateUserRole_Success", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Update target user's role to moderator
		reqBody := map[string]string{
			"role":   "moderator",
			"reason": "Promoting to moderator for good behavior",
		}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("PATCH", fmt.Sprintf("/api/v1/admin/users/%s/role", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Role update should succeed")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "User role updated successfully", response["message"])

		// Verify role persisted in database
		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)
		updatedUser, err := userRepo.GetByID(ctx, targetUser.ID)
		require.NoError(t, err)
		assert.Equal(t, "moderator", updatedUser.Role, "Role should be updated in database")

		// Verify audit log entry was created
		verifyAuditLog(t, db, auditLogRepo, "update_user_role", targetUser.ID, adminUser.ID)
	})

	t.Run("UpdateUserRole_InvalidRole_Rejected", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Try to set an invalid role
		reqBody := map[string]string{
			"role":   "superadmin", // Invalid role
			"reason": "Testing invalid role",
		}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("PATCH", fmt.Sprintf("/api/v1/admin/users/%s/role", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code, "Invalid role should be rejected")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response["error"], "Invalid role")
	})

	t.Run("RoleChange_PermissionsApplyImmediately", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Verify target user initially cannot access admin endpoints
		userToken, _ := testutil.GenerateTestTokens(t, jwtManager, targetUser.ID, targetUser.Role)
		req, _ := http.NewRequest("GET", "/api/v1/admin/users", nil)
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", userToken))

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusForbidden, w.Code, "User should not have admin access initially")

		// Promote user to admin account type
		ctx := context.Background()
		_, err := db.Pool.Exec(ctx, "UPDATE users SET account_type = $1 WHERE id = $2", "admin", targetUser.ID)
		require.NoError(t, err)

		// Generate new token with user role (permissions come from account_type in middleware)
		newToken, _ := testutil.GenerateTestTokens(t, jwtManager, targetUser.ID, "user")

		// Verify user now has admin access
		req, _ = http.NewRequest("GET", "/api/v1/admin/users", nil)
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", newToken))

		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code, "User with admin account_type should have access")
	})
}

// ==============================================================================
// Ban/Unban Tests
// ==============================================================================

func TestAdminUserManagement_BanUnban(t *testing.T) {
	router, _, db, redisClient, jwtManager, auditLogRepo := setupAdminTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("BanUser_Success", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Ban the target user
		reqBody := map[string]string{"reason": "Violating community guidelines"}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/v1/admin/users/%s/ban", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Ban should succeed")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "User banned successfully", response["message"])

		// Verify user is banned in database
		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)
		bannedUser, err := userRepo.GetByID(ctx, targetUser.ID)
		require.NoError(t, err)
		assert.True(t, bannedUser.IsBanned, "User should be marked as banned")

		// Verify audit log entry
		verifyAuditLog(t, db, auditLogRepo, "ban_user", targetUser.ID, adminUser.ID)
	})

	t.Run("UnbanUser_Success", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Ban the user first
		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)
		err := userRepo.BanUser(ctx, targetUser.ID)
		require.NoError(t, err)

		// Verify user is banned
		bannedUser, err := userRepo.GetByID(ctx, targetUser.ID)
		require.NoError(t, err)
		assert.True(t, bannedUser.IsBanned)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Unban the user
		reqBody := map[string]string{"reason": "Ban appeal approved"}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/v1/admin/users/%s/unban", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Unban should succeed")

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "User unbanned successfully", response["message"])

		// Verify user is no longer banned
		unbannedUser, err := userRepo.GetByID(ctx, targetUser.ID)
		require.NoError(t, err)
		assert.False(t, unbannedUser.IsBanned, "User should no longer be banned")

		// Verify audit log entry
		verifyAuditLog(t, db, auditLogRepo, "unban_user", targetUser.ID, adminUser.ID)
	})

	t.Run("BanUser_InvalidUserID_Returns400", func(t *testing.T) {
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		reqBody := map[string]string{"reason": "Test"}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/admin/users/invalid-uuid/ban", bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code, "Invalid UUID should return 400")
	})
}

// ==============================================================================
// Comment Suspension Tests
// ==============================================================================

func TestAdminUserManagement_CommentSuspension(t *testing.T) {
	router, _, db, redisClient, jwtManager, auditLogRepo := setupAdminTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("SuspendCommentPrivileges_Temporary_Success", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Suspend comment privileges temporarily
		durationHours := 24
		reqBody := map[string]interface{}{
			"suspension_type": "temporary",
			"reason":          "Spam comments",
			"duration_hours":  durationHours,
		}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/v1/admin/users/%s/suspend-comments", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Comment suspension should succeed")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "Comment privileges suspended successfully", response["message"])
		assert.Equal(t, "temporary", response["suspension_type"])

		// Verify audit log entry
		verifyAuditLog(t, db, auditLogRepo, "suspend_comment_privileges", targetUser.ID, adminUser.ID)
	})

	t.Run("SuspendCommentPrivileges_Permanent_Success", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Suspend comment privileges permanently
		reqBody := map[string]interface{}{
			"suspension_type": "permanent",
			"reason":          "Repeated severe violations",
		}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/v1/admin/users/%s/suspend-comments", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Permanent comment suspension should succeed")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "Comment privileges suspended successfully", response["message"])
		assert.Equal(t, "permanent", response["suspension_type"])
	})

	t.Run("LiftCommentSuspension_Success", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Suspend comment privileges first
		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)
		durationHours := 24
		err := userRepo.SuspendCommentPrivileges(ctx, targetUser.ID, adminUser.ID, models.SuspensionTypeTemporary, "Test suspension", &durationHours)
		require.NoError(t, err)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Lift the suspension
		reqBody := map[string]string{"reason": "Good behavior restored"}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/v1/admin/users/%s/lift-comment-suspension", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Lifting suspension should succeed")

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "Comment suspension lifted successfully", response["message"])

		// Verify audit log entry
		verifyAuditLog(t, db, auditLogRepo, "lift_comment_suspension", targetUser.ID, adminUser.ID)
	})

	t.Run("GetCommentSuspensionHistory_Success", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Create suspension history
		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)
		durationHours := 24
		err := userRepo.SuspendCommentPrivileges(ctx, targetUser.ID, adminUser.ID, models.SuspensionTypeTemporary, "First suspension", &durationHours)
		require.NoError(t, err)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Get suspension history
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/v1/admin/users/%s/comment-suspension-history", targetUser.ID), nil)
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Get history should succeed")

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "history")
		assert.Contains(t, response, "count")
		
		count := int(response["count"].(float64))
		assert.GreaterOrEqual(t, count, 1, "Should have at least one suspension record")
	})
}

// ==============================================================================
// Other Admin Operations Tests
// ==============================================================================

func TestAdminUserManagement_OtherOperations(t *testing.T) {
	router, _, db, redisClient, jwtManager, auditLogRepo := setupAdminTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("UpdateUserKarma_Success", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Update karma
		reqBody := map[string]int{"karma_points": 500}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("PATCH", fmt.Sprintf("/api/v1/admin/users/%s/karma", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Karma update should succeed")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "User karma updated successfully", response["message"])
		assert.Equal(t, float64(500), response["karma_points"])

		// Verify karma persisted in database
		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)
		updatedUser, err := userRepo.GetByID(ctx, targetUser.ID)
		require.NoError(t, err)
		assert.Equal(t, 500, updatedUser.KarmaPoints, "Karma should be updated in database")

		// Verify audit log entry
		verifyAuditLog(t, db, auditLogRepo, "update_user_karma", targetUser.ID, adminUser.ID)
	})

	t.Run("ToggleCommentReview_Enable_Success", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Enable comment review requirement
		reqBody := map[string]interface{}{
			"require_review": true,
			"reason":         "Suspicious activity detected",
		}
		body, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", fmt.Sprintf("/api/v1/admin/users/%s/toggle-comment-review", targetUser.ID), bytes.NewBuffer(body))
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Toggle comment review should succeed")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "Comment review requirement updated successfully", response["message"])
		assert.Equal(t, true, response["require_review"])

		// Verify audit log entry
		verifyAuditLog(t, db, auditLogRepo, "enable_comment_review", targetUser.ID, adminUser.ID)
	})

	t.Run("ListUsers_Success", func(t *testing.T) {
		// Create admin user
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		// Generate admin token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// List users
		req, _ := http.NewRequest("GET", "/api/v1/admin/users?per_page=10", nil)
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "List users should succeed")

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "users")
		assert.Contains(t, response, "total")
		assert.Contains(t, response, "page")
		assert.Contains(t, response, "per_page")
	})
}

// ==============================================================================
// Audit Logging Comprehensive Tests
// ==============================================================================

func TestAdminUserManagement_AuditLogging(t *testing.T) {
	router, _, db, redisClient, jwtManager, auditLogRepo := setupAdminTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("AllOperations_CreateAuditLogs", func(t *testing.T) {
		// Create admin and target users
		adminUser := testutil.CreateTestUserWithAccountType(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()), "admin")
		defer testutil.CleanupTestUser(t, db, adminUser.ID)

		targetUser := testutil.CreateTestUser(t, db, fmt.Sprintf("target%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, db, targetUser.ID)

		token, _ := testutil.GenerateTestTokens(t, jwtManager, adminUser.ID, adminUser.Role)

		// Test each operation and verify audit log
		operations := []struct {
			name     string
			method   string
			path     string
			body     map[string]interface{}
			action   string
		}{
			{
				name:   "BanUser",
				method: "POST",
				path:   fmt.Sprintf("/api/v1/admin/users/%s/ban", targetUser.ID),
				body:   map[string]interface{}{"reason": "Test ban"},
				action: "ban_user",
			},
			{
				name:   "UnbanUser",
				method: "POST",
				path:   fmt.Sprintf("/api/v1/admin/users/%s/unban", targetUser.ID),
				body:   map[string]interface{}{"reason": "Test unban"},
				action: "unban_user",
			},
			{
				name:   "UpdateRole",
				method: "PATCH",
				path:   fmt.Sprintf("/api/v1/admin/users/%s/role", targetUser.ID),
				body:   map[string]interface{}{"role": "moderator", "reason": "Test role change"},
				action: "update_user_role",
			},
			{
				name:   "UpdateKarma",
				method: "PATCH",
				path:   fmt.Sprintf("/api/v1/admin/users/%s/karma", targetUser.ID),
				body:   map[string]interface{}{"karma_points": 100},
				action: "update_user_karma",
			},
		}

		for _, op := range operations {
			t.Run(op.name, func(t *testing.T) {
				body, _ := json.Marshal(op.body)
				req, _ := http.NewRequest(op.method, op.path, bytes.NewBuffer(body))
				req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
				req.Header.Set("Content-Type", "application/json")

				w := httptest.NewRecorder()
				router.ServeHTTP(w, req)

				assert.Equal(t, http.StatusOK, w.Code, "%s should succeed", op.name)

				// Verify audit log was created
				verifyAuditLog(t, db, auditLogRepo, op.action, targetUser.ID, adminUser.ID)
			})
		}
	})
}
