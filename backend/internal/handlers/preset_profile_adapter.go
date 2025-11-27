package handlers

import (
	"context"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/repository"
)

// PresetProfileRepositoryAdapter adapts repository.PresetProfileRepository to PresetProfileRepoIface
type PresetProfileRepositoryAdapter struct {
	repo *repository.PresetProfileRepository
}

func NewPresetProfileRepositoryAdapter(repo *repository.PresetProfileRepository) *PresetProfileRepositoryAdapter {
	return &PresetProfileRepositoryAdapter{repo: repo}
}

func (a *PresetProfileRepositoryAdapter) List(ctx context.Context) ([]PresetProfileRepo, error) {
	profiles, err := a.repo.List(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]PresetProfileRepo, len(profiles))
	for i, p := range profiles {
		result[i] = PresetProfileRepo{
			ID:              p.ID,
			Name:            p.Name,
			Description:     p.Description,
			VoteWeight:      p.VoteWeight,
			CommentWeight:   p.CommentWeight,
			FavoriteWeight:  p.FavoriteWeight,
			ViewWeight:      p.ViewWeight,
			IsSystem:        p.IsSystem,
			CreatedBy:       p.CreatedBy,
			CreatedAt:       p.CreatedAt,
			UpdatedBy:       p.UpdatedBy,
			UpdatedAt:       p.UpdatedAt,
		}
	}
	return result, nil
}

func (a *PresetProfileRepositoryAdapter) Get(ctx context.Context, id uuid.UUID) (*PresetProfileRepo, error) {
	p, err := a.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	return &PresetProfileRepo{
		ID:              p.ID,
		Name:            p.Name,
		Description:     p.Description,
		VoteWeight:      p.VoteWeight,
		CommentWeight:   p.CommentWeight,
		FavoriteWeight:  p.FavoriteWeight,
		ViewWeight:      p.ViewWeight,
		IsSystem:        p.IsSystem,
		CreatedBy:       p.CreatedBy,
		CreatedAt:       p.CreatedAt,
		UpdatedBy:       p.UpdatedBy,
		UpdatedAt:       p.UpdatedAt,
	}, nil
}

func (a *PresetProfileRepositoryAdapter) Create(ctx context.Context, name string, description *string,
	voteWeight, commentWeight, favoriteWeight, viewWeight float64, createdBy uuid.UUID) (*PresetProfileRepo, error) {

	p, err := a.repo.Create(ctx, name, description, voteWeight, commentWeight, favoriteWeight, viewWeight, createdBy)
	if err != nil {
		return nil, err
	}

	return &PresetProfileRepo{
		ID:              p.ID,
		Name:            p.Name,
		Description:     p.Description,
		VoteWeight:      p.VoteWeight,
		CommentWeight:   p.CommentWeight,
		FavoriteWeight:  p.FavoriteWeight,
		ViewWeight:      p.ViewWeight,
		IsSystem:        p.IsSystem,
		CreatedBy:       p.CreatedBy,
		CreatedAt:       p.CreatedAt,
		UpdatedBy:       p.UpdatedBy,
		UpdatedAt:       p.UpdatedAt,
	}, nil
}

func (a *PresetProfileRepositoryAdapter) Update(ctx context.Context, id uuid.UUID, name string,
	description *string, voteWeight, commentWeight, favoriteWeight, viewWeight float64,
	updatedBy uuid.UUID) (*PresetProfileRepo, error) {

	p, err := a.repo.Update(ctx, id, name, description, voteWeight, commentWeight, favoriteWeight, viewWeight, updatedBy)
	if err != nil {
		return nil, err
	}

	return &PresetProfileRepo{
		ID:              p.ID,
		Name:            p.Name,
		Description:     p.Description,
		VoteWeight:      p.VoteWeight,
		CommentWeight:   p.CommentWeight,
		FavoriteWeight:  p.FavoriteWeight,
		ViewWeight:      p.ViewWeight,
		IsSystem:        p.IsSystem,
		CreatedBy:       p.CreatedBy,
		CreatedAt:       p.CreatedAt,
		UpdatedBy:       p.UpdatedBy,
		UpdatedAt:       p.UpdatedAt,
	}, nil
}

func (a *PresetProfileRepositoryAdapter) Delete(ctx context.Context, id uuid.UUID) error {
	return a.repo.Delete(ctx, id)
}
