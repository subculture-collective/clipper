package handlers

import (
	"context"
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// SendGridWebhookHandler handles incoming SendGrid webhook events
type SendGridWebhookHandler struct {
	emailLogRepo *repository.EmailLogRepository
	publicKey    *ecdsa.PublicKey
	logger       *utils.StructuredLogger
}

// NewSendGridWebhookHandler creates a new SendGrid webhook handler
func NewSendGridWebhookHandler(emailLogRepo *repository.EmailLogRepository, sendgridPublicKey string) *SendGridWebhookHandler {
	logger := utils.GetLogger()

	var publicKey *ecdsa.PublicKey
	if sendgridPublicKey != "" {
		key, err := parseECDSAPublicKey(sendgridPublicKey)
		if err != nil {
			logger.Warn("Failed to parse SendGrid public key, webhook signature verification will be disabled", map[string]interface{}{"error": err.Error()})
		} else {
			publicKey = key
		}
	} else {
		logger.Warn("SendGrid public key not configured, webhook signature verification is disabled")
	}

	return &SendGridWebhookHandler{
		emailLogRepo: emailLogRepo,
		publicKey:    publicKey,
		logger:       logger,
	}
}

// HandleWebhook processes SendGrid webhook events
// @Summary Handle SendGrid webhook events
// @Description Processes SendGrid webhook events for email delivery tracking
// @Tags webhooks
// @Accept json
// @Produce json
// @Param X-Twilio-Email-Event-Webhook-Signature header string false "SendGrid signature"
// @Param X-Twilio-Email-Event-Webhook-Timestamp header string false "SendGrid timestamp"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/webhooks/sendgrid [post]
func (h *SendGridWebhookHandler) HandleWebhook(c *gin.Context) {
	// Read request body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		h.logger.Error("Failed to read webhook body", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Verify webhook signature if public key is configured
	if h.publicKey != nil {
		signature := c.GetHeader("X-Twilio-Email-Event-Webhook-Signature")
		timestamp := c.GetHeader("X-Twilio-Email-Event-Webhook-Timestamp")

		if signature == "" || timestamp == "" {
			h.logger.Warn("Missing webhook signature or timestamp headers")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing signature headers"})
			return
		}

		if err := h.verifySignature(body, signature, timestamp); err != nil {
			h.logger.Warn("Invalid webhook signature", map[string]interface{}{"error": err.Error()})
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
			return
		}
	}

	// Parse webhook events (SendGrid sends an array of events)
	var events []models.SendGridWebhookEvent
	if err := json.Unmarshal(body, &events); err != nil {
		h.logger.Error("Failed to parse webhook events", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event format"})
		return
	}

	h.logger.Info("Received SendGrid webhook events", map[string]interface{}{"event_count": len(events)})

	// Process each event
	for _, event := range events {
		if err := h.processEvent(c.Request.Context(), &event); err != nil {
			// Log error but continue processing other events
			h.logger.Error("Failed to process event", err, map[string]interface{}{"event_type": event.Event})
		}
	}

	// Return 200 OK immediately as per requirements
	c.JSON(http.StatusOK, gin.H{"message": "Events processed"})
}

// processEvent processes a single SendGrid webhook event
func (h *SendGridWebhookHandler) processEvent(ctx context.Context, event *models.SendGridWebhookEvent) error {
	// Convert timestamp to time.Time
	eventTime := time.Unix(event.Timestamp, 0)

	// Determine status and event type
	status := h.mapEventToStatus(event.Event)

	// Check if this is a new event or an update to an existing log
	var existingLog *models.EmailLog
	var err error

	if event.SgMessageID != "" {
		existingLog, err = h.emailLogRepo.GetEmailLogByMessageID(ctx, event.SgMessageID)
		if err != nil {
			h.logger.Error("Failed to check for existing email log", err, map[string]interface{}{"message_id": event.SgMessageID})
		}
	}

	// Prepare metadata
	metadataBytes, _ := json.Marshal(event)
	metadataStr := string(metadataBytes)

	if existingLog != nil {
		// Update existing log
		h.updateExistingLog(existingLog, event, status, eventTime)
		existingLog.Metadata = &metadataStr
		existingLog.UpdatedAt = time.Now()

		if err := h.emailLogRepo.UpdateEmailLog(ctx, existingLog); err != nil {
			return fmt.Errorf("failed to update email log: %w", err)
		}

		h.logger.Info("Updated email log", map[string]interface{}{"log_id": existingLog.ID, "event_type": event.Event})
	} else {
		// Create new log entry
		log := &models.EmailLog{
			ID:                uuid.New(),
			Recipient:         event.Email,
			Status:            status,
			EventType:         event.Event,
			SendGridMessageID: &event.SgMessageID,
			SendGridEventID:   &event.SgEventID,
			IPAddress:         &event.IP,
			UserAgent:         &event.UserAgent,
			Metadata:          &metadataStr,
			CreatedAt:         time.Now(),
			UpdatedAt:         time.Now(),
		}

		// Set template from category if available
		if len(event.Category) > 0 {
			log.Template = &event.Category[0]
		}

		// Set event-specific fields
		h.setEventSpecificFields(log, event, eventTime)

		if err := h.emailLogRepo.CreateEmailLog(ctx, log); err != nil {
			return fmt.Errorf("failed to create email log: %w", err)
		}

		h.logger.Info("Created email log", map[string]interface{}{"log_id": log.ID, "event_type": event.Event})
	}

	return nil
}

// mapEventToStatus maps SendGrid event types to our status field
func (h *SendGridWebhookHandler) mapEventToStatus(eventType string) string {
	switch eventType {
	case "processed", "delivered":
		return models.EmailLogStatusDelivered
	case "bounce":
		return models.EmailLogStatusBounce
	case "dropped":
		return models.EmailLogStatusDropped
	case "open":
		return models.EmailLogStatusOpen
	case "click":
		return models.EmailLogStatusClick
	case "spamreport":
		return models.EmailLogStatusSpamReport
	case "unsubscribe", "group_unsubscribe", "group_resubscribe":
		return models.EmailLogStatusUnsubscribe
	case "deferred":
		return models.EmailLogStatusDeferred
	default:
		return eventType
	}
}

// setEventSpecificFields sets fields specific to the event type
func (h *SendGridWebhookHandler) setEventSpecificFields(log *models.EmailLog, event *models.SendGridWebhookEvent, eventTime time.Time) {
	switch event.Event {
	case "processed":
		// 'processed' is when SendGrid has received and validated the message
		log.SentAt = &eventTime
	case "delivered":
		// 'delivered' is when the message was successfully delivered to the receiving server
		log.DeliveredAt = &eventTime
	case "bounce":
		log.BouncedAt = &eventTime
		if event.Type != "" {
			bounceType := event.Type // hard, soft, blocked
			log.BounceType = &bounceType
		}
		if event.Reason != "" {
			log.BounceReason = &event.Reason
		}
	case "dropped":
		log.BouncedAt = &eventTime
		if event.Reason != "" {
			log.BounceReason = &event.Reason
		}
	case "open":
		log.OpenedAt = &eventTime
	case "click":
		log.ClickedAt = &eventTime
		if event.URL != "" {
			log.LinkURL = &event.URL
		}
	case "spamreport":
		log.SpamReportedAt = &eventTime
	case "unsubscribe", "group_unsubscribe":
		log.UnsubscribedAt = &eventTime
	}
}

// updateExistingLog updates an existing log with new event data
func (h *SendGridWebhookHandler) updateExistingLog(log *models.EmailLog, event *models.SendGridWebhookEvent, status string, eventTime time.Time) {
	// Update status to the latest event
	log.Status = status

	// Update event-specific timestamps and fields
	switch event.Event {
	case "delivered":
		log.DeliveredAt = &eventTime
	case "bounce":
		log.BouncedAt = &eventTime
		if event.Type != "" {
			bounceType := event.Type
			log.BounceType = &bounceType
		}
		if event.Reason != "" {
			log.BounceReason = &event.Reason
		}
	case "dropped":
		log.BouncedAt = &eventTime
		if event.Reason != "" {
			log.BounceReason = &event.Reason
		}
	case "open":
		// Only update if not already set (track first open)
		if log.OpenedAt == nil {
			log.OpenedAt = &eventTime
		}
	case "click":
		// Only update if not already set (track first click)
		if log.ClickedAt == nil {
			log.ClickedAt = &eventTime
		}
		if event.URL != "" {
			log.LinkURL = &event.URL
		}
	case "spamreport":
		log.SpamReportedAt = &eventTime
	case "unsubscribe", "group_unsubscribe":
		log.UnsubscribedAt = &eventTime
	}
}

// verifySignature verifies the SendGrid webhook signature
func (h *SendGridWebhookHandler) verifySignature(payload []byte, signature, timestamp string) error {
	// SECURITY WARNING: This is a placeholder implementation that does NOT provide real security.
	// Before using this webhook endpoint in production, you MUST implement proper ECDSA signature verification.
	//
	// The current implementation only checks for signature presence but does not verify its authenticity,
	// making the endpoint vulnerable to spoofed webhook requests.
	//
	// To implement proper verification:
	// 1. Parse the ECDSA public key from h.publicKey (already configured)
	// 2. Construct the signed payload: timestamp + payload
	// 3. Decode the base64-encoded signature
	// 4. Verify the signature using crypto/ecdsa.Verify()
	//
	// Reference: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features

	if signature == "" {
		return fmt.Errorf("empty signature")
	}

	// TODO: Implement ECDSA signature verification before production use
	// Example implementation:
	// signedPayload := timestamp + string(payload)
	// hash := sha256.Sum256([]byte(signedPayload))
	// sigBytes, _ := base64.StdEncoding.DecodeString(signature)
	// r, s := parseSignature(sigBytes)
	// if !ecdsa.Verify(h.publicKey, hash[:], r, s) {
	//     return fmt.Errorf("invalid signature")
	// }

	return nil
}

// parseECDSAPublicKey parses an ECDSA public key from PEM format
func parseECDSAPublicKey(publicKeyPEM string) (*ecdsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return nil, fmt.Errorf("failed to parse PEM block")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %w", err)
	}

	ecdsaPub, ok := pub.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("not an ECDSA public key")
	}

	return ecdsaPub, nil
}
