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
