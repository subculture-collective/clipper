package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// PlaylistScriptService handles script-based playlist automation
type PlaylistScriptService struct {
    scriptRepo   *repository.PlaylistScriptRepository
    playlistRepo *repository.PlaylistRepository
    clipRepo     *repository.ClipRepository
}

// NewPlaylistScriptService creates a new PlaylistScriptService
func NewPlaylistScriptService(scriptRepo *repository.PlaylistScriptRepository, playlistRepo *repository.PlaylistRepository, clipRepo *repository.ClipRepository) *PlaylistScriptService {
    return &PlaylistScriptService{
        scriptRepo:   scriptRepo,
        playlistRepo: playlistRepo,
        clipRepo:     clipRepo,
    }
}

// ListScripts returns all playlist scripts
func (s *PlaylistScriptService) ListScripts(ctx context.Context) ([]*models.PlaylistScript, error) {
    return s.scriptRepo.List(ctx)
}

// CreateScript creates a new playlist script
func (s *PlaylistScriptService) CreateScript(ctx context.Context, userID uuid.UUID, req *models.CreatePlaylistScriptRequest) (*models.PlaylistScript, error) {
    visibility := models.PlaylistVisibilityPublic
    if req.Visibility != nil {
        visibility = *req.Visibility
    }
    isActive := true
    if req.IsActive != nil {
        isActive = *req.IsActive
    }
    script := &models.PlaylistScript{
        ID:          uuid.New(),
        Name:        req.Name,
        Description: req.Description,
        Sort:        req.Sort,
        Timeframe:   req.Timeframe,
        ClipLimit:   req.ClipLimit,
        Visibility:  visibility,
        IsActive:    isActive,
        CreatedBy:   &userID,
    }

    if err := s.scriptRepo.Create(ctx, script); err != nil {
        return nil, err
    }

    return script, nil
}

// UpdateScript updates an existing playlist script
func (s *PlaylistScriptService) UpdateScript(ctx context.Context, scriptID uuid.UUID, req *models.UpdatePlaylistScriptRequest) (*models.PlaylistScript, error) {
    script, err := s.scriptRepo.GetByID(ctx, scriptID)
    if err != nil {
        return nil, err
    }
    if script == nil {
        return nil, fmt.Errorf("playlist script not found")
    }

    if req.Name != nil {
        script.Name = *req.Name
    }
    if req.Description != nil {
        script.Description = req.Description
    }
    if req.Sort != nil {
        script.Sort = *req.Sort
    }
    if req.Timeframe != nil {
        script.Timeframe = req.Timeframe
    }
    if req.ClipLimit != nil {
        script.ClipLimit = *req.ClipLimit
    }
    if req.Visibility != nil {
        script.Visibility = *req.Visibility
    }
    if req.IsActive != nil {
        script.IsActive = *req.IsActive
    }

    if err := s.scriptRepo.Update(ctx, script); err != nil {
        return nil, err
    }

    return script, nil
}
// DeleteScript removes a playlist script
func (s *PlaylistScriptService) DeleteScript(ctx context.Context, scriptID uuid.UUID) error {
    return s.scriptRepo.Delete(ctx, scriptID)
}
// GeneratePlaylist creates a playlist from a script
func (s *PlaylistScriptService) GeneratePlaylist(ctx context.Context, scriptID uuid.UUID) (*models.Playlist, error) {
    script, err := s.scriptRepo.GetByID(ctx, scriptID)
    if err != nil {
        return nil, err
    }
    if script == nil {
        return nil, fmt.Errorf("playlist script not found")
    }
    if !script.IsActive {
        return nil, fmt.Errorf("playlist script is inactive")
    }

    filters := repository.ClipFilters{Sort: script.Sort}
    if script.Timeframe != nil {
        filters.Timeframe = script.Timeframe
    }

    clips, _, err := s.clipRepo.ListWithFilters(ctx, filters, script.ClipLimit, 0)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch clips: %w", err)
    }

    ownerID := uuid.Nil
    if script.CreatedBy != nil {
        ownerID = *script.CreatedBy
    }
    if ownerID == uuid.Nil {
        return nil, fmt.Errorf("invalid script owner")
    }

    title := fmt.Sprintf("%s • %s", script.Name, time.Now().Format("Jan 2, 2006"))
    playlist := &models.Playlist{
        ID:          uuid.New(),
        UserID:      ownerID,
        Title:       title,
        Description: script.Description,
        Visibility:  script.Visibility,
        ScriptID:    &script.ID,
    }

    if err := s.playlistRepo.Create(ctx, playlist); err != nil {
        return nil, fmt.Errorf("failed to create generated playlist: %w", err)
    }

    for idx, clip := range clips {
        if err := s.playlistRepo.AddClip(ctx, playlist.ID, clip.ID, idx); err != nil {
            return nil, fmt.Errorf("failed to add clip to generated playlist: %w", err)
        }
    }

    if err := s.scriptRepo.CreateGeneratedPlaylist(ctx, script.ID, playlist.ID); err != nil {
        return nil, err
    }
    if err := s.scriptRepo.UpdateLastRun(ctx, script.ID, playlist.ID); err != nil {
        return nil, err
    }

    return playlist, nil
}
