---
title: "Search Evaluation"
summary: "This document describes the search evaluation system for Clipper's semantic search, including evalua"
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Search Evaluation

This document describes the search evaluation system for Clipper's semantic search, including evaluation datasets, metrics, and how to run offline evaluations.

## Overview

Search evaluation is essential for measuring and improving search quality. This system provides:

- **Labeled Evaluation Dataset**: Query-document pairs with relevance ratings
- **Offline Metrics**: nDCG, MRR, Precision, Recall calculations
- **Evaluation CLI**: Command-line tool for running evaluations
- **Grafana Dashboard**: Visualization of metrics over time

## Metrics

### Offline Metrics

These metrics are computed using labeled evaluation data:

| Metric | Target | Description |
|--------|--------|-------------|
| **nDCG@5** | ≥ 0.75 | Normalized Discounted Cumulative Gain at 5 - measures ranking quality for top 5 results |
| **nDCG@10** | ≥ 0.80 | Normalized Discounted Cumulative Gain at 10 |
| **MRR** | ≥ 0.70 | Mean Reciprocal Rank - how high the first relevant result appears |
| **Precision@5** | ≥ 0.60 | Fraction of top 5 results that are relevant |
| **Recall@10** | ≥ 0.70 | Fraction of relevant documents found in top 10 |

#### nDCG (Normalized Discounted Cumulative Gain)

nDCG measures how well the search ranking matches ideal ranking. It accounts for:

- Position of relevant documents (earlier = better)
- Degree of relevance (highly relevant documents contribute more)

Formula: `nDCG = DCG / IDCG`

Where:

- `DCG = Σ (2^relevance - 1) / log2(position + 1)`
- `IDCG = DCG for ideal (perfect) ranking`

#### MRR (Mean Reciprocal Rank)

MRR measures how quickly users find the first relevant result:

`MRR = 1 / (position of first relevant result)`

- MRR = 1.0 means first result is always relevant
- MRR = 0.5 means first relevant result is typically at position 2

### Online Metrics

These metrics are collected from real user behavior:

| Metric | Target | Description |
|--------|--------|-------------|
| **Click-Through Rate** | ≥ 25% | Percentage of search results clicked |
| **Zero Result Rate** | ≤ 5% | Percentage of searches with no results |
| **Average Click Position** | ≤ 3 | Average position of clicked results |
| **Session Success Rate** | ≥ 75% | Percentage of sessions finding relevant content |

## Evaluation Dataset

The evaluation dataset is located at `backend/testdata/search_evaluation_dataset.yaml`.

### Structure

```yaml
version: "1.0"
evaluation_queries:
  - id: "eval-001"
    query: "valorant ace"
    description: "User looking for ace plays in Valorant"
    relevant_documents:
      - clip_id: "clip-id-1"
        relevance: 4  # Perfect match
        reason: "Valorant ace clip by professional player"
      - clip_id: "clip-id-2"
        relevance: 2  # Fairly relevant
        reason: "Valorant 4k but not ace"
```

### Relevance Scale

| Score | Label | Description |
|-------|-------|-------------|
| 0 | Not relevant | Document is completely unrelated |
| 1 | Marginally relevant | Tangentially related, doesn't satisfy query |
| 2 | Fairly relevant | Partially satisfies query intent |
| 3 | Highly relevant | Strongly satisfies query intent |
| 4 | Perfect | Exactly what the user is looking for |

### Adding New Queries

When adding new evaluation queries:

1. Include diverse query types (game-specific, creator, semantic, etc.)
2. Add at least 3-5 relevant documents per query
3. Distribute relevance scores across the scale
4. Document the reason for each relevance judgment
5. Test for consistency with existing judgments

## Running Evaluation

### Using the CLI

```bash
# Build the evaluation tool
cd backend
go build -o bin/evaluate-search ./cmd/evaluate-search

# Run with default settings (simulated results)
./bin/evaluate-search

# Run with verbose output
./bin/evaluate-search -verbose

# Save results to JSON file
./bin/evaluate-search -output results.json

# Use custom dataset
./bin/evaluate-search -dataset path/to/dataset.yaml
```

### Command-Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `-dataset` | `testdata/search_evaluation_dataset.yaml` | Path to evaluation dataset |
| `-output` | (stdout) | Path to output JSON file |
| `-simulate` | `true` | Use simulated ideal results |
| `-verbose` | `false` | Print detailed per-query results |
| `-help` | `false` | Show help message |

### Example Output

```
========================================
     Search Evaluation Results
========================================

Aggregate Metrics:
-----------------------------------------
  nDCG@5:      0.8500
  nDCG@10:     0.8800
  MRR:         0.9200
  Precision@5: 0.6400
  Recall@10:   0.8100
  Query Count: 15

Target Comparison:
-----------------------------------------
  ✅ nDCG@5:      0.8500 (target: 0.75)
  ✅ nDCG@10:     0.8800 (target: 0.80)
  ✅ MRR:         0.9200 (target: 0.70)
  ✅ Precision@5: 0.6400 (target: 0.60)
  ✅ Recall@10:   0.8100 (target: 0.70)
```

## Grafana Dashboard

A Grafana dashboard for search quality metrics is available at `monitoring/dashboards/search-quality.json`.

### Importing the Dashboard

1. Open Grafana (http://localhost:3000)
2. Navigate to Dashboards → Import
3. Upload `search-quality.json`
4. Select Prometheus as the data source

### Required Prometheus Metrics

The dashboard expects these metrics from the backend:

```go
// Offline evaluation metrics (pushed by evaluation runner)
search_evaluation_ndcg_5
search_evaluation_ndcg_10
search_evaluation_mrr
search_evaluation_precision_5
search_evaluation_recall_10

// Search performance metrics
search_query_duration_ms_bucket{search_type="hybrid|bm25|vector"}
search_queries_total{search_type="hybrid|bm25"}

// Embedding metrics
embedding_cache_hits_total
embedding_cache_misses_total
embedding_generation_total
embedding_generation_errors_total
clips_with_embeddings
clips_without_embeddings

// Online user metrics
search_result_clicks_total
search_impressions_total
search_zero_results_total
search_click_position
search_sessions_total
search_sessions_successful_total
```

## Best Practices

### Running Regular Evaluations

1. **Schedule weekly evaluations** as part of CI/CD
2. **Track metrics over time** in the dashboard
3. **Set up alerts** for metric regressions
4. **Review failing queries** to understand search weaknesses

### Expanding the Dataset

1. **Analyze query logs** to find common user queries
2. **Include edge cases** (typos, multiple languages, complex queries)
3. **Balance query difficulty** (easy and hard queries)
4. **Get multiple labelers** for ambiguous queries

### Responding to Metric Drops

1. **Identify affected queries** using per-query breakdown
2. **Compare with baseline** to understand regression scope
3. **Check recent changes** to search configuration or models
4. **Test fixes locally** before deploying

## Integration with CI/CD

Add evaluation to your pipeline:

```yaml
# .github/workflows/search-evaluation.yml
name: Search Evaluation

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.24'
      
      - name: Build evaluation tool
        run: |
          cd backend
          go build -o bin/evaluate-search ./cmd/evaluate-search
      
      - name: Run evaluation
        run: |
          cd backend
          ./bin/evaluate-search -output evaluation-results.json
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: evaluation-results
          path: backend/evaluation-results.json
```

## References

- [Semantic Search Architecture](./SEMANTIC_SEARCH_ARCHITECTURE.md)
- [Search Documentation](./SEARCH.md)
- [Relevance Validation Dataset](./backend/testdata/search_relevance_dataset.yaml)
- [nDCG on Wikipedia](https://en.wikipedia.org/wiki/Discounted_cumulative_gain)
- [MRR on Wikipedia](https://en.wikipedia.org/wiki/Mean_reciprocal_rank)
