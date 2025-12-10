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

	// Batch fetch preview clips for all lists
	if len(lists) > 0 {
		listIDs := make([]uuid.UUID, len(lists))
		for i, list := range lists {
			listIDs[i] = list.ID
		}

		// Fetch preview clips for all lists in a single query using window function
		previewQuery := `
			WITH ranked_clips AS (
				SELECT 
					c.*,
					dlc.list_id,
					ROW_NUMBER() OVER (PARTITION BY dlc.list_id ORDER BY dlc.display_order ASC, dlc.added_at DESC) as rn
				FROM discovery_list_clips dlc
				INNER JOIN clips c ON dlc.clip_id = c.id
				WHERE dlc.list_id = ANY($1) AND c.is_removed = false
			)
			SELECT * FROM ranked_clips WHERE rn <= 4 ORDER BY list_id, rn
		`

		var allPreviewClips []struct {
			models.Clip
			ListID uuid.UUID `db:"list_id"`
			RN     int       `db:"rn"`
		}
		err = r.db.SelectContext(ctx, &allPreviewClips, previewQuery, listIDs)
		if err != nil {
			// Don't fail the whole request if preview clips can't be fetched
			return lists, nil
		}

		// Group clips by list ID
		clipsByList := make(map[uuid.UUID][]models.Clip)
		for _, preview := range allPreviewClips {
			clipsByList[preview.ListID] = append(clipsByList[preview.ListID], preview.Clip)
		}

		// Assign preview clips to lists
		for i := range lists {
			if clips, ok := clipsByList[lists[i].ID]; ok {
				lists[i].PreviewClips = clips
			}
		}
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

	// Batch fetch submitter info for clips that have been submitted
	// Collect unique submitter IDs
	submitterIDs := make(map[uuid.UUID]bool)
	for _, clip := range clips {
		if clip.SubmittedByUserID != nil {
			submitterIDs[*clip.SubmittedByUserID] = true
		}
	}

	// Fetch all submitters in a single query if there are any
	if len(submitterIDs) > 0 {
		ids := make([]uuid.UUID, 0, len(submitterIDs))
		for id := range submitterIDs {
			ids = append(ids, id)
		}

		var submitters []models.ClipSubmitterInfo
		submitterQuery := `SELECT id, username, display_name, avatar_url FROM users WHERE id = ANY($1)`
		err = r.db.SelectContext(ctx, &submitters, submitterQuery, ids)
		if err != nil {
			// Don't fail the whole request if submitters can't be fetched
			return clips, nil
		}

		// Map submitters by ID for O(1) lookup
		submitterMap := make(map[uuid.UUID]*models.ClipSubmitterInfo)
		for i := range submitters {
			submitterMap[submitters[i].ID] = &submitters[i]
		}

		// Attach submitters to clips
		for i := range clips {
			if clips[i].SubmittedByUserID != nil {
				if submitter, ok := submitterMap[*clips[i].SubmittedByUserID]; ok {
					clips[i].SubmittedBy = submitter
				}
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

// GetListClipsCount retrieves the total count of clips in a discovery list
func (r *DiscoveryListRepository) GetListClipsCount(ctx context.Context, listID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM discovery_list_clips dlc
		INNER JOIN clips c ON dlc.clip_id = c.id
		WHERE dlc.list_id = $1 AND c.is_removed = false
	`

	var count int
	err := r.db.GetContext(ctx, &count, query, listID)
	if err != nil {
		return 0, fmt.Errorf("failed to get list clips count: %w", err)
	}

	return count, nil
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

// CreateDiscoveryList creates a new discovery list (admin only)
func (r *DiscoveryListRepository) CreateDiscoveryList(ctx context.Context, name, slug, description string, isFeatured bool, createdBy uuid.UUID) (*models.DiscoveryList, error) {
	query := `
		INSERT INTO discovery_lists (name, slug, description, is_featured, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, slug, description, is_featured, is_active, display_order, created_by, created_at, updated_at
	`

	var list models.DiscoveryList
	err := r.db.GetContext(ctx, &list, query, name, slug, description, isFeatured, createdBy)
	if err != nil {
		return nil, fmt.Errorf("failed to create discovery list: %w", err)
	}

	return &list, nil
}

// UpdateDiscoveryList updates an existing discovery list (admin only)
func (r *DiscoveryListRepository) UpdateDiscoveryList(ctx context.Context, listID uuid.UUID, name, description *string, isFeatured, isActive *bool) (*models.DiscoveryList, error) {
	// Build dynamic update query
	query := "UPDATE discovery_lists SET updated_at = NOW()"
	args := []interface{}{listID}
	argIdx := 2

	if name != nil {
		query += fmt.Sprintf(", name = $%d", argIdx)
		args = append(args, *name)
		argIdx++
	}
	if description != nil {
		query += fmt.Sprintf(", description = $%d", argIdx)
		args = append(args, *description)
		argIdx++
	}
	if isFeatured != nil {
		query += fmt.Sprintf(", is_featured = $%d", argIdx)
		args = append(args, *isFeatured)
		argIdx++
	}
	if isActive != nil {
		query += fmt.Sprintf(", is_active = $%d", argIdx)
		args = append(args, *isActive)
		argIdx++
	}

	query += " WHERE id = $1 RETURNING id, name, slug, description, is_featured, is_active, display_order, created_by, created_at, updated_at"

	var list models.DiscoveryList
	err := r.db.GetContext(ctx, &list, query, args...)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("discovery list not found")
		}
		return nil, fmt.Errorf("failed to update discovery list: %w", err)
	}

	return &list, nil
}

// DeleteDiscoveryList deletes a discovery list (admin only)
func (r *DiscoveryListRepository) DeleteDiscoveryList(ctx context.Context, listID uuid.UUID) error {
	query := "DELETE FROM discovery_lists WHERE id = $1"

	result, err := r.db.ExecContext(ctx, query, listID)
	if err != nil {
		return fmt.Errorf("failed to delete discovery list: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("discovery list not found")
	}

	return nil
}

// AddClipToList adds a clip to a discovery list (admin only)
func (r *DiscoveryListRepository) AddClipToList(ctx context.Context, listID, clipID uuid.UUID) error {
	// Get the current max display order
	var maxOrder int
	err := r.db.GetContext(ctx, &maxOrder, 
		"SELECT COALESCE(MAX(display_order), -1) FROM discovery_list_clips WHERE list_id = $1", listID)
	if err != nil {
		return fmt.Errorf("failed to get max display order: %w", err)
	}

	// Insert the clip with the next display order
	query := `
		INSERT INTO discovery_list_clips (list_id, clip_id, display_order)
		VALUES ($1, $2, $3)
		ON CONFLICT (list_id, clip_id) DO NOTHING
	`

	_, err = r.db.ExecContext(ctx, query, listID, clipID, maxOrder+1)
	if err != nil {
		return fmt.Errorf("failed to add clip to list: %w", err)
	}

	// Update the list's updated_at timestamp
	_, err = r.db.ExecContext(ctx, "UPDATE discovery_lists SET updated_at = NOW() WHERE id = $1", listID)
	if err != nil {
		return fmt.Errorf("failed to update list timestamp: %w", err)
	}

	return nil
}

// RemoveClipFromList removes a clip from a discovery list (admin only)
func (r *DiscoveryListRepository) RemoveClipFromList(ctx context.Context, listID, clipID uuid.UUID) error {
	query := "DELETE FROM discovery_list_clips WHERE list_id = $1 AND clip_id = $2"

	result, err := r.db.ExecContext(ctx, query, listID, clipID)
	if err != nil {
		return fmt.Errorf("failed to remove clip from list: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("clip not found in list")
	}

	// Update the list's updated_at timestamp
	_, err = r.db.ExecContext(ctx, "UPDATE discovery_lists SET updated_at = NOW() WHERE id = $1", listID)
	if err != nil {
		return fmt.Errorf("failed to update list timestamp: %w", err)
	}

	return nil
}

// ReorderListClips reorders clips in a discovery list (admin only)
func (r *DiscoveryListRepository) ReorderListClips(ctx context.Context, listID uuid.UUID, clipIDs []uuid.UUID) error {
	// Start a transaction
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Update display order for each clip
	for i, clipID := range clipIDs {
		query := "UPDATE discovery_list_clips SET display_order = $1 WHERE list_id = $2 AND clip_id = $3"
		_, err := tx.ExecContext(ctx, query, i, listID, clipID)
		if err != nil {
			return fmt.Errorf("failed to update clip order: %w", err)
		}
	}

	// Update the list's updated_at timestamp
	_, err = tx.ExecContext(ctx, "UPDATE discovery_lists SET updated_at = NOW() WHERE id = $1", listID)
	if err != nil {
		return fmt.Errorf("failed to update list timestamp: %w", err)
	}

	// Commit the transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// ListAllDiscoveryLists retrieves all discovery lists including inactive ones (admin only)
func (r *DiscoveryListRepository) ListAllDiscoveryLists(ctx context.Context, limit, offset int) ([]models.DiscoveryListWithStats, error) {
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
		GROUP BY dl.id
		ORDER BY dl.created_at DESC
		LIMIT $1 OFFSET $2
	`

	var lists []models.DiscoveryListWithStats
	err := r.db.SelectContext(ctx, &lists, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list all discovery lists: %w", err)
	}

	return lists, nil
}
