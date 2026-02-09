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

// PlaylistScriptRepository handles database operations for playlist scripts
type PlaylistScriptRepository struct {
    pool *pgxpool.Pool
}

// NewPlaylistScriptRepository creates a new PlaylistScriptRepository
func NewPlaylistScriptRepository(pool *pgxpool.Pool) *PlaylistScriptRepository {
    return &PlaylistScriptRepository{pool: pool}
}

// List retrieves all playlist scripts
func (r *PlaylistScriptRepository) List(ctx context.Context) ([]*models.PlaylistScript, error) {
    query := `
        SELECT id, name, description, sort, timeframe, clip_limit, visibility,
               is_active, created_by, created_at, updated_at, last_run_at, last_generated_playlist_id
        FROM playlist_scripts
        ORDER BY created_at DESC
    `

    rows, err := r.pool.Query(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("failed to list playlist scripts: %w", err)
    }
    defer rows.Close()

    var scripts []*models.PlaylistScript
    for rows.Next() {
        var script models.PlaylistScript
        err := rows.Scan(
            &script.ID,
            &script.Name,
            &script.Description,
            &script.Sort,
            &script.Timeframe,
            &script.ClipLimit,
            &script.Visibility,
            &script.IsActive,
            &script.CreatedBy,
            &script.CreatedAt,
            &script.UpdatedAt,
            &script.LastRunAt,
            &script.LastGeneratedPlaylistID,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan playlist script: %w", err)
        }
        scripts = append(scripts, &script)
    }

    return scripts, nil
}
// GetByID retrieves a playlist script by ID
func (r *PlaylistScriptRepository) GetByID(ctx context.Context, scriptID uuid.UUID) (*models.PlaylistScript, error) {
    query := `
        SELECT id, name, description, sort, timeframe, clip_limit, visibility,
               is_active, created_by, created_at, updated_at, last_run_at, last_generated_playlist_id
        FROM playlist_scripts
        WHERE id = $1
    `

    var script models.PlaylistScript
    err := r.pool.QueryRow(ctx, query, scriptID).Scan(
        &script.ID,
        &script.Name,
        &script.Description,
        &script.Sort,
        &script.Timeframe,
        &script.ClipLimit,
        &script.Visibility,
        &script.IsActive,
        &script.CreatedBy,
        &script.CreatedAt,
        &script.UpdatedAt,
        &script.LastRunAt,
        &script.LastGeneratedPlaylistID,
    )

    if err == pgx.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, fmt.Errorf("failed to get playlist script: %w", err)
    }

    return &script, nil
}
// Create inserts a new playlist script
func (r *PlaylistScriptRepository) Create(ctx context.Context, script *models.PlaylistScript) error {
    query := `
        INSERT INTO playlist_scripts (id, name, description, sort, timeframe, clip_limit, visibility, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING created_at, updated_at
    `

    err := r.pool.QueryRow(ctx, query,
        script.ID,
        script.Name,
        script.Description,
        script.Sort,
        script.Timeframe,
        script.ClipLimit,
        script.Visibility,
        script.IsActive,
        script.CreatedBy,
    ).Scan(&script.CreatedAt, &script.UpdatedAt)

    if err != nil {
        return fmt.Errorf("failed to create playlist script: %w", err)
    }

    return nil
}
// Update updates an existing playlist script
func (r *PlaylistScriptRepository) Update(ctx context.Context, script *models.PlaylistScript) error {
    query := `
        UPDATE playlist_scripts
        SET name = $1, description = $2, sort = $3, timeframe = $4,
            clip_limit = $5, visibility = $6, is_active = $7
        WHERE id = $8
        RETURNING updated_at
    `

    err := r.pool.QueryRow(ctx, query,
        script.Name,
        script.Description,
        script.Sort,
        script.Timeframe,
        script.ClipLimit,
        script.Visibility,
        script.IsActive,
        script.ID,
    ).Scan(&script.UpdatedAt)

    if err == pgx.ErrNoRows {
        return fmt.Errorf("playlist script not found")
    }
    if err != nil {
        return fmt.Errorf("failed to update playlist script: %w", err)
    }

    return nil
}
// Delete removes a playlist script
func (r *PlaylistScriptRepository) Delete(ctx context.Context, scriptID uuid.UUID) error {
    query := `
        DELETE FROM playlist_scripts
        WHERE id = $1
    `

    result, err := r.pool.Exec(ctx, query, scriptID)
    if err != nil {
        return fmt.Errorf("failed to delete playlist script: %w", err)
    }
    if result.RowsAffected() == 0 {
        return fmt.Errorf("playlist script not found")
    }

    return nil
}
// CreateGeneratedPlaylist records a generated playlist instance
func (r *PlaylistScriptRepository) CreateGeneratedPlaylist(ctx context.Context, scriptID, playlistID uuid.UUID) error {
    query := `
        INSERT INTO generated_playlists (id, script_id, playlist_id, generated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (playlist_id) DO NOTHING
    `

    _, err := r.pool.Exec(ctx, query, uuid.New(), scriptID, playlistID, time.Now())
    if err != nil {
        return fmt.Errorf("failed to record generated playlist: %w", err)
    }

    return nil
}
// UpdateLastRun updates script run metadata
func (r *PlaylistScriptRepository) UpdateLastRun(ctx context.Context, scriptID, playlistID uuid.UUID) error {
    query := `
        UPDATE playlist_scripts
        SET last_run_at = $1, last_generated_playlist_id = $2
        WHERE id = $3
    `

    result, err := r.pool.Exec(ctx, query, time.Now(), playlistID, scriptID)
    if err != nil {
        return fmt.Errorf("failed to update playlist script run metadata: %w", err)
    }
    if result.RowsAffected() == 0 {
        return fmt.Errorf("playlist script not found")
    }

    return nil
}
