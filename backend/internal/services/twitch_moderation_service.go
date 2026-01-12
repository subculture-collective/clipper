package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/pkg/metrics"
	"github.com/subculture-collective/clipper/pkg/twitch"
)

// Sentinel errors for Twitch moderation operations
var (
	ErrTwitchNotAuthenticated    = errors.New("user not authenticated with Twitch")
	ErrTwitchScopeInsufficient   = errors.New("insufficient Twitch scopes for this action")
	ErrTwitchNotBroadcaster      = errors.New("user is not the broadcaster for this channel")
	ErrTwitchNotModerator        = errors.New("user is not a Twitch moderator for this channel")
	ErrSiteModeratorsReadOnly    = errors.New("site moderators cannot perform Twitch ban actions - Twitch channel moderator status required")
)

// TwitchAuthRepository defines the interface for Twitch auth operations
type TwitchAuthRepository interface {
	GetTwitchAuth(ctx context.Context, userID uuid.UUID) (*models.TwitchAuth, error)
	IsTokenExpired(auth *models.TwitchAuth) bool
}

// TwitchBanClient defines the interface for Twitch ban/unban operations
type TwitchBanClient interface {
	BanUser(ctx context.Context, broadcasterID string, moderatorID string, userAccessToken string, request *twitch.BanUserRequest) (*twitch.BanUserResponse, error)
	UnbanUser(ctx context.Context, broadcasterID string, moderatorID string, userID string, userAccessToken string) error
}

// TwitchModerationService handles Twitch-specific moderation operations with scope enforcement
type TwitchModerationService struct {
	twitchClient   TwitchBanClient
	twitchAuthRepo TwitchAuthRepository
	userRepo       ModerationUserRepo
	auditLogRepo   ModerationAuditRepo
}

// NewTwitchModerationService creates a new TwitchModerationService
func NewTwitchModerationService(
	twitchClient TwitchBanClient,
	twitchAuthRepo TwitchAuthRepository,
	userRepo ModerationUserRepo,
	auditLogRepo ModerationAuditRepo,
) *TwitchModerationService {
	return &TwitchModerationService{
		twitchClient:   twitchClient,
		twitchAuthRepo: twitchAuthRepo,
		userRepo:       userRepo,
		auditLogRepo:   auditLogRepo,
	}
}

// ValidateTwitchBanScope validates that a user can perform Twitch ban/unban actions
// This enforces:
// - User must have valid Twitch OAuth token
// - Token must have moderator:manage:banned_users OR channel:manage:banned_users scope
// - User must be either:
//   - The broadcaster for the channel (twitchUserID == broadcasterID), OR
//   - A Twitch-recognized moderator for that channel
// - Site moderators are blocked (they have Clipper permissions but not Twitch permissions)
func (s *TwitchModerationService) ValidateTwitchBanScope(ctx context.Context, userID uuid.UUID, broadcasterID string) (*models.TwitchAuth, error) {
	// Get user to check if they're a site moderator
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Site moderators are explicitly blocked from Twitch actions
	// They have Clipper-level moderation powers but not necessarily Twitch mod status
	if user.AccountType == models.AccountTypeModerator && user.ModeratorScope == models.ModeratorScopeSite {
		return nil, ErrSiteModeratorsReadOnly
	}

	// Get user's Twitch auth
	auth, err := s.twitchAuthRepo.GetTwitchAuth(ctx, userID)
	if err != nil || auth == nil {
		return nil, ErrTwitchNotAuthenticated
	}

	// Check token expiry
	if s.twitchAuthRepo.IsTokenExpired(auth) {
		return nil, &twitch.AuthError{Message: "Twitch token expired, please re-authenticate"}
	}

	// Validate scopes - user must have at least one of the required scopes
	requiredScopes := map[string]bool{
		"moderator:manage:banned_users": true, // For moderators
		"channel:manage:banned_users":   true, // For broadcasters
	}

	hasRequiredScope := false
	scopes := strings.Split(auth.Scopes, " ")
	for _, scope := range scopes {
		if requiredScopes[scope] {
			hasRequiredScope = true
			break
		}
	}

	if !hasRequiredScope {
		return nil, ErrTwitchScopeInsufficient
	}

	// Check if user is the broadcaster
	if auth.TwitchUserID == broadcasterID {
		// User is the broadcaster, they can manage bans in their channel
		return auth, nil
	}

	// User is not the broadcaster, they must be a Twitch moderator for this channel
	// This would require checking Twitch's moderator list for the channel
	// For now, we enforce that only the broadcaster can ban (stricter than Twitch)
	// Future enhancement: Call Twitch API to verify moderator status
	// GET https://api.twitch.tv/helix/moderation/moderators?broadcaster_id={broadcaster_id}&user_id={user_id}
	
	// For P0 implementation, only broadcasters can use Twitch ban actions
	return nil, ErrTwitchNotBroadcaster
}

// BanUserOnTwitch bans a user on Twitch via API
// Validates scope and permissions before calling Twitch API
func (s *TwitchModerationService) BanUserOnTwitch(ctx context.Context, moderatorUserID uuid.UUID, broadcasterID string, targetUserID string, reason *string, duration *int) error {
	// Record start time for latency metrics
	startTime := time.Now()
	action := "ban"
	var statusCode int
	var banErr error
	
	// Ensure metrics and audit logs are emitted regardless of outcome
	defer func() {
		// Record latency
		metrics.TwitchBanActionDuration.WithLabelValues(action).Observe(time.Since(startTime).Seconds())
		
		// Determine status and error code for metrics
		status := "success"
		errorCode := "none"
		
		if banErr != nil {
			status = "failed"
			errorCode = categorizeError(banErr)
			
			// Track specific error types
			if errors.Is(banErr, ErrTwitchScopeInsufficient) {
				metrics.TwitchBanPermissionErrors.WithLabelValues(action, "insufficient_scope").Inc()
			} else if errors.Is(banErr, ErrTwitchNotBroadcaster) {
				metrics.TwitchBanPermissionErrors.WithLabelValues(action, "not_broadcaster").Inc()
			} else if errors.Is(banErr, ErrTwitchNotAuthenticated) {
				metrics.TwitchBanPermissionErrors.WithLabelValues(action, "not_authenticated").Inc()
			} else if errors.Is(banErr, ErrSiteModeratorsReadOnly) {
				metrics.TwitchBanPermissionErrors.WithLabelValues(action, "site_moderator_readonly").Inc()
			}
			
			// Track rate limits
			var rateLimitErr *twitch.RateLimitError
			if errors.As(banErr, &rateLimitErr) {
				metrics.TwitchBanRateLimitHits.WithLabelValues(action).Inc()
			}
			
			// Track server errors
			var apiErr *twitch.APIError
			if errors.As(banErr, &apiErr) {
				statusCode = apiErr.StatusCode
				if statusCode >= 500 {
					metrics.TwitchBanServerErrors.WithLabelValues(action, strconv.Itoa(statusCode)).Inc()
				}
			}
			
			// Track moderation errors
			var modErr *twitch.ModerationError
			if errors.As(banErr, &modErr) {
				statusCode = modErr.StatusCode
				if modErr.Code == twitch.ModerationErrorCodeRateLimited {
					metrics.TwitchBanRateLimitHits.WithLabelValues(action).Inc()
				}
			}
		} else {
			statusCode = 200
		}
		
		// Record total action count
		metrics.TwitchBanActionTotal.WithLabelValues(action, status, errorCode).Inc()
		
		// Record HTTP status
		if statusCode > 0 {
			statusClass := fmt.Sprintf("%dxx", statusCode/100)
			metrics.TwitchBanHTTPStatus.WithLabelValues(action, strconv.Itoa(statusCode), statusClass).Inc()
		}
		
		// Create audit log entry
		auditMetadata := map[string]interface{}{
			"action":         "twitch_ban",
			"broadcaster_id": broadcasterID,
			"target_user_id": targetUserID,
			"success":        banErr == nil,
		}
		
		if reason != nil {
			auditMetadata["reason"] = *reason
		}
		if duration != nil {
			auditMetadata["duration_seconds"] = *duration
		}
		if statusCode > 0 {
			auditMetadata["http_status"] = statusCode
		}
		if banErr != nil {
			auditMetadata["error"] = banErr.Error()
			auditMetadata["error_code"] = errorCode
		}
		
		// Parse target user ID as UUID for audit log
		// Note: Twitch user IDs are strings, but we need a UUID for entity_id
		// We'll use the moderator ID as entity_id since it's the actor
		auditLog := &models.ModerationAuditLog{
			Action:      "twitch_ban",
			EntityType:  "twitch_user",
			EntityID:    moderatorUserID, // Using moderator as entity since Twitch IDs are strings
			ModeratorID: moderatorUserID,
			Reason:      reason,
			Metadata:    auditMetadata,
		}
		
		// Attempt to create audit log, but don't fail the operation if it fails
		if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
			// Log error but don't propagate - audit failures shouldn't block operations
			// TODO: Add structured logging here
		}
	}()
	
	// Validate scope and get auth
	auth, err := s.ValidateTwitchBanScope(ctx, moderatorUserID, broadcasterID)
	if err != nil {
		banErr = err
		return err
	}

	// Build ban request
	request := &twitch.BanUserRequest{
		UserID:   targetUserID,
		Duration: duration,
		Reason:   reason,
	}

	// Call Twitch API
	_, err = s.twitchClient.BanUser(ctx, broadcasterID, auth.TwitchUserID, auth.AccessToken, request)
	if err != nil {
		banErr = err
		// Check for specific Twitch errors
		var authErr *twitch.AuthError
		if errors.As(err, &authErr) {
			return fmt.Errorf("Twitch authentication failed: %w", authErr)
		}
		return fmt.Errorf("failed to ban user on Twitch: %w", err)
	}

	return nil
}

// UnbanUserOnTwitch unbans a user on Twitch via API
// Validates scope and permissions before calling Twitch API
func (s *TwitchModerationService) UnbanUserOnTwitch(ctx context.Context, moderatorUserID uuid.UUID, broadcasterID string, targetUserID string) error {
	// Record start time for latency metrics
	startTime := time.Now()
	action := "unban"
	var statusCode int
	var unbanErr error
	
	// Ensure metrics and audit logs are emitted regardless of outcome
	defer func() {
		// Record latency
		metrics.TwitchBanActionDuration.WithLabelValues(action).Observe(time.Since(startTime).Seconds())
		
		// Determine status and error code for metrics
		status := "success"
		errorCode := "none"
		
		if unbanErr != nil {
			status = "failed"
			errorCode = categorizeError(unbanErr)
			
			// Track specific error types
			if errors.Is(unbanErr, ErrTwitchScopeInsufficient) {
				metrics.TwitchBanPermissionErrors.WithLabelValues(action, "insufficient_scope").Inc()
			} else if errors.Is(unbanErr, ErrTwitchNotBroadcaster) {
				metrics.TwitchBanPermissionErrors.WithLabelValues(action, "not_broadcaster").Inc()
			} else if errors.Is(unbanErr, ErrTwitchNotAuthenticated) {
				metrics.TwitchBanPermissionErrors.WithLabelValues(action, "not_authenticated").Inc()
			} else if errors.Is(unbanErr, ErrSiteModeratorsReadOnly) {
				metrics.TwitchBanPermissionErrors.WithLabelValues(action, "site_moderator_readonly").Inc()
			}
			
			// Track rate limits
			var rateLimitErr *twitch.RateLimitError
			if errors.As(unbanErr, &rateLimitErr) {
				metrics.TwitchBanRateLimitHits.WithLabelValues(action).Inc()
			}
			
			// Track server errors
			var apiErr *twitch.APIError
			if errors.As(unbanErr, &apiErr) {
				statusCode = apiErr.StatusCode
				if statusCode >= 500 {
					metrics.TwitchBanServerErrors.WithLabelValues(action, strconv.Itoa(statusCode)).Inc()
				}
			}
			
			// Track moderation errors
			var modErr *twitch.ModerationError
			if errors.As(unbanErr, &modErr) {
				statusCode = modErr.StatusCode
				if modErr.Code == twitch.ModerationErrorCodeRateLimited {
					metrics.TwitchBanRateLimitHits.WithLabelValues(action).Inc()
				}
			}
		} else {
			statusCode = 200
		}
		
		// Record total action count
		metrics.TwitchBanActionTotal.WithLabelValues(action, status, errorCode).Inc()
		
		// Record HTTP status
		if statusCode > 0 {
			statusClass := fmt.Sprintf("%dxx", statusCode/100)
			metrics.TwitchBanHTTPStatus.WithLabelValues(action, strconv.Itoa(statusCode), statusClass).Inc()
		}
		
		// Create audit log entry
		auditMetadata := map[string]interface{}{
			"action":         "twitch_unban",
			"broadcaster_id": broadcasterID,
			"target_user_id": targetUserID,
			"success":        unbanErr == nil,
		}
		
		if statusCode > 0 {
			auditMetadata["http_status"] = statusCode
		}
		if unbanErr != nil {
			auditMetadata["error"] = unbanErr.Error()
			auditMetadata["error_code"] = errorCode
		}
		
		// Parse target user ID as UUID for audit log
		// Note: Twitch user IDs are strings, but we need a UUID for entity_id
		// We'll use the moderator ID as entity_id since it's the actor
		auditLog := &models.ModerationAuditLog{
			Action:      "twitch_unban",
			EntityType:  "twitch_user",
			EntityID:    moderatorUserID, // Using moderator as entity since Twitch IDs are strings
			ModeratorID: moderatorUserID,
			Metadata:    auditMetadata,
		}
		
		// Attempt to create audit log, but don't fail the operation if it fails
		if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
			// Log error but don't propagate - audit failures shouldn't block operations
			// TODO: Add structured logging here
		}
	}()
	
	// Validate scope and get auth
	auth, err := s.ValidateTwitchBanScope(ctx, moderatorUserID, broadcasterID)
	if err != nil {
		unbanErr = err
		return err
	}

	// Call Twitch API
	err = s.twitchClient.UnbanUser(ctx, broadcasterID, auth.TwitchUserID, targetUserID, auth.AccessToken)
	if err != nil {
		unbanErr = err
		// Check for specific Twitch errors
		var authErr *twitch.AuthError
		if errors.As(err, &authErr) {
			return fmt.Errorf("Twitch authentication failed: %w", authErr)
		}
		return fmt.Errorf("failed to unban user on Twitch: %w", err)
	}

	return nil
}

// categorizeError categorizes an error into a simple error code for metrics
func categorizeError(err error) string {
	if errors.Is(err, ErrTwitchNotAuthenticated) {
		return "not_authenticated"
	}
	if errors.Is(err, ErrTwitchScopeInsufficient) {
		return "insufficient_scope"
	}
	if errors.Is(err, ErrTwitchNotBroadcaster) {
		return "not_broadcaster"
	}
	if errors.Is(err, ErrTwitchNotModerator) {
		return "not_moderator"
	}
	if errors.Is(err, ErrSiteModeratorsReadOnly) {
		return "site_moderator_readonly"
	}
	
	var rateLimitErr *twitch.RateLimitError
	if errors.As(err, &rateLimitErr) {
		return "rate_limited"
	}
	
	var modErr *twitch.ModerationError
	if errors.As(err, &modErr) {
		return string(modErr.Code)
	}
	
	var apiErr *twitch.APIError
	if errors.As(err, &apiErr) {
		if apiErr.StatusCode >= 500 {
			return "server_error"
		}
		if apiErr.StatusCode >= 400 {
			return "client_error"
		}
	}
	
	return "unknown"
}
