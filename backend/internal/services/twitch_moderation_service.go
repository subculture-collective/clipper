package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
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
}

// NewTwitchModerationService creates a new TwitchModerationService
func NewTwitchModerationService(
	twitchClient TwitchBanClient,
	twitchAuthRepo TwitchAuthRepository,
	userRepo ModerationUserRepo,
) *TwitchModerationService {
	return &TwitchModerationService{
		twitchClient:   twitchClient,
		twitchAuthRepo: twitchAuthRepo,
		userRepo:       userRepo,
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
	// Validate scope and get auth
	auth, err := s.ValidateTwitchBanScope(ctx, moderatorUserID, broadcasterID)
	if err != nil {
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
	// Validate scope and get auth
	auth, err := s.ValidateTwitchBanScope(ctx, moderatorUserID, broadcasterID)
	if err != nil {
		return err
	}

	// Call Twitch API
	err = s.twitchClient.UnbanUser(ctx, broadcasterID, auth.TwitchUserID, targetUserID, auth.AccessToken)
	if err != nil {
		// Check for specific Twitch errors
		var authErr *twitch.AuthError
		if errors.As(err, &authErr) {
			return fmt.Errorf("Twitch authentication failed: %w", authErr)
		}
		return fmt.Errorf("failed to unban user on Twitch: %w", err)
	}

	return nil
}
