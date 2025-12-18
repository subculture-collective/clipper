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

// WatchPartyRepository handles database operations for watch parties
type WatchPartyRepository struct {
	pool *pgxpool.Pool
}

// NewWatchPartyRepository creates a new WatchPartyRepository
func NewWatchPartyRepository(pool *pgxpool.Pool) *WatchPartyRepository {
	return &WatchPartyRepository{
		pool: pool,
	}
}

// Create creates a new watch party
func (r *WatchPartyRepository) Create(ctx context.Context, party *models.WatchParty) error {
	query := `
		INSERT INTO watch_parties (
			id, host_user_id, title, playlist_id, visibility, 
			invite_code, max_participants
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at
	`

	err := r.pool.QueryRow(ctx, query,
		party.ID,
		party.HostUserID,
		party.Title,
		party.PlaylistID,
		party.Visibility,
		party.InviteCode,
		party.MaxParticipants,
	).Scan(&party.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create watch party: %w", err)
	}

	return nil
}

// GetByID retrieves a watch party by its ID
func (r *WatchPartyRepository) GetByID(ctx context.Context, partyID uuid.UUID) (*models.WatchParty, error) {
	query := `
		SELECT id, host_user_id, title, playlist_id, current_clip_id,
		       current_position_seconds, is_playing, visibility, invite_code,
		       max_participants, created_at, started_at, ended_at
		FROM watch_parties
		WHERE id = $1
	`

	var party models.WatchParty
	err := r.pool.QueryRow(ctx, query, partyID).Scan(
		&party.ID,
		&party.HostUserID,
		&party.Title,
		&party.PlaylistID,
		&party.CurrentClipID,
		&party.CurrentPositionSeconds,
		&party.IsPlaying,
		&party.Visibility,
		&party.InviteCode,
		&party.MaxParticipants,
		&party.CreatedAt,
		&party.StartedAt,
		&party.EndedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get watch party: %w", err)
	}

	return &party, nil
}

// GetByInviteCode retrieves a watch party by its invite code
func (r *WatchPartyRepository) GetByInviteCode(ctx context.Context, inviteCode string) (*models.WatchParty, error) {
	query := `
		SELECT id, host_user_id, title, playlist_id, current_clip_id,
		       current_position_seconds, is_playing, visibility, invite_code,
		       max_participants, created_at, started_at, ended_at
		FROM watch_parties
		WHERE invite_code = $1 AND ended_at IS NULL
	`

	var party models.WatchParty
	err := r.pool.QueryRow(ctx, query, inviteCode).Scan(
		&party.ID,
		&party.HostUserID,
		&party.Title,
		&party.PlaylistID,
		&party.CurrentClipID,
		&party.CurrentPositionSeconds,
		&party.IsPlaying,
		&party.Visibility,
		&party.InviteCode,
		&party.MaxParticipants,
		&party.CreatedAt,
		&party.StartedAt,
		&party.EndedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get watch party by invite code: %w", err)
	}

	return &party, nil
}

// UpdatePlaybackState updates the playback state of a watch party
func (r *WatchPartyRepository) UpdatePlaybackState(ctx context.Context, partyID uuid.UUID, isPlaying bool, position int) error {
	query := `
		UPDATE watch_parties
		SET is_playing = $1, current_position_seconds = $2
		WHERE id = $3 AND ended_at IS NULL
	`

	_, err := r.pool.Exec(ctx, query, isPlaying, position, partyID)
	if err != nil {
		return fmt.Errorf("failed to update playback state: %w", err)
	}

	return nil
}

// UpdateCurrentClip updates the current clip being played
func (r *WatchPartyRepository) UpdateCurrentClip(ctx context.Context, partyID uuid.UUID, clipID uuid.UUID, position int) error {
	query := `
		UPDATE watch_parties
		SET current_clip_id = $1, current_position_seconds = $2
		WHERE id = $3 AND ended_at IS NULL
	`

	_, err := r.pool.Exec(ctx, query, clipID, position, partyID)
	if err != nil {
		return fmt.Errorf("failed to update current clip: %w", err)
	}

	return nil
}

// EndParty marks a watch party as ended
func (r *WatchPartyRepository) EndParty(ctx context.Context, partyID uuid.UUID) error {
	query := `
		UPDATE watch_parties
		SET ended_at = NOW()
		WHERE id = $1 AND ended_at IS NULL
	`

	_, err := r.pool.Exec(ctx, query, partyID)
	if err != nil {
		return fmt.Errorf("failed to end watch party: %w", err)
	}

	return nil
}

// GetActiveParticipantCount returns the count of active participants in a party
func (r *WatchPartyRepository) GetActiveParticipantCount(ctx context.Context, partyID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM watch_party_participants
		WHERE party_id = $1 AND left_at IS NULL
	`

	var count int
	err := r.pool.QueryRow(ctx, query, partyID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get active participant count: %w", err)
	}

	return count, nil
}

// AddParticipant adds a participant to a watch party
func (r *WatchPartyRepository) AddParticipant(ctx context.Context, participant *models.WatchPartyParticipant) error {
	query := `
		INSERT INTO watch_party_participants (
			id, party_id, user_id, role
		)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (party_id, user_id)
		DO UPDATE SET left_at = NULL, joined_at = NOW()
		RETURNING joined_at
	`

	err := r.pool.QueryRow(ctx, query,
		participant.ID,
		participant.PartyID,
		participant.UserID,
		participant.Role,
	).Scan(&participant.JoinedAt)

	if err != nil {
		return fmt.Errorf("failed to add participant: %w", err)
	}

	return nil
}

// RemoveParticipant marks a participant as having left the party
func (r *WatchPartyRepository) RemoveParticipant(ctx context.Context, partyID, userID uuid.UUID) error {
	query := `
		UPDATE watch_party_participants
		SET left_at = NOW()
		WHERE party_id = $1 AND user_id = $2 AND left_at IS NULL
	`

	_, err := r.pool.Exec(ctx, query, partyID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove participant: %w", err)
	}

	return nil
}

// GetParticipant retrieves a specific participant
func (r *WatchPartyRepository) GetParticipant(ctx context.Context, partyID, userID uuid.UUID) (*models.WatchPartyParticipant, error) {
	query := `
		SELECT id, party_id, user_id, role, joined_at, left_at, last_sync_at, sync_offset_ms
		FROM watch_party_participants
		WHERE party_id = $1 AND user_id = $2
		ORDER BY joined_at DESC
		LIMIT 1
	`

	var participant models.WatchPartyParticipant
	err := r.pool.QueryRow(ctx, query, partyID, userID).Scan(
		&participant.ID,
		&participant.PartyID,
		&participant.UserID,
		&participant.Role,
		&participant.JoinedAt,
		&participant.LeftAt,
		&participant.LastSyncAt,
		&participant.SyncOffsetMS,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get participant: %w", err)
	}

	return &participant, nil
}

// GetActiveParticipants retrieves all active participants in a party
func (r *WatchPartyRepository) GetActiveParticipants(ctx context.Context, partyID uuid.UUID) ([]models.WatchPartyParticipant, error) {
	query := `
		SELECT wpp.id, wpp.party_id, wpp.user_id, wpp.role, 
		       wpp.joined_at, wpp.left_at, wpp.last_sync_at, wpp.sync_offset_ms,
		       u.username, u.display_name, u.avatar_url
		FROM watch_party_participants wpp
		JOIN users u ON u.id = wpp.user_id
		WHERE wpp.party_id = $1 AND wpp.left_at IS NULL
		ORDER BY wpp.joined_at ASC
	`

	rows, err := r.pool.Query(ctx, query, partyID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active participants: %w", err)
	}
	defer rows.Close()

	var participants []models.WatchPartyParticipant
	for rows.Next() {
		var p models.WatchPartyParticipant
		var user models.User

		err := rows.Scan(
			&p.ID,
			&p.PartyID,
			&p.UserID,
			&p.Role,
			&p.JoinedAt,
			&p.LeftAt,
			&p.LastSyncAt,
			&p.SyncOffsetMS,
			&user.Username,
			&user.DisplayName,
			&user.AvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan participant: %w", err)
		}

		user.ID = p.UserID
		p.User = &user
		participants = append(participants, p)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating participants: %w", err)
	}

	return participants, nil
}

// UpdateParticipantSync updates the last sync time for a participant
func (r *WatchPartyRepository) UpdateParticipantSync(ctx context.Context, partyID, userID uuid.UUID, offsetMS int) error {
	query := `
		UPDATE watch_party_participants
		SET last_sync_at = NOW(), sync_offset_ms = $1
		WHERE party_id = $2 AND user_id = $3 AND left_at IS NULL
	`

	_, err := r.pool.Exec(ctx, query, offsetMS, partyID, userID)
	if err != nil {
		return fmt.Errorf("failed to update participant sync: %w", err)
	}

	return nil
}

// StartParty marks a party as started
func (r *WatchPartyRepository) StartParty(ctx context.Context, partyID uuid.UUID) error {
	query := `
		UPDATE watch_parties
		SET started_at = NOW()
		WHERE id = $1 AND started_at IS NULL AND ended_at IS NULL
	`

	_, err := r.pool.Exec(ctx, query, partyID)
	if err != nil {
		return fmt.Errorf("failed to start party: %w", err)
	}

	return nil
}

// CleanupStaleParticipants removes participants who haven't synced recently
func (r *WatchPartyRepository) CleanupStaleParticipants(ctx context.Context, partyID uuid.UUID, staleDuration time.Duration) error {
	query := `
		UPDATE watch_party_participants
		SET left_at = NOW()
		WHERE party_id = $1 
		  AND left_at IS NULL
		  AND (last_sync_at IS NULL OR last_sync_at < NOW() - $2::interval)
	`

	_, err := r.pool.Exec(ctx, query, partyID, staleDuration)
	if err != nil {
		return fmt.Errorf("failed to cleanup stale participants: %w", err)
	}

	return nil
}
