//go:build integration

package rbac

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

// AccessMatrix defines expected access for different user roles to an endpoint
type AccessMatrix struct {
Guest      int // Expected status code for guest (401)
User       int // Expected status code for regular user
Moderator  int // Expected status code for moderator
Admin      int // Expected status code for admin
}

// EndpointTestCase defines a test case for an endpoint
type EndpointTestCase struct {
Name           string       // Test name
Method         string       // HTTP method
Path           string       // URL path (can include placeholders)
Body           interface{}  // Request body
AccessMatrix   AccessMatrix // Expected status codes per role
SetupData      func(*testing.T, *database.DB) map[string]uuid.UUID // Setup test data, returns IDs
CleanupData    func(*testing.T, *database.DB, map[string]uuid.UUID) // Cleanup test data
AuditAction    string       // Expected audit log action (if applicable)
RequiresAudit  bool         // Whether audit log should be created
}

// TestContext holds all dependencies for RBAC tests
type TestContext struct {
Router       *gin.Engine
DB           *database.DB
RedisClient  *redispkg.Client
JWTManager   *jwtpkg.Manager
AuditLogRepo *repository.AuditLogRepository
}

// setupRBACTestRouter creates a test router with admin user management endpoints
// We focus on admin endpoints since they're the most critical for RBAC testing
func setupRBACTestRouter(t *testing.T) *TestContext {
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
Server: config.ServerConfig{
BaseURL: "http://localhost:8080",
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
clipHandler := handlers.NewClipHandler(nil, authService) // Minimal clip handler for testing auth

// Setup router
r := gin.New()
r.Use(gin.Recovery())

v1 := r.Group("/api/v1")
{
// Clip routes
clips := v1.Group("/clips")
{
clips.PUT("/:id", middleware.AuthMiddleware(authService), middleware.RequireRole("admin", "moderator"), clipHandler.UpdateClip)
clips.DELETE("/:id", middleware.AuthMiddleware(authService), middleware.RequireRole("admin"), clipHandler.DeleteClip)
}

// Admin routes
admin := v1.Group("/admin")
admin.Use(middleware.AuthMiddleware(authService))
admin.Use(middleware.RequireRole("admin", "moderator"))
{
// User management
adminUsers := admin.Group("/users")
{
adminUsers.GET("", middleware.RequirePermission(models.PermissionManageUsers), adminUserHandler.ListUsers)
adminUsers.POST("/:id/ban", middleware.RequirePermission(models.PermissionManageUsers), adminUserHandler.BanUser)
adminUsers.POST("/:id/unban", middleware.RequirePermission(models.PermissionManageUsers), adminUserHandler.UnbanUser)
adminUsers.PATCH("/:id/role", middleware.RequirePermission(models.PermissionManageUsers), adminUserHandler.UpdateUserRole)
adminUsers.PATCH("/:id/karma", middleware.RequirePermission(models.PermissionManageUsers), adminUserHandler.UpdateUserKarma)
}
}
}

return &TestContext{
Router:       r,
DB:           db,
RedisClient:  redisClient,
JWTManager:   jwtManager,
AuditLogRepo: auditLogRepo,
}
}

// runEndpointTest runs a single endpoint test against all roles
func runEndpointTest(t *testing.T, ctx *TestContext, tc EndpointTestCase) {
t.Run(tc.Name, func(t *testing.T) {
// Setup test data if needed
var dataIDs map[string]uuid.UUID
if tc.SetupData != nil {
dataIDs = tc.SetupData(t, ctx.DB)
if tc.CleanupData != nil {
defer tc.CleanupData(t, ctx.DB, dataIDs)
}
}

// Replace placeholders in path
path := tc.Path
for _, id := range dataIDs {
path = fmt.Sprintf(path, id.String())
break // For single placeholder
}

// Test 1: Guest (no authentication)
t.Run("Guest", func(t *testing.T) {
statusCode := makeRequest(t, ctx, tc.Method, path, tc.Body, "")
assert.Equal(t, tc.AccessMatrix.Guest, statusCode, 
"Guest access failed for %s %s", tc.Method, tc.Name)
})

// Test 2: Regular user
t.Run("User", func(t *testing.T) {
user := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("user_%d", time.Now().UnixNano()))
defer testutil.CleanupTestUser(t, ctx.DB, user.ID)

token, _ := testutil.GenerateTestTokens(t, ctx.JWTManager, user.ID, user.Role)
statusCode := makeRequest(t, ctx, tc.Method, path, tc.Body, token)
assert.Equal(t, tc.AccessMatrix.User, statusCode,
"User access failed for %s %s", tc.Method, tc.Name)
})

// Test 3: Moderator
t.Run("Moderator", func(t *testing.T) {
moderator := testutil.CreateTestUserWithAccountType(t, ctx.DB, 
fmt.Sprintf("mod_%d", time.Now().UnixNano()), models.AccountTypeModerator)
moderator.Role = models.RoleModerator
defer testutil.CleanupTestUser(t, ctx.DB, moderator.ID)

token, _ := testutil.GenerateTestTokens(t, ctx.JWTManager, moderator.ID, moderator.Role)
statusCode := makeRequest(t, ctx, tc.Method, path, tc.Body, token)
assert.Equal(t, tc.AccessMatrix.Moderator, statusCode,
"Moderator access failed for %s %s", tc.Method, tc.Name)

// Verify audit log if required and request succeeded
if tc.RequiresAudit && statusCode >= 200 && statusCode < 300 {
if tc.AuditAction != "" && len(dataIDs) > 0 {
// Get the entity ID from dataIDs (first ID in map)
var entityID uuid.UUID
for _, id := range dataIDs {
entityID = id
break
}
verifyAuditLog(t, ctx.DB, ctx.AuditLogRepo, tc.AuditAction, entityID, moderator.ID)
}
}
})

// Test 4: Admin
t.Run("Admin", func(t *testing.T) {
admin := testutil.CreateTestUserWithAccountType(t, ctx.DB, 
fmt.Sprintf("admin_%d", time.Now().UnixNano()), models.AccountTypeAdmin)
admin.Role = models.RoleAdmin
defer testutil.CleanupTestUser(t, ctx.DB, admin.ID)

token, _ := testutil.GenerateTestTokens(t, ctx.JWTManager, admin.ID, admin.Role)
statusCode := makeRequest(t, ctx, tc.Method, path, tc.Body, token)
assert.Equal(t, tc.AccessMatrix.Admin, statusCode,
"Admin access failed for %s %s", tc.Method, tc.Name)

// Verify audit log if required and request succeeded
if tc.RequiresAudit && statusCode >= 200 && statusCode < 300 {
if tc.AuditAction != "" && len(dataIDs) > 0 {
// Get the entity ID from dataIDs
var entityID uuid.UUID
for _, id := range dataIDs {
entityID = id
break
}
verifyAuditLog(t, ctx.DB, ctx.AuditLogRepo, tc.AuditAction, entityID, admin.ID)
}
}
})
})
}

// makeRequest makes an HTTP request and returns the status code
func makeRequest(t *testing.T, ctx *TestContext, method, path string, body interface{}, token string) int {
var reqBody []byte
if body != nil {
var err error
reqBody, err = json.Marshal(body)
require.NoError(t, err)
}

req, err := http.NewRequest(method, path, bytes.NewBuffer(reqBody))
require.NoError(t, err)

if token != "" {
req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
}
if body != nil {
req.Header.Set("Content-Type", "application/json")
}

w := httptest.NewRecorder()
ctx.Router.ServeHTTP(w, req)

return w.Code
}

// verifyAuditLog checks that an audit log entry was created
func verifyAuditLog(t *testing.T, db *database.DB, auditLogRepo *repository.AuditLogRepository, 
action string, entityID uuid.UUID, moderatorID uuid.UUID) {

ctx := context.Background()

// Query audit logs
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
err := rows.Scan(&log.ID, &log.Action, &log.EntityType, &log.EntityID, 
&log.ModeratorID, &log.Reason, &log.CreatedAt)
require.NoError(t, err, "Failed to scan audit log")
logs = append(logs, &log)
}

require.NotEmpty(t, logs, "Expected audit log entry not found for action: %s", action)

log := logs[0]
assert.Equal(t, action, log.Action, "Audit log action mismatch")
assert.Equal(t, entityID, log.EntityID, "Audit log entity ID mismatch")
assert.Equal(t, moderatorID, log.ModeratorID, "Audit log moderator ID mismatch")
assert.WithinDuration(t, time.Now(), log.CreatedAt, 5*time.Second, 
"Audit log should be recent")
}
