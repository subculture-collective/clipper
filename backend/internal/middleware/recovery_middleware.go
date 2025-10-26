package middleware

import (
	"log"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

// JSONRecoveryMiddleware returns a middleware that recovers from panics and returns JSON errors
func JSONRecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Log the panic with stack trace
				stack := debug.Stack()
				log.Printf("PANIC recovered: %v\nStack trace:\n%s", err, stack)

				// Always return JSON error response
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error":   "Internal server error",
					"code":    "INTERNAL_ERROR",
					"message": "An unexpected error occurred. Please try again later.",
				})
			}
		}()

		c.Next()
	}
}
