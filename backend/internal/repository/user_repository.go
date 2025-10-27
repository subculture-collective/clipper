package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

var (
	// ErrUserNotFound is returned when a user is not found
	ErrUserNotFound = errors.New("user not found")
	// ErrUserAlreadyExists is returned when trying to create a duplicate user
	ErrUserAlreadyExists = errors.New("user already exists")
)

// UserRepository handles user database operations
type UserRepository struct {
	db *pgxpool.Pool
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (
			id, twitch_id, username, display_name, email, 
			avatar_url, bio, role, last_login_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRow(
		ctx, query,
		user.ID, user.TwitchID, user.Username, user.DisplayName, user.Email,
		user.AvatarURL, user.Bio, user.Role, user.LastLoginAt,
	).Scan(&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return err
	}

	return nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `
		SELECT 
			id, twitch_id, username, display_name, email, avatar_url, bio,
			karma_points, role, is_banned, created_at, updated_at, last_login_at
		FROM users
		WHERE id = $1
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.TwitchID, &user.Username, &user.DisplayName, &user.Email,
		&user.AvatarURL, &user.Bio, &user.KarmaPoints, &user.Role, &user.IsBanned,
		&user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

// GetByTwitchID retrieves a user by Twitch ID
func (r *UserRepository) GetByTwitchID(ctx context.Context, twitchID string) (*models.User, error) {
	query := `
		SELECT 
			id, twitch_id, username, display_name, email, avatar_url, bio,
			karma_points, role, is_banned, created_at, updated_at, last_login_at
		FROM users
		WHERE twitch_id = $1
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, twitchID).Scan(
		&user.ID, &user.TwitchID, &user.Username, &user.DisplayName, &user.Email,
		&user.AvatarURL, &user.Bio, &user.KarmaPoints, &user.Role, &user.IsBanned,
		&user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

// GetByUsername retrieves a user by username (case-insensitive)
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `
		SELECT 
			id, twitch_id, username, display_name, email, avatar_url, bio,
			karma_points, role, is_banned, created_at, updated_at, last_login_at
		FROM users
		WHERE LOWER(username) = LOWER($1)
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, username).Scan(
		&user.ID, &user.TwitchID, &user.Username, &user.DisplayName, &user.Email,
		&user.AvatarURL, &user.Bio, &user.KarmaPoints, &user.Role, &user.IsBanned,
		&user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

// Update updates an existing user
func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users
		SET username = $2, display_name = $3, email = $4, avatar_url = $5,
		    bio = $6, last_login_at = $7, updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.db.Exec(
		ctx, query,
		user.ID, user.Username, user.DisplayName, user.Email,
		user.AvatarURL, user.Bio, user.LastLoginAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

// UpdateProfile updates user's display name and bio
func (r *UserRepository) UpdateProfile(ctx context.Context, userID uuid.UUID, displayName string, bio *string) error {
	query := `
		UPDATE users
		SET display_name = $2, bio = $3, updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.db.Exec(ctx, query, userID, displayName, bio)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

// UpdateLastLogin updates the user's last login timestamp
func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE users
		SET last_login_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// UpdateKarma updates a user's karma points
func (r *UserRepository) UpdateKarma(ctx context.Context, userID uuid.UUID, delta int) error {
	query := `
		UPDATE users
		SET karma_points = karma_points + $2
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, userID, delta)
	return err
}

// BanUser bans a user
func (r *UserRepository) BanUser(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE users
		SET is_banned = true, updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// UnbanUser unbans a user
func (r *UserRepository) UnbanUser(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE users
		SET is_banned = false, updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// RefreshTokenRepository handles refresh token database operations
type RefreshTokenRepository struct {
	db *pgxpool.Pool
}

// NewRefreshTokenRepository creates a new refresh token repository
func NewRefreshTokenRepository(db *pgxpool.Pool) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

// Create creates a new refresh token
func (r *RefreshTokenRepository) Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	query := `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`

	_, err := r.db.Exec(ctx, query, userID, tokenHash, expiresAt)
	return err
}

// GetByHash retrieves a refresh token by its hash
func (r *RefreshTokenRepository) GetByHash(ctx context.Context, tokenHash string) (userID uuid.UUID, expiresAt time.Time, isRevoked bool, err error) {
	query := `
		SELECT user_id, expires_at, is_revoked
		FROM refresh_tokens
		WHERE token_hash = $1
	`

	err = r.db.QueryRow(ctx, query, tokenHash).Scan(&userID, &expiresAt, &isRevoked)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, time.Time{}, false, errors.New("refresh token not found")
		}
		return uuid.Nil, time.Time{}, false, err
	}

	return userID, expiresAt, isRevoked, nil
}

// Revoke marks a refresh token as revoked
func (r *RefreshTokenRepository) Revoke(ctx context.Context, tokenHash string) error {
	query := `
		UPDATE refresh_tokens
		SET is_revoked = true, revoked_at = NOW()
		WHERE token_hash = $1
	`

	_, err := r.db.Exec(ctx, query, tokenHash)
	return err
}

// RevokeAllForUser revokes all refresh tokens for a user
func (r *RefreshTokenRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE refresh_tokens
		SET is_revoked = true, revoked_at = NOW()
		WHERE user_id = $1 AND is_revoked = false
	`

	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// GetAllActiveUserIDs retrieves all user IDs that are not banned
func (r *UserRepository) GetAllActiveUserIDs(ctx context.Context) ([]uuid.UUID, error) {
	query := `
		SELECT id FROM users
		WHERE is_banned = false
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, id)
	}

	return userIDs, rows.Err()
}

// DeleteExpired deletes expired refresh tokens
func (r *RefreshTokenRepository) DeleteExpired(ctx context.Context) error {
	query := `
		DELETE FROM refresh_tokens
		WHERE expires_at < NOW() - INTERVAL '7 days'
	`

	_, err := r.db.Exec(ctx, query)
	return err
}

// UserSettingsRepository handles user settings database operations
type UserSettingsRepository struct {
	db *pgxpool.Pool
}

// NewUserSettingsRepository creates a new user settings repository
func NewUserSettingsRepository(db *pgxpool.Pool) *UserSettingsRepository {
	return &UserSettingsRepository{db: db}
}

// GetByUserID retrieves user settings by user ID
func (r *UserSettingsRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.UserSettings, error) {
	query := `
		SELECT user_id, profile_visibility, show_karma_publicly, created_at, updated_at
		FROM user_settings
		WHERE user_id = $1
	`

	var settings models.UserSettings
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&settings.UserID, &settings.ProfileVisibility, &settings.ShowKarmaPublicly,
		&settings.CreatedAt, &settings.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &settings, nil
}

// Update updates user settings
func (r *UserSettingsRepository) Update(ctx context.Context, userID uuid.UUID, profileVisibility *string, showKarmaPublicly *bool) error {
	// Build query based on which fields are provided
	var query string
	var args []interface{}

	if profileVisibility != nil && showKarmaPublicly != nil {
		query = `UPDATE user_settings SET profile_visibility = $2, show_karma_publicly = $3, updated_at = NOW() WHERE user_id = $1`
		args = []interface{}{userID, *profileVisibility, *showKarmaPublicly}
	} else if profileVisibility != nil {
		query = `UPDATE user_settings SET profile_visibility = $2, updated_at = NOW() WHERE user_id = $1`
		args = []interface{}{userID, *profileVisibility}
	} else if showKarmaPublicly != nil {
		query = `UPDATE user_settings SET show_karma_publicly = $2, updated_at = NOW() WHERE user_id = $1`
		args = []interface{}{userID, *showKarmaPublicly}
	} else {
		// Nothing to update
		return nil
	}

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

// AccountDeletionRepository handles account deletion database operations
type AccountDeletionRepository struct {
	db *pgxpool.Pool
}

// NewAccountDeletionRepository creates a new account deletion repository
func NewAccountDeletionRepository(db *pgxpool.Pool) *AccountDeletionRepository {
	return &AccountDeletionRepository{db: db}
}

// Create creates a new account deletion request
func (r *AccountDeletionRepository) Create(ctx context.Context, deletion *models.AccountDeletion) error {
	query := `
		INSERT INTO account_deletions (id, user_id, scheduled_for, reason)
		VALUES ($1, $2, $3, $4)
		RETURNING requested_at, is_cancelled
	`

	err := r.db.QueryRow(
		ctx, query,
		deletion.ID, deletion.UserID, deletion.ScheduledFor, deletion.Reason,
	).Scan(&deletion.RequestedAt, &deletion.IsCancelled)

	return err
}

// GetPendingByUserID retrieves a pending deletion request for a user
func (r *AccountDeletionRepository) GetPendingByUserID(ctx context.Context, userID uuid.UUID) (*models.AccountDeletion, error) {
	query := `
		SELECT id, user_id, requested_at, scheduled_for, reason, is_cancelled, cancelled_at, completed_at
		FROM account_deletions
		WHERE user_id = $1 AND is_cancelled = false AND completed_at IS NULL
		ORDER BY requested_at DESC
		LIMIT 1
	`

	var deletion models.AccountDeletion
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&deletion.ID, &deletion.UserID, &deletion.RequestedAt, &deletion.ScheduledFor,
		&deletion.Reason, &deletion.IsCancelled, &deletion.CancelledAt, &deletion.CompletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // No pending deletion
		}
		return nil, err
	}

	return &deletion, nil
}

// Cancel cancels a deletion request
func (r *AccountDeletionRepository) Cancel(ctx context.Context, deletionID uuid.UUID) error {
	query := `
		UPDATE account_deletions
		SET is_cancelled = true, cancelled_at = NOW()
		WHERE id = $1 AND is_cancelled = false AND completed_at IS NULL
	`

	result, err := r.db.Exec(ctx, query, deletionID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("deletion request not found or already completed")
	}

	return nil
}

// GetScheduledDeletions retrieves all scheduled deletions that are ready to be executed
func (r *AccountDeletionRepository) GetScheduledDeletions(ctx context.Context) ([]*models.AccountDeletion, error) {
	query := `
		SELECT id, user_id, requested_at, scheduled_for, reason, is_cancelled, cancelled_at, completed_at
		FROM account_deletions
		WHERE scheduled_for <= NOW() AND is_cancelled = false AND completed_at IS NULL
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deletions []*models.AccountDeletion
	for rows.Next() {
		var deletion models.AccountDeletion
		err := rows.Scan(
			&deletion.ID, &deletion.UserID, &deletion.RequestedAt, &deletion.ScheduledFor,
			&deletion.Reason, &deletion.IsCancelled, &deletion.CancelledAt, &deletion.CompletedAt,
		)
		if err != nil {
			return nil, err
		}
		deletions = append(deletions, &deletion)
	}

	return deletions, rows.Err()
}

// MarkCompleted marks a deletion as completed
func (r *AccountDeletionRepository) MarkCompleted(ctx context.Context, deletionID uuid.UUID) error {
	query := `
		UPDATE account_deletions
		SET completed_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, deletionID)
	return err
}
