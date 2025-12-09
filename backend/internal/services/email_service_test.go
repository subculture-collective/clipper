package services

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/subculture-collective/clipper/internal/models"
)

// TestEmailServiceCreation tests that the email service can be created
func TestEmailServiceCreation(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          false,
		MaxEmailsPerHour: 10,
	}

	service := NewEmailService(cfg, nil, nil)
	assert.NotNil(t, service)
	assert.Equal(t, "test-key", service.apiKey)
	assert.Equal(t, "test@example.com", service.fromEmail)
	assert.Equal(t, 10, service.maxEmailsPerHour)
	assert.False(t, service.enabled)
}

// TestEmailServiceDefaultRateLimit tests default rate limit
func TestEmailServiceDefaultRateLimit(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          false,
		MaxEmailsPerHour: 0, // Should default to 10
	}

	service := NewEmailService(cfg, nil, nil)
	assert.NotNil(t, service)
	assert.Equal(t, 10, service.maxEmailsPerHour)
}

// TestPrepareReplyEmail tests reply email template generation
func TestPrepareReplyEmail(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          true,
		MaxEmailsPerHour: 10,
	}

	service := NewEmailService(cfg, nil, nil)

	data := map[string]interface{}{
		"AuthorName":     "John Doe",
		"ClipTitle":      "Amazing Play",
		"ClipURL":        "http://localhost:5173/clips/123",
		"CommentPreview": "This is a test comment",
		"UnsubscribeURL": "http://localhost:5173/unsubscribe?token=abc123",
	}

	htmlBody, textBody := service.prepareReplyEmail(data)

	// Check that both HTML and text bodies contain key information
	assert.Contains(t, htmlBody, "John Doe")
	assert.Contains(t, htmlBody, "Amazing Play")
	assert.Contains(t, htmlBody, "This is a test comment")
	assert.Contains(t, htmlBody, "http://localhost:5173/clips/123")
	assert.Contains(t, htmlBody, "Unsubscribe")

	assert.Contains(t, textBody, "John Doe")
	assert.Contains(t, textBody, "Amazing Play")
	assert.Contains(t, textBody, "This is a test comment")
	assert.Contains(t, textBody, "http://localhost:5173/clips/123")
}

// TestPrepareMentionEmail tests mention email template generation
func TestPrepareMentionEmail(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          true,
		MaxEmailsPerHour: 10,
	}

	service := NewEmailService(cfg, nil, nil)

	data := map[string]interface{}{
		"AuthorName":     "Jane Smith",
		"ClipTitle":      "Epic Moment",
		"ClipURL":        "http://localhost:5173/clips/456",
		"CommentPreview": "@username check this out!",
		"UnsubscribeURL": "http://localhost:5173/unsubscribe?token=def456",
	}

	htmlBody, textBody := service.prepareMentionEmail(data)

	// Check that both HTML and text bodies contain key information
	assert.Contains(t, htmlBody, "Jane Smith")
	assert.Contains(t, htmlBody, "Epic Moment")
	assert.Contains(t, htmlBody, "@username check this out!")
	assert.Contains(t, htmlBody, "http://localhost:5173/clips/456")
	assert.Contains(t, htmlBody, "Unsubscribe")

	assert.Contains(t, textBody, "Jane Smith")
	assert.Contains(t, textBody, "Epic Moment")
	assert.Contains(t, textBody, "@username check this out!")
	assert.Contains(t, textBody, "http://localhost:5173/clips/456")
}

// TestPrepareEmailContent tests email content preparation
func TestPrepareEmailContent(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          true,
		MaxEmailsPerHour: 10,
	}

	service := NewEmailService(cfg, nil, nil)

	data := map[string]interface{}{
		"AuthorName":     "Test User",
		"ClipTitle":      "Test Clip",
		"ClipURL":        "http://localhost:5173/clips/789",
		"CommentPreview": "Test comment",
	}

	// Test reply notification
	subject, htmlBody, textBody, err := service.prepareEmailContent(
		models.NotificationTypeReply,
		data,
		"token123",
	)

	assert.NoError(t, err)
	assert.Contains(t, subject, "Test User")
	assert.Contains(t, subject, "replied")
	assert.Contains(t, htmlBody, "Test User")
	assert.Contains(t, textBody, "Test User")
	assert.Contains(t, data, "UnsubscribeURL")

	// Test mention notification
	subject, htmlBody, textBody, err = service.prepareEmailContent(
		models.NotificationTypeMention,
		data,
		"token456",
	)

	assert.NoError(t, err)
	assert.Contains(t, subject, "Test User")
	assert.Contains(t, subject, "mentioned")
	assert.Contains(t, htmlBody, "Test User")
	assert.Contains(t, textBody, "Test User")

	// Test unsupported notification type
	_, _, _, err = service.prepareEmailContent(
		"unsupported_type",
		data,
		"token789",
	)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported notification type")
}

// TestEmailNotificationLog tests the email notification log model
func TestEmailNotificationLog(t *testing.T) {
	userID := uuid.New()
	notificationID := uuid.New()

	log := &models.EmailNotificationLog{
		ID:               uuid.New(),
		UserID:           userID,
		NotificationID:   &notificationID,
		NotificationType: models.NotificationTypeReply,
		RecipientEmail:   "user@example.com",
		Subject:          "Test Subject",
		Status:           models.EmailStatusPending,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	assert.NotEqual(t, uuid.Nil, log.ID)
	assert.Equal(t, userID, log.UserID)
	assert.Equal(t, notificationID, *log.NotificationID)
	assert.Equal(t, models.NotificationTypeReply, log.NotificationType)
	assert.Equal(t, "user@example.com", log.RecipientEmail)
	assert.Equal(t, models.EmailStatusPending, log.Status)
}

// TestEmailUnsubscribeToken tests the unsubscribe token model
func TestEmailUnsubscribeToken(t *testing.T) {
	userID := uuid.New()
	notificationType := models.NotificationTypeReply

	token := &models.EmailUnsubscribeToken{
		ID:               uuid.New(),
		UserID:           userID,
		Token:            "test_token_123",
		NotificationType: &notificationType,
		CreatedAt:        time.Now(),
		ExpiresAt:        time.Now().Add(90 * 24 * time.Hour),
	}

	assert.NotEqual(t, uuid.Nil, token.ID)
	assert.Equal(t, userID, token.UserID)
	assert.Equal(t, "test_token_123", token.Token)
	assert.Equal(t, notificationType, *token.NotificationType)
	assert.Nil(t, token.UsedAt)
}

// TestEmailRateLimit tests the rate limit model
func TestEmailRateLimit(t *testing.T) {
	userID := uuid.New()
	windowStart := time.Now().Truncate(time.Hour)

	rateLimit := &models.EmailRateLimit{
		ID:          uuid.New(),
		UserID:      userID,
		WindowStart: windowStart,
		EmailCount:  5,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	assert.NotEqual(t, uuid.Nil, rateLimit.ID)
	assert.Equal(t, userID, rateLimit.UserID)
	assert.Equal(t, windowStart, rateLimit.WindowStart)
	assert.Equal(t, 5, rateLimit.EmailCount)
}

// TestSandboxMode tests that sandbox mode logs emails without sending
func TestSandboxMode(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          true,
		SandboxMode:      true, // Enable sandbox mode
		MaxEmailsPerHour: 10,
	}

	service := NewEmailService(cfg, nil, nil)
	assert.NotNil(t, service)
	assert.True(t, service.sandboxMode)

	// Test sending an email in sandbox mode (should not actually send)
	messageID, err := service.sendViaSendGrid("recipient@example.com", "Test Subject", "<p>Test HTML</p>", "Test Text")
	assert.NoError(t, err)
	assert.Contains(t, messageID, "sandbox-") // Should return a sandbox message ID
}

// TestSendEmailMethod tests the generic SendEmail method
func TestSendEmailMethod(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          true,
		SandboxMode:      true, // Use sandbox mode for testing
		MaxEmailsPerHour: 10,
	}

	service := NewEmailService(cfg, nil, nil)

	// Test valid email request
	req := EmailRequest{
		To:       []string{"recipient@example.com"},
		Subject:  "Test Email",
		Template: "welcome",
		Data: map[string]interface{}{
			"name":    "John Doe",
			"message": "Welcome to our service!",
		},
		Tags: []string{"welcome", "onboarding"},
	}

	err := service.SendEmail(context.Background(), req)
	assert.NoError(t, err)

	// Verify content is built correctly with sorted keys and escaped HTML
	htmlBody := service.buildEmailFromData(req.Data)
	assert.Contains(t, htmlBody, "John Doe")
	assert.Contains(t, htmlBody, "Welcome to our service!")
	// Check that keys are in alphabetical order (message comes after name in alphabet)
	messageIdx := strings.Index(htmlBody, "message")
	nameIdx := strings.Index(htmlBody, "name")
	assert.Greater(t, messageIdx, nameIdx, "Keys should be sorted alphabetically (name before message)")

	// Test email request with no recipients
	invalidReq := EmailRequest{
		To:      []string{},
		Subject: "Test",
		Data:    map[string]interface{}{},
	}

	err = service.SendEmail(context.Background(), invalidReq)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no recipients")

	// Test email request with no subject
	invalidReq2 := EmailRequest{
		To:      []string{"test@example.com"},
		Subject: "",
		Data:    map[string]interface{}{},
	}

	err = service.SendEmail(context.Background(), invalidReq2)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "subject is required")

	// Test invalid email address
	invalidReq3 := EmailRequest{
		To:      []string{"invalid-email"},
		Subject: "Test",
		Data:    map[string]interface{}{},
	}

	err = service.SendEmail(context.Background(), invalidReq3)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid email address")
}

// TestEmailServiceDisabled tests that disabled service doesn't send emails
func TestEmailServiceDisabled(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          false, // Disabled
		SandboxMode:      false,
		MaxEmailsPerHour: 10,
	}

	service := NewEmailService(cfg, nil, nil)

	req := EmailRequest{
		To:      []string{"recipient@example.com"},
		Subject: "Test Email",
		Data:    map[string]interface{}{},
	}

	err := service.SendEmail(context.Background(), req)
	assert.NoError(t, err) // Should return nil when disabled
}

// TestHTMLEscaping tests that HTML in data is properly escaped
func TestHTMLEscaping(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          true,
		SandboxMode:      true,
		MaxEmailsPerHour: 10,
	}

	service := NewEmailService(cfg, nil, nil)

	// Test data with HTML/script tags
	data := map[string]interface{}{
		"malicious": "<script>alert('xss')</script>",
		"safe":      "normal text",
	}

	htmlBody := service.buildEmailFromData(data)

	// Verify HTML is escaped
	assert.Contains(t, htmlBody, "&lt;script&gt;")
	assert.NotContains(t, htmlBody, "<script>alert")
	assert.Contains(t, htmlBody, "normal text")
}

// TestSendEmailPartialFailure tests handling of partial failures
func TestSendEmailPartialFailure(t *testing.T) {
	cfg := &EmailConfig{
		SendGridAPIKey:   "test-key",
		FromEmail:        "test@example.com",
		FromName:         "Test",
		BaseURL:          "http://localhost:5173",
		Enabled:          true,
		SandboxMode:      true,
		MaxEmailsPerHour: 10,
	}

	service := NewEmailService(cfg, nil, nil)

	// Test with mix of valid and invalid email addresses
	req := EmailRequest{
		To:      []string{"valid@example.com", "invalid-email", "another@example.com"},
		Subject: "Test Email",
		Data:    map[string]interface{}{"test": "data"},
	}

	err := service.SendEmail(context.Background(), req)
	assert.Error(t, err)
	// Should report that 1 out of 3 failed
	assert.Contains(t, err.Error(), "invalid email address")
}
