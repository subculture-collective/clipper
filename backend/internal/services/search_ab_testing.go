package services

import (
	"context"
	"fmt"
)

// SearchWeightConfig represents a configuration of search ranking weights
type SearchWeightConfig struct {
	Name            string  `json:"name" yaml:"name"`
	Description     string  `json:"description" yaml:"description"`
	BM25Weight      float64 `json:"bm25_weight" yaml:"bm25_weight"`           // Weight for BM25 text matching
	VectorWeight    float64 `json:"vector_weight" yaml:"vector_weight"`       // Weight for semantic vector search
	TitleBoost      float64 `json:"title_boost" yaml:"title_boost"`           // Field boost for title
	CreatorBoost    float64 `json:"creator_boost" yaml:"creator_boost"`       // Field boost for creator name
	GameBoost       float64 `json:"game_boost" yaml:"game_boost"`             // Field boost for game name
	EngagementBoost float64 `json:"engagement_boost" yaml:"engagement_boost"` // Boost factor for engagement score
	RecencyBoost    float64 `json:"recency_boost" yaml:"recency_boost"`       // Boost factor for recency
}

// Validate checks if the configuration is valid
// BM25Weight and VectorWeight should sum to 1.0 for proper normalization
func (c SearchWeightConfig) Validate() error {
	const tolerance = 0.01 // Allow small floating point errors
	sum := c.BM25Weight + c.VectorWeight
	if sum < 1.0-tolerance || sum > 1.0+tolerance {
		return fmt.Errorf("BM25Weight (%.2f) + VectorWeight (%.2f) should sum to 1.0, got %.2f",
			c.BM25Weight, c.VectorWeight, sum)
	}
	if c.BM25Weight < 0 || c.BM25Weight > 1 {
		return fmt.Errorf("BM25Weight must be between 0 and 1, got %.2f", c.BM25Weight)
	}
	if c.VectorWeight < 0 || c.VectorWeight > 1 {
		return fmt.Errorf("VectorWeight must be between 0 and 1, got %.2f", c.VectorWeight)
	}
	return nil
}

// ABTestResult represents the result of comparing two configurations
type ABTestResult struct {
	ConfigA        SearchWeightConfig `json:"config_a"`
	ConfigB        SearchWeightConfig `json:"config_b"`
	MetricsA       AggregateMetrics   `json:"metrics_a"`
	MetricsB       AggregateMetrics   `json:"metrics_b"`
	Improvements   map[string]float64 `json:"improvements"`   // Percentage improvement for each metric
	Recommendation string             `json:"recommendation"` // Which config to use
	StatSummary    string             `json:"stat_summary"`   // Statistical significance summary
}

// ABTestHarness provides tools for A/B testing search configurations
type ABTestHarness struct {
	evalService *SearchEvaluationService
}

// NewABTestHarness creates a new A/B testing harness
func NewABTestHarness(evalService *SearchEvaluationService) *ABTestHarness {
	return &ABTestHarness{
		evalService: evalService,
	}
}

// DefaultConfigs returns a set of default configurations for testing
func DefaultConfigs() []SearchWeightConfig {
	return []SearchWeightConfig{
		{
			Name:            "baseline",
			Description:     "Current production configuration",
			BM25Weight:      0.7,
			VectorWeight:    0.3,
			TitleBoost:      3.0,
			CreatorBoost:    2.0,
			GameBoost:       1.0,
			EngagementBoost: 0.1,
			RecencyBoost:    0.5,
		},
		{
			Name:            "semantic-heavy",
			Description:     "Emphasize semantic understanding over text matching",
			BM25Weight:      0.4,
			VectorWeight:    0.6,
			TitleBoost:      3.0,
			CreatorBoost:    2.0,
			GameBoost:       1.0,
			EngagementBoost: 0.1,
			RecencyBoost:    0.5,
		},
		{
			Name:            "text-heavy",
			Description:     "Emphasize text matching over semantic understanding",
			BM25Weight:      0.8,
			VectorWeight:    0.2,
			TitleBoost:      3.0,
			CreatorBoost:    2.0,
			GameBoost:       1.0,
			EngagementBoost: 0.1,
			RecencyBoost:    0.5,
		},
		{
			Name:            "engagement-focused",
			Description:     "Prioritize popular content",
			BM25Weight:      0.6,
			VectorWeight:    0.4,
			TitleBoost:      3.0,
			CreatorBoost:    2.0,
			GameBoost:       1.0,
			EngagementBoost: 0.3,
			RecencyBoost:    0.3,
		},
		{
			Name:            "recency-focused",
			Description:     "Prioritize recent content",
			BM25Weight:      0.6,
			VectorWeight:    0.4,
			TitleBoost:      3.0,
			CreatorBoost:    2.0,
			GameBoost:       1.0,
			EngagementBoost: 0.1,
			RecencyBoost:    0.8,
		},
		{
			Name:            "balanced",
			Description:     "Balanced configuration with equal weights",
			BM25Weight:      0.5,
			VectorWeight:    0.5,
			TitleBoost:      3.0,
			CreatorBoost:    2.0,
			GameBoost:       1.0,
			EngagementBoost: 0.2,
			RecencyBoost:    0.5,
		},
		{
			Name:            "title-priority",
			Description:     "Heavily prioritize title matches",
			BM25Weight:      0.7,
			VectorWeight:    0.3,
			TitleBoost:      5.0,
			CreatorBoost:    2.0,
			GameBoost:       1.0,
			EngagementBoost: 0.1,
			RecencyBoost:    0.5,
		},
		{
			Name:            "creator-priority",
			Description:     "Prioritize creator name matches",
			BM25Weight:      0.7,
			VectorWeight:    0.3,
			TitleBoost:      3.0,
			CreatorBoost:    4.0,
			GameBoost:       1.0,
			EngagementBoost: 0.1,
			RecencyBoost:    0.5,
		},
	}
}

// CompareConfigs compares two search configurations using the evaluation dataset
func (h *ABTestHarness) CompareConfigs(ctx context.Context, configA, configB SearchWeightConfig, resultsProvider func(config SearchWeightConfig, query string) ([]string, error)) (*ABTestResult, error) {
	if h.evalService.dataset == nil {
		return nil, fmt.Errorf("no evaluation dataset loaded")
	}

	// Validate configurations
	if err := configA.Validate(); err != nil {
		return nil, fmt.Errorf("config A is invalid: %w", err)
	}
	if err := configB.Validate(); err != nil {
		return nil, fmt.Errorf("config B is invalid: %w", err)
	}

	// Run evaluation for config A
	reportA, err := h.evalService.EvaluateDataset(ctx, func(query string) ([]string, error) {
		return resultsProvider(configA, query)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to evaluate config A: %w", err)
	}

	// Run evaluation for config B
	reportB, err := h.evalService.EvaluateDataset(ctx, func(query string) ([]string, error) {
		return resultsProvider(configB, query)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to evaluate config B: %w", err)
	}

	// Calculate improvements
	improvements := h.calculateImprovements(reportA.Metrics, reportB.Metrics)

	// Generate recommendation
	recommendation := h.generateRecommendation(improvements)

	// Generate statistical summary
	statSummary := h.generateStatSummary(reportA.Metrics, reportB.Metrics, improvements)

	return &ABTestResult{
		ConfigA:        configA,
		ConfigB:        configB,
		MetricsA:       reportA.Metrics,
		MetricsB:       reportB.Metrics,
		Improvements:   improvements,
		Recommendation: recommendation,
		StatSummary:    statSummary,
	}, nil
}

// calculateImprovements calculates percentage improvement from A to B
func (h *ABTestHarness) calculateImprovements(metricsA, metricsB AggregateMetrics) map[string]float64 {
	improvements := make(map[string]float64)

	improvements["ndcg_at_5"] = calculatePercentChange(metricsA.MeanNDCG5, metricsB.MeanNDCG5)
	improvements["ndcg_at_10"] = calculatePercentChange(metricsA.MeanNDCG10, metricsB.MeanNDCG10)
	improvements["mrr"] = calculatePercentChange(metricsA.MeanMRR, metricsB.MeanMRR)
	improvements["precision_at_5"] = calculatePercentChange(metricsA.MeanPrecision5, metricsB.MeanPrecision5)
	improvements["precision_at_10"] = calculatePercentChange(metricsA.MeanPrecision10, metricsB.MeanPrecision10)
	improvements["precision_at_20"] = calculatePercentChange(metricsA.MeanPrecision20, metricsB.MeanPrecision20)
	improvements["recall_at_5"] = calculatePercentChange(metricsA.MeanRecall5, metricsB.MeanRecall5)
	improvements["recall_at_10"] = calculatePercentChange(metricsA.MeanRecall10, metricsB.MeanRecall10)
	improvements["recall_at_20"] = calculatePercentChange(metricsA.MeanRecall20, metricsB.MeanRecall20)

	return improvements
}

// calculatePercentChange calculates percentage change from A to B
func calculatePercentChange(a, b float64) float64 {
	if a == 0 {
		if b == 0 {
			return 0
		}
		return 100.0 // If A is 0 and B is not, it's a 100% improvement
	}
	return ((b - a) / a) * 100.0
}

// generateRecommendation generates a recommendation based on improvements
func (h *ABTestHarness) generateRecommendation(improvements map[string]float64) string {
	// Weight the importance of different metrics
	importantMetrics := []string{"ndcg_at_10", "mrr", "precision_at_10", "recall_at_10"}

	positiveCount := 0
	totalImprovement := 0.0

	for _, metric := range importantMetrics {
		if imp, ok := improvements[metric]; ok {
			totalImprovement += imp
			if imp > 0 {
				positiveCount++
			}
		}
	}

	avgImprovement := totalImprovement / float64(len(importantMetrics))

	if avgImprovement > 5.0 && positiveCount >= 3 {
		return "Config B shows significant improvement. Recommend switching to Config B."
	} else if avgImprovement > 2.0 && positiveCount >= 2 {
		return "Config B shows moderate improvement. Consider A/B testing with live traffic before full rollout."
	} else if avgImprovement > -2.0 {
		return "Configs are similar in performance. Stick with Config A unless other factors favor B."
	} else if avgImprovement > -5.0 {
		return "Config B shows slight degradation. Recommend staying with Config A."
	}
	return "Config B shows significant degradation. Strongly recommend staying with Config A."
}

// generateStatSummary generates a summary of statistical significance
// Note: For production use, implement proper statistical significance testing
func (h *ABTestHarness) generateStatSummary(metricsA, metricsB AggregateMetrics, improvements map[string]float64) string {
	summary := fmt.Sprintf("Evaluated on %d queries.\n", metricsA.QueryCount)

	// Count significant changes (>5% improvement/degradation)
	significantImprovements := 0
	significantDegradations := 0

	for _, change := range improvements {
		if change > 5.0 {
			significantImprovements++
		} else if change < -5.0 {
			significantDegradations++
		}
	}

	summary += fmt.Sprintf("Significant improvements (>5%%): %d metrics\n", significantImprovements)
	summary += fmt.Sprintf("Significant degradations (<-5%%): %d metrics\n", significantDegradations)
	summary += "Note: For production decisions, conduct proper statistical significance testing."

	return summary
}

// EvaluateWithSimulated evaluates configurations using simulated results
// This is useful for testing the A/B harness without a live search system
func (h *ABTestHarness) EvaluateWithSimulated(ctx context.Context, configA, configB SearchWeightConfig) (*ABTestResult, error) {
	resultsProvider := func(config SearchWeightConfig, query string) ([]string, error) {
		// Find the query in dataset and return simulated results
		for _, eq := range h.evalService.dataset.EvaluationQueries {
			if eq.Query == query {
				return h.evalService.SimulateResults(eq), nil
			}
		}
		return []string{}, nil
	}

	return h.CompareConfigs(ctx, configA, configB, resultsProvider)
}
