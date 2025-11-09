package services

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pgvector/pgvector-go"
	"github.com/redis/go-redis/v9"
	"github.com/subculture-collective/clipper/internal/models"
)

// HybridSearchService orchestrates BM25 + vector similarity search
type HybridSearchService struct {
	pool              *pgxpool.Pool
	openSearchService *OpenSearchService
	embeddingService  *EmbeddingService
	redisClient       *redis.Client
}

// HybridSearchConfig holds configuration for hybrid search
type HybridSearchConfig struct {
	Pool              *pgxpool.Pool
	OpenSearchService *OpenSearchService
	EmbeddingService  *EmbeddingService
	RedisClient       *redis.Client
}

// NewHybridSearchService creates a new hybrid search service
func NewHybridSearchService(config *HybridSearchConfig) *HybridSearchService {
	return &HybridSearchService{
		pool:              config.Pool,
		openSearchService: config.OpenSearchService,
		embeddingService:  config.EmbeddingService,
		redisClient:       config.RedisClient,
	}
}

// Search performs hybrid search combining BM25 and vector similarity
func (s *HybridSearchService) Search(ctx context.Context, req *models.SearchRequest) (*models.SearchResponse, error) {
	// If semantic search is disabled or embedding service not available, fall back to BM25 only
	if s.embeddingService == nil || req.Query == "" {
		return s.openSearchService.Search(ctx, req)
	}

	// Step 1: BM25 candidate selection via OpenSearch
	// Get more candidates than requested to allow for re-ranking
	candidateLimit := req.Limit * 5
	if candidateLimit > 100 {
		candidateLimit = 100
	}

	candidateReq := *req
	candidateReq.Limit = candidateLimit
	candidateReq.Page = 1 // Always get from first page for re-ranking

	bm25Results, err := s.openSearchService.Search(ctx, &candidateReq)
	if err != nil {
		return nil, fmt.Errorf("BM25 search failed: %w", err)
	}

	// If no clips found, return empty results
	if len(bm25Results.Results.Clips) == 0 {
		return bm25Results, nil
	}

	// Step 2: Generate query embedding
	queryEmbedding, err := s.embeddingService.GenerateEmbedding(ctx, req.Query)
	if err != nil {
		log.Printf("Warning: failed to generate query embedding, falling back to BM25: %v", err)
		// Fall back to BM25 results
		return s.openSearchService.Search(ctx, req)
	}

	// Step 3: Extract candidate IDs
	candidateIDs := make([]string, len(bm25Results.Results.Clips))
	for i, clip := range bm25Results.Results.Clips {
		candidateIDs[i] = clip.ID.String()
	}

	// Step 4: Re-rank using vector similarity
	rerankedClips, err := s.rerankByVectorSimilarity(ctx, candidateIDs, queryEmbedding, req.Limit, (req.Page-1)*req.Limit)
	if err != nil {
		log.Printf("Warning: vector re-ranking failed, falling back to BM25: %v", err)
		// Fall back to BM25 results
		return s.openSearchService.Search(ctx, req)
	}

	// Step 5: Build response
	response := &models.SearchResponse{
		Query: req.Query,
		Results: models.SearchResultsByType{
			Clips: rerankedClips,
		},
		Counts: models.SearchCounts{
			Clips: bm25Results.Counts.Clips, // Use total count from BM25
		},
		Facets: bm25Results.Facets,
		Meta: models.SearchMeta{
			Page:       req.Page,
			Limit:      req.Limit,
			TotalItems: bm25Results.Counts.Clips,
		},
	}

	// Calculate total pages
	if req.Limit > 0 {
		response.Meta.TotalPages = (response.Meta.TotalItems + req.Limit - 1) / req.Limit
	}

	return response, nil
}

// rerankByVectorSimilarity re-ranks clips using pgvector similarity
func (s *HybridSearchService) rerankByVectorSimilarity(ctx context.Context, candidateIDs []string, queryEmbedding []float32, limit, offset int) ([]models.Clip, error) {
	if len(candidateIDs) == 0 {
		return []models.Clip{}, nil
	}

	// Convert to pgvector format
	queryVector := pgvector.NewVector(queryEmbedding)

	// Query with vector similarity re-ranking
	// Using cosine distance operator <=> for similarity
	query := `
		SELECT 
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at, vote_score, comment_count,
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason,
			embedding <=> $1 AS similarity_distance
		FROM clips
		WHERE id = ANY($2)
			AND embedding IS NOT NULL
			AND is_removed = false
		ORDER BY embedding <=> $1
		LIMIT $3 OFFSET $4
	`

	rows, err := s.pool.Query(ctx, query, queryVector, candidateIDs, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query vector similarity: %w", err)
	}
	defer rows.Close()

	clips := []models.Clip{}
	for rows.Next() {
		var clip models.Clip
		var similarityDistance float64

		err := rows.Scan(
			&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
			&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
			&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
			&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
			&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
			&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason,
			&similarityDistance,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan clip: %w", err)
		}

		clips = append(clips, clip)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating clips: %w", err)
	}

	return clips, nil
}

// SearchWithScores performs hybrid search and includes similarity scores in response
func (s *HybridSearchService) SearchWithScores(ctx context.Context, req *models.SearchRequest) (*models.SearchResponseWithScores, error) {
	// If semantic search is disabled or embedding service not available, fall back to BM25 only
	if s.embeddingService == nil || req.Query == "" {
		baseResponse, err := s.openSearchService.Search(ctx, req)
		if err != nil {
			return nil, err
		}
		
		// Convert to response with scores (no semantic scores available)
		return &models.SearchResponseWithScores{
			SearchResponse: *baseResponse,
			Scores:         []models.ClipScore{},
		}, nil
	}

	// Step 1: BM25 candidate selection via OpenSearch
	candidateLimit := req.Limit * 5
	if candidateLimit > 100 {
		candidateLimit = 100
	}

	candidateReq := *req
	candidateReq.Limit = candidateLimit
	candidateReq.Page = 1

	bm25Results, err := s.openSearchService.Search(ctx, &candidateReq)
	if err != nil {
		return nil, fmt.Errorf("BM25 search failed: %w", err)
	}

	if len(bm25Results.Results.Clips) == 0 {
		return &models.SearchResponseWithScores{
			SearchResponse: *bm25Results,
			Scores:         []models.ClipScore{},
		}, nil
	}

	// Step 2: Generate query embedding
	queryEmbedding, err := s.embeddingService.GenerateEmbedding(ctx, req.Query)
	if err != nil {
		log.Printf("Warning: failed to generate query embedding, falling back to BM25: %v", err)
		return &models.SearchResponseWithScores{
			SearchResponse: *bm25Results,
			Scores:         []models.ClipScore{},
		}, nil
	}

	// Step 3: Extract candidate IDs
	candidateIDs := make([]string, len(bm25Results.Results.Clips))
	for i, clip := range bm25Results.Results.Clips {
		candidateIDs[i] = clip.ID.String()
	}

	// Step 4: Re-rank with scores
	rerankedClips, scores, err := s.rerankByVectorSimilarityWithScores(ctx, candidateIDs, queryEmbedding, req.Limit, (req.Page-1)*req.Limit)
	if err != nil {
		log.Printf("Warning: vector re-ranking failed, falling back to BM25: %v", err)
		return &models.SearchResponseWithScores{
			SearchResponse: *bm25Results,
			Scores:         []models.ClipScore{},
		}, nil
	}

	// Step 5: Build response with scores
	response := &models.SearchResponseWithScores{
		SearchResponse: models.SearchResponse{
			Query: req.Query,
			Results: models.SearchResultsByType{
				Clips: rerankedClips,
			},
			Counts: models.SearchCounts{
				Clips: bm25Results.Counts.Clips,
			},
			Facets: bm25Results.Facets,
			Meta: models.SearchMeta{
				Page:       req.Page,
				Limit:      req.Limit,
				TotalItems: bm25Results.Counts.Clips,
			},
		},
		Scores: scores,
	}

	if req.Limit > 0 {
		response.SearchResponse.Meta.TotalPages = (response.SearchResponse.Meta.TotalItems + req.Limit - 1) / req.Limit
	}

	return response, nil
}

// rerankByVectorSimilarityWithScores re-ranks clips and includes similarity scores
func (s *HybridSearchService) rerankByVectorSimilarityWithScores(ctx context.Context, candidateIDs []string, queryEmbedding []float32, limit, offset int) ([]models.Clip, []models.ClipScore, error) {
	if len(candidateIDs) == 0 {
		return []models.Clip{}, []models.ClipScore{}, nil
	}

	queryVector := pgvector.NewVector(queryEmbedding)

	query := `
		SELECT 
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at, vote_score, comment_count,
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason,
			embedding <=> $1 AS similarity_distance
		FROM clips
		WHERE id = ANY($2)
			AND embedding IS NOT NULL
			AND is_removed = false
		ORDER BY embedding <=> $1
		LIMIT $3 OFFSET $4
	`

	rows, err := s.pool.Query(ctx, query, queryVector, candidateIDs, limit, offset)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query vector similarity: %w", err)
	}
	defer rows.Close()

	clips := []models.Clip{}
	scores := []models.ClipScore{}

	for rows.Next() {
		var clip models.Clip
		var similarityDistance float64

		err := rows.Scan(
			&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
			&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
			&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
			&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
			&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
			&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason,
			&similarityDistance,
		)

		if err != nil {
			return nil, nil, fmt.Errorf("failed to scan clip: %w", err)
		}

		clips = append(clips, clip)

		// Convert cosine distance to similarity score (1 - distance)
		// Cosine distance ranges from 0 (identical) to 2 (opposite)
		// Similarity score ranges from 0 to 1 (higher is better)
		similarityScore := 1.0 - (similarityDistance / 2.0)

		scores = append(scores, models.ClipScore{
			ClipID:           clip.ID,
			SimilarityScore:  similarityScore,
			SimilarityRank:   len(scores) + 1,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("error iterating clips: %w", err)
	}

	return clips, scores, nil
}
