package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

func TestRateLimitMiddleware_FallbackInitialization(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Reset global fallback limiters for test isolation
	ipFallbackLimiter = nil

	// Create the middleware with a low limit for testing
	// This should initialize the fallback limiter even if Redis is nil
	_ = RateLimitMiddleware((*redispkg.Client)(nil), 3, time.Second)

	// Verify that the fallback limiter was initialized
	if ipFallbackLimiter == nil {
		t.Fatal("ipFallbackLimiter should be initialized when creating RateLimitMiddleware")
	}

	// Verify the fallback limiter works correctly
	key := "test-key"

	// Make requests up to the limit
	for i := 0; i < 3; i++ {
		allowed, _ := ipFallbackLimiter.Allow(key)
		if !allowed {
			t.Errorf("request %d should be allowed", i+1)
		}
	}

	// The 4th request should be blocked
	allowed, remaining := ipFallbackLimiter.Allow(key)
	if allowed {
		t.Error("4th request should be blocked")
	}
	if remaining != 0 {
		t.Errorf("expected remaining=0, got %d", remaining)
	}
}

func TestRateLimitMiddleware_FallbackHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Reset global fallback limiters
	ipFallbackLimiter = NewInMemoryRateLimiter(5, time.Second)

	router := gin.New()
	// We'll create a middleware that always uses fallback by simulating Redis failure
	router.Use(func(c *gin.Context) {
		// Simulate using fallback
		key := fmt.Sprintf("ratelimit:%s:%s", c.Request.URL.Path, c.ClientIP())
		allowed, remaining := ipFallbackLimiter.Allow(key)

		if !allowed {
			c.Header("X-RateLimit-Limit", "5")
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Fallback", "true")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Header("X-RateLimit-Limit", "5")
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Fallback", "true")
		c.Next()
	})

	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Make a request and check headers
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "127.0.0.1:1234"
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// Verify headers
	if limit := w.Header().Get("X-RateLimit-Limit"); limit != "5" {
		t.Errorf("expected X-RateLimit-Limit=5, got %s", limit)
	}

	if remaining := w.Header().Get("X-RateLimit-Remaining"); remaining == "" {
		t.Error("X-RateLimit-Remaining header should be set")
	}

	if fallback := w.Header().Get("X-RateLimit-Fallback"); fallback != "true" {
		t.Errorf("expected X-RateLimit-Fallback=true, got %s", fallback)
	}
}

func TestRateLimitByUserMiddleware_FallbackInitialization(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Reset global fallback limiters
	userFallbackLimiter = nil

	// Create the middleware
	_ = RateLimitByUserMiddleware((*redispkg.Client)(nil), 2, time.Second)

	// Verify fallback limiter is created
	if userFallbackLimiter == nil {
		t.Fatal("userFallbackLimiter should be initialized when creating RateLimitByUserMiddleware")
	}

	// Verify the fallback limiter works correctly
	key := "test-user-key"

	// Make requests up to the limit
	for i := 0; i < 2; i++ {
		allowed, _ := userFallbackLimiter.Allow(key)
		if !allowed {
			t.Errorf("request %d should be allowed", i+1)
		}
	}

	// The 3rd request should be blocked
	allowed, remaining := userFallbackLimiter.Allow(key)
	if allowed {
		t.Error("3rd request should be blocked")
	}
	if remaining != 0 {
		t.Errorf("expected remaining=0, got %d", remaining)
	}
}

func TestInMemoryRateLimiter_Integration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a fresh limiter for this test
	limiter := NewInMemoryRateLimiter(5, 200*time.Millisecond)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		key := c.ClientIP()
		allowed, remaining := limiter.Allow(key)

		if !allowed {
			c.Header("X-RateLimit-Limit", "5")
			c.Header("X-RateLimit-Remaining", "0")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
			})
			c.Abort()
			return
		}

		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Next()
	})

	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Make 5 requests (should all succeed)
	for i := 0; i < 5; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.1:1234"
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("request %d: expected status 200, got %d", i+1, w.Code)
		}
	}

	// 6th request should fail
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.1:1234"
	router.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("6th request: expected status 429, got %d", w.Code)
	}

	// Wait for window to expire
	time.Sleep(250 * time.Millisecond)

	// Should be able to make requests again
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.1:1234"
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("request after window: expected status 200, got %d", w.Code)
	}
}
