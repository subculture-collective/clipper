package services

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// Cold start metrics
	coldStartRecommendationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "recommendations_cold_start_total",
			Help: "Total number of cold start recommendations served",
		},
		[]string{"strategy"}, // "onboarding", "trending", "popularity"
	)

	coldStartOnboardingCompletedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "recommendations_onboarding_completed_total",
			Help: "Total number of users who completed onboarding",
		},
	)

	coldStartRecommendationQuality = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "recommendations_cold_start_quality_score",
			Help:    "Quality score of cold start recommendations (0-1)",
			Buckets: []float64{0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0},
		},
		[]string{"strategy"},
	)

	coldStartProcessingTime = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "recommendations_cold_start_processing_seconds",
			Help:    "Time to generate cold start recommendations",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
		},
		[]string{"strategy"},
	)

	coldStartFallbackTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "recommendations_cold_start_fallback_total",
			Help: "Total number of times fallback strategies were used",
		},
		[]string{"from_strategy", "to_strategy"},
	)

	coldStartPreferenceSource = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "recommendations_preference_source_total",
			Help: "Count of preference sources for cold start users",
		},
		[]string{"source"}, // "onboarding", "inferred", "default"
	)

	coldStartRecommendationCount = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "recommendations_cold_start_count",
			Help:    "Number of recommendations returned for cold start users",
			Buckets: []float64{5, 10, 15, 20, 25, 30, 40, 50},
		},
		[]string{"strategy"},
	)
)

// RecordColdStartRecommendation records metrics for a cold start recommendation request
func RecordColdStartRecommendation(strategy string, count int, processingTimeMs int64, avgScore float64) {
	coldStartRecommendationsTotal.WithLabelValues(strategy).Inc()
	coldStartProcessingTime.WithLabelValues(strategy).Observe(float64(processingTimeMs) / 1000.0)
	coldStartRecommendationCount.WithLabelValues(strategy).Observe(float64(count))

	if avgScore > 0 {
		coldStartRecommendationQuality.WithLabelValues(strategy).Observe(avgScore)
	}
}

// RecordColdStartFallback records when a fallback strategy was used
func RecordColdStartFallback(fromStrategy, toStrategy string) {
	coldStartFallbackTotal.WithLabelValues(fromStrategy, toStrategy).Inc()
}

// RecordOnboardingCompleted records when a user completes onboarding
func RecordOnboardingCompleted() {
	coldStartOnboardingCompletedTotal.Inc()
}

// RecordPreferenceSource records the source of user preferences
func RecordPreferenceSource(source string) {
	coldStartPreferenceSource.WithLabelValues(source).Inc()
}
