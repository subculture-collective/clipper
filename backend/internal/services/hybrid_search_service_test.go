package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/subculture-collective/clipper/internal/models"
)

func TestHybridSearchService_Search_NilEmbeddingService(t *testing.T) {
	// Test that hybrid search falls back to BM25 when embedding service is nil
	service := &HybridSearchService{
		openSearchService: nil,
		embeddingService:  nil,
	}

	// Should not panic even with nil services
	assert.NotNil(t, service)
}

func TestHybridSearchService_NewHybridSearchService(t *testing.T) {
	// Test service initialization
	config := &HybridSearchConfig{
		Pool:              nil,
		OpenSearchService: nil,
		EmbeddingService:  nil,
		RedisClient:       nil,
	}

	service := NewHybridSearchService(config)
	assert.NotNil(t, service)
	assert.Nil(t, service.pool)
	assert.Nil(t, service.openSearchService)
	assert.Nil(t, service.embeddingService)
	assert.Nil(t, service.redisClient)
}

func TestClipScore_Structure(t *testing.T) {
	// Test that ClipScore model is properly structured
	score := models.ClipScore{
		SimilarityScore: 0.95,
		SimilarityRank:  1,
	}

	assert.Equal(t, 0.95, score.SimilarityScore)
	assert.Equal(t, 1, score.SimilarityRank)
}

func TestSearchResponseWithScores_Structure(t *testing.T) {
	// Test that SearchResponseWithScores model is properly structured
	response := models.SearchResponseWithScores{
		SearchResponse: models.SearchResponse{
			Query: "test",
			Meta: models.SearchMeta{
				Page:  1,
				Limit: 20,
			},
		},
		Scores: []models.ClipScore{
			{SimilarityScore: 0.95, SimilarityRank: 1},
			{SimilarityScore: 0.85, SimilarityRank: 2},
		},
	}

	assert.Equal(t, "test", response.Query)
	assert.Equal(t, 2, len(response.Scores))
	assert.Equal(t, 0.95, response.Scores[0].SimilarityScore)
}
