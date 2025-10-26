package utils

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// LogLevel represents logging severity
type LogLevel string

const (
	LogLevelDebug LogLevel = "debug"
	LogLevelInfo  LogLevel = "info"
	LogLevelWarn  LogLevel = "warn"
	LogLevelError LogLevel = "error"
)

// StructuredLogger provides JSON structured logging
type StructuredLogger struct {
	writer   io.Writer
	minLevel LogLevel
}

// LogEntry represents a structured log entry
type LogEntry struct {
	Timestamp  string                 `json:"timestamp"`
	Level      string                 `json:"level"`
	Message    string                 `json:"message"`
	Service    string                 `json:"service,omitempty"`
	TraceID    string                 `json:"trace_id,omitempty"`
	SpanID     string                 `json:"span_id,omitempty"`
	UserID     string                 `json:"user_id,omitempty"`
	Method     string                 `json:"method,omitempty"`
	Path       string                 `json:"path,omitempty"`
	StatusCode int                    `json:"status_code,omitempty"`
	Latency    string                 `json:"latency,omitempty"`
	ClientIP   string                 `json:"client_ip,omitempty"`
	UserAgent  string                 `json:"user_agent,omitempty"`
	Error      string                 `json:"error,omitempty"`
	Fields     map[string]interface{} `json:"fields,omitempty"`
}

// NewStructuredLogger creates a new structured logger
func NewStructuredLogger(minLevel LogLevel) *StructuredLogger {
	return &StructuredLogger{
		writer:   os.Stdout,
		minLevel: minLevel,
	}
}

// shouldLog checks if the log level should be logged
func (l *StructuredLogger) shouldLog(level LogLevel) bool {
	levels := map[LogLevel]int{
		LogLevelDebug: 0,
		LogLevelInfo:  1,
		LogLevelWarn:  2,
		LogLevelError: 3,
	}
	return levels[level] >= levels[l.minLevel]
}

// log writes a structured log entry
func (l *StructuredLogger) log(entry LogEntry) {
	if !l.shouldLog(LogLevel(entry.Level)) {
		return
	}

	entry.Timestamp = time.Now().UTC().Format(time.RFC3339)
	data, err := json.Marshal(entry)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal log entry: %v\n", err)
		return
	}
	fmt.Fprintln(l.writer, string(data))
}

// Debug logs a debug message
func (l *StructuredLogger) Debug(message string, fields ...map[string]interface{}) {
	entry := LogEntry{
		Level:   string(LogLevelDebug),
		Message: message,
		Service: "clipper-backend",
	}
	if len(fields) > 0 {
		entry.Fields = fields[0]
	}
	l.log(entry)
}

// Info logs an info message
func (l *StructuredLogger) Info(message string, fields ...map[string]interface{}) {
	entry := LogEntry{
		Level:   string(LogLevelInfo),
		Message: message,
		Service: "clipper-backend",
	}
	if len(fields) > 0 {
		entry.Fields = fields[0]
	}
	l.log(entry)
}

// Warn logs a warning message
func (l *StructuredLogger) Warn(message string, fields ...map[string]interface{}) {
	entry := LogEntry{
		Level:   string(LogLevelWarn),
		Message: message,
		Service: "clipper-backend",
	}
	if len(fields) > 0 {
		entry.Fields = fields[0]
	}
	l.log(entry)
}

// Error logs an error message
func (l *StructuredLogger) Error(message string, err error, fields ...map[string]interface{}) {
	entry := LogEntry{
		Level:   string(LogLevelError),
		Message: message,
		Service: "clipper-backend",
	}
	if err != nil {
		entry.Error = err.Error()
	}
	if len(fields) > 0 {
		entry.Fields = fields[0]
	}
	l.log(entry)
}

// GinLogger returns a Gin middleware for structured logging
func (l *StructuredLogger) GinLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get user ID from context if available
		userID := ""
		if uid, exists := c.Get("user_id"); exists {
			userID = fmt.Sprintf("%v", uid)
		}

		// Get trace ID from context if available
		traceID := ""
		if tid, exists := c.Get("trace_id"); exists {
			traceID = fmt.Sprintf("%v", tid)
		}

		entry := LogEntry{
			Level:      string(LogLevelInfo),
			Message:    "HTTP Request",
			Service:    "clipper-backend",
			TraceID:    traceID,
			UserID:     userID,
			Method:     c.Request.Method,
			Path:       path,
			StatusCode: c.Writer.Status(),
			Latency:    latency.String(),
			ClientIP:   c.ClientIP(),
			UserAgent:  c.Request.UserAgent(),
		}

		// Add query string if present
		if query != "" {
			if entry.Fields == nil {
				entry.Fields = make(map[string]interface{})
			}
			entry.Fields["query"] = query
		}

		// Add error if present
		if len(c.Errors) > 0 {
			entry.Error = c.Errors.String()
			entry.Level = string(LogLevelError)
		}

		l.log(entry)
	}
}

// Global logger instance
var defaultLogger *StructuredLogger

// InitLogger initializes the global logger
func InitLogger(minLevel LogLevel) {
	defaultLogger = NewStructuredLogger(minLevel)
}

// GetLogger returns the global logger instance
func GetLogger() *StructuredLogger {
	if defaultLogger == nil {
		defaultLogger = NewStructuredLogger(LogLevelInfo)
	}
	return defaultLogger
}

// Debug logs a debug message using the global logger
func Debug(message string, fields ...map[string]interface{}) {
	GetLogger().Debug(message, fields...)
}

// Info logs an info message using the global logger
func Info(message string, fields ...map[string]interface{}) {
	GetLogger().Info(message, fields...)
}

// Warn logs a warning message using the global logger
func Warn(message string, fields ...map[string]interface{}) {
	GetLogger().Warn(message, fields...)
}

// Error logs an error message using the global logger
func Error(message string, err error, fields ...map[string]interface{}) {
	GetLogger().Error(message, err, fields...)
}
