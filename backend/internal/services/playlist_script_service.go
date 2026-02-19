package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// BotUserID is the well-known UUID of the system bot user that posts clips
// on behalf of automated playlist scripts. Created in migration 000107.
var BotUserID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

// PlaylistScriptService handles script-based playlist automation
type PlaylistScriptService struct {
    scriptRepo      *repository.PlaylistScriptRepository
    playlistRepo    *repository.PlaylistRepository
    clipRepo        *repository.ClipRepository
    curationRepo    *repository.PlaylistCurationRepository
    clipSyncService *ClipSyncService // nil when Twitch client is not configured
}

// NewPlaylistScriptService creates a new PlaylistScriptService
func NewPlaylistScriptService(scriptRepo *repository.PlaylistScriptRepository, playlistRepo *repository.PlaylistRepository, clipRepo *repository.ClipRepository, curationRepo *repository.PlaylistCurationRepository, clipSyncService *ClipSyncService) *PlaylistScriptService {
    return &PlaylistScriptService{
        scriptRepo:      scriptRepo,
        playlistRepo:    playlistRepo,
        clipRepo:        clipRepo,
        curationRepo:    curationRepo,
        clipSyncService: clipSyncService,
    }
}

// SetClipSyncService sets the clip sync service for Twitch-powered strategies.
// Called after initialization since ClipSyncService may be nil when Twitch is not configured.
func (s *PlaylistScriptService) SetClipSyncService(clipSyncService *ClipSyncService) {
    s.clipSyncService = clipSyncService
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
    schedule := "manual"
    if req.Schedule != nil {
        schedule = *req.Schedule
    }
    strategy := "standard"
    if req.Strategy != nil {
        strategy = *req.Strategy
    }
    excludeNSFW := true
    if req.ExcludeNSFW != nil {
        excludeNSFW = *req.ExcludeNSFW
    }
    retentionDays := 30
    if req.RetentionDays != nil {
        retentionDays = *req.RetentionDays
    }

    var seedClipID *uuid.UUID
    if req.SeedClipID != nil {
        parsed, err := uuid.Parse(*req.SeedClipID)
        if err != nil {
            return nil, fmt.Errorf("invalid seed_clip_id: %w", err)
        }
        seedClipID = &parsed
    }

    script := &models.PlaylistScript{
        ID:              uuid.New(),
        Name:            req.Name,
        Description:     req.Description,
        Sort:            req.Sort,
        Timeframe:       req.Timeframe,
        ClipLimit:       req.ClipLimit,
        Visibility:      visibility,
        IsActive:        isActive,
        Schedule:        schedule,
        Strategy:        strategy,
        GameID:          req.GameID,
        GameIDs:         req.GameIDs,
        BroadcasterID:   req.BroadcasterID,
        Tag:             req.Tag,
        ExcludeTags:     req.ExcludeTags,
        Language:        req.Language,
        MinVoteScore:    req.MinVoteScore,
        MinViewCount:    req.MinViewCount,
        ExcludeNSFW:     excludeNSFW,
        Top10kStreamers: req.Top10kStreamers != nil && *req.Top10kStreamers,
        SeedClipID:      seedClipID,
        RetentionDays:   retentionDays,
        TitleTemplate:   req.TitleTemplate,
        CreatedBy:       &userID,
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
    if req.Schedule != nil {
        script.Schedule = *req.Schedule
    }
    if req.Strategy != nil {
        script.Strategy = *req.Strategy
    }
    if req.GameID != nil {
        script.GameID = req.GameID
    }
    if req.GameIDs != nil {
        script.GameIDs = req.GameIDs
    }
    if req.BroadcasterID != nil {
        script.BroadcasterID = req.BroadcasterID
    }
    if req.Tag != nil {
        script.Tag = req.Tag
    }
    if req.ExcludeTags != nil {
        script.ExcludeTags = req.ExcludeTags
    }
    if req.Language != nil {
        script.Language = req.Language
    }
    if req.MinVoteScore != nil {
        script.MinVoteScore = req.MinVoteScore
    }
    if req.MinViewCount != nil {
        script.MinViewCount = req.MinViewCount
    }
    if req.ExcludeNSFW != nil {
        script.ExcludeNSFW = *req.ExcludeNSFW
    }
    if req.Top10kStreamers != nil {
        script.Top10kStreamers = *req.Top10kStreamers
    }
    if req.SeedClipID != nil {
        parsed, err := uuid.Parse(*req.SeedClipID)
        if err != nil {
            return nil, fmt.Errorf("invalid seed_clip_id: %w", err)
        }
        script.SeedClipID = &parsed
    }
    if req.RetentionDays != nil {
        script.RetentionDays = *req.RetentionDays
    }
    if req.TitleTemplate != nil {
        script.TitleTemplate = req.TitleTemplate
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

// GeneratePlaylist creates a playlist from a script using either standard filters or a curation strategy.
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

    var clips []models.Clip

    if script.Strategy == "" || script.Strategy == "standard" {
        // Standard strategy: use ClipFilters + ListWithFilters
        filters := buildFiltersFromScript(script)
        clips, _, err = s.clipRepo.ListWithFilters(ctx, filters, script.ClipLimit, 0)
        if err != nil {
            return nil, fmt.Errorf("failed to fetch clips: %w", err)
        }
    } else {
        // Advanced strategy: delegate to curation repository
        clips, err = s.executeStrategy(ctx, script)
        if err != nil {
            return nil, fmt.Errorf("strategy %s failed: %w", script.Strategy, err)
        }
    }

    ownerID := uuid.Nil
    if script.CreatedBy != nil {
        ownerID = *script.CreatedBy
    }
    if ownerID == uuid.Nil {
        return nil, fmt.Errorf("invalid script owner")
    }

    title := buildPlaylistTitle(script)
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

// ListDueForExecution returns scripts that are due for scheduled execution.
func (s *PlaylistScriptService) ListDueForExecution(ctx context.Context) ([]*models.PlaylistScript, error) {
    return s.scriptRepo.ListDueForExecution(ctx)
}

// DeleteStaleGeneratedPlaylists removes generated playlists past their retention period.
func (s *PlaylistScriptService) DeleteStaleGeneratedPlaylists(ctx context.Context) (int64, error) {
    return s.scriptRepo.DeleteStaleGeneratedPlaylists(ctx)
}

// buildFiltersFromScript converts script fields into ClipFilters for the standard strategy.
func buildFiltersFromScript(script *models.PlaylistScript) repository.ClipFilters {
    filters := repository.ClipFilters{
        Sort:            script.Sort,
        Timeframe:       script.Timeframe,
        GameID:          script.GameID,
        BroadcasterID:   script.BroadcasterID,
        Tag:             script.Tag,
        ExcludeTags:     script.ExcludeTags,
        Language:        script.Language,
        Top10kStreamers: script.Top10kStreamers,
    }
    return filters
}

// buildPlaylistTitle generates a title from the script's template or falls back to a default.
// Supported placeholders: {name}, {date}, {day}, {week_start}, {month}
func buildPlaylistTitle(script *models.PlaylistScript) string {
    now := time.Now()

    if script.TitleTemplate != nil && *script.TitleTemplate != "" {
        title := *script.TitleTemplate
        title = strings.ReplaceAll(title, "{name}", script.Name)
        title = strings.ReplaceAll(title, "{date}", now.Format("Jan 2, 2006"))
        title = strings.ReplaceAll(title, "{day}", now.Format("Monday"))
        // week_start = most recent Monday
        weekStart := now.AddDate(0, 0, -int(now.Weekday()-time.Monday+7)%7)
        title = strings.ReplaceAll(title, "{week_start}", weekStart.Format("Jan 2"))
        title = strings.ReplaceAll(title, "{month}", now.Format("January 2006"))
        return title
    }

    return fmt.Sprintf("%s \u2022 %s", script.Name, now.Format("Jan 2, 2006"))
}
