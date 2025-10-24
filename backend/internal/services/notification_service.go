package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// NotificationService handles notification business logic
type NotificationService struct {
	repo         *repository.NotificationRepository
	userRepo     *repository.UserRepository
	commentRepo  *repository.CommentRepository
	clipRepo     *repository.ClipRepository
	favoriteRepo *repository.FavoriteRepository
}

// NewNotificationService creates a new NotificationService
func NewNotificationService(
	repo *repository.NotificationRepository,
	userRepo *repository.UserRepository,
	commentRepo *repository.CommentRepository,
	clipRepo *repository.ClipRepository,
	favoriteRepo *repository.FavoriteRepository,
) *NotificationService {
	return &NotificationService{
		repo:         repo,
		userRepo:     userRepo,
		commentRepo:  commentRepo,
		clipRepo:     clipRepo,
		favoriteRepo: favoriteRepo,
	}
}

// CreateNotification creates a new notification
func (s *NotificationService) CreateNotification(
	ctx context.Context,
	userID uuid.UUID,
	notificationType string,
	title string,
	message string,
	link *string,
	sourceUserID *uuid.UUID,
	sourceContentID *uuid.UUID,
	sourceContentType *string,
) (*models.Notification, error) {
	// Check user's notification preferences
	prefs, err := s.repo.GetPreferences(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification preferences: %w", err)
	}

	// Check if user has notifications enabled and specific type is enabled
	if !prefs.InAppEnabled {
		return nil, nil // User has disabled notifications
	}

	// Check type-specific preferences
	if !s.shouldNotify(prefs, notificationType) {
		return nil, nil // User has disabled this type of notification
	}

	notification := &models.Notification{
		ID:                uuid.New(),
		UserID:            userID,
		Type:              notificationType,
		Title:             title,
		Message:           message,
		Link:              link,
		IsRead:            false,
		CreatedAt:         time.Now(),
		SourceUserID:      sourceUserID,
		SourceContentID:   sourceContentID,
		SourceContentType: sourceContentType,
	}

	err = s.repo.Create(ctx, notification)
	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	return notification, nil
}

// shouldNotify checks if a user should be notified based on their preferences
func (s *NotificationService) shouldNotify(prefs *models.NotificationPreferences, notificationType string) bool {
	switch notificationType {
	case models.NotificationTypeReply:
		return prefs.NotifyReplies
	case models.NotificationTypeMention:
		return prefs.NotifyMentions
	case models.NotificationTypeVoteMilestone:
		return prefs.NotifyVotes
	case models.NotificationTypeBadgeEarned, models.NotificationTypeRankUp:
		return prefs.NotifyBadges
	case models.NotificationTypeContentRemoved, models.NotificationTypeWarning,
		models.NotificationTypeBan, models.NotificationTypeAppealDecision:
		return prefs.NotifyModeration
	case models.NotificationTypeFavoritedClipComment:
		return prefs.NotifyFavoritedClipComment
	default:
		return true // Default to notifying for unknown types
	}
}

// GetUserNotifications retrieves notifications for a user
func (s *NotificationService) GetUserNotifications(
	ctx context.Context,
	userID uuid.UUID,
	filter string,
	limit, offset int,
) ([]models.NotificationWithSource, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	notifications, err := s.repo.ListByUserID(ctx, userID, filter, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get user notifications: %w", err)
	}

	return notifications, nil
}

// GetUnreadCount returns the count of unread notifications for a user
func (s *NotificationService) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	count, err := s.repo.CountUnread(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}

	return count, nil
}

// MarkAsRead marks a notification as read
func (s *NotificationService) MarkAsRead(ctx context.Context, notificationID uuid.UUID, userID uuid.UUID) error {
	err := s.repo.MarkAsRead(ctx, notificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	return nil
}

// MarkAllAsRead marks all notifications as read for a user
func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	err := s.repo.MarkAllAsRead(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}

	return nil
}

// DeleteNotification deletes a notification
func (s *NotificationService) DeleteNotification(ctx context.Context, notificationID uuid.UUID, userID uuid.UUID) error {
	err := s.repo.Delete(ctx, notificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}

	return nil
}

// GetPreferences retrieves notification preferences for a user
func (s *NotificationService) GetPreferences(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error) {
	prefs, err := s.repo.GetPreferences(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get preferences: %w", err)
	}

	return prefs, nil
}

// UpdatePreferences updates notification preferences for a user
func (s *NotificationService) UpdatePreferences(ctx context.Context, prefs *models.NotificationPreferences) error {
	err := s.repo.UpdatePreferences(ctx, prefs)
	if err != nil {
		return fmt.Errorf("failed to update preferences: %w", err)
	}

	return nil
}

// NotifyCommentReply notifies a user when someone replies to their comment
func (s *NotificationService) NotifyCommentReply(
	ctx context.Context,
	clipID uuid.UUID,
	parentCommentID uuid.UUID,
	replyAuthorID uuid.UUID,
) error {
	// Get parent comment to find the author
	parentComment, err := s.commentRepo.GetByID(ctx, parentCommentID, nil)
	if err != nil {
		return fmt.Errorf("failed to get parent comment: %w", err)
	}

	// Don't notify if replying to own comment
	if parentComment.UserID == replyAuthorID {
		return nil
	}

	// Get reply author info
	replyAuthor, err := s.userRepo.GetByID(ctx, replyAuthorID)
	if err != nil {
		return fmt.Errorf("failed to get reply author: %w", err)
	}

	// Get clip info
	clip, err := s.clipRepo.GetByID(ctx, clipID)
	if err != nil {
		return fmt.Errorf("failed to get clip: %w", err)
	}

	title := fmt.Sprintf("%s replied to your comment", replyAuthor.DisplayName)
	message := fmt.Sprintf("on \"%s\"", clip.Title)
	link := fmt.Sprintf("/clips/%s", clipID.String())

	contentType := "comment"
	_, err = s.CreateNotification(
		ctx,
		parentComment.UserID,
		models.NotificationTypeReply,
		title,
		message,
		&link,
		&replyAuthorID,
		&clipID,
		&contentType,
	)

	return err
}

// NotifyMentions notifies users mentioned in a comment
func (s *NotificationService) NotifyMentions(
	ctx context.Context,
	content string,
	clipID uuid.UUID,
	commentAuthorID uuid.UUID,
) error {
	// Extract mentions from content
	mentions := extractMentions(content)
	if len(mentions) == 0 {
		return nil
	}

	// Get comment author info
	author, err := s.userRepo.GetByID(ctx, commentAuthorID)
	if err != nil {
		return fmt.Errorf("failed to get comment author: %w", err)
	}

	// Get clip info
	clip, err := s.clipRepo.GetByID(ctx, clipID)
	if err != nil {
		return fmt.Errorf("failed to get clip: %w", err)
	}

	// Notify each mentioned user
	for _, username := range mentions {
		// Get user by username
		user, err := s.userRepo.GetByUsername(ctx, username)
		if err != nil {
			continue // Skip if user not found
		}

		// Don't notify if mentioning yourself
		if user.ID == commentAuthorID {
			continue
		}

		title := fmt.Sprintf("%s mentioned you in a comment", author.DisplayName)
		message := fmt.Sprintf("on \"%s\"", clip.Title)
		link := fmt.Sprintf("/clips/%s", clipID.String())

		contentType := "comment"
		_, err = s.CreateNotification(
			ctx,
			user.ID,
			models.NotificationTypeMention,
			title,
			message,
			&link,
			&commentAuthorID,
			&clipID,
			&contentType,
		)
		if err != nil {
			// Log error but continue with other mentions
			continue
		}
	}

	return nil
}

// NotifyVoteMilestone notifies a user when their comment reaches a vote milestone
func (s *NotificationService) NotifyVoteMilestone(
	ctx context.Context,
	commentID uuid.UUID,
	voteScore int,
) error {
	// Only notify for specific milestones
	milestones := []int{10, 25, 50, 100, 250, 500, 1000}
	isMilestone := false
	for _, m := range milestones {
		if voteScore == m {
			isMilestone = true
			break
		}
	}

	if !isMilestone {
		return nil
	}

	// Get comment to find the author
	comment, err := s.commentRepo.GetByID(ctx, commentID, nil)
	if err != nil {
		return fmt.Errorf("failed to get comment: %w", err)
	}

	// Get clip info
	clip, err := s.clipRepo.GetByID(ctx, comment.ClipID)
	if err != nil {
		return fmt.Errorf("failed to get clip: %w", err)
	}

	title := fmt.Sprintf("Your comment received %d upvotes!", voteScore)
	message := fmt.Sprintf("on \"%s\"", clip.Title)
	link := fmt.Sprintf("/clips/%s", comment.ClipID.String())

	contentType := "comment"
	_, err = s.CreateNotification(
		ctx,
		comment.UserID,
		models.NotificationTypeVoteMilestone,
		title,
		message,
		&link,
		nil,
		&commentID,
		&contentType,
	)

	return err
}

// NotifyBadgeEarned notifies a user when they earn a badge
func (s *NotificationService) NotifyBadgeEarned(
	ctx context.Context,
	userID uuid.UUID,
	badgeName string,
) error {
	title := fmt.Sprintf("You earned the %s badge!", badgeName)
	message := "Check out your profile to see your new badge"
	link := "/profile"

	_, err := s.CreateNotification(
		ctx,
		userID,
		models.NotificationTypeBadgeEarned,
		title,
		message,
		&link,
		nil,
		nil,
		nil,
	)

	return err
}

// NotifyRankUp notifies a user when they rank up
func (s *NotificationService) NotifyRankUp(
	ctx context.Context,
	userID uuid.UUID,
	newRank string,
) error {
	title := fmt.Sprintf("You ranked up to %s!", newRank)
	message := "Keep up the great work!"
	link := "/profile"

	_, err := s.CreateNotification(
		ctx,
		userID,
		models.NotificationTypeRankUp,
		title,
		message,
		&link,
		nil,
		nil,
		nil,
	)

	return err
}

// NotifyFavoritedClipComment notifies users when a clip they favorited gets a new comment
func (s *NotificationService) NotifyFavoritedClipComment(
	ctx context.Context,
	clipID uuid.UUID,
	commentAuthorID uuid.UUID,
) error {
	// Get clip info
	clip, err := s.clipRepo.GetByID(ctx, clipID)
	if err != nil {
		return fmt.Errorf("failed to get clip: %w", err)
	}

	// Get all users who favorited this clip
	favorites, err := s.favoriteRepo.GetByClipID(ctx, clipID)
	if err != nil {
		return fmt.Errorf("failed to get favorites: %w", err)
	}

	// Get comment author info
	author, err := s.userRepo.GetByID(ctx, commentAuthorID)
	if err != nil {
		return fmt.Errorf("failed to get comment author: %w", err)
	}

	// Notify each user who favorited the clip (except the comment author)
	for _, favorite := range favorites {
		if favorite.UserID == commentAuthorID {
			continue // Don't notify the comment author
		}

		title := fmt.Sprintf("%s commented on a clip you favorited", author.DisplayName)
		message := fmt.Sprintf("\"%s\"", clip.Title)
		link := fmt.Sprintf("/clips/%s", clipID.String())

		contentType := "clip"
		_, err = s.CreateNotification(
			ctx,
			favorite.UserID,
			models.NotificationTypeFavoritedClipComment,
			title,
			message,
			&link,
			&commentAuthorID,
			&clipID,
			&contentType,
		)
		if err != nil {
			// Log error but continue with other users
			continue
		}
	}

	return nil
}

// extractMentions extracts @username mentions from text
func extractMentions(text string) []string {
	// Match @username pattern (alphanumeric and underscore)
	re := regexp.MustCompile(`@([a-zA-Z0-9_]+)`)
	matches := re.FindAllStringSubmatch(text, -1)

	var mentions []string
	seen := make(map[string]bool)

	for _, match := range matches {
		if len(match) > 1 {
			username := strings.ToLower(match[1])
			if !seen[username] {
				mentions = append(mentions, username)
				seen[username] = true
			}
		}
	}

	return mentions
}
