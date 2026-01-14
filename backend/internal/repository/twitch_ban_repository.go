package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TwitchBan represents a ban record in the database
type TwitchBan struct {
	ID               uuid.UUID  `db:"id"`
	ChannelID        uuid.UUID  `db:"channel_id"`
	BannedUserID     uuid.UUID  `db:"banned_user_id"`
	Reason           *string    `db:"reason"`
	BannedAt         time.Time  `db:"banned_at"`
	ExpiresAt        *time.Time `db:"expires_at"`
	SyncedFromTwitch bool       `db:"synced_from_twitch"`
	TwitchBanID      *string    `db:"twitch_ban_id"`
	LastSyncedAt     *time.Time `db:"last_synced_at"`
	CreatedAt        time.Time  `db:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at"`
}

// TwitchBanRepository handles Twitch ban data persistence
type TwitchBanRepository struct {
	pool *pgxpool.Pool
}

// NewTwitchBanRepository creates a new Twitch ban repository
func NewTwitchBanRepository(pool *pgxpool.Pool) *TwitchBanRepository {
	return &TwitchBanRepository{pool: pool}
}

// UpsertBan inserts or updates a ban record
// For permanent bans (expires_at IS NULL), uses the partial unique index on (channel_id, banned_user_id)
// For temporary bans, uses twitch_ban_id for uniqueness since multiple temporary bans can exist
func (r *TwitchBanRepository) UpsertBan(ctx context.Context, ban *TwitchBan) error {
	// For permanent bans, use the partial unique index
	if ban.ExpiresAt == nil {
		query := `
			INSERT INTO twitch_bans (
				channel_id, banned_user_id, reason, banned_at, expires_at,
				synced_from_twitch, twitch_ban_id, last_synced_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (channel_id, banned_user_id)
			WHERE expires_at IS NULL
			DO UPDATE SET
				reason = EXCLUDED.reason,
				banned_at = EXCLUDED.banned_at,
				synced_from_twitch = EXCLUDED.synced_from_twitch,
				twitch_ban_id = EXCLUDED.twitch_ban_id,
				last_synced_at = EXCLUDED.last_synced_at,
				updated_at = NOW()
			RETURNING id, created_at, updated_at
		`

		err := r.pool.QueryRow(
			ctx,
			query,
			ban.ChannelID,
			ban.BannedUserID,
			ban.Reason,
			ban.BannedAt,
			ban.ExpiresAt,
			ban.SyncedFromTwitch,
			ban.TwitchBanID,
			ban.LastSyncedAt,
		).Scan(&ban.ID, &ban.CreatedAt, &ban.UpdatedAt)

		return err
	}

	// For temporary bans, just insert (they can overlap)
	// If we have the same twitch_ban_id, we could update it, but typically
	// temporary bans from Twitch are unique by their creation time
	query := `
		INSERT INTO twitch_bans (
			channel_id, banned_user_id, reason, banned_at, expires_at,
			synced_from_twitch, twitch_ban_id, last_synced_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	err := r.pool.QueryRow(
		ctx,
		query,
		ban.ChannelID,
		ban.BannedUserID,
		ban.Reason,
		ban.BannedAt,
		ban.ExpiresAt,
		ban.SyncedFromTwitch,
		ban.TwitchBanID,
		ban.LastSyncedAt,
	).Scan(&ban.ID, &ban.CreatedAt, &ban.UpdatedAt)

	return err
}

// BatchUpsertBans inserts or updates multiple ban records in a transaction
func (r *TwitchBanRepository) BatchUpsertBans(ctx context.Context, bans []*TwitchBan) error {
	if len(bans) == 0 {
		return nil
	}

	// Start transaction
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // nolint:errcheck

	// Prepare queries for both permanent and temporary bans
	permanentBanQuery := `
		INSERT INTO twitch_bans (
			channel_id, banned_user_id, reason, banned_at, expires_at,
			synced_from_twitch, twitch_ban_id, last_synced_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (channel_id, banned_user_id)
		WHERE expires_at IS NULL
		DO UPDATE SET
			reason = EXCLUDED.reason,
			banned_at = EXCLUDED.banned_at,
			synced_from_twitch = EXCLUDED.synced_from_twitch,
			twitch_ban_id = EXCLUDED.twitch_ban_id,
			last_synced_at = EXCLUDED.last_synced_at,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`

	temporaryBanQuery := `
		INSERT INTO twitch_bans (
			channel_id, banned_user_id, reason, banned_at, expires_at,
			synced_from_twitch, twitch_ban_id, last_synced_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	for _, ban := range bans {
		var query string
		if ban.ExpiresAt == nil {
			query = permanentBanQuery
		} else {
			query = temporaryBanQuery
		}

		err := tx.QueryRow(
			ctx,
			query,
			ban.ChannelID,
			ban.BannedUserID,
			ban.Reason,
			ban.BannedAt,
			ban.ExpiresAt,
			ban.SyncedFromTwitch,
			ban.TwitchBanID,
			ban.LastSyncedAt,
		).Scan(&ban.ID, &ban.CreatedAt, &ban.UpdatedAt)

		if err != nil {
			return err
		}
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}

// GetBansByChannel retrieves all bans for a specific channel
func (r *TwitchBanRepository) GetBansByChannel(ctx context.Context, channelID uuid.UUID) ([]*TwitchBan, error) {
	query := `
		SELECT id, channel_id, banned_user_id, reason, banned_at, expires_at,
			synced_from_twitch, twitch_ban_id, last_synced_at, created_at, updated_at
		FROM twitch_bans
		WHERE channel_id = $1
		ORDER BY banned_at DESC
	`

	rows, err := r.pool.Query(ctx, query, channelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bans []*TwitchBan
	for rows.Next() {
		ban := &TwitchBan{}
		err := rows.Scan(
			&ban.ID,
			&ban.ChannelID,
			&ban.BannedUserID,
			&ban.Reason,
			&ban.BannedAt,
			&ban.ExpiresAt,
			&ban.SyncedFromTwitch,
			&ban.TwitchBanID,
			&ban.LastSyncedAt,
			&ban.CreatedAt,
			&ban.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		bans = append(bans, ban)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return bans, nil
}

// DeleteBan removes a ban record
func (r *TwitchBanRepository) DeleteBan(ctx context.Context, channelID, bannedUserID uuid.UUID) error {
	query := `DELETE FROM twitch_bans WHERE channel_id = $1 AND banned_user_id = $2`
	_, err := r.pool.Exec(ctx, query, channelID, bannedUserID)
	return err
}

// GetBan retrieves a specific ban record
func (r *TwitchBanRepository) GetBan(ctx context.Context, channelID, bannedUserID uuid.UUID) (*TwitchBan, error) {
	query := `
		SELECT id, channel_id, banned_user_id, reason, banned_at, expires_at,
			synced_from_twitch, twitch_ban_id, last_synced_at, created_at, updated_at
		FROM twitch_bans
		WHERE channel_id = $1 AND banned_user_id = $2
	`

	ban := &TwitchBan{}
	err := r.pool.QueryRow(ctx, query, channelID, bannedUserID).Scan(
		&ban.ID,
		&ban.ChannelID,
		&ban.BannedUserID,
		&ban.Reason,
		&ban.BannedAt,
		&ban.ExpiresAt,
		&ban.SyncedFromTwitch,
		&ban.TwitchBanID,
		&ban.LastSyncedAt,
		&ban.CreatedAt,
		&ban.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}

	return ban, err
}
