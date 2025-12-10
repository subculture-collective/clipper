package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/subculture-collective/clipper/internal/models"
)

// DiscoveryListRepository handles database operations for discovery lists
type DiscoveryListRepository struct {
	db *sqlx.DB
}

// NewDiscoveryListRepository creates a new repository instance
func NewDiscoveryListRepository(db *sqlx.DB) *DiscoveryListRepository {
	return &DiscoveryListRepository{db: db}
}

// ListDiscoveryLists retrieves discovery lists with optional filtering
func (r *DiscoveryListRepository) ListDiscoveryLists(ctx context.Context, featuredOnly bool, userID *uuid.UUID, limit, offset int) ([]models.DiscoveryListWithStats, error) {
	query := `
		WITH list_stats AS (
			SELECT 
				dl.id,
				dl.name,
				dl.slug,
				dl.description,
				dl.is_featured,
				dl.is_active,
				dl.display_order,
				dl.created_by,
				dl.created_at,
				dl.updated_at,
				COUNT(DISTINCT dlc.clip_id) as clip_count,
				COUNT(DISTINCT dlf.user_id) as follower_count
			FROM discovery_lists dl
			LEFT JOIN discovery_list_clips dlc ON dl.id = dlc.list_id
			LEFT JOIN discovery_list_follows dlf ON dl.id = dlf.list_id
			WHERE dl.is_active = true
	`

	if featuredOnly {
		query += " AND dl.is_featured = true"
	}

	query += `
			GROUP BY dl.id
			ORDER BY dl.display_order ASC, dl.created_at DESC
			LIMIT $1 OFFSET $2
		)
		SELECT * FROM list_stats
	`

	var lists []models.DiscoveryListWithStats
	err := r.db.SelectContext(ctx, &lists, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list discovery lists: %w", err)
	}

	// Get user-specific data if user is authenticated
	if userID != nil && len(lists) > 0 {
		listIDs := make([]uuid.UUID, len(lists))
		for i, list := range lists {
			listIDs[i] = list.ID
		}

		// Get follows
		followQuery := `
			SELECT list_id FROM discovery_list_follows 
			WHERE user_id = $1 AND list_id = ANY($2)
		`
		var followedListIDs []uuid.UUID
		err = r.db.SelectContext(ctx, &followedListIDs, followQuery, userID, listIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to get followed lists: %w", err)
		}

		followedMap := make(map[uuid.UUID]bool)
		for _, id := range followedListIDs {
			followedMap[id] = true
		}

		// Get bookmarks
		bookmarkQuery := `
			SELECT list_id FROM discovery_list_bookmarks 
			WHERE user_id = $1 AND list_id = ANY($2)
		`
		var bookmarkedListIDs []uuid.UUID
		err = r.db.SelectContext(ctx, &bookmarkedListIDs, bookmarkQuery, userID, listIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to get bookmarked lists: %w", err)
		}

		bookmarkedMap := make(map[uuid.UUID]bool)
		for _, id := range bookmarkedListIDs {
			bookmarkedMap[id] = true
		}

		// Update lists with user data
		for i := range lists {
			lists[i].IsFollowing = followedMap[lists[i].ID]
			lists[i].IsBookmarked = bookmarkedMap[lists[i].ID]
		}
	}

	// Get preview clips (first 4) for each list
	for i := range lists {
		previewClips, err := r.GetListPreviewClips(ctx, lists[i].ID, 4)
		if err != nil {
			return nil, fmt.Errorf("failed to get preview clips: %w", err)
		}
		lists[i].PreviewClips = previewClips
	}

	return lists, nil
}

// GetDiscoveryList retrieves a single discovery list by ID or slug
func (r *DiscoveryListRepository) GetDiscoveryList(ctx context.Context, idOrSlug string, userID *uuid.UUID) (*models.DiscoveryListWithStats, error) {
	query := `
		SELECT 
			dl.id,
			dl.name,
			dl.slug,
			dl.description,
			dl.is_featured,
			dl.is_active,
			dl.display_order,
			dl.created_by,
			dl.created_at,
			dl.updated_at,
			COUNT(DISTINCT dlc.clip_id) as clip_count,
			COUNT(DISTINCT dlf.user_id) as follower_count
		FROM discovery_lists dl
		LEFT JOIN discovery_list_clips dlc ON dl.id = dlc.list_id
		LEFT JOIN discovery_list_follows dlf ON dl.id = dlf.list_id
		WHERE dl.is_active = true AND (dl.id::text = $1 OR dl.slug = $1)
		GROUP BY dl.id
	`

	var list models.DiscoveryListWithStats
	err := r.db.GetContext(ctx, &list, query, idOrSlug)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("discovery list not found")
		}
		return nil, fmt.Errorf("failed to get discovery list: %w", err)
	}

	// Get user-specific data if user is authenticated
	if userID != nil {
		// Check if following
		var followCount int
		err = r.db.GetContext(ctx, &followCount, 
			"SELECT COUNT(*) FROM discovery_list_follows WHERE user_id = $1 AND list_id = $2",
			userID, list.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to check follow status: %w", err)
		}
		list.IsFollowing = followCount > 0

		// Check if bookmarked
		var bookmarkCount int
		err = r.db.GetContext(ctx, &bookmarkCount,
			"SELECT COUNT(*) FROM discovery_list_bookmarks WHERE user_id = $1 AND list_id = $2",
			userID, list.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to check bookmark status: %w", err)
		}
		list.IsBookmarked = bookmarkCount > 0
	}

	return &list, nil
}

// GetListClips retrieves all clips in a discovery list with pagination
func (r *DiscoveryListRepository) GetListClips(ctx context.Context, listID uuid.UUID, userID *uuid.UUID, limit, offset int) ([]models.ClipWithSubmitter, error) {
	query := `
		SELECT 
			c.*,
			COALESCE(v.vote_type, 0) as user_vote
		FROM discovery_list_clips dlc
		INNER JOIN clips c ON dlc.clip_id = c.id
		LEFT JOIN votes v ON c.id = v.clip_id AND v.user_id = $2
		WHERE dlc.list_id = $1 AND c.is_removed = false
		ORDER BY dlc.display_order ASC, dlc.added_at DESC
		LIMIT $3 OFFSET $4
	`

	var clips []models.ClipWithSubmitter
	err := r.db.SelectContext(ctx, &clips, query, listID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get list clips: %w", err)
	}

	// Get submitter info for clips that have been submitted
	for i := range clips {
		if clips[i].SubmittedByUserID != nil {
			var submitter models.ClipSubmitterInfo
			err := r.db.GetContext(ctx, &submitter,
				`SELECT id, username, display_name, avatar_url FROM users WHERE id = $1`,
				clips[i].SubmittedByUserID)
			if err == nil {
				clips[i].SubmittedBy = &submitter
			}
		}
	}

	return clips, nil
}

// GetListPreviewClips retrieves a small number of preview clips for a list
func (r *DiscoveryListRepository) GetListPreviewClips(ctx context.Context, listID uuid.UUID, limit int) ([]models.Clip, error) {
	query := `
		SELECT c.*
		FROM discovery_list_clips dlc
		INNER JOIN clips c ON dlc.clip_id = c.id
		WHERE dlc.list_id = $1 AND c.is_removed = false
		ORDER BY dlc.display_order ASC, dlc.added_at DESC
		LIMIT $2
	`

	var clips []models.Clip
	err := r.db.SelectContext(ctx, &clips, query, listID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get preview clips: %w", err)
	}

	return clips, nil
}

// FollowList adds a follow relationship between user and list
func (r *DiscoveryListRepository) FollowList(ctx context.Context, userID, listID uuid.UUID) error {
	query := `
		INSERT INTO discovery_list_follows (user_id, list_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, list_id) DO NOTHING
	`

	_, err := r.db.ExecContext(ctx, query, userID, listID)
	if err != nil {
		return fmt.Errorf("failed to follow list: %w", err)
	}

	return nil
}

// UnfollowList removes a follow relationship between user and list
func (r *DiscoveryListRepository) UnfollowList(ctx context.Context, userID, listID uuid.UUID) error {
	query := `
		DELETE FROM discovery_list_follows
		WHERE user_id = $1 AND list_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, userID, listID)
	if err != nil {
		return fmt.Errorf("failed to unfollow list: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("not following this list")
	}

	return nil
}

// BookmarkList adds a bookmark relationship between user and list
func (r *DiscoveryListRepository) BookmarkList(ctx context.Context, userID, listID uuid.UUID) error {
	query := `
		INSERT INTO discovery_list_bookmarks (user_id, list_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, list_id) DO NOTHING
	`

	_, err := r.db.ExecContext(ctx, query, userID, listID)
	if err != nil {
		return fmt.Errorf("failed to bookmark list: %w", err)
	}

	return nil
}

// UnbookmarkList removes a bookmark relationship between user and list
func (r *DiscoveryListRepository) UnbookmarkList(ctx context.Context, userID, listID uuid.UUID) error {
	query := `
		DELETE FROM discovery_list_bookmarks
		WHERE user_id = $1 AND list_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, userID, listID)
	if err != nil {
		return fmt.Errorf("failed to unbookmark list: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("list not bookmarked")
	}

	return nil
}

// GetUserFollowedLists retrieves all lists followed by a user
func (r *DiscoveryListRepository) GetUserFollowedLists(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.DiscoveryListWithStats, error) {
	query := `
		SELECT 
			dl.id,
			dl.name,
			dl.slug,
			dl.description,
			dl.is_featured,
			dl.is_active,
			dl.display_order,
			dl.created_by,
			dl.created_at,
			dl.updated_at,
			COUNT(DISTINCT dlc.clip_id) as clip_count,
			COUNT(DISTINCT dlf2.user_id) as follower_count,
			true as is_following,
			EXISTS(SELECT 1 FROM discovery_list_bookmarks dlb WHERE dlb.user_id = $1 AND dlb.list_id = dl.id) as is_bookmarked
		FROM discovery_list_follows dlf
		INNER JOIN discovery_lists dl ON dlf.list_id = dl.id
		LEFT JOIN discovery_list_clips dlc ON dl.id = dlc.list_id
		LEFT JOIN discovery_list_follows dlf2 ON dl.id = dlf2.list_id
		WHERE dlf.user_id = $1 AND dl.is_active = true
		GROUP BY dl.id
		ORDER BY dlf.followed_at DESC
		LIMIT $2 OFFSET $3
	`

	var lists []models.DiscoveryListWithStats
	err := r.db.SelectContext(ctx, &lists, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get user followed lists: %w", err)
	}

	// Get preview clips for each list
	for i := range lists {
		previewClips, err := r.GetListPreviewClips(ctx, lists[i].ID, 4)
		if err != nil {
			return nil, fmt.Errorf("failed to get preview clips: %w", err)
		}
		lists[i].PreviewClips = previewClips
	}

	return lists, nil
}
