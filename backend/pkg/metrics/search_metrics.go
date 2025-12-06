package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	// Search query metrics
	SearchQueriesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "search_queries_total",
			Help: "Total number of search queries by type",
		},
		[]string{"search_type", "status"},
	)

	SearchQueryDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "search_query_duration_ms",
			Help:    "Duration of search queries in milliseconds",
			Buckets: []float64{1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000},
		},
		[]string{"search_type"},
	)

	SearchResultsCount = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "search_results_count",
			Help:    "Number of search results returned",
			Buckets: []float64{0, 1, 5, 10, 20, 50, 100},
		},
		[]string{"search_type"},
	)

	SearchZeroResultsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "search_zero_results_total",
			Help: "Total number of searches returning zero results",
		},
		[]string{"search_type"},
	)

	// Embedding metrics
	EmbeddingCacheHits = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "embedding_cache_hits_total",
			Help: "Total number of embedding cache hits",
		},
	)

	EmbeddingCacheMisses = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "embedding_cache_misses_total",
			Help: "Total number of embedding cache misses",
		},
	)

	EmbeddingGenerationTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "embedding_generation_total",
			Help: "Total number of embeddings generated",
		},
		[]string{"type"}, // "clip" or "query"
	)

	EmbeddingGenerationErrors = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "embedding_generation_errors_total",
			Help: "Total number of embedding generation errors",
		},
		[]string{"type"}, // "clip" or "query"
	)

	EmbeddingGenerationDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "embedding_generation_duration_ms",
			Help:    "Duration of embedding generation in milliseconds",
			Buckets: []float64{10, 25, 50, 100, 250, 500, 1000, 2500, 5000},
		},
		[]string{"type"}, // "clip" or "query"
	)

	// Indexing metrics
	ClipsWithEmbeddings = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "clips_with_embeddings",
			Help: "Number of clips with embeddings generated",
		},
	)

	ClipsWithoutEmbeddings = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "clips_without_embeddings",
			Help: "Number of clips without embeddings",
		},
	)

	IndexingJobsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "indexing_jobs_total",
			Help: "Total number of indexing jobs",
		},
		[]string{"status"}, // "success", "partial", "failed"
	)

	IndexingJobDuration = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "indexing_job_duration_seconds",
			Help:    "Duration of indexing jobs in seconds",
			Buckets: []float64{1, 5, 10, 30, 60, 120, 300, 600},
		},
	)

	// Vector search metrics
	VectorSearchDuration = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "vector_search_duration_ms",
			Help:    "Duration of vector similarity search (re-ranking) in milliseconds",
			Buckets: []float64{1, 5, 10, 25, 50, 100, 250, 500},
		},
	)

	BM25SearchDuration = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "bm25_search_duration_ms",
			Help:    "Duration of BM25 candidate search in milliseconds",
			Buckets: []float64{1, 5, 10, 25, 50, 100, 250, 500},
		},
	)

	// Search fallback metrics
	SearchFallbackTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "search_fallback_total",
			Help: "Total number of search fallbacks",
		},
		[]string{"reason"}, // "embedding_error", "opensearch_error", "no_results"
	)
)

func init() {
	// Register search and embedding metrics
	prometheus.MustRegister(SearchQueriesTotal)
	prometheus.MustRegister(SearchQueryDuration)
	prometheus.MustRegister(SearchResultsCount)
	prometheus.MustRegister(SearchZeroResultsTotal)

	prometheus.MustRegister(EmbeddingCacheHits)
	prometheus.MustRegister(EmbeddingCacheMisses)
	prometheus.MustRegister(EmbeddingGenerationTotal)
	prometheus.MustRegister(EmbeddingGenerationErrors)
	prometheus.MustRegister(EmbeddingGenerationDuration)

	prometheus.MustRegister(ClipsWithEmbeddings)
	prometheus.MustRegister(ClipsWithoutEmbeddings)
	prometheus.MustRegister(IndexingJobsTotal)
	prometheus.MustRegister(IndexingJobDuration)

	prometheus.MustRegister(VectorSearchDuration)
	prometheus.MustRegister(BM25SearchDuration)
	prometheus.MustRegister(SearchFallbackTotal)
}
