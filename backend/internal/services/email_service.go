package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// EmailService handles email sending and management
type EmailService struct {
	apiKey           string
	fromEmail        string
	fromName         string
	baseURL          string
	repo             *repository.EmailNotificationRepository
	enabled          bool
	maxEmailsPerHour int
}

// EmailConfig holds email service configuration
type EmailConfig struct {
	SendGridAPIKey   string
	FromEmail        string
	FromName         string
	BaseURL          string
	Enabled          bool
	MaxEmailsPerHour int
}

// NewEmailService creates a new EmailService
func NewEmailService(cfg *EmailConfig, repo *repository.EmailNotificationRepository) *EmailService {
	maxPerHour := cfg.MaxEmailsPerHour
	if maxPerHour <= 0 {
		maxPerHour = 10 // Default rate limit
	}

	return &EmailService{
		apiKey:           cfg.SendGridAPIKey,
		fromEmail:        cfg.FromEmail,
		fromName:         cfg.FromName,
		baseURL:          cfg.BaseURL,
		repo:             repo,
		enabled:          cfg.Enabled,
		maxEmailsPerHour: maxPerHour,
	}
}

// SendNotificationEmail sends an email for a notification
func (s *EmailService) SendNotificationEmail(
	ctx context.Context,
	user *models.User,
	notificationType string,
	notificationID uuid.UUID,
	emailData map[string]interface{},
) error {
	if !s.enabled {
		return nil // Email service disabled
	}

	// Check if user has an email
	if user.Email == nil || *user.Email == "" {
		return nil // User has no email
	}

	// Check rate limit
	canSend, err := s.checkRateLimit(ctx, user.ID)
	if err != nil {
		return fmt.Errorf("failed to check rate limit: %w", err)
	}
	if !canSend {
		return fmt.Errorf("rate limit exceeded for user %s", user.ID)
	}

	// Generate unsubscribe token
	unsubToken, err := s.generateUnsubscribeToken(ctx, user.ID, &notificationType)
	if err != nil {
		// Continue without unsubscribe link (log but don't fail)
		unsubToken = ""
	}

	// Prepare email content
	subject, htmlBody, textBody, err := s.prepareEmailContent(notificationType, emailData, unsubToken)
	if err != nil {
		return fmt.Errorf("failed to prepare email content: %w", err)
	}

	// Create audit log entry
	logEntry := &models.EmailNotificationLog{
		ID:               uuid.New(),
		UserID:           user.ID,
		NotificationID:   &notificationID,
		NotificationType: notificationType,
		RecipientEmail:   *user.Email,
		Subject:          subject,
		Status:           models.EmailStatusPending,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	err = s.repo.CreateLog(ctx, logEntry)
	if err != nil {
		return fmt.Errorf("failed to create email log: %w", err)
	}

	// Send via SendGrid
	messageID, err := s.sendViaSendGrid(*user.Email, subject, htmlBody, textBody)
	if err != nil {
		// Update log with error
		logEntry.Status = models.EmailStatusFailed
		errMsg := err.Error()
		logEntry.ErrorMessage = &errMsg
		logEntry.UpdatedAt = time.Now()
		_ = s.repo.UpdateLog(ctx, logEntry)
		return fmt.Errorf("failed to send email: %w", err)
	}

	// Update log with success
	logEntry.Status = models.EmailStatusSent
	logEntry.ProviderMessageID = &messageID
	now := time.Now()
	logEntry.SentAt = &now
	logEntry.UpdatedAt = now
	err = s.repo.UpdateLog(ctx, logEntry)
	if err != nil {
		// Log but don't fail
		_ = err
	}

	// Increment rate limit counter
	err = s.incrementRateLimit(ctx, user.ID)
	if err != nil {
		// Log but don't fail
		_ = err
	}

	return nil
}

// sendViaSendGrid sends an email using SendGrid API
func (s *EmailService) sendViaSendGrid(to, subject, htmlContent, textContent string) (string, error) {
	from := mail.NewEmail(s.fromName, s.fromEmail)
	toEmail := mail.NewEmail("", to)

	message := mail.NewSingleEmail(from, subject, toEmail, textContent, htmlContent)
	client := sendgrid.NewSendClient(s.apiKey)

	response, err := client.Send(message)
	if err != nil {
		return "", err
	}

	if response.StatusCode >= 400 {
		return "", fmt.Errorf("sendgrid error: status %d, body: %s", response.StatusCode, response.Body)
	}

	// Extract message ID from headers
	messageID := ""
	if ids, ok := response.Headers["X-Message-Id"]; ok && len(ids) > 0 {
		messageID = ids[0]
	}
	return messageID, nil
}

// prepareEmailContent prepares the email subject and body based on notification type
func (s *EmailService) prepareEmailContent(
	notificationType string,
	data map[string]interface{},
	unsubToken string,
) (subject, htmlBody, textBody string, err error) {
	// Add unsubscribe URL to data
	if unsubToken != "" {
		data["UnsubscribeURL"] = fmt.Sprintf("%s/api/v1/notifications/unsubscribe?token=%s", s.baseURL, unsubToken)
	}

	switch notificationType {
	case models.NotificationTypeReply:
		subject = fmt.Sprintf("%s replied to your comment", data["AuthorName"])
		htmlBody, textBody = s.prepareReplyEmail(data)
	case models.NotificationTypeMention:
		subject = fmt.Sprintf("%s mentioned you in a comment", data["AuthorName"])
		htmlBody, textBody = s.prepareMentionEmail(data)
	default:
		return "", "", "", fmt.Errorf("unsupported notification type: %s", notificationType)
	}

	return subject, htmlBody, textBody, nil
}

// prepareReplyEmail prepares reply notification email
func (s *EmailService) prepareReplyEmail(data map[string]interface{}) (html, text string) {
	authorName := data["AuthorName"]
	clipTitle := data["ClipTitle"]
	clipURL := data["ClipURL"]
	commentPreview := data["CommentPreview"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Reply</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Reply on Clipper</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>%s</strong> replied to your comment on <strong>%s</strong>
        </p>
        
        <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #666; font-style: italic;">"%s"</p>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
            <a href="%s" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Reply</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            You're receiving this because you have email notifications enabled for replies.<br>
            <a href="%s" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #667eea; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, authorName, clipTitle, commentPreview, clipURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`New Reply on Clipper

%s replied to your comment on "%s"

"%s"

View the reply: %s

---
Unsubscribe: %s
Manage preferences: %s/settings
`, authorName, clipTitle, commentPreview, clipURL, unsubURL, s.baseURL)

	return html, text
}

// prepareMentionEmail prepares mention notification email
func (s *EmailService) prepareMentionEmail(data map[string]interface{}) (html, text string) {
	authorName := data["AuthorName"]
	clipTitle := data["ClipTitle"]
	clipURL := data["ClipURL"]
	commentPreview := data["CommentPreview"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You Were Mentioned</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📢 You Were Mentioned!</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>%s</strong> mentioned you in a comment on <strong>%s</strong>
        </p>
        
        <div style="background: white; padding: 20px; border-left: 4px solid #f5576c; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #666; font-style: italic;">"%s"</p>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
            <a href="%s" style="display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Comment</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            You're receiving this because you have email notifications enabled for mentions.<br>
            <a href="%s" style="color: #f5576c; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #f5576c; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, authorName, clipTitle, commentPreview, clipURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`You Were Mentioned on Clipper!

%s mentioned you in a comment on "%s"

"%s"

View the comment: %s

---
Unsubscribe: %s
Manage preferences: %s/settings
`, authorName, clipTitle, commentPreview, clipURL, unsubURL, s.baseURL)

	return html, text
}

// generateUnsubscribeToken generates a secure unsubscribe token
func (s *EmailService) generateUnsubscribeToken(ctx context.Context, userID uuid.UUID, notificationType *string) (string, error) {
	// Generate random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(tokenBytes)

	// Create token record
	tokenRecord := &models.EmailUnsubscribeToken{
		ID:               uuid.New(),
		UserID:           userID,
		Token:            token,
		NotificationType: notificationType,
		CreatedAt:        time.Now(),
		ExpiresAt:        time.Now().Add(90 * 24 * time.Hour), // 90 days
	}

	err := s.repo.CreateUnsubscribeToken(ctx, tokenRecord)
	if err != nil {
		return "", err
	}

	return token, nil
}

// ValidateUnsubscribeToken validates and uses an unsubscribe token
func (s *EmailService) ValidateUnsubscribeToken(ctx context.Context, token string) (*models.EmailUnsubscribeToken, error) {
	tokenRecord, err := s.repo.GetUnsubscribeToken(ctx, token)
	if err != nil {
		return nil, err
	}

	// Check if already used
	if tokenRecord.UsedAt != nil {
		return nil, fmt.Errorf("token already used")
	}

	// Check expiration
	if time.Now().After(tokenRecord.ExpiresAt) {
		return nil, fmt.Errorf("token expired")
	}

	return tokenRecord, nil
}

// UseUnsubscribeToken marks a token as used
func (s *EmailService) UseUnsubscribeToken(ctx context.Context, token string) error {
	return s.repo.MarkTokenUsed(ctx, token)
}

// checkRateLimit checks if a user has exceeded the email rate limit
func (s *EmailService) checkRateLimit(ctx context.Context, userID uuid.UUID) (bool, error) {
	windowStart := time.Now().Truncate(time.Hour)
	
	rateLimit, err := s.repo.GetRateLimit(ctx, userID, windowStart)
	if err != nil {
		// If no record exists, user is under limit
		if strings.Contains(err.Error(), "no rows") {
			return true, nil
		}
		return false, err
	}

	return rateLimit.EmailCount < s.maxEmailsPerHour, nil
}

// incrementRateLimit increments the email count for rate limiting
func (s *EmailService) incrementRateLimit(ctx context.Context, userID uuid.UUID) error {
	windowStart := time.Now().Truncate(time.Hour)
	return s.repo.IncrementRateLimit(ctx, userID, windowStart)
}

// GetEmailLogs retrieves email logs for a user
func (s *EmailService) GetEmailLogs(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.EmailNotificationLog, error) {
	return s.repo.GetLogsByUserID(ctx, userID, limit, offset)
}
