package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
)

func TestRequirePermission_NoUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RequirePermission(models.PermissionCreateSubmission))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", w.Code)
	}
}

func TestRequirePermission_HasPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Middleware to set user
	router.Use(func(c *gin.Context) {
		user := &models.User{
			ID:          uuid.New(),
			Username:    "broadcaster",
			Role:        models.RoleUser,
			AccountType: models.AccountTypeBroadcaster,
		}
		c.Set("user", user)
		c.Next()
	})

	router.Use(RequirePermission(models.PermissionViewBroadcasterAnalytics))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestRequirePermission_LacksPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Middleware to set user (member cannot moderate)
	router.Use(func(c *gin.Context) {
		user := &models.User{
			ID:          uuid.New(),
			Username:    "member",
			Role:        models.RoleUser,
			AccountType: models.AccountTypeMember,
		}
		c.Set("user", user)
		c.Next()
	})

	router.Use(RequirePermission(models.PermissionModerateContent))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", w.Code)
	}
}

func TestRequirePermission_AdminHasAllPermissions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Middleware to set admin user
	router.Use(func(c *gin.Context) {
		user := &models.User{
			ID:          uuid.New(),
			Username:    "admin",
			Role:        models.RoleAdmin,
			AccountType: models.AccountTypeMember, // Even with member account type, admin role grants all
		}
		c.Set("user", user)
		c.Next()
	})

	router.Use(RequirePermission(models.PermissionManageSystem))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestRequireAnyPermission_HasOnePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Middleware to set broadcaster user
	router.Use(func(c *gin.Context) {
		user := &models.User{
			ID:          uuid.New(),
			Username:    "broadcaster",
			Role:        models.RoleUser,
			AccountType: models.AccountTypeBroadcaster,
		}
		c.Set("user", user)
		c.Next()
	})

	router.Use(RequireAnyPermission(
		models.PermissionModerateContent,
		models.PermissionViewBroadcasterAnalytics,
	))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestRequireAnyPermission_LacksAllPermissions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Middleware to set member user
	router.Use(func(c *gin.Context) {
		user := &models.User{
			ID:          uuid.New(),
			Username:    "member",
			Role:        models.RoleUser,
			AccountType: models.AccountTypeMember,
		}
		c.Set("user", user)
		c.Next()
	})

	router.Use(RequireAnyPermission(
		models.PermissionModerateContent,
		models.PermissionViewBroadcasterAnalytics,
	))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", w.Code)
	}
}

func TestRequireAccountType_HasAccountType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Middleware to set broadcaster user
	router.Use(func(c *gin.Context) {
		user := &models.User{
			ID:          uuid.New(),
			Username:    "broadcaster",
			Role:        models.RoleUser,
			AccountType: models.AccountTypeBroadcaster,
		}
		c.Set("user", user)
		c.Next()
	})

	router.Use(RequireAccountType(models.AccountTypeBroadcaster, models.AccountTypeModerator))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestRequireAccountType_LacksAccountType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Middleware to set member user
	router.Use(func(c *gin.Context) {
		user := &models.User{
			ID:          uuid.New(),
			Username:    "member",
			Role:        models.RoleUser,
			AccountType: models.AccountTypeMember,
		}
		c.Set("user", user)
		c.Next()
	})

	router.Use(RequireAccountType(models.AccountTypeBroadcaster, models.AccountTypeModerator))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", w.Code)
	}
}

func TestRequireAccountType_DefaultsToMember(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Middleware to set user without account type set (should default to member)
	router.Use(func(c *gin.Context) {
		user := &models.User{
			ID:          uuid.New(),
			Username:    "member",
			Role:        models.RoleUser,
			AccountType: "", // Empty, should default to member
		}
		c.Set("user", user)
		c.Next()
	})

	router.Use(RequireAccountType(models.AccountTypeMember))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}
