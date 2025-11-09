# Search Platform Documentation

This document describes the OpenSearch-based search platform implemented for Clipper.

## Overview

Clipper uses OpenSearch (v2.11.1) as its primary search engine, providing powerful full-text search capabilities with typo tolerance, multi-language support, and advanced filtering options. The system gracefully falls back to PostgreSQL full-text search if OpenSearch is unavailable.

## Architecture

### Components

1. **OpenSearch Client** (`pkg/opensearch/client.go`)
   - Manages connection to OpenSearch cluster
   - Handles authentication and TLS configuration

2. **Search Indexer Service** (`internal/services/search_indexer_service.go`)
   - Creates and manages search indices
   - Handles document indexing (single and bulk operations)
   - Defines index mappings with proper analyzers

3. **OpenSearch Search Service** (`internal/services/opensearch_search_service.go`)
   - Executes search queries with filters
   - Provides autocomplete suggestions
   - Supports fuzzy matching for typo tolerance

4. **Search Handler** (`internal/handlers/search_handler.go`)
   - HTTP API endpoints for search
   - Handles request validation
   - Tracks search analytics

### Indices

The system maintains four indices:

- **clips**: Twitch clips with metadata
- **users**: User profiles (creators/broadcasters)
- **games**: Game information aggregated from clips
- **tags**: User-defined tags

## Setup

### 1. Start OpenSearch

```bash
# Start with Docker Compose
docker compose up -d opensearch

# Verify it's running
curl http://localhost:9200/_cluster/health
```

### 2. Configure Environment

Add to your `.env` file:

```bash
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_USERNAME=       # Optional: for production with security enabled
OPENSEARCH_PASSWORD=       # Optional: for production with security enabled
# WARNING: Set to false in production to enable TLS certificate verification
OPENSEARCH_INSECURE_SKIP_VERIFY=true  # Development only!
```

⚠️ **Security Note**: The `OPENSEARCH_INSECURE_SKIP_VERIFY` setting disables TLS certificate verification. This should **ONLY** be set to `true` in development environments. For production, set it to `false` and use properly signed certificates.

### 3. Initialize Indices

Indices are automatically created when the application starts. You can also manually initialize them:

```bash
# Run the backfill command
go run cmd/backfill-search/main.go
```

### 4. Backfill Existing Data

To index existing data from PostgreSQL:

```bash
cd backend
go run cmd/backfill-search/main.go -batch 100
```

Options:
- `-batch`: Number of records to process per batch (default: 100)

The backfill process:
1. Initializes all indices with proper mappings
2. Fetches data from PostgreSQL in batches
3. Bulk indexes documents to OpenSearch
4. Provides progress updates

## API Usage

### Search Endpoint

```
GET /api/v1/search
```

Query Parameters:
- `q` (required): Search query text
- `type`: Filter by type (`clips`, `creators`, `games`, `tags`, `all`)
- `sort`: Sort order (`relevance`, `recent`, `popular`)
- `game_id`: Filter clips by game
- `creator_id`: Filter clips by creator
- `language`: Filter by language code (e.g., `en`, `es`)
- `tags`: Filter by tag slugs (array)
- `min_votes`: Minimum vote score
- `date_from`: Start date (ISO 8601)
- `date_to`: End date (ISO 8601)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

Example:

```bash
# Basic search
curl "http://localhost:8080/api/v1/search?q=valorant"

# Search clips with filters
curl "http://localhost:8080/api/v1/search?q=ace&type=clips&sort=popular&min_votes=10"

# Search with language filter
curl "http://localhost:8080/api/v1/search?q=funny&type=clips&language=en"
```

Response:

```json
{
  "query": "valorant",
  "results": {
    "clips": [...],
    "creators": [...],
    "games": [...],
    "tags": [...]
  },
  "counts": {
    "clips": 42,
    "creators": 5,
    "games": 1,
    "tags": 3
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total_items": 51,
    "total_pages": 3
  }
}
```

### Suggestions Endpoint

```
GET /api/v1/search/suggestions
```

Query Parameters:
- `q` (required): Partial query text (minimum 2 characters)

Example:

```bash
curl "http://localhost:8080/api/v1/search/suggestions?q=val"
```

Response:

```json
{
  "query": "val",
  "suggestions": [
    { "text": "Valorant", "type": "game" },
    { "text": "TenZ", "type": "creator" }
  ]
}
```

### Hybrid Search with Similarity Scores

```
GET /api/v1/search/scores
```

This endpoint provides hybrid search combining BM25 (keyword matching) with vector similarity (semantic search) for improved relevance. Results are re-ranked using embedding similarity scores.

**Requirements:**
- OpenSearch must be available for BM25 candidate selection
- Embedding service must be enabled (OPENAI_API_KEY configured)
- Clips must have embeddings generated

Query Parameters:
- Same as standard search endpoint (`/api/v1/search`)

Example:

```bash
# Semantic search with similarity scores
curl "http://localhost:8080/api/v1/search/scores?q=funny+valorant+clutch+moments"
```

Response:

```json
{
  "query": "funny valorant clutch moments",
  "results": {
    "clips": [...]
  },
  "counts": {
    "clips": 42
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total_items": 42,
    "total_pages": 3
  },
  "scores": [
    {
      "clip_id": "550e8400-e29b-41d4-a716-446655440000",
      "similarity_score": 0.892,
      "similarity_rank": 1
    },
    {
      "clip_id": "660e8400-e29b-41d4-a716-446655440001",
      "similarity_score": 0.854,
      "similarity_rank": 2
    }
  ]
}
```

**How it works:**
1. **BM25 Candidate Selection**: OpenSearch retrieves candidates using keyword matching
2. **Query Embedding**: User query is converted to a 768-dimensional vector (embedding is cached in Redis by the embedding service layer)
3. **Vector Re-ranking**: Candidates are re-ranked using cosine similarity with pgvector
4. **Score Calculation**: Similarity scores are normalized to 0-1 range (higher is better)

**Benefits:**
- Better understanding of query intent
- Finds semantically similar clips even without exact keyword matches
- Combines strengths of keyword and semantic search
- Gracefully falls back to BM25-only if embeddings unavailable

**Performance:**
- P95 latency goal: <100ms (subject to ongoing measurement and optimization)
- Caching reduces embedding generation overhead
- Candidate pool size scaled based on pagination needs

## Features

### Typo Tolerance

OpenSearch automatically handles typos using fuzzy matching:

```bash
# "valarant" will match "Valorant"
curl "http://localhost:8080/api/v1/search?q=valarant"
```

The fuzziness is set to `AUTO`, which allows:
- 0 edits for terms length 1-2
- 1 edit for terms length 3-5
- 2 edits for terms length > 5

### Multi-Language Support

Language-specific analyzers provide optimized search for different languages:

**Supported Languages:**
- English (`en`) - English analyzer with English stop words
- Spanish (`es`) - Spanish analyzer with Spanish stop words
- French (`fr`) - French analyzer with French stop words
- German (`de`) - German analyzer with German stop words
- Other languages use standard multilingual analyzer

**Language-Specific Features:**
- Proper stemming for each language
- Language-specific stop word lists
- Enhanced field boost (4x) when language filter is applied
- Tokenization optimized for each language

Example with language filter:
```bash
# Search English clips with optimized analyzer
curl "http://localhost:8080/api/v1/search?q=funny+moments&language=en"
```

### Enhanced Relevance Scoring

Search results use function_score to combine multiple relevance signals:

**Engagement Score:**
Calculated from user interactions with weighted factors:
- Vote score: 10x weight
- Comment count: 5x weight
- Favorite count: 3x weight
- View count: 0.01x weight

Uses log1p modifier to prevent extreme outliers from dominating results.

**Recency Score:**
Newer clips receive higher scores using exponential decay:
- Initial score: 100.0 for brand new clips
- Half-life: 7 days (50% decrease every week)
- Formula: `score = 100.0 * exp(-ln(2) * days / 7)`

**Combined Scoring:**
For relevance sort, the final score combines:
1. Text relevance (BM25 with field boosts)
2. Engagement score (factor: 0.1)
3. Recency score (factor: 0.5)

All factors are summed together (score_mode: sum, boost_mode: sum).

### Field Boosting

Search results are ranked by relevance with field boosting:

**Clips:**
- Title: 3x boost (4x when language-specific field matches)
- Creator name: 2x boost
- Broadcaster name: 2x boost
- Game name: 1x boost

**Users:**
- Username: 3x boost
- Display name: 2x boost
- Bio: 1x boost

**Tags:**
- Name: 2x boost
- Description: 1x boost

### Faceted Search

Search responses include facet aggregations for filtering:

**Available Facets:**
- **Languages:** Distribution of results by language code
- **Games:** Top games in search results (up to 20)
- **Date Ranges:** Time-based distribution
  - Last hour
  - Last 24 hours
  - Last week
  - Last month
  - Older than a month

**Example Response with Facets:**
```json
{
  "query": "valorant",
  "results": { ... },
  "counts": { ... },
  "facets": {
    "languages": [
      { "key": "en", "label": "en", "count": 150 },
      { "key": "es", "label": "es", "count": 45 }
    ],
    "games": [
      { "key": "Valorant", "label": "Valorant", "count": 200 }
    ],
    "date_range": {
      "last_hour": 5,
      "last_day": 42,
      "last_week": 88,
      "last_month": 150,
      "older": 315
    }
  },
  "meta": { ... }
}
```

### Graceful Degradation

If OpenSearch is unavailable, the system automatically falls back to PostgreSQL full-text search:

1. Application checks OpenSearch connection on startup
2. If connection fails, logs a warning and uses PostgreSQL
3. No code changes needed - same API works with both backends
4. Health check endpoint reflects OpenSearch status

## Monitoring

### Health Check

```bash
curl http://localhost:8080/health/ready
```

Response includes OpenSearch status:

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "opensearch": "ok"
  }
}
```

If OpenSearch is degraded:

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "opensearch": "degraded"
  }
}
```

### Metrics

Monitor these metrics for production:

- **Index lag**: Time between write to PostgreSQL and OpenSearch index
- **Search latency**: Response time for search queries
- **Error rate**: Failed indexing or search operations
- **Index size**: Disk usage per index

Access OpenSearch metrics:

```bash
# Cluster stats
curl http://localhost:9200/_cluster/stats

# Index stats
curl http://localhost:9200/_cat/indices?v

# Node stats
curl http://localhost:9200/_nodes/stats
```

## Real-time Indexing

To enable real-time indexing, integrate the indexer service into your write operations:

```go
// After creating/updating a clip
if searchIndexer != nil {
    go func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        if err := searchIndexer.IndexClip(ctx, &clip); err != nil {
            log.Printf("Failed to index clip: %v", err)
        }
    }()
}

// After deleting a clip
if searchIndexer != nil {
    go func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        if err := searchIndexer.DeleteClip(ctx, clipID); err != nil {
            log.Printf("Failed to delete clip from index: %v", err)
        }
    }()
}
```

## Troubleshooting

### OpenSearch won't start

Check logs:
```bash
docker logs clipper-opensearch
```

Common issues:
- Insufficient memory: Increase Docker memory limit
- Port conflict: Ensure ports 9200 and 9600 are available
- Bootstrap checks failing: Review ulimits in docker-compose.yml

### Search returns no results

1. Check if indices exist:
   ```bash
   curl http://localhost:9200/_cat/indices?v
   ```

2. Verify data is indexed:
   ```bash
   curl http://localhost:9200/clips/_count
   ```

3. Run backfill if needed:
   ```bash
   go run cmd/backfill-search/main.go
   ```

### Performance issues

1. Check index size and fragmentation:
   ```bash
   curl http://localhost:9200/_cat/indices?v&s=store.size:desc
   ```

2. Optimize indices (production only):
   ```bash
   curl -X POST "http://localhost:9200/clips/_forcemerge?max_num_segments=1"
   ```

3. Increase batch size for backfill:
   ```bash
   go run cmd/backfill-search/main.go -batch 500
   ```

## Production Considerations

⚠️ **IMPORTANT SECURITY NOTE**: The default docker-compose configuration has OpenSearch security disabled (`DISABLE_SECURITY_PLUGIN=true`) for development ease. **This is NOT suitable for production.** Always enable security features, authentication, and TLS encryption for production deployments.

### Security

1. **Enable OpenSearch security plugin**
   - Remove `DISABLE_SECURITY_PLUGIN=true` from docker-compose.yml
   - Configure SSL/TLS certificates
   - Set up authentication credentials
   - See [OpenSearch Security Documentation](https://opensearch.org/docs/latest/security/)

2. **Update configuration**
   ```bash
   OPENSEARCH_URL=https://your-opensearch-cluster:9200
   OPENSEARCH_USERNAME=admin
   OPENSEARCH_PASSWORD=your-secure-password
   ```

3. **Network isolation**
   - Run OpenSearch in private network
   - Use firewall rules to restrict access
   - Enable VPC peering if using cloud services

### Scaling

1. **Increase resources**
   - Adjust `OPENSEARCH_JAVA_OPTS` for heap size
   - Increase ulimits for file descriptors
   - Allocate sufficient disk space

2. **Multi-node cluster**
   - Add more OpenSearch nodes
   - Configure proper discovery settings
   - Set up replication for high availability

3. **Optimize indices**
   - Increase `number_of_replicas` for read scalability
   - Use `number_of_shards` based on data volume
   - Enable index lifecycle management (ILM)

### Backup and Recovery

1. **Snapshot repository**
   ```bash
   # Register snapshot repository
   curl -X PUT "http://localhost:9200/_snapshot/backup" -H 'Content-Type: application/json' -d'
   {
     "type": "fs",
     "settings": {
       "location": "/usr/share/opensearch/backup"
     }
   }'
   ```

2. **Create snapshot**
   ```bash
   curl -X PUT "http://localhost:9200/_snapshot/backup/snapshot_1"
   ```

3. **Restore snapshot**
   ```bash
   curl -X POST "http://localhost:9200/_snapshot/backup/snapshot_1/_restore"
   ```

## Relevance Validation

A versioned relevance dataset is maintained in `backend/testdata/search_relevance_dataset.yaml` to validate search quality and track improvements over time.

### Dataset Structure

The dataset includes:
- **Test Cases:** Queries with expected behavior and ranking factors
- **Index Configuration:** Expected analyzer and boost settings
- **Execution Notes:** Guidelines for running validation tests

### Test Categories

1. **Text Matching:** Exact matches, typo tolerance, multi-word queries
2. **Language Analyzers:** Language-specific search with proper stemming
3. **Engagement Scoring:** Vote-based and interaction-based ranking
4. **Recency Scoring:** Time-decay based relevance
5. **Faceted Search:** Facet aggregation validation
6. **Filters:** Single and combined filter tests
7. **Sort Orders:** Relevance, recent, and popular sorting

### Running Validation Tests

```bash
# Manual validation (compare actual vs expected)
cd backend/testdata
cat search_relevance_dataset.yaml

# For each test case, run the search and verify:
curl "http://localhost:8080/api/v1/search?q=<query>&<filters>&<sort>"

# Compare results with expected behavior documented in dataset
```

### Updating the Dataset

When making relevance changes:
1. Update the dataset with new expected behavior
2. Run validation tests to verify changes
3. Document any discrepancies
4. Version the changes in the changelog section
5. Commit the updated dataset with your changes

## Semantic Search

Clipper implements semantic search using hybrid BM25 + vector similarity re-ranking to understand query meaning and context, not just keywords.

**See**: [Semantic Search Architecture Documentation](./SEMANTIC_SEARCH_ARCHITECTURE.md)

**Key Features**:
- Vector embeddings using pgvector in PostgreSQL
- Hybrid search combining OpenSearch BM25 with vector similarity
- Sub-100ms query latency with intelligent caching
- Cost-effective approach leveraging existing infrastructure

**Architecture Decision**: [ADR-001: Semantic Search Vector Database Selection](./adr/001-semantic-search-vector-db.md)

## Future Enhancements

Potential improvements for the search platform:

1. **Real-time streaming** - Use Change Data Capture (CDC) for immediate indexing
2. **Advanced analytics** - Implement search analytics dashboard
3. **ML-powered ranking** - Use learning to rank for personalized results
4. ~~**Semantic search**~~ - ✅ Architecture defined (hybrid BM25 + vector re-ranking)
5. **Search as you type** - Implement completion suggester
6. ~~**Faceted search**~~ - ✅ Completed (aggregations for filter options)
7. **Highlighting** - Return matched text snippets in results
8. **Spell checking** - Suggest corrections for misspelled queries
9. **Tag facets** - Add tag-based facet aggregations
10. **Personalized ranking** - User preference-based result ordering
11. **Multi-modal embeddings** - Include video thumbnails in semantic search
12. **Cross-lingual search** - Search across different languages semantically

## Resources

- [OpenSearch Documentation](https://opensearch.org/docs/latest/)
- [OpenSearch Go Client](https://github.com/opensearch-project/opensearch-go)
- [Query DSL Reference](https://opensearch.org/docs/latest/query-dsl/)
- [Index Management](https://opensearch.org/docs/latest/im-plugin/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Semantic Search Architecture](./SEMANTIC_SEARCH_ARCHITECTURE.md)
