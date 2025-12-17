package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// PlaylistService handles business logic for playlists
type PlaylistService struct {
	playlistRepo *repository.PlaylistRepository
	clipRepo     *repository.ClipRepository
}

// NewPlaylistService creates a new PlaylistService
func NewPlaylistService(playlistRepo *repository.PlaylistRepository, clipRepo *repository.ClipRepository) *PlaylistService {
	return &PlaylistService{
		playlistRepo: playlistRepo,
		clipRepo:     clipRepo,
	}
}

// CreatePlaylist creates a new playlist
func (s *PlaylistService) CreatePlaylist(ctx context.Context, userID uuid.UUID, req *models.CreatePlaylistRequest) (*models.Playlist, error) {
	// Set default visibility if not provided
	visibility := models.PlaylistVisibilityPrivate
	if req.Visibility != nil {
		visibility = *req.Visibility
	}

	playlist := &models.Playlist{
		ID:          uuid.New(),
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		CoverURL:    req.CoverURL,
		Visibility:  visibility,
	}

	err := s.playlistRepo.Create(ctx, playlist)
	if err != nil {
		return nil, fmt.Errorf("failed to create playlist: %w", err)
	}

	return playlist, nil
}

// GetPlaylist retrieves a playlist by ID with clips and additional data
func (s *PlaylistService) GetPlaylist(ctx context.Context, playlistID uuid.UUID, userID *uuid.UUID, page, limit int) (*models.PlaylistWithClips, error) {
	// Get the playlist
	playlist, err := s.playlistRepo.GetByID(ctx, playlistID)
	if err != nil {
		return nil, fmt.Errorf("failed to get playlist: %w", err)
	}
	if playlist == nil {
		return nil, fmt.Errorf("playlist not found")
	}

	// Check visibility permissions
	if playlist.Visibility == models.PlaylistVisibilityPrivate {
		if userID == nil || *userID != playlist.UserID {
			return nil, fmt.Errorf("unauthorized: playlist is private")
		}
	}

	// Get clip count
	clipCount, err := s.playlistRepo.GetClipCount(ctx, playlistID)
	if err != nil {
		return nil, fmt.Errorf("failed to get clip count: %w", err)
	}

	// Get clips with pagination
	offset := (page - 1) * limit
	clips, _, err := s.playlistRepo.GetClips(ctx, playlistID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get clips: %w", err)
	}

	// Get creator information
	creator, err := s.playlistRepo.GetCreator(ctx, playlist.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get creator: %w", err)
	}

	// Check if user has liked the playlist
	isLiked := false
	if userID != nil {
		isLiked, err = s.playlistRepo.IsLiked(ctx, *userID, playlistID)
		if err != nil {
			return nil, fmt.Errorf("failed to check if liked: %w", err)
		}
	}

	result := &models.PlaylistWithClips{
		Playlist:  *playlist,
		ClipCount: clipCount,
		Clips:     clips,
		IsLiked:   isLiked,
		Creator:   creator,
	}

	return result, nil
}

// UpdatePlaylist updates a playlist
func (s *PlaylistService) UpdatePlaylist(ctx context.Context, playlistID, userID uuid.UUID, req *models.UpdatePlaylistRequest) (*models.Playlist, error) {
	// Get the playlist to verify ownership
	playlist, err := s.playlistRepo.GetByID(ctx, playlistID)
	if err != nil {
		return nil, fmt.Errorf("failed to get playlist: %w", err)
	}
	if playlist == nil {
		return nil, fmt.Errorf("playlist not found")
	}

	// Verify ownership
	if playlist.UserID != userID {
		return nil, fmt.Errorf("unauthorized: user does not own this playlist")
	}

	// Update fields if provided
	if req.Title != nil {
		playlist.Title = *req.Title
	}
	if req.Description != nil {
		playlist.Description = req.Description
	}
	if req.CoverURL != nil {
		playlist.CoverURL = req.CoverURL
	}
	if req.Visibility != nil {
		playlist.Visibility = *req.Visibility
	}

	err = s.playlistRepo.Update(ctx, playlist)
	if err != nil {
		return nil, fmt.Errorf("failed to update playlist: %w", err)
	}

	return playlist, nil
}

// DeletePlaylist soft deletes a playlist
func (s *PlaylistService) DeletePlaylist(ctx context.Context, playlistID, userID uuid.UUID) error {
	// Get the playlist to verify ownership
	playlist, err := s.playlistRepo.GetByID(ctx, playlistID)
	if err != nil {
		return fmt.Errorf("failed to get playlist: %w", err)
	}
	if playlist == nil {
		return fmt.Errorf("playlist not found")
	}

	// Verify ownership
	if playlist.UserID != userID {
		return fmt.Errorf("unauthorized: user does not own this playlist")
	}

	err = s.playlistRepo.SoftDelete(ctx, playlistID)
	if err != nil {
		return fmt.Errorf("failed to delete playlist: %w", err)
	}

	return nil
}

// ListUserPlaylists retrieves playlists owned by a user
func (s *PlaylistService) ListUserPlaylists(ctx context.Context, userID uuid.UUID, page, limit int) ([]*models.PlaylistListItem, int, error) {
	offset := (page - 1) * limit
	playlists, total, err := s.playlistRepo.ListByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list playlists: %w", err)
	}

	return playlists, total, nil
}

// ListPublicPlaylists retrieves public playlists for discovery
func (s *PlaylistService) ListPublicPlaylists(ctx context.Context, page, limit int) ([]*models.PlaylistListItem, int, error) {
	offset := (page - 1) * limit
	playlists, total, err := s.playlistRepo.ListPublic(ctx, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list public playlists: %w", err)
	}

	return playlists, total, nil
}

// AddClipsToPlaylist adds multiple clips to a playlist
func (s *PlaylistService) AddClipsToPlaylist(ctx context.Context, playlistID, userID uuid.UUID, clipIDs []uuid.UUID) error {
	// Get the playlist to verify ownership
	playlist, err := s.playlistRepo.GetByID(ctx, playlistID)
	if err != nil {
		return fmt.Errorf("failed to get playlist: %w", err)
	}
	if playlist == nil {
		return fmt.Errorf("playlist not found")
	}

	// Verify ownership
	if playlist.UserID != userID {
		return fmt.Errorf("unauthorized: user does not own this playlist")
	}

	// Get current clip count
	currentCount, err := s.playlistRepo.GetClipCount(ctx, playlistID)
	if err != nil {
		return fmt.Errorf("failed to get clip count: %w", err)
	}

	// Add clips one by one, checking for duplicates and existence
	addedCount := 0
	for _, clipID := range clipIDs {
		// Check if clip exists
		clip, err := s.clipRepo.GetByID(ctx, clipID)
		if err != nil {
			return fmt.Errorf("failed to check clip existence: %w", err)
		}
		if clip == nil {
			return fmt.Errorf("clip %s not found", clipID)
		}

		// Check if clip is already in playlist
		exists, err := s.playlistRepo.HasClip(ctx, playlistID, clipID)
		if err != nil {
			return fmt.Errorf("failed to check if clip exists in playlist: %w", err)
		}
		if exists {
			// Skip duplicate clips
			continue
		}

		// Check if adding this clip would exceed the limit
		if currentCount+addedCount >= 1000 {
			return fmt.Errorf("playlist cannot exceed 1000 clips")
		}

		// Add clip with order index based on actual position
		orderIndex := currentCount + addedCount
		err = s.playlistRepo.AddClip(ctx, playlistID, clipID, orderIndex)
		if err != nil {
			return fmt.Errorf("failed to add clip to playlist: %w", err)
		}
		addedCount++
	}

	return nil
}

// RemoveClipFromPlaylist removes a clip from a playlist
func (s *PlaylistService) RemoveClipFromPlaylist(ctx context.Context, playlistID, clipID, userID uuid.UUID) error {
	// Get the playlist to verify ownership
	playlist, err := s.playlistRepo.GetByID(ctx, playlistID)
	if err != nil {
		return fmt.Errorf("failed to get playlist: %w", err)
	}
	if playlist == nil {
		return fmt.Errorf("playlist not found")
	}

	// Verify ownership
	if playlist.UserID != userID {
		return fmt.Errorf("unauthorized: user does not own this playlist")
	}

	err = s.playlistRepo.RemoveClip(ctx, playlistID, clipID)
	if err != nil {
		return fmt.Errorf("failed to remove clip from playlist: %w", err)
	}

	return nil
}

// ReorderPlaylistClips updates the order of clips in a playlist
func (s *PlaylistService) ReorderPlaylistClips(ctx context.Context, playlistID, userID uuid.UUID, clipIDs []uuid.UUID) error {
	// Get the playlist to verify ownership
	playlist, err := s.playlistRepo.GetByID(ctx, playlistID)
	if err != nil {
		return fmt.Errorf("failed to get playlist: %w", err)
	}
	if playlist == nil {
		return fmt.Errorf("playlist not found")
	}

	// Verify ownership
	if playlist.UserID != userID {
		return fmt.Errorf("unauthorized: user does not own this playlist")
	}

	// Verify all clips exist in the playlist
	for _, clipID := range clipIDs {
		exists, err := s.playlistRepo.HasClip(ctx, playlistID, clipID)
		if err != nil {
			return fmt.Errorf("failed to check if clip exists in playlist: %w", err)
		}
		if !exists {
			return fmt.Errorf("clip %s not found in playlist", clipID)
		}
	}

	err = s.playlistRepo.ReorderClips(ctx, playlistID, clipIDs)
	if err != nil {
		return fmt.Errorf("failed to reorder clips: %w", err)
	}

	return nil
}

// LikePlaylist adds a like to a playlist
func (s *PlaylistService) LikePlaylist(ctx context.Context, playlistID, userID uuid.UUID) error {
	// Verify playlist exists and is not private
	playlist, err := s.playlistRepo.GetByID(ctx, playlistID)
	if err != nil {
		return fmt.Errorf("failed to get playlist: %w", err)
	}
	if playlist == nil {
		return fmt.Errorf("playlist not found")
	}

	// Can't like private playlists unless you own them
	if playlist.Visibility == models.PlaylistVisibilityPrivate && playlist.UserID != userID {
		return fmt.Errorf("cannot like private playlists")
	}

	err = s.playlistRepo.LikePlaylist(ctx, userID, playlistID)
	if err != nil {
		return fmt.Errorf("failed to like playlist: %w", err)
	}

	return nil
}

// UnlikePlaylist removes a like from a playlist
func (s *PlaylistService) UnlikePlaylist(ctx context.Context, playlistID, userID uuid.UUID) error {
	err := s.playlistRepo.UnlikePlaylist(ctx, userID, playlistID)
	if err != nil {
		return fmt.Errorf("failed to unlike playlist: %w", err)
	}

	return nil
}
