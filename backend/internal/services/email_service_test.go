package services

import (
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
