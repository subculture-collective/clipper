package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/utils"
	"github.com/subculture-collective/clipper/pkg/twitch"
)

// SubmissionService handles clip submission business logic
type SubmissionService struct {
	submissionRepo      *repository.SubmissionRepository
	clipRepo            *repository.ClipRepository
	userRepo            *repository.UserRepository
	auditLogRepo        *repository.AuditLogRepository
	twitchClient        *twitch.Client
	notificationService *NotificationService
}

// NewSubmissionService creates a new SubmissionService
func NewSubmissionService(
	submissionRepo *repository.SubmissionRepository,
	clipRepo *repository.ClipRepository,
	userRepo *repository.UserRepository,
	auditLogRepo *repository.AuditLogRepository,
	twitchClient *twitch.Client,
	notificationService *NotificationService,
) *SubmissionService {
	return &SubmissionService{
		submissionRepo:      submissionRepo,
		clipRepo:            clipRepo,
		userRepo:            userRepo,
		auditLogRepo:        auditLogRepo,
		twitchClient:        twitchClient,
		notificationService: notificationService,
	}
}

// SubmitClipRequest represents a clip submission request
type SubmitClipRequest struct {
	ClipURL                 string   `json:"clip_url" binding:"required"`
	CustomTitle             *string  `json:"custom_title,omitempty"`
	BroadcasterNameOverride *string  `json:"broadcaster_name_override,omitempty"`
	Tags                    []string `json:"tags,omitempty"`
	IsNSFW                  bool     `json:"is_nsfw"`
	SubmissionReason        *string  `json:"submission_reason,omitempty"`
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
	// Validate and normalize input fields first
	if err := s.validateSubmissionInput(req); err != nil {
		return nil, err
	}

	// Check user permissions and rate limits
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if user.IsBanned {
		return nil, &ValidationError{Field: "user", Message: "Your account has been banned and cannot submit clips. Please contact support if you believe this is an error."}
	}

	// Check minimum karma requirement (100 karma)
	if user.KarmaPoints < 100 {
		return nil, &ValidationError{Field: "karma", Message: "You need at least 100 karma points to submit clips. Earn karma by participating in the community through voting and commenting."}
	}

	// Check rate limits (5 per hour, 20 per day)
	if err := s.checkRateLimits(ctx, userID); err != nil {
		return nil, err
	}

	// Extract and normalize clip ID from URL
	clipID, normalizedURL := s.normalizeClipURL(req.ClipURL)
	if clipID == "" {
		return nil, &ValidationError{
			Field:   "clip_url",
			Message: "Invalid Twitch clip URL. Please provide a valid URL like 'https://clips.twitch.tv/ClipID' or 'https://www.twitch.tv/username/clip/ClipID'",
		}
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

	// Use normalized URL
	if normalizedURL != "" {
		twitchClip.URL = normalizedURL
	}

	// Create submission
	submission := &models.ClipSubmission{
		ID:                      uuid.New(),
		UserID:                  userID,
		TwitchClipID:            twitchClip.ID,
		TwitchClipURL:           twitchClip.URL,
		Title:                   &twitchClip.Title,
		CustomTitle:             req.CustomTitle,
		BroadcasterNameOverride: req.BroadcasterNameOverride,
		Tags:                    req.Tags,
		IsNSFW:                  req.IsNSFW,
		SubmissionReason:        req.SubmissionReason,
		Status:                  "pending",
		CreatedAt:               time.Now(),
		UpdatedAt:               time.Now(),
		// Metadata from Twitch
		CreatorName:     &twitchClip.CreatorName,
		CreatorID:       utils.StringPtr(twitchClip.CreatorID),
		BroadcasterName: &twitchClip.BroadcasterName,
		BroadcasterID:   utils.StringPtr(twitchClip.BroadcasterID),
		GameID:          utils.StringPtr(twitchClip.GameID),
		ThumbnailURL:    utils.StringPtr(twitchClip.ThumbnailURL),
		Duration:        utils.Float64Ptr(twitchClip.Duration),
		ViewCount:       twitchClip.ViewCount,
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

// validateSubmissionInput validates and normalizes submission request fields
func (s *SubmissionService) validateSubmissionInput(req *SubmitClipRequest) error {
	// Validate clip URL (non-empty is already enforced by binding:"required")
	if len(req.ClipURL) > 500 {
		return &ValidationError{
			Field:   "clip_url",
			Message: "Clip URL is too long (maximum 500 characters)",
		}
	}

	// Validate custom title if provided
	if req.CustomTitle != nil {
		title := strings.TrimSpace(*req.CustomTitle)
		if title != "" {
			if len(title) < 3 {
				return &ValidationError{
					Field:   "custom_title",
					Message: "Custom title must be at least 3 characters long",
				}
			}
			if len(title) > 200 {
				return &ValidationError{
					Field:   "custom_title",
					Message: "Custom title is too long (maximum 200 characters)",
				}
			}
			// Normalize: update the pointer to the trimmed value
			*req.CustomTitle = title
		} else {
			// If it's empty after trimming, set to nil
			req.CustomTitle = nil
		}
	}

	// Validate broadcaster name override if provided
	if req.BroadcasterNameOverride != nil {
		broadcaster := strings.TrimSpace(*req.BroadcasterNameOverride)
		if broadcaster != "" {
			if len(broadcaster) < 2 {
				return &ValidationError{
					Field:   "broadcaster_name_override",
					Message: "Broadcaster name must be at least 2 characters long",
				}
			}
			if len(broadcaster) > 100 {
				return &ValidationError{
					Field:   "broadcaster_name_override",
					Message: "Broadcaster name is too long (maximum 100 characters)",
				}
			}
			// Validate broadcaster name format (alphanumeric + underscores only)
			if !isValidUsername(broadcaster) {
				return &ValidationError{
					Field:   "broadcaster_name_override",
					Message: "Broadcaster name can only contain letters, numbers, and underscores",
				}
			}
			// Normalize: update the pointer to the trimmed value
			*req.BroadcasterNameOverride = broadcaster
		} else {
			// If it's empty after trimming, set to nil
			req.BroadcasterNameOverride = nil
		}
	}

	// Validate tags
	if len(req.Tags) > 10 {
		return &ValidationError{
			Field:   "tags",
			Message: "Too many tags (maximum 10 tags allowed)",
		}
	}

	// Normalize and validate each tag
	normalizedTags := make([]string, 0, len(req.Tags))
	seenTags := make(map[string]bool)
	for i, tag := range req.Tags {
		// Trim and lowercase for normalization
		normalized := strings.ToLower(strings.TrimSpace(tag))
		if normalized == "" {
			continue // Skip empty tags
		}

		// Check for duplicates (case-insensitive)
		if seenTags[normalized] {
			continue // Skip duplicate tags
		}

		if len(normalized) < 2 {
			return &ValidationError{
				Field:   "tags",
				Message: fmt.Sprintf("Tag '%s' is too short (minimum 2 characters)", tag),
			}
		}
		if len(normalized) > 50 {
			return &ValidationError{
				Field:   "tags",
				Message: fmt.Sprintf("Tag '%s' is too long (maximum 50 characters)", tag),
			}
		}

		// Validate tag format (alphanumeric + hyphens only)
		if !isValidTag(normalized) {
			return &ValidationError{
				Field:   "tags",
				Message: fmt.Sprintf("Tag '%s' contains invalid characters (only letters, numbers, and hyphens allowed)", tag),
			}
		}

		normalizedTags = append(normalizedTags, normalized)
		seenTags[normalized] = true

		// Safety check: limit iteration
		if i >= 10 {
			break
		}
	}
	req.Tags = normalizedTags

	// Validate submission reason if provided
	if req.SubmissionReason != nil {
		reason := strings.TrimSpace(*req.SubmissionReason)
		if reason != "" {
			if len(reason) > 1000 {
				return &ValidationError{
					Field:   "submission_reason",
					Message: "Submission reason is too long (maximum 1000 characters)",
				}
			}
			// Normalize: update the pointer to the trimmed value
			*req.SubmissionReason = reason
		} else {
			// If it's empty after trimming, set to nil
			req.SubmissionReason = nil
		}
	}

	return nil
}

// isValidUsername checks if a username contains only valid characters
func isValidUsername(username string) bool {
	for _, r := range username {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_') {
			return false
		}
	}
	return true
}

// isValidTag checks if a tag contains only valid characters
func isValidTag(tag string) bool {
	for _, r := range tag {
		if !((r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-') {
			return false
		}
	}
	return true
}

// normalizeClipURL extracts clip ID and returns normalized URL
func (s *SubmissionService) normalizeClipURL(clipURLOrID string) (clipID string, normalizedURL string) {
	clipID = extractClipIDFromURL(clipURLOrID)
	if clipID == "" {
		return "", ""
	}
	// Return canonical clips.twitch.tv URL
	normalizedURL = fmt.Sprintf("https://clips.twitch.tv/%s", clipID)
	return clipID, normalizedURL
}

// checkRateLimits validates rate limits for submissions
func (s *SubmissionService) checkRateLimits(ctx context.Context, userID uuid.UUID) error {
	// Check hourly limit (5 per hour)
	hourlyCount, err := s.submissionRepo.CountUserSubmissions(ctx, userID, time.Now().Add(-1*time.Hour))
	if err != nil {
		return fmt.Errorf("failed to check hourly rate limit: %w", err)
	}
	if hourlyCount >= 5 {
		return &ValidationError{
			Field:   "rate_limit",
			Message: fmt.Sprintf("You have submitted %d clips in the last hour. Please wait before submitting more (limit: 5 per hour)", hourlyCount),
		}
	}

	// Check daily limit (20 per day)
	dailyCount, err := s.submissionRepo.CountUserSubmissions(ctx, userID, time.Now().Add(-24*time.Hour))
	if err != nil {
		return fmt.Errorf("failed to check daily rate limit: %w", err)
	}
	if dailyCount >= 20 {
		return &ValidationError{
			Field:   "rate_limit",
			Message: fmt.Sprintf("You have submitted %d clips in the last 24 hours. Please wait before submitting more (limit: 20 per day)", dailyCount),
		}
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
		return &ValidationError{
			Field:   "clip_url",
			Message: "This clip has already been added to our database and cannot be submitted again",
		}
	}

	// Check if clip was already submitted
	submission, err := s.submissionRepo.GetByTwitchClipID(ctx, twitchClipID)
	if err != nil {
		return fmt.Errorf("failed to check submission existence: %w", err)
	}
	if submission != nil {
		if submission.Status == "pending" {
			return &ValidationError{
				Field:   "clip_url",
				Message: "This clip is already pending review. You'll be notified once it's been reviewed by our moderators.",
			}
		}
		if submission.Status == "approved" {
			return &ValidationError{
				Field:   "clip_url",
				Message: "This clip has already been approved and added to our database",
			}
		}
		// If rejected, allow resubmission after some time
		if submission.Status == "rejected" && time.Since(submission.CreatedAt) < 7*24*time.Hour {
			daysRemaining := 7 - int(time.Since(submission.CreatedAt).Hours()/24)
			return &ValidationError{
				Field:   "clip_url",
				Message: fmt.Sprintf("This clip was recently rejected. You can resubmit it in %d days", daysRemaining),
			}
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
		return nil, &ValidationError{
			Field:   "clip_url",
			Message: "Unable to fetch clip information from Twitch. Please verify the URL is correct and the clip exists.",
		}
	}

	if len(resp.Data) == 0 {
		return nil, &ValidationError{
			Field:   "clip_url",
			Message: "This clip was not found on Twitch. It may have been deleted or the URL is incorrect.",
		}
	}

	return &resp.Data[0], nil
}

// validateClipQuality validates clip meets quality requirements
func (s *SubmissionService) validateClipQuality(clip *twitch.Clip) error {
	// Check if clip is too old (>6 months)
	if time.Since(clip.CreatedAt) > 6*30*24*time.Hour {
		ageInMonths := int(time.Since(clip.CreatedAt).Hours() / 24 / 30)
		return &ValidationError{
			Field:   "clip",
			Message: fmt.Sprintf("This clip is too old (%d months). Only clips less than 6 months old can be submitted.", ageInMonths),
		}
	}

	// Check if clip is too short (<5 seconds)
	if clip.Duration < 5.0 {
		return &ValidationError{
			Field:   "clip",
			Message: fmt.Sprintf("This clip is too short (%.1f seconds). Clips must be at least 5 seconds long.", clip.Duration),
		}
	}

	// Check if clip has valid metadata
	if clip.Title == "" || clip.BroadcasterName == "" {
		return &ValidationError{
			Field:   "clip",
			Message: "This clip has missing or invalid metadata from Twitch. Please try a different clip.",
		}
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
	// Use BroadcasterNameOverride if provided, otherwise fall back to BroadcasterName
	broadcasterNameFallback := utils.StringOrDefault(submission.BroadcasterName, &emptyStr)
	broadcasterName := utils.StringOrDefault(submission.BroadcasterNameOverride, &broadcasterNameFallback)

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

// getClipTitle returns the clip title, preferring custom title over original title
func getClipTitle(submission *models.ClipSubmission) string {
	if submission.CustomTitle != nil && *submission.CustomTitle != "" {
		return *submission.CustomTitle
	}
	if submission.Title != nil {
		return *submission.Title
	}
	return ""
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

	// Create audit log
	if s.auditLogRepo != nil {
		auditLog := &models.ModerationAuditLog{
			ID:          uuid.New(),
			Action:      "approve",
			EntityType:  "clip_submission",
			EntityID:    submissionID,
			ModeratorID: reviewerID,
			CreatedAt:   time.Now(),
		}
		if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
			// Log error but don't fail
			fmt.Printf("Failed to create audit log: %v\n", err)
		}
	}

	// Award karma to submitter
	if err := s.awardKarma(ctx, submission.UserID, 10); err != nil {
		// Log error but don't fail
		fmt.Printf("Failed to award karma: %v\n", err)
	}

	// Send notification to submitter
	if s.notificationService != nil {
		clipTitle := getClipTitle(submission)
		if err := s.notificationService.NotifySubmissionApproved(ctx, submission.UserID, submissionID, clipTitle); err != nil {
			// Log error but don't fail
			fmt.Printf("Failed to send notification: %v\n", err)
		}
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

	// Create audit log
	if s.auditLogRepo != nil {
		auditLog := &models.ModerationAuditLog{
			ID:          uuid.New(),
			Action:      "reject",
			EntityType:  "clip_submission",
			EntityID:    submissionID,
			ModeratorID: reviewerID,
			Reason:      &reason,
			CreatedAt:   time.Now(),
		}
		if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
			// Log error but don't fail
			fmt.Printf("Failed to create audit log: %v\n", err)
		}
	}

	// Penalize karma
	if err := s.awardKarma(ctx, submission.UserID, -5); err != nil {
		// Log error but don't fail
		fmt.Printf("Failed to penalize karma: %v\n", err)
	}

	// Send notification to submitter
	if s.notificationService != nil {
		clipTitle := getClipTitle(submission)
		if err := s.notificationService.NotifySubmissionRejected(ctx, submission.UserID, submissionID, clipTitle, reason); err != nil {
			// Log error but don't fail
			fmt.Printf("Failed to send notification: %v\n", err)
		}
	}

	return nil
}

// BulkApproveSubmissions approves multiple submissions
func (s *SubmissionService) BulkApproveSubmissions(ctx context.Context, submissionIDs []uuid.UUID, reviewerID uuid.UUID) error {
	// Get submissions to validate they're all pending
	submissions, err := s.submissionRepo.GetByIDs(ctx, submissionIDs)
	if err != nil {
		return fmt.Errorf("failed to get submissions: %w", err)
	}

	// Validate all are pending
	for _, submission := range submissions {
		if submission.Status != "pending" {
			return fmt.Errorf("submission %s is not pending", submission.ID)
		}
	}

	// Create clips for all submissions
	for _, submission := range submissions {
		if err := s.createClipFromSubmission(ctx, submission); err != nil {
			return fmt.Errorf("failed to create clip for submission %s: %w", submission.ID, err)
		}
	}

	// Bulk update status
	if err := s.submissionRepo.BulkUpdateStatus(ctx, submissionIDs, "approved", reviewerID, nil); err != nil {
		return fmt.Errorf("failed to bulk update submission status: %w", err)
	}

	// Create audit log
	if s.auditLogRepo != nil {
		metadata := map[string]interface{}{
			"submission_count": len(submissionIDs),
			"submission_ids":   submissionIDs,
		}
		auditLog := &models.ModerationAuditLog{
			ID:          uuid.New(),
			Action:      "bulk_approve",
			EntityType:  "clip_submission",
			EntityID:    uuid.Nil, // Use uuid.Nil as entity ID for bulk actions
			ModeratorID: reviewerID,
			Metadata:    metadata,
			CreatedAt:   time.Now(),
		}
		if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
			// Log error but don't fail
			fmt.Printf("Failed to create audit log: %v\n", err)
		}
	}

	// Award karma to submitters
	for _, submission := range submissions {
		if err := s.awardKarma(ctx, submission.UserID, 10); err != nil {
			// Log error but don't fail
			fmt.Printf("Failed to award karma: %v\n", err)
		}
	}

	return nil
}

// BulkRejectSubmissions rejects multiple submissions
func (s *SubmissionService) BulkRejectSubmissions(ctx context.Context, submissionIDs []uuid.UUID, reviewerID uuid.UUID, reason string) error {
	// Get submissions to validate they're all pending
	submissions, err := s.submissionRepo.GetByIDs(ctx, submissionIDs)
	if err != nil {
		return fmt.Errorf("failed to get submissions: %w", err)
	}

	// Validate all are pending
	for _, submission := range submissions {
		if submission.Status != "pending" {
			return fmt.Errorf("submission %s is not pending", submission.ID)
		}
	}

	// Bulk update status
	if err := s.submissionRepo.BulkUpdateStatus(ctx, submissionIDs, "rejected", reviewerID, &reason); err != nil {
		return fmt.Errorf("failed to bulk update submission status: %w", err)
	}

	// Create audit log
	if s.auditLogRepo != nil {
		metadata := map[string]interface{}{
			"submission_count": len(submissionIDs),
			"submission_ids":   submissionIDs,
		}
		auditLog := &models.ModerationAuditLog{
			ID:          uuid.New(),
			Action:      "bulk_reject",
			EntityType:  "clip_submission",
			EntityID:    uuid.Nil, // No single entity; use Nil UUID for bulk actions
			ModeratorID: reviewerID,
			Reason:      &reason,
			Metadata:    metadata,
			CreatedAt:   time.Now(),
		}
		if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
			// Log error but don't fail
			fmt.Printf("Failed to create audit log: %v\n", err)
		}
	}

	// Penalize karma
	for _, submission := range submissions {
		if err := s.awardKarma(ctx, submission.UserID, -5); err != nil {
			// Log error but don't fail
			fmt.Printf("Failed to penalize karma: %v\n", err)
		}
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

// GetPendingSubmissionsWithFilters retrieves pending submissions with filters
func (s *SubmissionService) GetPendingSubmissionsWithFilters(ctx context.Context, filters repository.SubmissionFilters, page, limit int) ([]*models.ClipSubmissionWithUser, int, error) {
	return s.submissionRepo.ListPendingWithFilters(ctx, filters, page, limit)
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
