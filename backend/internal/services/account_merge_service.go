package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/repository"
)

// AccountMergeService handles merging unclaimed accounts into authenticated accounts
type AccountMergeService struct {
	db              *pgxpool.Pool
	userRepo        *repository.UserRepository
	auditLogRepo    *repository.AuditLogRepository
	voteRepo        *repository.VoteRepository
	favoriteRepo    *repository.FavoriteRepository
	commentRepo     *repository.CommentRepository
	clipRepo        *repository.ClipRepository
	watchHistoryRepo *repository.WatchHistoryRepository
}

// NewAccountMergeService creates a new AccountMergeService
func NewAccountMergeService(
	db *pgxpool.Pool,
	userRepo *repository.UserRepository,
	auditLogRepo *repository.AuditLogRepository,
	voteRepo *repository.VoteRepository,
	favoriteRepo *repository.FavoriteRepository,
	commentRepo *repository.CommentRepository,
	clipRepo *repository.ClipRepository,
	watchHistoryRepo *repository.WatchHistoryRepository,
) *AccountMergeService {
	return &AccountMergeService{
		db:              db,
		userRepo:        userRepo,
		auditLogRepo:    auditLogRepo,
		voteRepo:        voteRepo,
		favoriteRepo:    favoriteRepo,
		commentRepo:     commentRepo,
		clipRepo:        clipRepo,
		watchHistoryRepo: watchHistoryRepo,
	}
}

// MergeResult represents the result of an account merge operation
type MergeResult struct {
	ClipsMerged         int
	VotesMerged         int
	FavoritesMerged     int
	CommentsMerged      int
	FollowsMerged       int
	WatchHistoryMerged  int
	PreferencesMerged   bool
	SettingsMerged      bool
	SubscriptionMerged  bool
	DuplicatesSkipped   int
	Success             bool
	Error               string
}

// MergeAccounts performs a complete merge of unclaimed account data into authenticated account
func (s *AccountMergeService) MergeAccounts(ctx context.Context, fromUserID, toUserID uuid.UUID) (*MergeResult, error) {
	result := &MergeResult{}

	// Begin transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(ctx); rbErr != nil {
				log.Printf("Error rolling back transaction: %v", rbErr)
			}
		}
	}()

	// 1. Transfer clips
	clipsTransferred, err := s.transferClips(ctx, tx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to transfer clips: %w", err)
	}
	result.ClipsMerged = clipsTransferred

	// 2. Transfer votes (with duplicate handling)
	votesTransferred, duplicatesSkipped, err := s.transferVotes(ctx, tx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to transfer votes: %w", err)
	}
	result.VotesMerged = votesTransferred
	result.DuplicatesSkipped += duplicatesSkipped

	// 3. Transfer favorites (union of both sets)
	favoritesTransferred, favDuplicates, err := s.transferFavorites(ctx, tx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to transfer favorites: %w", err)
	}
	result.FavoritesMerged = favoritesTransferred
	result.DuplicatesSkipped += favDuplicates

	// 4. Transfer comments and comment votes
	commentsTransferred, err := s.transferComments(ctx, tx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to transfer comments: %w", err)
	}
	result.CommentsMerged = commentsTransferred

	// 5. Transfer follows (broadcaster, stream, game, user follows)
	followsTransferred, err := s.transferFollows(ctx, tx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to transfer follows: %w", err)
	}
	result.FollowsMerged = followsTransferred

	// 6. Transfer watch history (keep most recent per clip)
	watchHistoryTransferred, err := s.transferWatchHistory(ctx, tx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to transfer watch history: %w", err)
	}
	result.WatchHistoryMerged = watchHistoryTransferred

	// 7. Merge user preferences (arrays union)
	preferencesMerged, err := s.mergeUserPreferences(ctx, tx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to merge user preferences: %w", err)
	}
	result.PreferencesMerged = preferencesMerged

	// 8. Keep authenticated user's settings (don't override)
	// Settings are already set for authenticated user, no merge needed
	result.SettingsMerged = true

	// 9. Transfer subscription data if exists
	subscriptionMerged, err := s.transferSubscription(ctx, tx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to transfer subscription: %w", err)
	}
	result.SubscriptionMerged = subscriptionMerged

	// 10. Mark unclaimed account as merged
	if err := s.markAccountAsMerged(ctx, tx, fromUserID, toUserID); err != nil {
		return nil, fmt.Errorf("failed to mark account as merged: %w", err)
	}

	// 11. Create audit log entry
	if err := s.createMergeAuditLog(ctx, tx, fromUserID, toUserID, result); err != nil {
		// Log but don't fail the merge
		log.Printf("Warning: failed to create merge audit log: %v", err)
	}

	// Commit transaction
	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	result.Success = true
	return result, nil
}

// transferClips transfers all clips submitted by the unclaimed account
func (s *AccountMergeService) transferClips(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID) (int, error) {
	query := `
		UPDATE clips
		SET submitted_by_user_id = $1
		WHERE submitted_by_user_id = $2
	`
	
	cmdTag, err := tx.Exec(ctx, query, toUserID, fromUserID)
	if err != nil {
		return 0, err
	}
	
	return int(cmdTag.RowsAffected()), nil
}

// transferVotes transfers votes with duplicate handling (keep authenticated account vote)
func (s *AccountMergeService) transferVotes(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID) (int, int, error) {
	// First, delete any votes from unclaimed account where authenticated account already has a vote
	deleteQuery := `
		DELETE FROM votes
		WHERE user_id = $1
		AND clip_id IN (
			SELECT clip_id FROM votes WHERE user_id = $2
		)
	`
	
	delCmdTag, err := tx.Exec(ctx, deleteQuery, fromUserID, toUserID)
	if err != nil {
		return 0, 0, err
	}
	duplicatesSkipped := int(delCmdTag.RowsAffected())
	
	// Transfer remaining votes
	updateQuery := `
		UPDATE votes
		SET user_id = $1
		WHERE user_id = $2
	`
	
	updCmdTag, err := tx.Exec(ctx, updateQuery, toUserID, fromUserID)
	if err != nil {
		return 0, 0, err
	}
	
	return int(updCmdTag.RowsAffected()), duplicatesSkipped, nil
}

// transferFavorites transfers favorites (union of both sets)
func (s *AccountMergeService) transferFavorites(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID) (int, int, error) {
	// Count duplicates first
	countQuery := `
		SELECT COUNT(*)
		FROM favorites
		WHERE user_id = $1
		AND clip_id IN (
			SELECT clip_id FROM favorites WHERE user_id = $2
		)
	`
	
	var duplicates int
	if err := tx.QueryRow(ctx, countQuery, fromUserID, toUserID).Scan(&duplicates); err != nil {
		return 0, 0, err
	}
	
	// Delete duplicates from unclaimed account
	deleteQuery := `
		DELETE FROM favorites
		WHERE user_id = $1
		AND clip_id IN (
			SELECT clip_id FROM favorites WHERE user_id = $2
		)
	`
	
	if _, err := tx.Exec(ctx, deleteQuery, fromUserID, toUserID); err != nil {
		return 0, 0, err
	}
	
	// Transfer remaining favorites
	updateQuery := `
		UPDATE favorites
		SET user_id = $1
		WHERE user_id = $2
	`
	
	cmdTag, err := tx.Exec(ctx, updateQuery, toUserID, fromUserID)
	if err != nil {
		return 0, 0, err
	}
	
	return int(cmdTag.RowsAffected()), duplicates, nil
}

// transferComments transfers all comments and comment votes
func (s *AccountMergeService) transferComments(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID) (int, error) {
	// Transfer comments
	commentsQuery := `
		UPDATE comments
		SET user_id = $1
		WHERE user_id = $2
	`
	
	cmdTag, err := tx.Exec(ctx, commentsQuery, toUserID, fromUserID)
	if err != nil {
		return 0, err
	}
	commentsTransferred := int(cmdTag.RowsAffected())
	
	// Transfer comment votes (with duplicate handling)
	// Delete duplicates first
	deleteVotesQuery := `
		DELETE FROM comment_votes
		WHERE user_id = $1
		AND comment_id IN (
			SELECT comment_id FROM comment_votes WHERE user_id = $2
		)
	`
	
	if _, err := tx.Exec(ctx, deleteVotesQuery, fromUserID, toUserID); err != nil {
		return 0, err
	}
	
	// Transfer remaining comment votes
	updateVotesQuery := `
		UPDATE comment_votes
		SET user_id = $1
		WHERE user_id = $2
	`
	
	if _, err := tx.Exec(ctx, updateVotesQuery, toUserID, fromUserID); err != nil {
		return 0, err
	}
	
	return commentsTransferred, nil
}

// transferFollows transfers all follow relationships (broadcaster, stream, game, user)
func (s *AccountMergeService) transferFollows(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID) (int, error) {
	totalTransferred := 0
	
	// Tables to transfer: broadcaster_follows, stream_follows, game_follows, user_follows
	tables := []string{
		"broadcaster_follows",
		"stream_follows",
		"game_follows",
		"user_follows",
	}
	
	for _, table := range tables {
		// Check if table exists (some may not exist in all deployments)
		checkQuery := fmt.Sprintf(`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_name = '%s'
			)
		`, table)
		
		var exists bool
		if err := tx.QueryRow(ctx, checkQuery).Scan(&exists); err != nil {
			log.Printf("Warning: failed to check if table %s exists: %v", table, err)
			continue
		}
		
		if !exists {
			continue
		}
		
		// Delete duplicates
		deleteQuery := fmt.Sprintf(`
			DELETE FROM %s
			WHERE user_id = $1
			AND EXISTS (
				SELECT 1 FROM %s AS t2 
				WHERE t2.user_id = $2
			)
		`, table, table)
		
		// Transfer remaining follows
		updateQuery := fmt.Sprintf(`
			UPDATE %s
			SET user_id = $1
			WHERE user_id = $2
		`, table)
		
		if _, err := tx.Exec(ctx, deleteQuery, fromUserID, toUserID); err != nil {
			log.Printf("Warning: failed to delete duplicate follows from %s: %v", table, err)
		}
		
		cmdTag, err := tx.Exec(ctx, updateQuery, toUserID, fromUserID)
		if err != nil {
			log.Printf("Warning: failed to transfer follows from %s: %v", table, err)
			continue
		}
		
		totalTransferred += int(cmdTag.RowsAffected())
	}
	
	return totalTransferred, nil
}

// transferWatchHistory transfers watch history, keeping most recent per clip
func (s *AccountMergeService) transferWatchHistory(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID) (int, error) {
	// For clips where authenticated user already has watch history, keep the authenticated user's version
	// Delete unclaimed user's watch history for those clips
	deleteQuery := `
		DELETE FROM watch_history
		WHERE user_id = $1
		AND clip_id IN (
			SELECT clip_id FROM watch_history WHERE user_id = $2
		)
	`
	
	if _, err := tx.Exec(ctx, deleteQuery, fromUserID, toUserID); err != nil {
		return 0, err
	}
	
	// Transfer remaining watch history
	updateQuery := `
		UPDATE watch_history
		SET user_id = $1
		WHERE user_id = $2
	`
	
	cmdTag, err := tx.Exec(ctx, updateQuery, toUserID, fromUserID)
	if err != nil {
		return 0, err
	}
	
	return int(cmdTag.RowsAffected()), nil
}

// mergeUserPreferences merges user preferences (union of arrays)
func (s *AccountMergeService) mergeUserPreferences(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID) (bool, error) {
	// Check if user_preferences table exists
	checkQuery := `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'user_preferences'
		)
	`
	
	var exists bool
	if err := tx.QueryRow(ctx, checkQuery).Scan(&exists); err != nil {
		return false, err
	}
	
	if !exists {
		return false, nil
	}
	
	// Merge preferences by taking union of arrays
	mergeQuery := `
		INSERT INTO user_preferences (
			user_id, 
			favorite_games, 
			followed_streamers, 
			preferred_categories, 
			preferred_tags,
			updated_at
		)
		SELECT 
			$1 as user_id,
			ARRAY(SELECT DISTINCT unnest(
				COALESCE(to_prefs.favorite_games, '{}') || 
				COALESCE(from_prefs.favorite_games, '{}')
			)) as favorite_games,
			ARRAY(SELECT DISTINCT unnest(
				COALESCE(to_prefs.followed_streamers, '{}') || 
				COALESCE(from_prefs.followed_streamers, '{}')
			)) as followed_streamers,
			ARRAY(SELECT DISTINCT unnest(
				COALESCE(to_prefs.preferred_categories, '{}') || 
				COALESCE(from_prefs.preferred_categories, '{}')
			)) as preferred_categories,
			ARRAY(SELECT DISTINCT unnest(
				COALESCE(to_prefs.preferred_tags, '{}') || 
				COALESCE(from_prefs.preferred_tags, '{}')
			)) as preferred_tags,
			NOW() as updated_at
		FROM 
			(SELECT * FROM user_preferences WHERE user_id = $1) to_prefs
		FULL OUTER JOIN 
			(SELECT * FROM user_preferences WHERE user_id = $2) from_prefs 
			ON true
		ON CONFLICT (user_id) 
		DO UPDATE SET
			favorite_games = EXCLUDED.favorite_games,
			followed_streamers = EXCLUDED.followed_streamers,
			preferred_categories = EXCLUDED.preferred_categories,
			preferred_tags = EXCLUDED.preferred_tags,
			updated_at = NOW()
	`
	
	if _, err := tx.Exec(ctx, mergeQuery, toUserID, fromUserID); err != nil {
		return false, err
	}
	
	// Delete unclaimed user's preferences
	deleteQuery := `DELETE FROM user_preferences WHERE user_id = $1`
	if _, err := tx.Exec(ctx, deleteQuery, fromUserID); err != nil {
		log.Printf("Warning: failed to delete old preferences: %v", err)
	}
	
	return true, nil
}

// transferSubscription transfers subscription data if it exists
func (s *AccountMergeService) transferSubscription(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID) (bool, error) {
	// Check if subscriptions table exists
	checkQuery := `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'subscriptions'
		)
	`
	
	var exists bool
	if err := tx.QueryRow(ctx, checkQuery).Scan(&exists); err != nil {
		return false, err
	}
	
	if !exists {
		return false, nil
	}
	
	// Check if unclaimed user has an active subscription
	hasSubQuery := `
		SELECT EXISTS (
			SELECT 1 FROM subscriptions 
			WHERE user_id = $1 
			AND status IN ('active', 'trialing')
		)
	`
	
	var hasSubscription bool
	if err := tx.QueryRow(ctx, hasSubQuery, fromUserID).Scan(&hasSubscription); err != nil {
		return false, err
	}
	
	if !hasSubscription {
		return false, nil
	}
	
	// Check if authenticated user already has subscription
	hasToSubQuery := `
		SELECT EXISTS (
			SELECT 1 FROM subscriptions 
			WHERE user_id = $1
		)
	`
	
	var toHasSubscription bool
	if err := tx.QueryRow(ctx, hasToSubQuery, toUserID).Scan(&toHasSubscription); err != nil {
		return false, err
	}
	
	// If authenticated user already has subscription, don't transfer (keep authenticated)
	if toHasSubscription {
		return false, nil
	}
	
	// Transfer subscription
	updateQuery := `
		UPDATE subscriptions
		SET user_id = $1
		WHERE user_id = $2
	`
	
	if _, err := tx.Exec(ctx, updateQuery, toUserID, fromUserID); err != nil {
		return false, err
	}
	
	return true, nil
}

// markAccountAsMerged marks the unclaimed account as merged
func (s *AccountMergeService) markAccountAsMerged(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID) error {
	query := `
		UPDATE users
		SET account_status = 'merged',
		    updated_at = NOW()
		WHERE id = $1
	`
	
	_, err := tx.Exec(ctx, query, fromUserID)
	return err
}

// createMergeAuditLog creates an audit log entry for the merge operation
func (s *AccountMergeService) createMergeAuditLog(ctx context.Context, tx pgx.Tx, fromUserID, toUserID uuid.UUID, result *MergeResult) error {
	metadata := map[string]interface{}{
		"from_user_id":        fromUserID.String(),
		"to_user_id":          toUserID.String(),
		"clips_merged":        result.ClipsMerged,
		"votes_merged":        result.VotesMerged,
		"favorites_merged":    result.FavoritesMerged,
		"comments_merged":     result.CommentsMerged,
		"follows_merged":      result.FollowsMerged,
		"watch_history_merged": result.WatchHistoryMerged,
		"preferences_merged":  result.PreferencesMerged,
		"subscription_merged": result.SubscriptionMerged,
		"duplicates_skipped":  result.DuplicatesSkipped,
		"timestamp":           time.Now().UTC().Format(time.RFC3339),
	}
	
	query := `
		INSERT INTO moderation_audit_logs (
			id, action, entity_type, entity_id, moderator_id, metadata, created_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, NOW()
		)
	`
	
	// PostgreSQL can handle map[string]interface{} directly as JSONB
	_, err := tx.Exec(ctx, query,
		"account_merged",
		"user",
		toUserID,
		toUserID,
		metadata,
	)
	
	return err
}
