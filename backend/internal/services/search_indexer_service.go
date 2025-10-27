package services

import (
"bytes"
"context"
"encoding/json"
"fmt"
"io"
"log"
"strings"

"github.com/google/uuid"
"github.com/opensearch-project/opensearch-go/v2/opensearchapi"
"github.com/subculture-collective/clipper/internal/models"
"github.com/subculture-collective/clipper/pkg/opensearch"
)

// SearchIndexerService handles indexing operations for OpenSearch
type SearchIndexerService struct {
osClient *opensearch.Client
}

// NewSearchIndexerService creates a new SearchIndexerService
func NewSearchIndexerService(osClient *opensearch.Client) *SearchIndexerService {
return &SearchIndexerService{
osClient: osClient,
}
}

const (
ClipsIndex    = "clips"
UsersIndex    = "users"
GamesIndex    = "games"
TagsIndex     = "tags"
)

// InitializeIndices creates all required indices with proper mappings
func (s *SearchIndexerService) InitializeIndices(ctx context.Context) error {
indices := map[string]string{
ClipsIndex: getClipIndexMapping(),
UsersIndex: getUserIndexMapping(),
GamesIndex: getGameIndexMapping(),
TagsIndex:  getTagIndexMapping(),
}

for indexName, mapping := range indices {
if err := s.createIndexIfNotExists(ctx, indexName, mapping); err != nil {
return fmt.Errorf("failed to create index %s: %w", indexName, err)
}
log.Printf("Index %s ready", indexName)
}

return nil
}

// createIndexIfNotExists creates an index if it doesn't exist
func (s *SearchIndexerService) createIndexIfNotExists(ctx context.Context, indexName, mapping string) error {
// Check if index exists
req := opensearchapi.IndicesExistsRequest{
Index: []string{indexName},
}

res, err := req.Do(ctx, s.osClient.GetClient())
if err != nil {
return fmt.Errorf("failed to check index existence: %w", err)
}
defer res.Body.Close()

// If index exists (200), return
if res.StatusCode == 200 {
return nil
}

// Create index
createReq := opensearchapi.IndicesCreateRequest{
Index: indexName,
Body:  strings.NewReader(mapping),
}

createRes, err := createReq.Do(ctx, s.osClient.GetClient())
if err != nil {
return fmt.Errorf("failed to create index: %w", err)
}
defer createRes.Body.Close()

if createRes.IsError() {
body, _ := io.ReadAll(createRes.Body)
return fmt.Errorf("failed to create index: %s - %s", createRes.Status(), string(body))
}

return nil
}

// IndexClip indexes a single clip
func (s *SearchIndexerService) IndexClip(ctx context.Context, clip *models.Clip) error {
doc := map[string]interface{}{
"id":               clip.ID.String(),
"twitch_clip_id":   clip.TwitchClipID,
"title":            clip.Title,
"creator_name":     clip.CreatorName,
"creator_id":       clip.CreatorID,
"broadcaster_name": clip.BroadcasterName,
"broadcaster_id":   clip.BroadcasterID,
"game_id":          clip.GameID,
"game_name":        clip.GameName,
"language":         clip.Language,
"view_count":       clip.ViewCount,
"vote_score":       clip.VoteScore,
"comment_count":    clip.CommentCount,
"favorite_count":   clip.FavoriteCount,
"is_featured":      clip.IsFeatured,
"is_nsfw":          clip.IsNSFW,
"is_removed":       clip.IsRemoved,
"created_at":       clip.CreatedAt,
"imported_at":      clip.ImportedAt,
}

return s.indexDocument(ctx, ClipsIndex, clip.ID.String(), doc)
}

// IndexUser indexes a single user
func (s *SearchIndexerService) IndexUser(ctx context.Context, user *models.User) error {
doc := map[string]interface{}{
"id":            user.ID.String(),
"twitch_id":     user.TwitchID,
"username":      user.Username,
"display_name":  user.DisplayName,
"bio":           user.Bio,
"karma_points":  user.KarmaPoints,
"role":          user.Role,
"is_banned":     user.IsBanned,
"created_at":    user.CreatedAt,
"last_login_at": user.LastLoginAt,
}

return s.indexDocument(ctx, UsersIndex, user.ID.String(), doc)
}

// IndexTag indexes a single tag
func (s *SearchIndexerService) IndexTag(ctx context.Context, tag *models.Tag) error {
doc := map[string]interface{}{
"id":          tag.ID.String(),
"name":        tag.Name,
"slug":        tag.Slug,
"description": tag.Description,
"usage_count": tag.UsageCount,
"created_at":  tag.CreatedAt,
}

return s.indexDocument(ctx, TagsIndex, tag.ID.String(), doc)
}

// IndexGame indexes a single game
func (s *SearchIndexerService) IndexGame(ctx context.Context, game *models.Game) error {
doc := map[string]interface{}{
"id":         game.ID,
"name":       game.Name,
"clip_count": game.ClipCount,
}

return s.indexDocument(ctx, GamesIndex, game.ID, doc)
}

// indexDocument is a helper to index any document
func (s *SearchIndexerService) indexDocument(ctx context.Context, indexName, docID string, doc map[string]interface{}) error {
data, err := json.Marshal(doc)
if err != nil {
return fmt.Errorf("failed to marshal document: %w", err)
}

req := opensearchapi.IndexRequest{
Index:      indexName,
DocumentID: docID,
Body:       bytes.NewReader(data),
Refresh:    "false", // Don't force refresh for performance
}

res, err := req.Do(ctx, s.osClient.GetClient())
if err != nil {
return fmt.Errorf("failed to index document: %w", err)
}
defer res.Body.Close()

if res.IsError() {
body, _ := io.ReadAll(res.Body)
return fmt.Errorf("failed to index document: %s - %s", res.Status(), string(body))
}

return nil
}

// DeleteClip removes a clip from the index
func (s *SearchIndexerService) DeleteClip(ctx context.Context, clipID uuid.UUID) error {
return s.deleteDocument(ctx, ClipsIndex, clipID.String())
}

// DeleteUser removes a user from the index
func (s *SearchIndexerService) DeleteUser(ctx context.Context, userID uuid.UUID) error {
return s.deleteDocument(ctx, UsersIndex, userID.String())
}

// DeleteTag removes a tag from the index
func (s *SearchIndexerService) DeleteTag(ctx context.Context, tagID uuid.UUID) error {
return s.deleteDocument(ctx, TagsIndex, tagID.String())
}

// deleteDocument is a helper to delete any document
func (s *SearchIndexerService) deleteDocument(ctx context.Context, indexName, docID string) error {
req := opensearchapi.DeleteRequest{
Index:      indexName,
DocumentID: docID,
Refresh:    "false",
}

res, err := req.Do(ctx, s.osClient.GetClient())
if err != nil {
return fmt.Errorf("failed to delete document: %w", err)
}
defer res.Body.Close()

// 404 is acceptable (document doesn't exist)
if res.IsError() && res.StatusCode != 404 {
body, _ := io.ReadAll(res.Body)
return fmt.Errorf("failed to delete document: %s - %s", res.Status(), string(body))
}

return nil
}

// BulkIndexClips indexes multiple clips in a batch
func (s *SearchIndexerService) BulkIndexClips(ctx context.Context, clips []models.Clip) error {
if len(clips) == 0 {
return nil
}

var buf bytes.Buffer
for _, clip := range clips {
// Action metadata
meta := map[string]interface{}{
"index": map[string]interface{}{
"_index": ClipsIndex,
"_id":    clip.ID.String(),
},
}
metaJSON, _ := json.Marshal(meta)
buf.Write(metaJSON)
buf.WriteByte('\n')

// Document data
doc := map[string]interface{}{
"id":               clip.ID.String(),
"twitch_clip_id":   clip.TwitchClipID,
"title":            clip.Title,
"creator_name":     clip.CreatorName,
"creator_id":       clip.CreatorID,
"broadcaster_name": clip.BroadcasterName,
"broadcaster_id":   clip.BroadcasterID,
"game_id":          clip.GameID,
"game_name":        clip.GameName,
"language":         clip.Language,
"view_count":       clip.ViewCount,
"vote_score":       clip.VoteScore,
"comment_count":    clip.CommentCount,
"favorite_count":   clip.FavoriteCount,
"is_featured":      clip.IsFeatured,
"is_nsfw":          clip.IsNSFW,
"is_removed":       clip.IsRemoved,
"created_at":       clip.CreatedAt,
"imported_at":      clip.ImportedAt,
}
docJSON, _ := json.Marshal(doc)
buf.Write(docJSON)
buf.WriteByte('\n')
}

return s.bulkRequest(ctx, &buf)
}

// bulkRequest performs a bulk request
func (s *SearchIndexerService) bulkRequest(ctx context.Context, body *bytes.Buffer) error {
req := opensearchapi.BulkRequest{
Body: body,
}

res, err := req.Do(ctx, s.osClient.GetClient())
if err != nil {
return fmt.Errorf("bulk request failed: %w", err)
}
defer res.Body.Close()

if res.IsError() {
bodyBytes, _ := io.ReadAll(res.Body)
return fmt.Errorf("bulk request error: %s - %s", res.Status(), string(bodyBytes))
}

// Parse response to check for item-level errors
var bulkRes map[string]interface{}
if err := json.NewDecoder(res.Body).Decode(&bulkRes); err != nil {
return fmt.Errorf("failed to parse bulk response: %w", err)
}

if errors, ok := bulkRes["errors"].(bool); ok && errors {
    log.Printf("WARNING: Some bulk operations failed. Check items for details.")
}

return nil
}

// Index mapping definitions with proper analyzers

func getClipIndexMapping() string {
return `{
"settings": {
"analysis": {
"analyzer": {
"standard_multilang": {
"type": "standard"
}
}
},
"index": {
"number_of_shards": 1,
"number_of_replicas": 0
}
},
"mappings": {
"properties": {
"id": {"type": "keyword"},
"twitch_clip_id": {"type": "keyword"},
"title": {
"type": "text",
"analyzer": "standard_multilang",
"fields": {
"keyword": {"type": "keyword"}
}
},
"creator_name": {
"type": "text",
"analyzer": "standard_multilang",
"fields": {
"keyword": {"type": "keyword"}
}
},
"broadcaster_name": {
"type": "text",
"analyzer": "standard_multilang",
"fields": {
"keyword": {"type": "keyword"}
}
},
"game_name": {
"type": "text",
"analyzer": "standard_multilang",
"fields": {
"keyword": {"type": "keyword"}
}
},
"language": {"type": "keyword"},
"view_count": {"type": "integer"},
"vote_score": {"type": "integer"},
"comment_count": {"type": "integer"},
"favorite_count": {"type": "integer"},
"is_featured": {"type": "boolean"},
"is_nsfw": {"type": "boolean"},
"is_removed": {"type": "boolean"},
"created_at": {"type": "date"},
"imported_at": {"type": "date"}
}
}
}`
}

func getUserIndexMapping() string {
return `{
"settings": {
"analysis": {
"analyzer": {
"standard_multilang": {
"type": "standard"
}
}
},
"index": {
"number_of_shards": 1,
"number_of_replicas": 0
}
},
"mappings": {
"properties": {
"id": {"type": "keyword"},
"twitch_id": {"type": "keyword"},
"username": {
"type": "text",
"analyzer": "standard_multilang",
"fields": {
"keyword": {"type": "keyword"}
}
},
"display_name": {
"type": "text",
"analyzer": "standard_multilang",
"fields": {
"keyword": {"type": "keyword"}
}
},
"bio": {
"type": "text",
"analyzer": "standard_multilang"
},
"karma_points": {"type": "integer"},
"role": {"type": "keyword"},
"is_banned": {"type": "boolean"},
"created_at": {"type": "date"},
"last_login_at": {"type": "date"}
}
}
}`
}

func getGameIndexMapping() string {
return `{
"settings": {
"analysis": {
"analyzer": {
"standard_multilang": {
"type": "standard"
}
}
},
"index": {
"number_of_shards": 1,
"number_of_replicas": 0
}
},
"mappings": {
"properties": {
"id": {"type": "keyword"},
"name": {
"type": "text",
"analyzer": "standard_multilang",
"fields": {
"keyword": {"type": "keyword"}
}
},
"clip_count": {"type": "integer"}
}
}
}`
}

func getTagIndexMapping() string {
return `{
"settings": {
"analysis": {
"analyzer": {
"standard_multilang": {
"type": "standard"
}
}
},
"index": {
"number_of_shards": 1,
"number_of_replicas": 0
}
},
"mappings": {
"properties": {
"id": {"type": "keyword"},
"name": {
"type": "text",
"analyzer": "standard_multilang",
"fields": {
"keyword": {"type": "keyword"}
}
},
"slug": {"type": "keyword"},
"description": {
"type": "text",
"analyzer": "standard_multilang"
},
"usage_count": {"type": "integer"},
"created_at": {"type": "date"}
}
}
}`
}
