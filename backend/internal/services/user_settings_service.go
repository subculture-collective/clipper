package services

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// UserSettingsService handles user settings operations
type UserSettingsService struct {
	userRepo              *repository.UserRepository
	userSettingsRepo      *repository.UserSettingsRepository
	accountDeletionRepo   *repository.AccountDeletionRepository
	clipRepo              *repository.ClipRepository
	voteRepo              *repository.VoteRepository
	favoriteRepo          *repository.FavoriteRepository
	auditLogService       *AuditLogService
}

// NewUserSettingsService creates a new user settings service
func NewUserSettingsService(
	userRepo *repository.UserRepository,
	userSettingsRepo *repository.UserSettingsRepository,
	accountDeletionRepo *repository.AccountDeletionRepository,
	clipRepo *repository.ClipRepository,
	voteRepo *repository.VoteRepository,
	favoriteRepo *repository.FavoriteRepository,
	auditLogService *AuditLogService,
) *UserSettingsService {
	return &UserSettingsService{
		userRepo:            userRepo,
		userSettingsRepo:    userSettingsRepo,
		accountDeletionRepo: accountDeletionRepo,
		clipRepo:            clipRepo,
		voteRepo:            voteRepo,
		favoriteRepo:        favoriteRepo,
		auditLogService:     auditLogService,
	}
}

// UpdateProfile updates user's display name and bio
func (s *UserSettingsService) UpdateProfile(ctx context.Context, userID uuid.UUID, displayName string, bio *string) error {
	return s.userRepo.UpdateProfile(ctx, userID, displayName, bio)
}

// GetSettings retrieves user settings
func (s *UserSettingsService) GetSettings(ctx context.Context, userID uuid.UUID) (*models.UserSettings, error) {
	return s.userSettingsRepo.GetByUserID(ctx, userID)
}

// UpdateSettings updates user settings
func (s *UserSettingsService) UpdateSettings(ctx context.Context, userID uuid.UUID, profileVisibility *string, showKarmaPublicly *bool) error {
	// Validate profile visibility if provided
	if profileVisibility != nil {
		validValues := map[string]bool{"public": true, "private": true, "followers": true}
		if !validValues[*profileVisibility] {
			return errors.New("invalid profile visibility value")
		}
	}

	return s.userSettingsRepo.Update(ctx, userID, profileVisibility, showKarmaPublicly)
}

// ExportUserData exports all user data as a JSON structure
func (s *UserSettingsService) ExportUserData(ctx context.Context, userID uuid.UUID) ([]byte, error) {
	// Get user data
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get user settings
	settings, err := s.userSettingsRepo.GetByUserID(ctx, userID)
	if err != nil {
		settings = nil // Settings might not exist
	}

	// Get user's favorites
	favorites, err := s.favoriteRepo.GetByUserID(ctx, userID, 1, 10000)
	if err != nil {
		favorites = nil
	}

	// Create export structure
	export := map[string]interface{}{
		"user": map[string]interface{}{
			"id":           user.ID,
			"twitch_id":    user.TwitchID,
			"username":     user.Username,
			"display_name": user.DisplayName,
			"email":        user.Email,
			"bio":          user.Bio,
			"karma_points": user.KarmaPoints,
			"role":         user.Role,
			"created_at":   user.CreatedAt,
			"updated_at":   user.UpdatedAt,
		},
		"settings":    settings,
		"favorites":   favorites,
		"exported_at": time.Now(),
	}

	// Marshal to JSON
	jsonData, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return nil, err
	}

	// Create a ZIP file
	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	// Add JSON file to ZIP
	jsonFile, err := zipWriter.Create("user_data.json")
	if err != nil {
		return nil, err
	}
	_, err = jsonFile.Write(jsonData)
	if err != nil {
		return nil, err
	}

	// Add README
	readmeContent := []byte(`User Data Export
================

This archive contains all your personal data from Clipper.

Contents:
- user_data.json: Your complete user data including profile and favorites

Exported at: ` + time.Now().Format(time.RFC3339) + `

This export is provided in compliance with GDPR Article 20 (Right to data portability).
`)
	readmeFile, err := zipWriter.Create("README.txt")
	if err != nil {
		return nil, err
	}
	_, err = readmeFile.Write(readmeContent)
	if err != nil {
		return nil, err
	}

	err = zipWriter.Close()
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// RequestAccountDeletion requests account deletion with a grace period
func (s *UserSettingsService) RequestAccountDeletion(ctx context.Context, userID uuid.UUID, reason *string) (*models.AccountDeletion, error) {
	// Check if there's already a pending deletion
	existing, err := s.accountDeletionRepo.GetPendingByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("account deletion already requested")
	}

	// Create deletion request with 30-day grace period
	deletion := &models.AccountDeletion{
		ID:           uuid.New(),
		UserID:       userID,
		ScheduledFor: time.Now().Add(30 * 24 * time.Hour), // 30 days
		Reason:       reason,
	}

	err = s.accountDeletionRepo.Create(ctx, deletion)
	if err != nil {
		return nil, err
	}

	// Log audit event
	s.auditLogService.LogAccountDeletionRequested(ctx, userID, reason)

	return deletion, nil
}

// CancelAccountDeletion cancels a pending account deletion
func (s *UserSettingsService) CancelAccountDeletion(ctx context.Context, userID uuid.UUID) error {
	// Get pending deletion
	deletion, err := s.accountDeletionRepo.GetPendingByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if deletion == nil {
		return errors.New("no pending account deletion found")
	}

	// Cancel the deletion
	err = s.accountDeletionRepo.Cancel(ctx, deletion.ID)
	if err != nil {
		return err
	}

	// Log audit event
	s.auditLogService.LogAccountDeletionCancelled(ctx, userID)

	return nil
}

// GetPendingDeletion retrieves pending deletion for a user
func (s *UserSettingsService) GetPendingDeletion(ctx context.Context, userID uuid.UUID) (*models.AccountDeletion, error) {
	return s.accountDeletionRepo.GetPendingByUserID(ctx, userID)
}
