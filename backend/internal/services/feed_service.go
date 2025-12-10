package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

type FeedService struct {
	feedRepo *repository.FeedRepository
	clipRepo *repository.ClipRepository
}

func NewFeedService(feedRepo *repository.FeedRepository, clipRepo *repository.ClipRepository) *FeedService {
	return &FeedService{
		feedRepo: feedRepo,
		clipRepo: clipRepo,
	}
}

// CreateFeed creates a new feed for a user
func (s *FeedService) CreateFeed(ctx context.Context, userID uuid.UUID, req *models.CreateFeedRequest) (*models.Feed, error) {
	feed := &models.Feed{
		ID:            uuid.New(),
		UserID:        userID,
		Name:          req.Name,
		Description:   req.Description,
		Icon:          req.Icon,
		IsPublic:      true,
		FollowerCount: 0,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if req.IsPublic != nil {
		feed.IsPublic = *req.IsPublic
	}

	err := s.feedRepo.CreateFeed(ctx, feed)
	if err != nil {
		return nil, fmt.Errorf("failed to create feed: %w", err)
	}

	return feed, nil
}

// GetFeed retrieves a feed by ID
func (s *FeedService) GetFeed(ctx context.Context, feedID uuid.UUID, requestingUserID *uuid.UUID) (*models.Feed, error) {
	feed, err := s.feedRepo.GetFeedByID(ctx, feedID)
	if err != nil {
		return nil, err
	}

	// Check if the requesting user has access to this feed
	if !feed.IsPublic {
		if requestingUserID == nil || *requestingUserID != feed.UserID {
			return nil, fmt.Errorf("unauthorized access to private feed")
		}
	}

	return feed, nil
}

// GetUserFeeds retrieves all feeds for a user
func (s *FeedService) GetUserFeeds(ctx context.Context, userID uuid.UUID, requestingUserID *uuid.UUID) ([]*models.Feed, error) {
	includePrivate := requestingUserID != nil && *requestingUserID == userID
	return s.feedRepo.GetFeedsByUserID(ctx, userID, includePrivate)
}

// UpdateFeed updates a feed
func (s *FeedService) UpdateFeed(ctx context.Context, feedID, userID uuid.UUID, req *models.UpdateFeedRequest) (*models.Feed, error) {
	feed, err := s.feedRepo.GetFeedByID(ctx, feedID)
	if err != nil {
		return nil, err
	}

	if feed.UserID != userID {
		return nil, fmt.Errorf("unauthorized to update this feed")
	}

	if req.Name != nil {
		feed.Name = *req.Name
	}
	if req.Description != nil {
		feed.Description = req.Description
	}
	if req.Icon != nil {
		feed.Icon = req.Icon
	}
	if req.IsPublic != nil {
		feed.IsPublic = *req.IsPublic
	}

	err = s.feedRepo.UpdateFeed(ctx, feed)
	if err != nil {
		return nil, fmt.Errorf("failed to update feed: %w", err)
	}

	return feed, nil
}

// DeleteFeed deletes a feed
func (s *FeedService) DeleteFeed(ctx context.Context, feedID, userID uuid.UUID) error {
	feed, err := s.feedRepo.GetFeedByID(ctx, feedID)
	if err != nil {
		return err
	}

	if feed.UserID != userID {
		return fmt.Errorf("unauthorized to delete this feed")
	}

	return s.feedRepo.DeleteFeed(ctx, feedID)
}

// AddClipToFeed adds a clip to a feed
func (s *FeedService) AddClipToFeed(ctx context.Context, feedID, userID, clipID uuid.UUID) (*models.FeedItem, error) {
	feed, err := s.feedRepo.GetFeedByID(ctx, feedID)
	if err != nil {
		return nil, err
	}

	if feed.UserID != userID {
		return nil, fmt.Errorf("unauthorized to add clips to this feed")
	}

	// Verify clip exists
	_, err = s.clipRepo.GetByID(ctx, clipID)
	if err != nil {
		return nil, fmt.Errorf("clip not found")
	}

	feedItem := &models.FeedItem{
		ID:      uuid.New(),
		FeedID:  feedID,
		ClipID:  clipID,
		AddedAt: time.Now(),
	}

	err = s.feedRepo.AddClipToFeed(ctx, feedItem)
	if err != nil {
		return nil, fmt.Errorf("failed to add clip to feed: %w", err)
	}

	return feedItem, nil
}

// RemoveClipFromFeed removes a clip from a feed
func (s *FeedService) RemoveClipFromFeed(ctx context.Context, feedID, userID, clipID uuid.UUID) error {
	feed, err := s.feedRepo.GetFeedByID(ctx, feedID)
	if err != nil {
		return err
	}

	if feed.UserID != userID {
		return fmt.Errorf("unauthorized to remove clips from this feed")
	}

	return s.feedRepo.RemoveClipFromFeed(ctx, feedID, clipID)
}

// GetFeedClips retrieves all clips in a feed
func (s *FeedService) GetFeedClips(ctx context.Context, feedID uuid.UUID, requestingUserID *uuid.UUID) ([]*models.FeedItemWithClip, error) {
	feed, err := s.feedRepo.GetFeedByID(ctx, feedID)
	if err != nil {
		return nil, err
	}

	// Check if the requesting user has access to this feed
	if !feed.IsPublic {
		if requestingUserID == nil || *requestingUserID != feed.UserID {
			return nil, fmt.Errorf("unauthorized access to private feed")
		}
	}

	return s.feedRepo.GetFeedClips(ctx, feedID)
}

// ReorderFeedClips reorders clips in a feed
func (s *FeedService) ReorderFeedClips(ctx context.Context, feedID, userID uuid.UUID, clipIDs []uuid.UUID) error {
	feed, err := s.feedRepo.GetFeedByID(ctx, feedID)
	if err != nil {
		return err
	}

	if feed.UserID != userID {
		return fmt.Errorf("unauthorized to reorder clips in this feed")
	}

	return s.feedRepo.ReorderFeedClips(ctx, feedID, clipIDs)
}

// FollowFeed adds a follow relationship
func (s *FeedService) FollowFeed(ctx context.Context, userID, feedID uuid.UUID) error {
	feed, err := s.feedRepo.GetFeedByID(ctx, feedID)
	if err != nil {
		return err
	}

	if !feed.IsPublic {
		return fmt.Errorf("cannot follow a private feed")
	}

	feedFollow := &models.FeedFollow{
		ID:         uuid.New(),
		UserID:     userID,
		FeedID:     feedID,
		FollowedAt: time.Now(),
	}

	return s.feedRepo.FollowFeed(ctx, feedFollow)
}

// UnfollowFeed removes a follow relationship
func (s *FeedService) UnfollowFeed(ctx context.Context, userID, feedID uuid.UUID) error {
	return s.feedRepo.UnfollowFeed(ctx, userID, feedID)
}

// IsFollowingFeed checks if a user is following a feed
func (s *FeedService) IsFollowingFeed(ctx context.Context, userID, feedID uuid.UUID) (bool, error) {
	return s.feedRepo.IsFollowingFeed(ctx, userID, feedID)
}

// GetFollowedFeeds retrieves all feeds a user is following
func (s *FeedService) GetFollowedFeeds(ctx context.Context, userID uuid.UUID) ([]*models.Feed, error) {
	return s.feedRepo.GetFollowedFeeds(ctx, userID)
}

// DiscoverPublicFeeds retrieves public feeds for discovery
func (s *FeedService) DiscoverPublicFeeds(ctx context.Context, limit, offset int) ([]*models.FeedWithOwner, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.feedRepo.DiscoverPublicFeeds(ctx, limit, offset)
}

// SearchFeeds searches for public feeds
func (s *FeedService) SearchFeeds(ctx context.Context, query string, limit, offset int) ([]*models.FeedWithOwner, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.feedRepo.SearchFeeds(ctx, query, limit, offset)
}
