package scheduler

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/pkg/database"
)

// EmbeddingServiceInterface defines the interface required by the scheduler
type EmbeddingServiceInterface interface {
	GenerateClipEmbedding(ctx context.Context, clip *models.Clip) ([]float32, error)
	Close()
}

// EmbeddingScheduler manages periodic embedding generation for new clips
type EmbeddingScheduler struct {
	db               *database.DB
	embeddingService EmbeddingServiceInterface
	interval         time.Duration
	stopChan         chan struct{}
	stopOnce         sync.Once
	model            string
}

// NewEmbeddingScheduler creates a new scheduler
func NewEmbeddingScheduler(
	db *database.DB,
	embeddingService EmbeddingServiceInterface,
	intervalMinutes int,
	model string,
) *EmbeddingScheduler {
	return &EmbeddingScheduler{
		db:               db,
		embeddingService: embeddingService,
		interval:         time.Duration(intervalMinutes) * time.Minute,
		stopChan:         make(chan struct{}),
		model:            model,
	}
}

// Start begins the periodic embedding generation process
func (s *EmbeddingScheduler) Start(ctx context.Context) {
	log.Printf("Starting embedding scheduler (interval: %v)", s.interval)

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Run initial embedding generation
	s.runEmbedding(ctx)

	for {
		select {
		case <-ticker.C:
			s.runEmbedding(ctx)
		case <-s.stopChan:
			log.Println("Embedding scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("Embedding scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop stops the scheduler in a thread-safe manner
func (s *EmbeddingScheduler) Stop() {
	s.stopOnce.Do(func() {
		close(s.stopChan)
	})
}

// runEmbedding executes embedding generation for clips without embeddings
func (s *EmbeddingScheduler) runEmbedding(ctx context.Context) {
	log.Println("Starting scheduled embedding generation...")

	// Skip if database is not available (e.g., in tests)
	if s.db == nil {
		log.Println("Database not available, skipping embedding generation")
		return
	}

	startTime := time.Now()

	// Fetch clips without embeddings (created in the last 7 days to avoid old clips)
	query := `
		SELECT id, twitch_clip_id, title, creator_name, broadcaster_name,
		       game_id, game_name
		FROM clips
		WHERE is_removed = false
		  AND embedding IS NULL
		  AND created_at > NOW() - INTERVAL '7 days'
		ORDER BY created_at DESC
		LIMIT 100
	`

	rows, err := s.db.Pool.Query(ctx, query)
	if err != nil {
		log.Printf("Failed to fetch clips for embedding: %v", err)
		return
	}
	defer rows.Close()

	var clips []models.Clip
	for rows.Next() {
		var clip models.Clip
		err := rows.Scan(
			&clip.ID,
			&clip.TwitchClipID,
			&clip.Title,
			&clip.CreatorName,
			&clip.BroadcasterName,
			&clip.GameID,
			&clip.GameName,
		)
		if err != nil {
			log.Printf("Failed to scan clip: %v", err)
			continue
		}
		clips = append(clips, clip)
	}

	if len(clips) == 0 {
		log.Println("No clips need embeddings - all up to date")
		return
	}

	log.Printf("Generating embeddings for %d clips", len(clips))

	processed := 0
	failed := 0

	for i := range clips {
		clip := &clips[i]

		// Generate embedding
		embedding, err := s.embeddingService.GenerateClipEmbedding(ctx, clip)
		if err != nil {
			log.Printf("Failed to generate embedding for clip %s: %v", clip.ID, err)
			failed++
			continue
		}

		// Save to database
		now := time.Now()
		updateQuery := `
			UPDATE clips
			SET embedding = $1,
			    embedding_generated_at = $2,
			    embedding_model = $3
			WHERE id = $4
		`

		_, err = s.db.Pool.Exec(ctx, updateQuery, embedding, now, s.model, clip.ID)
		if err != nil {
			log.Printf("Failed to save embedding for clip %s: %v", clip.ID, err)
			failed++
			continue
		}

		processed++
	}

	duration := time.Since(startTime)
	log.Printf("Scheduled embedding generation completed: processed=%d failed=%d duration=%v",
		processed, failed, duration)
}
