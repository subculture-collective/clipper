package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"

	"github.com/opensearch-project/opensearch-go/v2/opensearchapi"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/pkg/opensearch"
)

// OpenSearchService handles search operations using OpenSearch
type OpenSearchService struct {
osClient *opensearch.Client
}

// NewOpenSearchService creates a new OpenSearchService
func NewOpenSearchService(osClient *opensearch.Client) *OpenSearchService {
return &OpenSearchService{
osClient: osClient,
}
}

// Search performs a universal search using OpenSearch
func (s *OpenSearchService) Search(ctx context.Context, req *models.SearchRequest) (*models.SearchResponse, error) {
response := &models.SearchResponse{
Query:   req.Query,
Results: models.SearchResultsByType{},
Counts:  models.SearchCounts{},
Meta: models.SearchMeta{
Page:  req.Page,
Limit: req.Limit,
},
}

// Determine what types to search
searchAll := req.Type == "" || req.Type == "all"
searchClips := searchAll || req.Type == "clips"
searchCreators := searchAll || req.Type == "creators"
searchGames := searchAll || req.Type == "games"
searchTags := searchAll || req.Type == "tags"

var totalCount int

// Search clips
if searchClips {
clips, count, err := s.searchClips(ctx, req)
if err != nil {
return nil, fmt.Errorf("failed to search clips: %w", err)
}
response.Results.Clips = clips
response.Counts.Clips = count
totalCount += count
}

// Search creators
if searchCreators {
creators, count, err := s.searchCreators(ctx, req)
if err != nil {
return nil, fmt.Errorf("failed to search creators: %w", err)
}
response.Results.Creators = creators
response.Counts.Creators = count
totalCount += count
}

// Search games
if searchGames {
games, count, err := s.searchGames(ctx, req)
if err != nil {
return nil, fmt.Errorf("failed to search games: %w", err)
}
response.Results.Games = games
response.Counts.Games = count
totalCount += count
}

// Search tags
if searchTags {
tags, count, err := s.searchTags(ctx, req)
if err != nil {
return nil, fmt.Errorf("failed to search tags: %w", err)
}
response.Results.Tags = tags
response.Counts.Tags = count
totalCount += count
}

// Calculate pagination
response.Meta.TotalItems = totalCount
if req.Limit > 0 {
response.Meta.TotalPages = (totalCount + req.Limit - 1) / req.Limit
}

return response, nil
}

// searchClips searches for clips in OpenSearch
func (s *OpenSearchService) searchClips(ctx context.Context, req *models.SearchRequest) ([]models.Clip, int, error) {
query := s.buildClipQuery(req)

from := (req.Page - 1) * req.Limit
searchBody := map[string]interface{}{
"query": query,
"from":  from,
"size":  req.Limit,
"sort":  s.buildSortClause(req.Sort),
}

hits, total, err := s.executeSearch(ctx, ClipsIndex, searchBody)
if err != nil {
return nil, 0, err
}

clips := make([]models.Clip, 0, len(hits))
for _, hit := range hits {
var clip models.Clip
if err := json.Unmarshal(hit, &clip); err != nil {
continue
}
clips = append(clips, clip)
}

return clips, total, nil
}

// searchCreators searches for users/creators in OpenSearch
func (s *OpenSearchService) searchCreators(ctx context.Context, req *models.SearchRequest) ([]models.User, int, error) {
query := s.buildUserQuery(req)

from := (req.Page - 1) * req.Limit
searchBody := map[string]interface{}{
"query": query,
"from":  from,
"size":  req.Limit,
"sort":  s.buildSortClause(req.Sort),
}

hits, total, err := s.executeSearch(ctx, UsersIndex, searchBody)
if err != nil {
return nil, 0, err
}

users := make([]models.User, 0, len(hits))
for _, hit := range hits {
var user models.User
if err := json.Unmarshal(hit, &user); err != nil {
continue
}
users = append(users, user)
}

return users, total, nil
}

// searchGames searches for games in OpenSearch
func (s *OpenSearchService) searchGames(ctx context.Context, req *models.SearchRequest) ([]models.Game, int, error) {
query := s.buildGameQuery(req)

from := (req.Page - 1) * req.Limit
searchBody := map[string]interface{}{
"query": query,
"from":  from,
"size":  req.Limit,
"sort":  []map[string]interface{}{{"clip_count": "desc"}},
}

hits, total, err := s.executeSearch(ctx, GamesIndex, searchBody)
if err != nil {
return nil, 0, err
}

games := make([]models.Game, 0, len(hits))
for _, hit := range hits {
var game models.Game
if err := json.Unmarshal(hit, &game); err != nil {
continue
}
games = append(games, game)
}

return games, total, nil
}

// searchTags searches for tags in OpenSearch
func (s *OpenSearchService) searchTags(ctx context.Context, req *models.SearchRequest) ([]models.Tag, int, error) {
query := s.buildTagQuery(req)

from := (req.Page - 1) * req.Limit
searchBody := map[string]interface{}{
"query": query,
"from":  from,
"size":  req.Limit,
"sort":  []map[string]interface{}{{"usage_count": "desc"}},
}

hits, total, err := s.executeSearch(ctx, TagsIndex, searchBody)
if err != nil {
return nil, 0, err
}

tags := make([]models.Tag, 0, len(hits))
for _, hit := range hits {
var tag models.Tag
if err := json.Unmarshal(hit, &tag); err != nil {
continue
}
tags = append(tags, tag)
}

return tags, total, nil
}

// executeSearch performs the actual search request
func (s *OpenSearchService) executeSearch(ctx context.Context, indexName string, searchBody map[string]interface{}) ([]json.RawMessage, int, error) {
body, err := json.Marshal(searchBody)
if err != nil {
return nil, 0, fmt.Errorf("failed to marshal search body: %w", err)
}

req := opensearchapi.SearchRequest{
Index: []string{indexName},
Body:  bytes.NewReader(body),
}

res, err := req.Do(ctx, s.osClient.GetClient())
if err != nil {
return nil, 0, fmt.Errorf("search request failed: %w", err)
}
defer res.Body.Close()

if res.IsError() {
bodyBytes, _ := io.ReadAll(res.Body)
return nil, 0, fmt.Errorf("search error: %s - %s", res.Status(), string(bodyBytes))
}

var result map[string]interface{}
if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
return nil, 0, fmt.Errorf("failed to decode response: %w", err)
}

hits := result["hits"].(map[string]interface{})
total := int(hits["total"].(map[string]interface{})["value"].(float64))

hitsList := hits["hits"].([]interface{})
documents := make([]json.RawMessage, 0, len(hitsList))

for _, hit := range hitsList {
hitMap := hit.(map[string]interface{})
source := hitMap["_source"]
sourceJSON, _ := json.Marshal(source)
documents = append(documents, sourceJSON)
}

return documents, total, nil
}

// buildClipQuery builds a query for clips with filters
func (s *OpenSearchService) buildClipQuery(req *models.SearchRequest) map[string]interface{} {
must := []map[string]interface{}{}
filter := []map[string]interface{}{
{"term": map[string]interface{}{"is_removed": false}},
}

// Add text search if query is provided
if req.Query != "" {
must = append(must, map[string]interface{}{
"multi_match": map[string]interface{}{
"query":     req.Query,
"fields":    []string{"title^3", "creator_name^2", "broadcaster_name^2", "game_name"},
"fuzziness": "AUTO",
"operator":  "and",
},
})
}

// Add filters
if req.GameID != nil && *req.GameID != "" {
filter = append(filter, map[string]interface{}{
"term": map[string]interface{}{"game_id": *req.GameID},
})
}

if req.CreatorID != nil && *req.CreatorID != "" {
filter = append(filter, map[string]interface{}{
"term": map[string]interface{}{"creator_id": *req.CreatorID},
})
}

if req.Language != nil && *req.Language != "" {
filter = append(filter, map[string]interface{}{
"term": map[string]interface{}{"language": *req.Language},
})
}

if req.MinVotes != nil {
filter = append(filter, map[string]interface{}{
"range": map[string]interface{}{
"vote_score": map[string]interface{}{"gte": *req.MinVotes},
},
})
}

if req.DateFrom != nil && *req.DateFrom != "" {
filter = append(filter, map[string]interface{}{
"range": map[string]interface{}{
"created_at": map[string]interface{}{"gte": *req.DateFrom},
},
})
}

if req.DateTo != nil && *req.DateTo != "" {
filter = append(filter, map[string]interface{}{
"range": map[string]interface{}{
"created_at": map[string]interface{}{"lte": *req.DateTo},
},
})
}

// If no query text, use match_all
if len(must) == 0 {
must = append(must, map[string]interface{}{"match_all": map[string]interface{}{}})
}

return map[string]interface{}{
"bool": map[string]interface{}{
"must":   must,
"filter": filter,
},
}
}

// buildUserQuery builds a query for users
func (s *OpenSearchService) buildUserQuery(req *models.SearchRequest) map[string]interface{} {
must := []map[string]interface{}{}
filter := []map[string]interface{}{
{"term": map[string]interface{}{"is_banned": false}},
}

if req.Query != "" {
must = append(must, map[string]interface{}{
"multi_match": map[string]interface{}{
"query":     req.Query,
"fields":    []string{"username^3", "display_name^2", "bio"},
"fuzziness": "AUTO",
},
})
}

if len(must) == 0 {
must = append(must, map[string]interface{}{"match_all": map[string]interface{}{}})
}

return map[string]interface{}{
"bool": map[string]interface{}{
"must":   must,
"filter": filter,
},
}
}

// buildGameQuery builds a query for games
func (s *OpenSearchService) buildGameQuery(req *models.SearchRequest) map[string]interface{} {
if req.Query == "" {
return map[string]interface{}{"match_all": map[string]interface{}{}}
}

return map[string]interface{}{
"match": map[string]interface{}{
"name": map[string]interface{}{
"query":     req.Query,
"fuzziness": "AUTO",
},
},
}
}

// buildTagQuery builds a query for tags
func (s *OpenSearchService) buildTagQuery(req *models.SearchRequest) map[string]interface{} {
if req.Query == "" {
return map[string]interface{}{"match_all": map[string]interface{}{}}
}

return map[string]interface{}{
"multi_match": map[string]interface{}{
"query":     req.Query,
"fields":    []string{"name^2", "description"},
"fuzziness": "AUTO",
},
}
}

// buildSortClause builds sort criteria
func (s *OpenSearchService) buildSortClause(sort string) []map[string]interface{} {
switch sort {
case "popular":
return []map[string]interface{}{
{"vote_score": "desc"},
{"created_at": "desc"},
}
case "recent":
return []map[string]interface{}{
{"created_at": "desc"},
}
case "relevance":
fallthrough
default:
return []map[string]interface{}{
{"_score": "desc"},
{"vote_score": "desc"},
}
}
}

// GetSuggestions provides autocomplete suggestions
func (s *OpenSearchService) GetSuggestions(ctx context.Context, query string, limit int) ([]models.SearchSuggestion, error) {
if query == "" || len(query) < 2 {
return []models.SearchSuggestion{}, nil
}

suggestions := []models.SearchSuggestion{}

// Search games
gameQuery := map[string]interface{}{
"query": map[string]interface{}{
"match_phrase_prefix": map[string]interface{}{
"name": query,
},
},
"size": limit / 2,
}

gameHits, _, err := s.executeSearch(ctx, GamesIndex, gameQuery)
if err == nil {
for _, hit := range gameHits {
var game models.Game
if err := json.Unmarshal(hit, &game); err == nil {
suggestions = append(suggestions, models.SearchSuggestion{
Text: game.Name,
Type: "game",
})
}
}
}

// Search creators
creatorQuery := map[string]interface{}{
"query": map[string]interface{}{
"multi_match": map[string]interface{}{
"query":  query,
"fields": []string{"username", "display_name"},
"type":   "phrase_prefix",
},
},
"size": limit / 2,
}

creatorHits, _, err := s.executeSearch(ctx, UsersIndex, creatorQuery)
if err == nil {
for _, hit := range creatorHits {
var user models.User
if err := json.Unmarshal(hit, &user); err == nil {
suggestions = append(suggestions, models.SearchSuggestion{
Text: user.Username,
Type: "creator",
})
}
}
}

return suggestions, nil
}
