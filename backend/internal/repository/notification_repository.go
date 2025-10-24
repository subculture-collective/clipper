package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

// NotificationRepository handles database operations for notifications
type NotificationRepository struct {
	pool *pgxpool.Pool
}

// NewNotificationRepository creates a new NotificationRepository
func NewNotificationRepository(pool *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{
		pool: pool,
	}
}

// Create creates a new notification
func (r *NotificationRepository) Create(ctx context.Context, notification *models.Notification) error {
	query := `
		INSERT INTO notifications (
			id, user_id, type, title, message, link, is_read, created_at, expires_at,
			source_user_id, source_content_id, source_content_type
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at
	`

	err := r.pool.QueryRow(ctx, query,
		notification.ID,
		notification.UserID,
		notification.Type,
		notification.Title,
		notification.Message,
		notification.Link,
		notification.IsRead,
		notification.CreatedAt,
		notification.ExpiresAt,
		notification.SourceUserID,
		notification.SourceContentID,
		notification.SourceContentType,
	).Scan(&notification.ID, &notification.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}

	return nil
}

// GetByID retrieves a notification by ID
func (r *NotificationRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.NotificationWithSource, error) {
	query := `
		SELECT 
			n.id, n.user_id, n.type, n.title, n.message, n.link, n.is_read,
			n.created_at, n.expires_at, n.source_user_id, n.source_content_id, n.source_content_type,
			u.username AS source_username,
			u.display_name AS source_display_name,
			u.avatar_url AS source_avatar_url
		FROM notifications n
		LEFT JOIN users u ON n.source_user_id = u.id
		WHERE n.id = $1
	`

	var notification models.NotificationWithSource
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&notification.ID,
		&notification.UserID,
		&notification.Type,
		&notification.Title,
		&notification.Message,
		&notification.Link,
		&notification.IsRead,
		&notification.CreatedAt,
		&notification.ExpiresAt,
		&notification.SourceUserID,
		&notification.SourceContentID,
		&notification.SourceContentType,
		&notification.SourceUsername,
		&notification.SourceDisplayName,
		&notification.SourceAvatarURL,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("notification not found")
		}
		return nil, fmt.Errorf("failed to get notification: %w", err)
	}

	return &notification, nil
}

// ListByUserID retrieves notifications for a user with pagination and filtering
func (r *NotificationRepository) ListByUserID(ctx context.Context, userID uuid.UUID, filter string, limit, offset int) ([]models.NotificationWithSource, error) {
	var whereClause string
	switch filter {
	case "unread":
		whereClause = "AND n.is_read = false"
	case "read":
		whereClause = "AND n.is_read = true"
	default:
		whereClause = ""
	}

	query := fmt.Sprintf(`
		SELECT 
			n.id, n.user_id, n.type, n.title, n.message, n.link, n.is_read,
			n.created_at, n.expires_at, n.source_user_id, n.source_content_id, n.source_content_type,
			u.username AS source_username,
			u.display_name AS source_display_name,
			u.avatar_url AS source_avatar_url
		FROM notifications n
		LEFT JOIN users u ON n.source_user_id = u.id
		WHERE n.user_id = $1 %s
		ORDER BY n.created_at DESC
		LIMIT $2 OFFSET $3
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list notifications: %w", err)
	}
	defer rows.Close()

	var notifications []models.NotificationWithSource
	for rows.Next() {
		var notification models.NotificationWithSource
		err := rows.Scan(
			&notification.ID,
			&notification.UserID,
			&notification.Type,
			&notification.Title,
			&notification.Message,
			&notification.Link,
			&notification.IsRead,
			&notification.CreatedAt,
			&notification.ExpiresAt,
			&notification.SourceUserID,
			&notification.SourceContentID,
			&notification.SourceContentType,
			&notification.SourceUsername,
			&notification.SourceDisplayName,
			&notification.SourceAvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan notification: %w", err)
		}
		notifications = append(notifications, notification)
	}

	return notifications, nil
}

// CountUnread counts unread notifications for a user
func (r *NotificationRepository) CountUnread(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM notifications
		WHERE user_id = $1 AND is_read = false
	`

	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}

	return count, nil
}

// MarkAsRead marks a notification as read
func (r *NotificationRepository) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	query := `
		UPDATE notifications
		SET is_read = true
		WHERE id = $1 AND user_id = $2
	`

	result, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("notification not found or not owned by user")
	}

	return nil
}

// MarkAllAsRead marks all notifications as read for a user
func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE notifications
		SET is_read = true
		WHERE user_id = $1 AND is_read = false
	`

	_, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}

	return nil
}

// Delete deletes a notification
func (r *NotificationRepository) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	query := `
		DELETE FROM notifications
		WHERE id = $1 AND user_id = $2
	`

	result, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("notification not found or not owned by user")
	}

	return nil
}

// DeleteExpired deletes expired notifications
func (r *NotificationRepository) DeleteExpired(ctx context.Context) (int64, error) {
	query := `
		DELETE FROM notifications
		WHERE expires_at IS NOT NULL AND expires_at < NOW()
	`

	result, err := r.pool.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to delete expired notifications: %w", err)
	}

	return result.RowsAffected(), nil
}

// GetPreferences retrieves notification preferences for a user
func (r *NotificationRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error) {
	query := `
		SELECT 
			user_id, in_app_enabled, email_enabled, email_digest,
			notify_replies, notify_mentions, notify_votes, notify_badges,
			notify_moderation, notify_rank_up, notify_favorited_clip_comment, updated_at
		FROM notification_preferences
		WHERE user_id = $1
	`

	var prefs models.NotificationPreferences
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&prefs.UserID,
		&prefs.InAppEnabled,
		&prefs.EmailEnabled,
		&prefs.EmailDigest,
		&prefs.NotifyReplies,
		&prefs.NotifyMentions,
		&prefs.NotifyVotes,
		&prefs.NotifyBadges,
		&prefs.NotifyModeration,
		&prefs.NotifyRankUp,
		&prefs.NotifyFavoritedClipComment,
		&prefs.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			// Create default preferences if they don't exist
			return r.CreateDefaultPreferences(ctx, userID)
		}
		return nil, fmt.Errorf("failed to get notification preferences: %w", err)
	}

	return &prefs, nil
}

// CreateDefaultPreferences creates default notification preferences for a user
func (r *NotificationRepository) CreateDefaultPreferences(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error) {
	query := `
		INSERT INTO notification_preferences (user_id)
		VALUES ($1)
		ON CONFLICT (user_id) DO UPDATE SET user_id = $1
		RETURNING 
			user_id, in_app_enabled, email_enabled, email_digest,
			notify_replies, notify_mentions, notify_votes, notify_badges,
			notify_moderation, notify_rank_up, notify_favorited_clip_comment, updated_at
	`

	var prefs models.NotificationPreferences
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&prefs.UserID,
		&prefs.InAppEnabled,
		&prefs.EmailEnabled,
		&prefs.EmailDigest,
		&prefs.NotifyReplies,
		&prefs.NotifyMentions,
		&prefs.NotifyVotes,
		&prefs.NotifyBadges,
		&prefs.NotifyModeration,
		&prefs.NotifyRankUp,
		&prefs.NotifyFavoritedClipComment,
		&prefs.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create default notification preferences: %w", err)
	}

	return &prefs, nil
}

// UpdatePreferences updates notification preferences for a user
func (r *NotificationRepository) UpdatePreferences(ctx context.Context, prefs *models.NotificationPreferences) error {
	query := `
		UPDATE notification_preferences
		SET 
			in_app_enabled = $2,
			email_enabled = $3,
			email_digest = $4,
			notify_replies = $5,
			notify_mentions = $6,
			notify_votes = $7,
			notify_badges = $8,
			notify_moderation = $9,
			notify_rank_up = $10,
			notify_favorited_clip_comment = $11,
			updated_at = NOW()
		WHERE user_id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		prefs.UserID,
		prefs.InAppEnabled,
		prefs.EmailEnabled,
		prefs.EmailDigest,
		prefs.NotifyReplies,
		prefs.NotifyMentions,
		prefs.NotifyVotes,
		prefs.NotifyBadges,
		prefs.NotifyModeration,
		prefs.NotifyRankUp,
		prefs.NotifyFavoritedClipComment,
	)

	if err != nil {
		return fmt.Errorf("failed to update notification preferences: %w", err)
	}

	if result.RowsAffected() == 0 {
		// If no rows were updated, create default preferences
		_, err = r.CreateDefaultPreferences(ctx, prefs.UserID)
		return err
	}

	prefs.UpdatedAt = time.Now()
	return nil
}
