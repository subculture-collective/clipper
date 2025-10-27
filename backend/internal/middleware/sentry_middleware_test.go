package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSentryMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("should continue without Sentry hub", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, r := gin.CreateTestContext(w)

		// Add middleware
		r.Use(SentryMiddleware())

		// Add test handler
		r.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "ok"})
		})

		// Make request
		req, _ := http.NewRequest("GET", "/test", nil)
		c.Request = req
		r.ServeHTTP(w, req)

		// Assert
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "ok")
	})

	t.Run("should handle request with request ID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, r := gin.CreateTestContext(w)

		// Add middleware
		r.Use(SentryMiddleware())

		// Add test handler
		r.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "ok"})
		})

		// Make request with request ID header
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("X-Request-Id", "test-request-id-123")
		c.Request = req
		r.ServeHTTP(w, req)

		// Assert
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("should capture Gin errors", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, r := gin.CreateTestContext(w)

		// Add middleware
		r.Use(SentryMiddleware())

		// Add test handler that returns error
		r.GET("/test", func(c *gin.Context) {
			c.Error(assert.AnError)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "test error"})
		})

		// Make request
		req, _ := http.NewRequest("GET", "/test", nil)
		c.Request = req
		r.ServeHTTP(w, req)

		// Assert - middleware should not fail even with errors
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}

func TestRecoverWithSentry(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("should recover from panic", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, r := gin.CreateTestContext(w)

		// Add middleware
		r.Use(RecoverWithSentry())

		// Add test handler that panics
		r.GET("/test", func(c *gin.Context) {
			panic("test panic")
		})

		// Make request
		req, _ := http.NewRequest("GET", "/test", nil)
		c.Request = req
		r.ServeHTTP(w, req)

		// Assert - should return 500 and not crash
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Internal server error")
	})

	t.Run("should not interfere with normal requests", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, r := gin.CreateTestContext(w)

		// Add middleware
		r.Use(RecoverWithSentry())

		// Add test handler
		r.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "ok"})
		})

		// Make request
		req, _ := http.NewRequest("GET", "/test", nil)
		c.Request = req
		r.ServeHTTP(w, req)

		// Assert
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "ok")
	})
}
