#!/bin/bash

# test-seed-opensearch.sh
# Minimal seed script for OpenSearch integration tests
# Creates basic indices for testing search functionality

set -e

OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check OpenSearch is ready
if ! curl -f -s "$OPENSEARCH_URL/_cluster/health" > /dev/null 2>&1; then
    log_error "OpenSearch not responding on $OPENSEARCH_URL"
    exit 1
fi

log_info "OpenSearch URL: $OPENSEARCH_URL"
log_info "Creating test indices..."

# Create clips index (minimal mapping)
curl -f -s -X PUT "$OPENSEARCH_URL/clips" \
    -H "Content-Type: application/json" \
    -d '{
  "settings": {"number_of_shards": 1, "number_of_replicas": 0},
  "mappings": {
    "properties": {
      "id": {"type": "keyword"},
      "title": {"type": "text"},
      "description": {"type": "text"},
      "creator_name": {"type": "keyword"},
      "created_at": {"type": "date"}
    }
  }
}' > /dev/null 2>&1 || true

log_info "✓ clips index ready"

# Create users index (complete mapping for User model)
curl -f -s -X PUT "$OPENSEARCH_URL/users" \
    -H "Content-Type: application/json" \
    -d '{
  "settings": {"number_of_shards": 1, "number_of_replicas": 0},
  "mappings": {
    "properties": {
      "id": {"type": "keyword"},
      "twitch_id": {"type": "keyword"},
      "username": {"type": "keyword"},
      "display_name": {"type": "text"},
      "email": {"type": "keyword"},
      "avatar_url": {"type": "keyword"},
      "bio": {"type": "text"},
      "social_links": {"type": "text"},
      "karma_points": {"type": "integer"},
      "trust_score": {"type": "integer"},
      "trust_score_updated_at": {"type": "date"},
      "role": {"type": "keyword"},
      "account_type": {"type": "keyword"},
      "account_type_updated_at": {"type": "date"},
      "is_banned": {"type": "boolean"},
      "device_token": {"type": "keyword"},
      "device_platform": {"type": "keyword"},
      "follower_count": {"type": "integer"},
      "following_count": {"type": "integer"},
      "dmca_strikes_count": {"type": "integer"},
      "dmca_suspended_until": {"type": "date"},
      "dmca_terminated": {"type": "boolean"},
      "dmca_terminated_at": {"type": "date"},
      "is_verified": {"type": "boolean"},
      "verified_at": {"type": "date"},
      "comment_suspended_until": {"type": "date"},
      "comments_require_review": {"type": "boolean"},
      "comment_warning_count": {"type": "integer"},
      "created_at": {"type": "date"},
      "updated_at": {"type": "date"},
      "last_login_at": {"type": "date"}
    }
  }
}' > /dev/null 2>&1 || true

log_info "✓ users index ready"

# Create games index
curl -f -s -X PUT "$OPENSEARCH_URL/games" \
    -H "Content-Type: application/json" \
    -d '{
  "settings": {"number_of_shards": 1, "number_of_replicas": 0},
  "mappings": {
    "properties": {
      "id": {"type": "keyword"},
      "name": {"type": "text"},
      "twitch_game_id": {"type": "keyword"}
    }
  }
}' > /dev/null 2>&1 || true

log_info "✓ games index ready"

# Create tags index
curl -f -s -X PUT "$OPENSEARCH_URL/tags" \
    -H "Content-Type: application/json" \
    -d '{
  "settings": {"number_of_shards": 1, "number_of_replicas": 0},
  "mappings": {
    "properties": {
      "id": {"type": "keyword"},
      "name": {"type": "keyword"}
    }
  }
}' > /dev/null 2>&1 || true

log_info "✓ tags index ready"

log_info "OpenSearch seeding complete"
