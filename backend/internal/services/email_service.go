package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// EmailService handles email sending and management
type EmailService struct {
	apiKey              string
	fromEmail           string
	fromName            string
	baseURL             string
	repo                *repository.EmailNotificationRepository
	enabled             bool
	maxEmailsPerHour    int
	tokenExpiryDuration time.Duration
	logger              *utils.StructuredLogger
	wg                  sync.WaitGroup
	shutdown            chan struct{}
}

// EmailConfig holds email service configuration
type EmailConfig struct {
	SendGridAPIKey      string
	FromEmail           string
	FromName            string
	BaseURL             string
	Enabled             bool
	MaxEmailsPerHour    int
	TokenExpiryDuration time.Duration // Duration before unsubscribe tokens expire (default: 90 days)
}

// NewEmailService creates a new EmailService
func NewEmailService(cfg *EmailConfig, repo *repository.EmailNotificationRepository) *EmailService {
	maxPerHour := cfg.MaxEmailsPerHour
	if maxPerHour <= 0 {
		maxPerHour = 10 // Default rate limit
	}

	tokenExpiry := cfg.TokenExpiryDuration
	if tokenExpiry == 0 {
		tokenExpiry = 90 * 24 * time.Hour // Default: 90 days
	}

	return &EmailService{
		apiKey:              cfg.SendGridAPIKey,
		fromEmail:           cfg.FromEmail,
		fromName:            cfg.FromName,
		baseURL:             cfg.BaseURL,
		repo:                repo,
		enabled:             cfg.Enabled,
		maxEmailsPerHour:    maxPerHour,
		tokenExpiryDuration: tokenExpiry,
		logger:              utils.GetLogger(),
		shutdown:            make(chan struct{}),
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
		s.logger.Error("Failed to update email log after successful send", err, map[string]interface{}{
			"log_id":          logEntry.ID.String(),
			"user_id":         user.ID.String(),
			"notification_id": notificationID.String(),
		})
	}

	// Increment rate limit counter
	err = s.incrementRateLimit(ctx, user.ID)
	if err != nil {
		s.logger.Error("Failed to increment rate limit counter", err, map[string]interface{}{
			"user_id": user.ID.String(),
		})
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
	case "payment_failed":
		subject = "Payment Failed - Action Required"
		htmlBody, textBody = s.preparePaymentFailedEmail(data)
	case "payment_retry":
		subject = "Payment Retry Scheduled"
		htmlBody, textBody = s.preparePaymentRetryEmail(data)
	case "grace_period_warning":
		subject = "Your Premium Access Will End Soon"
		htmlBody, textBody = s.prepareGracePeriodWarningEmail(data)
	case "subscription_downgraded":
		subject = "Your Subscription Has Been Downgraded"
		htmlBody, textBody = s.prepareSubscriptionDowngradedEmail(data)
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
		ExpiresAt:        time.Now().Add(s.tokenExpiryDuration),
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
		if errors.Is(err, pgx.ErrNoRows) {
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

// Shutdown gracefully shuts down the email service by waiting for all pending emails to be sent
func (s *EmailService) Shutdown(timeout time.Duration) error {
	close(s.shutdown)
	
	// Wait for all goroutines with timeout
	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()
	
	select {
	case <-done:
		s.logger.Info("Email service shutdown completed successfully")
		return nil
	case <-time.After(timeout):
		s.logger.Warn("Email service shutdown timed out, some emails may not have been sent")
		return fmt.Errorf("shutdown timeout after %v", timeout)
	}
}

// SendNotificationEmailAsync sends an email asynchronously with proper tracking for graceful shutdown
func (s *EmailService) SendNotificationEmailAsync(
	ctx context.Context,
	user *models.User,
	notificationType string,
	notificationID uuid.UUID,
	emailData map[string]interface{},
) {
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		
		// Check if shutdown is in progress
		select {
		case <-s.shutdown:
			s.logger.Warn("Email send cancelled due to shutdown", map[string]interface{}{
				"user_id":         user.ID.String(),
				"notification_id": notificationID.String(),
			})
			return
		default:
		}
		
		// Use a background context to avoid cancellation from parent
		bgCtx := context.Background()
		if err := s.SendNotificationEmail(bgCtx, user, notificationType, notificationID, emailData); err != nil {
			s.logger.Error("Failed to send notification email", err, map[string]interface{}{
				"user_id":           user.ID.String(),
				"notification_id":   notificationID.String(),
				"notification_type": notificationType,
			})
		}
	}()
}

// preparePaymentFailedEmail prepares payment failed notification email
func (s *EmailService) preparePaymentFailedEmail(data map[string]interface{}) (html, text string) {
	amountDue := data["AmountDue"]
	invoiceID := data["InvoiceID"]
	gracePeriodEnd := data["GracePeriodEnd"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f5576c 0%%, #f093fb 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Payment Failed</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            We were unable to process your subscription payment of <strong>%s</strong>.
        </p>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #856404;">
                <strong>Don't worry!</strong> Your premium access will continue until <strong>%s</strong> while we attempt to retry the payment.
            </p>
        </div>
        
        <p style="font-size: 16px;">
            Please update your payment method to ensure uninterrupted access to your Pro features.
        </p>
        
        <p style="text-align: center; margin-top: 30px;">
            <a href="%s/settings/billing" style="display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Update Payment Method</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999;">
            Invoice ID: %s<br>
            If you have questions, please contact our support team.
        </p>
    </div>
</body>
</html>
`, amountDue, gracePeriodEnd, s.baseURL, invoiceID)

	text = fmt.Sprintf(`Payment Failed - Action Required

We were unable to process your subscription payment of %s.

Don't worry! Your premium access will continue until %s while we attempt to retry the payment.

Please update your payment method to ensure uninterrupted access to your Pro features.

Update your payment method: %s/settings/billing

Invoice ID: %s

If you have questions, please contact our support team.
`, amountDue, gracePeriodEnd, s.baseURL, invoiceID)

	return html, text
}

// preparePaymentRetryEmail prepares payment retry notification email
func (s *EmailService) preparePaymentRetryEmail(data map[string]interface{}) (html, text string) {
	amountDue := data["AmountDue"]
	nextRetryAt := data["NextRetryAt"]
	attemptCount := data["AttemptCount"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Retry Scheduled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔄 Payment Retry Scheduled</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            We're attempting to retry your subscription payment of <strong>%s</strong>.
        </p>
        
        <p style="font-size: 16px;">
            Next retry attempt: <strong>%s</strong><br>
            Attempt #<strong>%v</strong>
        </p>
        
        <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #0c5460;">
                To avoid service interruption, please ensure your payment method is up to date.
            </p>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
            <a href="%s/settings/billing" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Update Payment Method</a>
        </p>
    </div>
</body>
</html>
`, amountDue, nextRetryAt, attemptCount, s.baseURL)

	text = fmt.Sprintf(`Payment Retry Scheduled

We're attempting to retry your subscription payment of %s.

Next retry attempt: %s
Attempt #%v

To avoid service interruption, please ensure your payment method is up to date.

Update your payment method: %s/settings/billing
`, amountDue, nextRetryAt, attemptCount, s.baseURL)

	return html, text
}

// prepareGracePeriodWarningEmail prepares grace period warning email
func (s *EmailService) prepareGracePeriodWarningEmail(data map[string]interface{}) (html, text string) {
	amountDue := data["AmountDue"]
	gracePeriodEnd := data["GracePeriodEnd"]
	daysRemaining := data["DaysRemaining"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grace Period Ending Soon</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #fc4a1a 0%%, #f7b733 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Your Premium Access Ends Soon</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Your premium access will end in <strong>%v days</strong> on <strong>%s</strong> due to an outstanding payment.
        </p>
        
        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #721c24;">
                <strong>Action Required:</strong> Update your payment method to keep your premium features.
            </p>
        </div>
        
        <p style="font-size: 16px;">
            Outstanding amount: <strong>%s</strong>
        </p>
        
        <p style="font-size: 16px;">
            After %s, your subscription will be downgraded to the free tier and you'll lose access to:
        </p>
        
        <ul style="font-size: 16px;">
            <li>Unlimited favorites and collections</li>
            <li>Advanced search filters</li>
            <li>Priority support</li>
            <li>Ad-free experience</li>
        </ul>
        
        <p style="text-align: center; margin-top: 30px;">
            <a href="%s/settings/billing" style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Update Payment Method Now</a>
        </p>
    </div>
</body>
</html>
`, daysRemaining, gracePeriodEnd, amountDue, gracePeriodEnd, s.baseURL)

	text = fmt.Sprintf(`Your Premium Access Ends Soon

Your premium access will end in %v days on %s due to an outstanding payment.

Action Required: Update your payment method to keep your premium features.

Outstanding amount: %s

After %s, your subscription will be downgraded to the free tier and you'll lose access to:
- Unlimited favorites and collections
- Advanced search filters
- Priority support
- Ad-free experience

Update your payment method now: %s/settings/billing
`, daysRemaining, gracePeriodEnd, amountDue, gracePeriodEnd, s.baseURL)

	return html, text
}

// prepareSubscriptionDowngradedEmail prepares subscription downgraded email
func (s *EmailService) prepareSubscriptionDowngradedEmail(data map[string]interface{}) (html, text string) {
	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Downgraded</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #434343 0%%, #000000 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Downgraded</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Your premium subscription has been downgraded to the free tier due to an unsuccessful payment.
        </p>
        
        <p style="font-size: 16px;">
            You now have access to our free tier features, but premium features are no longer available.
        </p>
        
        <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #0c5460;">
                <strong>Want to restore your premium access?</strong> Update your payment method and resubscribe anytime.
            </p>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
            <a href="%s/premium" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Resubscribe to Pro</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            We're sorry to see you go! If you have any questions or feedback, please contact our support team.
        </p>
    </div>
</body>
</html>
`, s.baseURL)

	text = fmt.Sprintf(`Subscription Downgraded

Your premium subscription has been downgraded to the free tier due to an unsuccessful payment.

You now have access to our free tier features, but premium features are no longer available.

Want to restore your premium access? Update your payment method and resubscribe anytime.

Resubscribe to Pro: %s/premium

We're sorry to see you go! If you have any questions or feedback, please contact our support team.
`, s.baseURL)

	return html, text
}
