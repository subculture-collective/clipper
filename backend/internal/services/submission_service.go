package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/utils"
	"github.com/subculture-collective/clipper/pkg/twitch"
)

// SubmissionService handles clip submission business logic
type SubmissionService struct {
	submissionRepo *repository.SubmissionRepository
	clipRepo       *repository.ClipRepository
	userRepo       *repository.UserRepository
	twitchClient   *twitch.Client
}

// NewSubmissionService creates a new SubmissionService
func NewSubmissionService(
	submissionRepo *repository.SubmissionRepository,
	clipRepo *repository.ClipRepository,
	userRepo *repository.UserRepository,
	twitchClient *twitch.Client,
) *SubmissionService {
	return &SubmissionService{
		submissionRepo: submissionRepo,
		clipRepo:       clipRepo,
		userRepo:       userRepo,
		twitchClient:   twitchClient,
	}
}

// SubmitClipRequest represents a clip submission request
type SubmitClipRequest struct {
	ClipURL                 string   `json:"clip_url" binding:"required"`
	CustomTitle             *string  `json:"custom_title,omitempty"`
	Tags                    []string `json:"tags,omitempty"`
	IsNSFW                  bool     `json:"is_nsfw"`
	SubmissionReason        *string  `json:"submission_reason,omitempty"`
	BroadcasterNameOverride *string  `json:"broadcaster_name_override,omitempty"`
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// SubmitClip handles clip submission with validation and duplicate detection
func (s *SubmissionService) SubmitClip(ctx context.Context, userID uuid.UUID, req *SubmitClipRequest) (*models.ClipSubmission, error) {
	// Check user permissions and rate limits
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if user.IsBanned {
		return nil, &ValidationError{Field: "user", Message: "User is banned"}
	}

	// Check minimum karma requirement (100 karma)
	if user.KarmaPoints < 100 {
		return nil, &ValidationError{Field: "karma", Message: "Minimum 100 karma required to submit clips"}
	}

	// Check rate limits (5 per hour, 20 per day)
	if err := s.checkRateLimits(ctx, userID); err != nil {
		return nil, err
	}

	// Extract clip ID from URL - use the function from clip_sync_service
	clipID := extractClipIDFromURL(req.ClipURL)
	if clipID == "" {
		return nil, &ValidationError{Field: "clip_url", Message: "Invalid Twitch clip URL"}
	}

	// Check for duplicates
	if err := s.checkDuplicates(ctx, clipID); err != nil {
		return nil, err
	}

	// Fetch clip metadata from Twitch
	twitchClip, err := s.fetchClipFromTwitch(ctx, clipID)
	if err != nil {
		return nil, err
	}

	// Validate clip quality
	if err := s.validateClipQuality(twitchClip); err != nil {
		return nil, err
	}

	// Create submission
	submission := &models.ClipSubmission{
		ID:               uuid.New(),
		UserID:           userID,
		TwitchClipID:     twitchClip.ID,
		TwitchClipURL:    twitchClip.URL,
		Title:            &twitchClip.Title,
		CustomTitle:      req.CustomTitle,
		Tags:             req.Tags,
		IsNSFW:           req.IsNSFW,
		SubmissionReason: req.SubmissionReason,
		Status:           "pending",
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
		// Metadata from Twitch
		CreatorName:             &twitchClip.CreatorName,
		CreatorID:               utils.StringPtr(twitchClip.CreatorID),
		BroadcasterName:         &twitchClip.BroadcasterName,
		BroadcasterID:           utils.StringPtr(twitchClip.BroadcasterID),
		BroadcasterNameOverride: req.BroadcasterNameOverride,
		GameID:                  utils.StringPtr(twitchClip.GameID),
		ThumbnailURL:            utils.StringPtr(twitchClip.ThumbnailURL),
		Duration:                utils.Float64Ptr(twitchClip.Duration),
		ViewCount:               twitchClip.ViewCount,
	}

	// Check for auto-approval
	if s.shouldAutoApprove(user) {
		submission.Status = "approved"
		submission.ReviewedBy = &userID
		submission.ReviewedAt = &submission.CreatedAt

		// Create clip immediately
		if err := s.createClipFromSubmission(ctx, submission); err != nil {
			return nil, fmt.Errorf("failed to create clip: %w", err)
		}

		// Award karma
		if err := s.awardKarma(ctx, userID, 10); err != nil {
			// Log error but don't fail
			fmt.Printf("Failed to award karma: %v\n", err)
		}
	}

	// Save submission
	if err := s.submissionRepo.Create(ctx, submission); err != nil {
		return nil, fmt.Errorf("failed to create submission: %w", err)
	}

	return submission, nil
}

// checkRateLimits validates rate limits for submissions
func (s *SubmissionService) checkRateLimits(ctx context.Context, userID uuid.UUID) error {
	// Check hourly limit (5 per hour)
	hourlyCount, err := s.submissionRepo.CountUserSubmissions(ctx, userID, time.Now().Add(-1*time.Hour))
	if err != nil {
		return fmt.Errorf("failed to check hourly rate limit: %w", err)
	}
	if hourlyCount >= 5 {
		return &ValidationError{Field: "rate_limit", Message: "Maximum 5 submissions per hour exceeded"}
	}

	// Check daily limit (20 per day)
	dailyCount, err := s.submissionRepo.CountUserSubmissions(ctx, userID, time.Now().Add(-24*time.Hour))
	if err != nil {
		return fmt.Errorf("failed to check daily rate limit: %w", err)
	}
	if dailyCount >= 20 {
		return &ValidationError{Field: "rate_limit", Message: "Maximum 20 submissions per day exceeded"}
	}

	return nil
}

// checkDuplicates checks if clip already exists or was submitted
func (s *SubmissionService) checkDuplicates(ctx context.Context, twitchClipID string) error {
	// Check if clip already exists in clips table
	exists, err := s.clipRepo.ExistsByTwitchClipID(ctx, twitchClipID)
	if err != nil {
		return fmt.Errorf("failed to check clip existence: %w", err)
	}
	if exists {
		return &ValidationError{Field: "clip_url", Message: "This clip already exists in our database"}
	}

	// Check if clip was already submitted
	submission, err := s.submissionRepo.GetByTwitchClipID(ctx, twitchClipID)
	if err != nil {
		return fmt.Errorf("failed to check submission existence: %w", err)
	}
	if submission != nil {
		if submission.Status == "pending" {
			return &ValidationError{Field: "clip_url", Message: "This clip is already pending review"}
		}
		if submission.Status == "approved" {
			return &ValidationError{Field: "clip_url", Message: "This clip has already been approved"}
		}
		// If rejected, allow resubmission after some time
		if submission.Status == "rejected" && time.Since(submission.CreatedAt) < 7*24*time.Hour {
			return &ValidationError{Field: "clip_url", Message: "This clip was recently rejected"}
		}
	}

	return nil
}

// fetchClipFromTwitch fetches clip metadata from Twitch API
func (s *SubmissionService) fetchClipFromTwitch(ctx context.Context, clipID string) (*twitch.Clip, error) {
	if s.twitchClient == nil {
		return nil, fmt.Errorf("Twitch API is not configured")
	}

	params := &twitch.ClipParams{
		ClipIDs: []string{clipID},
	}

	resp, err := s.twitchClient.GetClips(ctx, params)
	if err != nil {
		return nil, &ValidationError{Field: "clip_url", Message: "Failed to fetch clip from Twitch"}
	}

	if len(resp.Data) == 0 {
		return nil, &ValidationError{Field: "clip_url", Message: "Clip not found on Twitch"}
	}

	return &resp.Data[0], nil
}

// validateClipQuality validates clip meets quality requirements
func (s *SubmissionService) validateClipQuality(clip *twitch.Clip) error {
	// Check if clip is too old (>6 months)
	if time.Since(clip.CreatedAt) > 6*30*24*time.Hour {
		return &ValidationError{Field: "clip", Message: "Clip is too old (must be less than 6 months)"}
	}

	// Check if clip is too short (<5 seconds)
	if clip.Duration < 5.0 {
		return &ValidationError{Field: "clip", Message: "Clip is too short (must be at least 5 seconds)"}
	}

	// Check if clip has valid metadata
	if clip.Title == "" || clip.BroadcasterName == "" {
		return &ValidationError{Field: "clip", Message: "Clip has invalid metadata"}
	}

	return nil
}

// shouldAutoApprove determines if a submission should be auto-approved
func (s *SubmissionService) shouldAutoApprove(user *models.User) bool {
	// Admins and moderators are auto-approved
	if user.Role == "admin" || user.Role == "moderator" {
		return true
	}

	// High karma users (>1000) are auto-approved
	if user.KarmaPoints >= 1000 {
		return true
	}

	return false
}

// createClipFromSubmission creates a clip in the main clips table
func (s *SubmissionService) createClipFromSubmission(ctx context.Context, submission *models.ClipSubmission) error {
	emptyStr := ""
	title := utils.StringOrDefault(submission.CustomTitle, submission.Title)
	creatorName := utils.StringOrDefault(submission.CreatorName, &emptyStr)
	// Use broadcaster_name_override if provided, otherwise use broadcaster_name from Twitch
	broadcasterName := utils.StringOrDefault(submission.BroadcasterNameOverride, submission.BroadcasterName)
	if broadcasterName == "" {
		broadcasterName = emptyStr
	}

	clip := &models.Clip{
		ID:              uuid.New(),
		TwitchClipID:    submission.TwitchClipID,
		TwitchClipURL:   submission.TwitchClipURL,
		EmbedURL:        fmt.Sprintf("https://clips.twitch.tv/embed?clip=%s", submission.TwitchClipID),
		Title:           title,
		CreatorName:     creatorName,
		CreatorID:       submission.CreatorID,
		BroadcasterName: broadcasterName,
		BroadcasterID:   submission.BroadcasterID,
		GameID:          submission.GameID,
		GameName:        submission.GameName,
		ThumbnailURL:    submission.ThumbnailURL,
		Duration:        submission.Duration,
		ViewCount:       submission.ViewCount,
		CreatedAt:       time.Now(),
		ImportedAt:      time.Now(),
		IsNSFW:          submission.IsNSFW,
	}

	return s.clipRepo.Create(ctx, clip)
}

// awardKarma awards karma points to a user
func (s *SubmissionService) awardKarma(ctx context.Context, userID uuid.UUID, points int) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	user.KarmaPoints += points
	return s.userRepo.Update(ctx, user)
}

// ApproveSubmission approves a submission and creates the clip
func (s *SubmissionService) ApproveSubmission(ctx context.Context, submissionID, reviewerID uuid.UUID) error {
	submission, err := s.submissionRepo.GetByID(ctx, submissionID)
	if err != nil {
		return fmt.Errorf("failed to get submission: %w", err)
	}

	if submission.Status != "pending" {
		return fmt.Errorf("submission is not pending")
	}

	// Create clip
	if err := s.createClipFromSubmission(ctx, submission); err != nil {
		return fmt.Errorf("failed to create clip: %w", err)
	}

	// Update submission status
	if err := s.submissionRepo.UpdateStatus(ctx, submissionID, "approved", reviewerID, nil); err != nil {
		return fmt.Errorf("failed to update submission status: %w", err)
	}

	// Award karma to submitter
	if err := s.awardKarma(ctx, submission.UserID, 10); err != nil {
		// Log error but don't fail
		fmt.Printf("Failed to award karma: %v\n", err)
	}

	return nil
}

// RejectSubmission rejects a submission
func (s *SubmissionService) RejectSubmission(ctx context.Context, submissionID, reviewerID uuid.UUID, reason string) error {
	submission, err := s.submissionRepo.GetByID(ctx, submissionID)
	if err != nil {
		return fmt.Errorf("failed to get submission: %w", err)
	}

	if submission.Status != "pending" {
		return fmt.Errorf("submission is not pending")
	}

	// Update submission status
	if err := s.submissionRepo.UpdateStatus(ctx, submissionID, "rejected", reviewerID, &reason); err != nil {
		return fmt.Errorf("failed to update submission status: %w", err)
	}

	// Penalize karma
	if err := s.awardKarma(ctx, submission.UserID, -5); err != nil {
		// Log error but don't fail
		fmt.Printf("Failed to penalize karma: %v\n", err)
	}

	return nil
}

// GetUserSubmissions retrieves submissions for a user
func (s *SubmissionService) GetUserSubmissions(ctx context.Context, userID uuid.UUID, page, limit int) ([]*models.ClipSubmission, int, error) {
	return s.submissionRepo.ListByUser(ctx, userID, page, limit)
}

// GetPendingSubmissions retrieves pending submissions for moderation
func (s *SubmissionService) GetPendingSubmissions(ctx context.Context, page, limit int) ([]*models.ClipSubmissionWithUser, int, error) {
	return s.submissionRepo.ListPending(ctx, page, limit)
}

// GetSubmissionStats retrieves submission statistics for a user
func (s *SubmissionService) GetSubmissionStats(ctx context.Context, userID uuid.UUID) (*models.SubmissionStats, error) {
	return s.submissionRepo.GetUserStats(ctx, userID)
}

// extractClipIDFromURL extracts the clip ID from a Twitch clip URL or returns the ID if already provided
func extractClipIDFromURL(clipURLOrID string) string {
	// If it's already just an ID (alphanumeric), return it
	if len(clipURLOrID) > 0 && clipURLOrID[0] != 'h' {
		return clipURLOrID
	}

	// Handle full URLs
	parts := []rune(clipURLOrID)
	lastSlash := -1
	for i := len(parts) - 1; i >= 0; i-- {
		if parts[i] == '/' {
			lastSlash = i
			break
		}
	}

	if lastSlash == -1 || lastSlash == len(parts)-1 {
		return ""
	}

	clipID := string(parts[lastSlash+1:])

	// Remove query parameters if present
	queryStart := -1
	for i, r := range clipID {
		if r == '?' {
			queryStart = i
			break
		}
	}

	if queryStart != -1 {
		clipID = clipID[:queryStart]
	}

	return clipID
}
