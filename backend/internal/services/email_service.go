package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"html"
	"net/mail"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/sendgrid/sendgrid-go"
	sendgridmail "github.com/sendgrid/sendgrid-go/helpers/mail"
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
	notificationRepo    *repository.NotificationRepository
	enabled             bool
	sandboxMode         bool // If true, emails are logged but not actually sent
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
	SandboxMode         bool // Enable sandbox mode for testing (logs emails without sending)
	MaxEmailsPerHour    int
	TokenExpiryDuration time.Duration // Duration before unsubscribe tokens expire (default: 90 days)
}

// EmailRequest represents a generic email sending request with template support
// Note: This method does NOT check rate limits or user preferences. Use only for system emails.
// For user-triggered notifications, use SendNotificationEmail instead.
type EmailRequest struct {
	To       []string               // List of recipient email addresses
	Subject  string                 // Email subject line
	Template string                 // Template ID or name (TODO: future SendGrid template integration)
	Data     map[string]interface{} // Template data/variables
	Tags     []string               // Email tags for categorization (TODO: future SendGrid categories API integration)
}

// NewEmailService creates a new EmailService
func NewEmailService(cfg *EmailConfig, repo *repository.EmailNotificationRepository, notificationRepo *repository.NotificationRepository) *EmailService {
	maxPerHour := cfg.MaxEmailsPerHour
	if maxPerHour <= 0 {
		maxPerHour = 10 // Default rate limit
	}

	tokenExpiry := cfg.TokenExpiryDuration
	if tokenExpiry == 0 {
		tokenExpiry = 90 * 24 * time.Hour // Default: 90 days
	}

	logger := utils.GetLogger()

	// Log sandbox mode status
	if cfg.SandboxMode {
		logger.Info("Email service initialized in SANDBOX MODE - emails will be logged but not sent")
	}

	return &EmailService{
		apiKey:              cfg.SendGridAPIKey,
		fromEmail:           cfg.FromEmail,
		fromName:            cfg.FromName,
		baseURL:             cfg.BaseURL,
		repo:                repo,
		notificationRepo:    notificationRepo,
		enabled:             cfg.Enabled,
		sandboxMode:         cfg.SandboxMode,
		maxEmailsPerHour:    maxPerHour,
		tokenExpiryDuration: tokenExpiry,
		logger:              logger,
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

	// Check user's notification preferences
	if s.notificationRepo != nil {
		prefs, err := s.notificationRepo.GetPreferences(ctx, user.ID)
		if err != nil {
			// Log but don't fail - allow email if we can't fetch preferences
			s.logger.Warn("Failed to get notification preferences, sending email anyway", map[string]interface{}{
				"user_id": user.ID.String(),
				"error":   err.Error(),
			})
		} else {
			// Check if email notifications are globally disabled
			if !prefs.EmailEnabled {
				return nil // User has disabled all email notifications
			}

			// Check if email digest is set to "never"
			if prefs.EmailDigest == "never" {
				return nil // User has disabled all email delivery
			}

			// Check specific notification type preferences
			if !s.shouldSendEmailForType(prefs, notificationType) {
				return nil // User has disabled this type of notification
			}
		}
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
	// Sandbox mode: log the email but don't actually send it
	if s.sandboxMode {
		s.logger.Info("SANDBOX MODE: Email would be sent", map[string]interface{}{
			"to":          to,
			"subject":     subject,
			"html_length": len(htmlContent),
			"text_length": len(textContent),
			"from_email":  s.fromEmail,
			"from_name":   s.fromName,
		})
		// Return a fake message ID for testing
		return fmt.Sprintf("sandbox-%s", uuid.New().String()), nil
	}

	from := sendgridmail.NewEmail(s.fromName, s.fromEmail)
	toEmail := sendgridmail.NewEmail("", to)

	message := sendgridmail.NewSingleEmail(from, subject, toEmail, textContent, htmlContent)
	client := sendgrid.NewSendClient(s.apiKey)

	response, err := client.Send(message)
	if err != nil {
		s.logger.Error("SendGrid API error", err, map[string]interface{}{
			"to":      to,
			"subject": subject,
		})
		return "", err
	}

	if response.StatusCode >= 400 {
		errMsg := fmt.Errorf("sendgrid error: status %d, body: %s", response.StatusCode, response.Body)
		s.logger.Error("SendGrid returned error status", errMsg, map[string]interface{}{
			"status_code": response.StatusCode,
			"to":          to,
			"subject":     subject,
		})
		return "", errMsg
	}

	// Extract message ID from headers
	messageID := ""
	if ids, ok := response.Headers["X-Message-Id"]; ok && len(ids) > 0 {
		messageID = ids[0]
	}

	// Log successful send
	s.logger.Info("Email sent successfully via SendGrid", map[string]interface{}{
		"to":         to,
		"subject":    subject,
		"message_id": messageID,
	})

	return messageID, nil
}

// shouldSendEmailForType checks if the user wants emails for a specific notification type
func (s *EmailService) shouldSendEmailForType(prefs *models.NotificationPreferences, notificationType string) bool {
	// Map notification types to preference fields
	switch notificationType {
	// Account & Security
	case models.NotificationTypeLoginNewDevice:
		return prefs.NotifyLoginNewDevice
	case models.NotificationTypeFailedLogin:
		return prefs.NotifyFailedLogin
	case models.NotificationTypePasswordChanged:
		return prefs.NotifyPasswordChanged
	case models.NotificationTypeEmailChanged:
		return prefs.NotifyEmailChanged

	// Content notifications
	case models.NotificationTypeReply:
		return prefs.NotifyReplies
	case models.NotificationTypeMention:
		return prefs.NotifyMentions
	case models.NotificationTypeContentTrending:
		return prefs.NotifyContentTrending
	case models.NotificationTypeContentFlagged:
		return prefs.NotifyContentFlagged
	case models.NotificationTypeVoteMilestone:
		return prefs.NotifyVotes
	case models.NotificationTypeFavoritedClipComment:
		return prefs.NotifyFavoritedClipComment

	// Community notifications
	case models.NotificationTypeModeratorMessage:
		return prefs.NotifyModeratorMessage
	case models.NotificationTypeUserFollowed:
		return prefs.NotifyUserFollowed
	case models.NotificationTypeCommentOnContent:
		return prefs.NotifyCommentOnContent
	case models.NotificationTypeDiscussionReply:
		return prefs.NotifyDiscussionReply
	case models.NotificationTypeBadgeEarned:
		return prefs.NotifyBadges
	case models.NotificationTypeRankUp:
		return prefs.NotifyRankUp
	case models.NotificationTypeContentRemoved, models.NotificationTypeWarning, models.NotificationTypeBan:
		return prefs.NotifyModeration

	// Creator notifications (including clip submissions)
	case models.NotificationTypeSubmissionApproved:
		return prefs.NotifyClipApproved
	case models.NotificationTypeSubmissionRejected:
		return prefs.NotifyClipRejected
	case models.NotificationTypeClipComment:
		return prefs.NotifyClipComments
	case models.NotificationTypeClipVoteThreshold, models.NotificationTypeClipViewThreshold:
		return prefs.NotifyClipThreshold

	// Global/Marketing
	case models.NotificationTypeMarketing:
		return prefs.NotifyMarketing
	case models.NotificationTypePolicyUpdate:
		return prefs.NotifyPolicyUpdates
	case models.NotificationTypePlatformAnnouncement:
		return prefs.NotifyPlatformAnnouncements

	default:
		// For unknown types, allow the email (safer default)
		return true
	}
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
	// Content notifications
	case models.NotificationTypeReply:
		subject = fmt.Sprintf("%s replied to your comment", data["AuthorName"])
		htmlBody, textBody = s.prepareReplyEmail(data)
	case models.NotificationTypeMention:
		subject = fmt.Sprintf("%s mentioned you in a comment", data["AuthorName"])
		htmlBody, textBody = s.prepareMentionEmail(data)
	case models.NotificationTypeSubmissionApproved:
		subject = "Your Clip Submission Has Been Approved! 🎉"
		htmlBody, textBody = s.prepareSubmissionApprovedEmail(data)
	case models.NotificationTypeSubmissionRejected:
		subject = "Clip Submission Status Update"
		htmlBody, textBody = s.prepareSubmissionRejectedEmail(data)
	case models.NotificationTypeContentTrending:
		subject = "🔥 Your Clip is Trending!"
		htmlBody, textBody = s.prepareClipTrendingEmail(data)

	// Account & Auth notifications
	case "welcome":
		subject = "Welcome to clpr! 🎬"
		htmlBody, textBody = s.prepareWelcomeEmail(data)
	case "password_reset":
		subject = "Reset Your clpr Password"
		htmlBody, textBody = s.preparePasswordResetEmail(data)
	case "email_verification":
		subject = "Verify Your Email Address"
		htmlBody, textBody = s.prepareEmailVerificationEmail(data)

	// Moderation notifications
	case models.NotificationTypeContentFlagged:
		subject = "Content Flagged for Review"
		htmlBody, textBody = s.prepareContentFlaggedEmail(data)
	case models.NotificationTypeBan:
		subject = "Account Status Update"
		htmlBody, textBody = s.prepareBanSuspensionEmail(data)

	// System alerts
	case models.NotificationTypeLoginNewDevice:
		subject = "⚠️ New Login Detected"
		htmlBody, textBody = s.prepareSecurityAlertEmail(data)
	case "policy_update":
		subject = "Important Update to Our Policies"
		htmlBody, textBody = s.preparePolicyUpdateEmail(data)

	// MFA notifications
	case "mfa_enabled":
		subject = "Multi-Factor Authentication Enabled"
		htmlBody, textBody = s.prepareMFAEnabledEmail(data)
	case "mfa_disabled":
		subject = "Multi-Factor Authentication Disabled"
		htmlBody, textBody = s.prepareMFADisabledEmail(data)
	case "mfa_backup_codes_regenerated":
		subject = "MFA Backup Codes Regenerated"
		htmlBody, textBody = s.prepareMFABackupCodesRegeneratedEmail(data)

	// Payment notifications
	case models.NotificationTypePaymentFailed:
		subject = "Payment Failed - Action Required"
		htmlBody, textBody = s.preparePaymentFailedEmail(data)
	case models.NotificationTypePaymentRetry:
		subject = "Payment Retry Scheduled"
		htmlBody, textBody = s.preparePaymentRetryEmail(data)
	case models.NotificationTypeGracePeriodWarning:
		subject = "Your Premium Access Will End Soon"
		htmlBody, textBody = s.prepareGracePeriodWarningEmail(data)
	case models.NotificationTypeSubscriptionDowngraded:
		subject = "Your Subscription Has Been Downgraded"
		htmlBody, textBody = s.prepareSubscriptionDowngradedEmail(data)
	case models.NotificationTypeInvoiceFinalized:
		subject = "Your Invoice is Ready"
		htmlBody, textBody = s.prepareInvoiceFinalizedEmail(data)
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
        <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Reply on clpr</h1>
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

	text = fmt.Sprintf(`New Reply on clpr

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

	text = fmt.Sprintf(`You Were Mentioned on clpr!

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

// SendEmail sends a generic email using the provided EmailRequest
// This method provides a flexible interface for sending template-based or custom emails
// WARNING: This method does NOT check rate limits or user preferences. Use only for system emails.
// For user-triggered notifications that respect preferences and rate limits, use SendNotificationEmail.
func (s *EmailService) SendEmail(ctx context.Context, req EmailRequest) error {
	if !s.enabled {
		return nil // Email service disabled
	}

	// Validate request
	if len(req.To) == 0 {
		return fmt.Errorf("no recipients specified")
	}
	if req.Subject == "" {
		return fmt.Errorf("subject is required")
	}

	// Validate email addresses
	for _, email := range req.To {
		if _, err := mail.ParseAddress(email); err != nil {
			return fmt.Errorf("invalid email address: %s", email)
		}
	}

	// For now, we'll build a simple HTML/text email from the data
	// In the future, this could be extended to use SendGrid templates
	htmlBody := s.buildEmailFromData(req.Data)
	textBody := s.buildTextEmailFromData(req.Data)

	// Send to each recipient
	var sendErrors []error
	for _, recipient := range req.To {
		messageID, err := s.sendViaSendGrid(recipient, req.Subject, htmlBody, textBody)
		if err != nil {
			s.logger.Error("Failed to send email", err, map[string]interface{}{
				"to":       recipient,
				"subject":  req.Subject,
				"template": req.Template,
				"tags":     req.Tags,
			})
			sendErrors = append(sendErrors, fmt.Errorf("failed to send to %s: %w", recipient, err))
		} else {
			s.logger.Info("Email sent successfully", map[string]interface{}{
				"to":         recipient,
				"subject":    req.Subject,
				"message_id": messageID,
				"template":   req.Template,
				"tags":       req.Tags,
			})
		}
	}

	if len(sendErrors) > 0 {
		// Include detailed error messages for debugging
		errMsgs := make([]string, len(sendErrors))
		for i, err := range sendErrors {
			errMsgs[i] = err.Error()
		}
		return fmt.Errorf("failed to send %d out of %d emails: %s",
			len(sendErrors), len(req.To), strings.Join(errMsgs, "; "))
	}

	return nil
}

// buildEmailFromData builds a simple HTML email from the provided data
// Keys are sorted alphabetically for consistent ordering
func (s *EmailService) buildEmailFromData(data map[string]interface{}) string {
	htmlContent := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
`
	// Sort keys for consistent ordering
	keys := make([]string, 0, len(data))
	for k := range data {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Build HTML with escaped values to prevent XSS
	for _, key := range keys {
		value := data[key]
		escapedKey := html.EscapeString(key)
		escapedValue := html.EscapeString(fmt.Sprintf("%v", value))
		htmlContent += fmt.Sprintf("    <p><strong>%s:</strong> %s</p>\n", escapedKey, escapedValue)
	}
	htmlContent += `</body>
</html>`
	return htmlContent
}

// buildTextEmailFromData builds a plain text email from the provided data
// Keys are sorted alphabetically for consistent ordering
func (s *EmailService) buildTextEmailFromData(data map[string]interface{}) string {
	// Sort keys for consistent ordering
	keys := make([]string, 0, len(data))
	for k := range data {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	text := ""
	for _, key := range keys {
		value := data[key]
		text += fmt.Sprintf("%s: %v\n", key, value)
	}
	return text
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

// prepareInvoiceFinalizedEmail prepares invoice finalized notification email with PDF link
func (s *EmailService) prepareInvoiceFinalizedEmail(data map[string]interface{}) (html, text string) {
	invoiceNumber := data["InvoiceNumber"]
	// Fallback to InvoiceID if InvoiceNumber is nil or empty
	if invoiceNumber == nil || fmt.Sprintf("%v", invoiceNumber) == "" {
		invoiceNumber = data["InvoiceID"]
	}
	total := data["Total"]
	pdfURL := data["InvoicePDFURL"]
	hostedURL := data["HostedInvoiceURL"]

	// Get optional tax details
	subtotal := data["Subtotal"]
	taxAmount := data["TaxAmount"]

	// Build tax section if tax was applied (check for non-zero string value)
	taxSection := ""
	taxSectionText := ""
	showTax := false
	if taxAmountStr, ok := taxAmount.(string); ok && taxAmountStr != "" {
		// Check that the formatted amount is not zero
		if taxAmountStr != "0.00" && taxAmountStr != "0" {
			showTax = true
		}
	}
	if showTax {
		taxSection = fmt.Sprintf(`
		<tr>
			<td style="padding: 10px; border-bottom: 1px solid #eee;">Subtotal:</td>
			<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;"><strong>%v</strong></td>
		</tr>
		<tr>
			<td style="padding: 10px; border-bottom: 1px solid #eee;">Tax:</td>
			<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;"><strong>%v</strong></td>
		</tr>`, subtotal, taxAmount)
		taxSectionText = fmt.Sprintf(`
Subtotal: %v
Tax: %v`, subtotal, taxAmount)
	}

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Invoice is Ready</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📄 Your Invoice is Ready</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Your invoice <strong>#%s</strong> has been finalized and is ready for your records.
        </p>
        
        <table style="width: 100%%; background: white; border-radius: 5px; margin: 20px 0;">
            %s
            <tr>
                <td style="padding: 15px; font-size: 18px;"><strong>Total:</strong></td>
                <td style="padding: 15px; font-size: 18px; text-align: right;"><strong>%v</strong></td>
            </tr>
        </table>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px;">📥 Download PDF</a>
            <a href="%s" style="display: inline-block; background: #764ba2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px;">🌐 View Online</a>
        </div>
        
        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #155724;">
                <strong>Note:</strong> This invoice includes all applicable taxes based on your location.
            </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This invoice is for your subscription to clpr Pro.<br>
            If you have any questions about this invoice, please contact our support team.
        </p>
    </div>
</body>
</html>
`, invoiceNumber, taxSection, total, pdfURL, hostedURL)

	text = fmt.Sprintf(`Your Invoice is Ready

Your invoice #%s has been finalized and is ready for your records.
%s
Total: %v

Download PDF: %s
View Online: %s

Note: This invoice includes all applicable taxes based on your location.

---
This invoice is for your subscription to clpr Pro.
If you have any questions about this invoice, please contact our support team.
`, invoiceNumber, taxSectionText, total, pdfURL, hostedURL)

	return html, text
}

// prepareWelcomeEmail prepares welcome email for new users
func (s *EmailService) prepareWelcomeEmail(data map[string]interface{}) (html, text string) {
	username := data["Username"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to clpr</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎬 Welcome to clpr!</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px; margin-bottom: 20px;">
            Hi <strong>%s</strong>,
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
            Welcome to clpr.tv - the community-driven platform for discovering and sharing the best Twitch clips!
        </p>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #667eea;">Getting Started</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Browse trending clips on the homepage</li>
                <li style="margin-bottom: 10px;">Vote on your favorite clips to help them rise</li>
                <li style="margin-bottom: 10px;">Submit your own clips for the community</li>
                <li style="margin-bottom: 10px;">Earn karma by contributing quality content</li>
            </ul>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
            <a href="%s" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Explore Clips</a>
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Need help? Check out our <a href="%s/docs" style="color: #667eea;">documentation</a> or visit our <a href="%s/support" style="color: #667eea;">support center</a>.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #667eea; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, username, s.baseURL, s.baseURL, s.baseURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`Welcome to clpr!

Hi %s,

Welcome to clpr.tv - the community-driven platform for discovering and sharing the best Twitch clips!

Getting Started:
- Browse trending clips on the homepage
- Vote on your favorite clips to help them rise
- Submit your own clips for the community
- Earn karma by contributing quality content

Explore Clips: %s

Need help? Check out our documentation at %s/docs or visit our support center at %s/support.

---
Unsubscribe: %s
Manage preferences: %s/settings
`, username, s.baseURL, s.baseURL, s.baseURL, unsubURL, s.baseURL)

	return html, text
}

// preparePasswordResetEmail prepares password reset email
func (s *EmailService) preparePasswordResetEmail(data map[string]interface{}) (html, text string) {
	resetURL := data["ResetURL"]
	expiryHours := data["ExpiryHours"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f5576c 0%%, #f093fb 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Reset Your Password</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            We received a request to reset your clpr password. Click the button below to create a new password.
        </p>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </p>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #856404;">
                <strong>Security Notice:</strong> This link will expire in <strong>%v hours</strong>. If you didn't request this reset, you can safely ignore this email.
            </p>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="%s" style="color: #f5576c; word-break: break-all;">%s</a>
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>Alternative Contact Method:</strong> If you're having trouble, contact our support team at <a href="mailto:support@clpr.tv" style="color: #f5576c;">support@clpr.tv</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #f5576c; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #f5576c; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, resetURL, expiryHours, resetURL, resetURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`Reset Your Password

We received a request to reset your clpr password. Click the link below to create a new password.

Reset Password: %s

Security Notice: This link will expire in %v hours. If you didn't request this reset, you can safely ignore this email.

Alternative Contact Method: If you're having trouble, contact our support team at support@clpr.tv

---
Unsubscribe: %s
Manage preferences: %s/settings
`, resetURL, expiryHours, unsubURL, s.baseURL)

	return html, text
}

// prepareEmailVerificationEmail prepares email verification email
func (s *EmailService) prepareEmailVerificationEmail(data map[string]interface{}) (html, text string) {
	verifyURL := data["VerifyURL"]
	resendURL := data["ResendURL"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✉️ Verify Your Email</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Thanks for signing up! Please verify your email address to get started with clpr.
        </p>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
        </p>
        
        <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #0c5460;">
                <strong>Security Info:</strong> This verification link is unique to your account and can only be used once. Keep it secure!
            </p>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="%s" style="color: #667eea; word-break: break-all;">%s</a>
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Didn't receive the email? <a href="%s" style="color: #667eea;">Resend verification link</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #667eea; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, verifyURL, verifyURL, verifyURL, resendURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`Verify Your Email

Thanks for signing up! Please verify your email address to get started with clpr.

Verify Email Address: %s

Security Info: This verification link is unique to your account and can only be used once. Keep it secure!

Didn't receive the email? Resend verification link: %s

---
Unsubscribe: %s
Manage preferences: %s/settings
`, verifyURL, resendURL, unsubURL, s.baseURL)

	return html, text
}

// prepareSubmissionApprovedEmail prepares submission approved email
func (s *EmailService) prepareSubmissionApprovedEmail(data map[string]interface{}) (html, text string) {
	clipTitle := data["ClipTitle"]
	clipURL := data["ClipURL"]
	viewCount := data["ViewCount"]
	voteScore := data["VoteScore"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submission Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #4ade80 0%%, #22c55e 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Your Clip Has Been Approved!</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Great news! Your submission <strong>"%s"</strong> has been approved and is now live on clpr!
        </p>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #4ade80;">
            <h3 style="margin-top: 0; color: #22c55e;">📊 Stats Snapshot</h3>
            <p style="margin: 10px 0;"><strong>Views:</strong> %v</p>
            <p style="margin: 10px 0;"><strong>Vote Score:</strong> %v</p>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Your Clip</a>
        </p>
        
        <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #0c5460;">
                <strong>Share it!</strong> Help your clip rise to the top by sharing it with the community. The more engagement, the higher it ranks!
            </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #22c55e; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #22c55e; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, clipTitle, viewCount, voteScore, clipURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`Your Clip Has Been Approved!

Great news! Your submission "%s" has been approved and is now live on clpr!

Stats Snapshot:
- Views: %v
- Vote Score: %v

View Your Clip: %s

Share it! Help your clip rise to the top by sharing it with the community. The more engagement, the higher it ranks!

---
Unsubscribe: %s
Manage preferences: %s/settings
`, clipTitle, viewCount, voteScore, clipURL, unsubURL, s.baseURL)

	return html, text
}

// prepareSubmissionRejectedEmail prepares submission rejected email
func (s *EmailService) prepareSubmissionRejectedEmail(data map[string]interface{}) (html, text string) {
	clipTitle := data["ClipTitle"]
	reason := data["Reason"]
	appealURL := data["AppealURL"]
	guidelinesURL := data["GuidelinesURL"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submission Status Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%%, #d97706 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📋 Submission Status Update</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Thank you for submitting <strong>"%s"</strong> to clpr. After review, we're unable to approve this submission at this time.
        </p>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #856404;">
                <strong>Reason:</strong> %s
            </p>
        </div>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #d97706;">💡 Resubmission Tips</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Review our <a href="%s" style="color: #d97706;">community guidelines</a></li>
                <li style="margin-bottom: 10px;">Ensure your clip meets quality standards</li>
                <li style="margin-bottom: 10px;">Check that it hasn't been submitted recently</li>
                <li style="margin-bottom: 10px;">Make sure it fits within our content policy</li>
            </ul>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px;">Submit an Appeal</a>
            <a href="%s/submit" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px;">Submit Another Clip</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #d97706; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #d97706; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, clipTitle, reason, guidelinesURL, appealURL, s.baseURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`Submission Status Update

Thank you for submitting "%s" to clpr. After review, we're unable to approve this submission at this time.

Reason: %s

Resubmission Tips:
- Review our community guidelines: %s
- Ensure your clip meets quality standards
- Check that it hasn't been submitted recently
- Make sure it fits within our content policy

Submit an Appeal: %s
Submit Another Clip: %s/submit

---
Unsubscribe: %s
Manage preferences: %s/settings
`, clipTitle, reason, guidelinesURL, appealURL, s.baseURL, unsubURL, s.baseURL)

	return html, text
}

// prepareClipTrendingEmail prepares clip trending notification email
func (s *EmailService) prepareClipTrendingEmail(data map[string]interface{}) (html, text string) {
	clipTitle := data["ClipTitle"]
	clipURL := data["ClipURL"]
	viewCount := data["ViewCount"]
	voteScore := data["VoteScore"]
	commentCount := data["CommentCount"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Clip is Trending</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #fc4a1a 0%%, #f7b733 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔥 Your Clip is Trending!</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Congratulations! Your clip <strong>"%s"</strong> is gaining traction and trending on clpr!
        </p>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #fc4a1a;">
            <h3 style="margin-top: 0; color: #fc4a1a;">📈 Current Stats</h3>
            <table style="width: 100%%;">
                <tr>
                    <td style="padding: 5px;"><strong>👁️ Views:</strong></td>
                    <td style="padding: 5px; text-align: right;">%v</td>
                </tr>
                <tr>
                    <td style="padding: 5px;"><strong>⬆️ Vote Score:</strong></td>
                    <td style="padding: 5px; text-align: right;">%v</td>
                </tr>
                <tr>
                    <td style="padding: 5px;"><strong>💬 Comments:</strong></td>
                    <td style="padding: 5px; text-align: right;">%v</td>
                </tr>
            </table>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #fc4a1a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Your Trending Clip</a>
        </p>
        
        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #155724;">
                <strong>Keep the momentum going!</strong> Engage with comments and share your clip to help it reach even more viewers.
            </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #fc4a1a; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #fc4a1a; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, clipTitle, viewCount, voteScore, commentCount, clipURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`Your Clip is Trending!

Congratulations! Your clip "%s" is gaining traction and trending on clpr!

Current Stats:
- Views: %v
- Vote Score: %v
- Comments: %v

View Your Trending Clip: %s

Keep the momentum going! Engage with comments and share your clip to help it reach even more viewers.

---
Unsubscribe: %s
Manage preferences: %s/settings
`, clipTitle, viewCount, voteScore, commentCount, clipURL, unsubURL, s.baseURL)

	return html, text
}

// prepareContentFlaggedEmail prepares content flagged notification email
func (s *EmailService) prepareContentFlaggedEmail(data map[string]interface{}) (html, text string) {
	contentType := data["ContentType"]
	contentTitle := data["ContentTitle"]
	flagReason := data["FlagReason"]
	appealURL := data["AppealURL"]
	guidelinesURL := data["GuidelinesURL"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Flagged for Review</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f5576c 0%%, #f093fb 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Content Flagged for Review</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Your %s <strong>"%s"</strong> has been flagged by the community for review.
        </p>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #856404;">
                <strong>Reason for Flag:</strong> %s
            </p>
        </div>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #f5576c;">What Happens Next?</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Our moderation team will review the content</li>
                <li style="margin-bottom: 10px;">You'll be notified of the decision within 24-48 hours</li>
                <li style="margin-bottom: 10px;">If removed, you can appeal the decision</li>
                <li style="margin-bottom: 10px;">Review our <a href="%s" style="color: #f5576c;">community guidelines</a></li>
            </ul>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Submit an Appeal</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #f5576c; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #f5576c; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, contentType, contentTitle, flagReason, guidelinesURL, appealURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`Content Flagged for Review

Your %s "%s" has been flagged by the community for review.

Reason for Flag: %s

What Happens Next?
- Our moderation team will review the content
- You'll be notified of the decision within 24-48 hours
- If removed, you can appeal the decision
- Review our community guidelines: %s

Submit an Appeal: %s

---
Unsubscribe: %s
Manage preferences: %s/settings
`, contentType, contentTitle, flagReason, guidelinesURL, appealURL, unsubURL, s.baseURL)

	return html, text
}

// prepareBanSuspensionEmail prepares ban/suspension notification email
func (s *EmailService) prepareBanSuspensionEmail(data map[string]interface{}) (html, text string) {
	actionType := data["ActionType"] // "ban" or "suspension"
	reason := data["Reason"]
	duration := data["Duration"]
	appealURL := data["AppealURL"]
	unsubURL := data["UnsubscribeURL"]

	actionTitle := "Account Suspended"
	if actionType == "ban" {
		actionTitle = "Account Banned"
	}

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Status Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #434343 0%%, #000000 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚫 %s</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Your clpr account has been %s due to a violation of our community guidelines.
        </p>
        
        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0 0 10px 0; color: #721c24;"><strong>Reason:</strong> %s</p>
            <p style="margin: 0; color: #721c24;"><strong>Duration:</strong> %s</p>
        </div>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #dc3545;">Appeal Process</h3>
            <p style="margin: 0 0 10px 0;">If you believe this action was taken in error, you can submit an appeal:</p>
            <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Provide detailed information about your case</li>
                <li style="margin-bottom: 10px;">Include any relevant context or evidence</li>
                <li style="margin-bottom: 10px;">Appeals are typically reviewed within 3-5 business days</li>
            </ul>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Submit an Appeal</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #dc3545; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #dc3545; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, actionTitle, actionType, reason, duration, appealURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`Account Status Update - %s

Your clpr account has been %s due to a violation of our community guidelines.

Reason: %s
Duration: %s

Appeal Process:
If you believe this action was taken in error, you can submit an appeal:
- Provide detailed information about your case
- Include any relevant context or evidence
- Appeals are typically reviewed within 3-5 business days

Submit an Appeal: %s

---
Unsubscribe: %s
Manage preferences: %s/settings
`, actionTitle, actionType, reason, duration, appealURL, unsubURL, s.baseURL)

	return html, text
}

// prepareSecurityAlertEmail prepares security alert email
func (s *EmailService) prepareSecurityAlertEmail(data map[string]interface{}) (html, text string) {
	deviceName := data["DeviceName"]
	location := data["Location"]
	ipAddress := data["IPAddress"]
	timestamp := data["Timestamp"]
	secureAccountURL := data["SecureAccountURL"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #dc3545 0%%, #c82333 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ New Login Detected</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            We detected a new login to your clpr account from an unrecognized device.
        </p>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #dc3545;">
            <h3 style="margin-top: 0; color: #dc3545;">Login Details</h3>
            <p style="margin: 5px 0;"><strong>Device:</strong> %s</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> %s</p>
            <p style="margin: 5px 0;"><strong>IP Address:</strong> %s</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> %s</p>
        </div>
        
        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #721c24;">
                <strong>Action Required:</strong> If this wasn't you, secure your account immediately by changing your password and reviewing recent activity.
            </p>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Secure My Account</a>
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If this was you, you can safely ignore this email. We send these notifications to help keep your account secure.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #dc3545; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #dc3545; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, deviceName, location, ipAddress, timestamp, secureAccountURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`New Login Detected - Security Alert

We detected a new login to your clpr account from an unrecognized device.

Login Details:
- Device: %s
- Location: %s
- IP Address: %s
- Time: %s

Action Required: If this wasn't you, secure your account immediately by changing your password and reviewing recent activity.

Secure My Account: %s

If this was you, you can safely ignore this email. We send these notifications to help keep your account secure.

---
Unsubscribe: %s
Manage preferences: %s/settings
`, deviceName, location, ipAddress, timestamp, secureAccountURL, unsubURL, s.baseURL)

	return html, text
}

// preparePolicyUpdateEmail prepares policy update notification email
func (s *EmailService) preparePolicyUpdateEmail(data map[string]interface{}) (html, text string) {
	policyName := data["PolicyName"]
	changesSummary := data["ChangesSummary"]
	effectiveDate := data["EffectiveDate"]
	fullPolicyURL := data["FullPolicyURL"]
	unsubURL := data["UnsubscribeURL"]

	html = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Policy Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📋 Important Policy Update</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            We've made some updates to our <strong>%s</strong> that we want you to know about.
        </p>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #667eea;">What Changed</h3>
            <p style="margin: 0; white-space: pre-line;">%s</p>
        </div>
        
        <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #0c5460;">
                <strong>Effective Date:</strong> %s<br>
                These changes will take effect on the date shown above. By continuing to use clpr, you agree to these updated terms.
            </p>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="%s" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Read Full Policy</a>
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions about these changes, please don't hesitate to contact our support team at <a href="mailto:support@clpr.tv" style="color: #667eea;">support@clpr.tv</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            <a href="%s" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
            <a href="%s/settings" style="color: #667eea; text-decoration: none;">Manage Preferences</a>
        </p>
    </div>
</body>
</html>
`, policyName, changesSummary, effectiveDate, fullPolicyURL, unsubURL, s.baseURL)

	text = fmt.Sprintf(`Important Policy Update

We've made some updates to our %s that we want you to know about.

What Changed:
%s

Effective Date: %s
These changes will take effect on the date shown above. By continuing to use clpr, you agree to these updated terms.

Read Full Policy: %s

If you have any questions about these changes, please don't hesitate to contact our support team at support@clpr.tv

---
Unsubscribe: %s
Manage preferences: %s/settings
`, policyName, changesSummary, effectiveDate, fullPolicyURL, unsubURL, s.baseURL)

	return html, text
}

// SendDisputeNotification sends a notification email when a payment dispute is created
func (s *EmailService) SendDisputeNotification(ctx context.Context, user *models.User, dispute interface{}) error {
	if !s.enabled {
		s.logger.Debug("Email service is disabled, skipping dispute notification")
		return nil
	}

	if user.Email == nil || *user.Email == "" {
		return errors.New("user email is required")
	}

	// Prepare email content
	subject := "Payment Dispute Notification - Action May Be Required"
	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Dispute</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f46b45 0%%, #eea849 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Payment Dispute Notification</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Hi %s,
        </p>
        
        <p style="font-size: 16px;">
            We wanted to notify you that a payment dispute has been filed regarding your subscription payment.
        </p>
        
        <div style="background: #fff3cd; border-left: 4px solid #856404; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #856404;">
                <strong>What does this mean?</strong><br>
                A dispute (also called a chargeback) means that you or your bank has questioned a charge on your payment method. 
                We're working to resolve this, but your subscription may be affected.
            </p>
        </div>
        
        <p style="font-size: 16px;">
            <strong>What should you do?</strong><br>
            • If you recognize this charge, no action is needed - we'll handle it.<br>
            • If you didn't initiate this dispute, please contact your bank.<br>
            • If you have questions, please reach out to our support team.
        </p>
        
        <p style="text-align: center; margin-top: 30px;">
            <a href="%s/settings/billing" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Billing Details</a>
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            If you have any questions or concerns, please contact our support team. We're here to help!
        </p>
    </div>
</body>
</html>
`, html.EscapeString(user.DisplayName), s.baseURL)

	textContent := fmt.Sprintf(`Payment Dispute Notification

Hi %s,

We wanted to notify you that a payment dispute has been filed regarding your subscription payment.

What does this mean?
A dispute (also called a chargeback) means that you or your bank has questioned a charge on your payment method. We're working to resolve this, but your subscription may be affected.

What should you do?
• If you recognize this charge, no action is needed - we'll handle it.
• If you didn't initiate this dispute, please contact your bank.
• If you have questions, please reach out to our support team.

View your billing details: %s/settings/billing

If you have any questions or concerns, please contact our support team. We're here to help!
`, html.EscapeString(user.DisplayName), s.baseURL)

	// Create email request
	req := EmailRequest{
		To:      []string{*user.Email},
		Subject: subject,
		Data: map[string]interface{}{
			"HTML": htmlContent,
			"Text": textContent,
		},
		Tags: []string{"dispute", "billing"},
	}

	// Send email
	if s.sandboxMode {
		s.logger.Info(fmt.Sprintf("SANDBOX MODE: Dispute notification email to %s", *user.Email))
		s.logger.Debug(fmt.Sprintf("Subject: %s", subject))
		return nil
	}

	return s.SendEmail(ctx, req)
}
