package utils

import (
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// Cursor represents a pagination cursor containing sort key values and clip ID
type Cursor struct {
	SortKey   string  // The sort field name (e.g., "trending_score", "created_at")
	SortValue float64 // The value of the sort field for the last item
	ClipID    string  // The clip ID for tie-breaking
	CreatedAt int64   // Unix timestamp of created_at for tie-breaking
}

// EncodeCursor encodes a cursor into a base64 string
// Format: sort_key:sort_value:clip_id:created_at
func EncodeCursor(sortKey string, sortValue float64, clipID uuid.UUID, createdAtUnix int64) string {
	data := fmt.Sprintf("%s:%.6f:%s:%d", sortKey, sortValue, clipID.String(), createdAtUnix)
	return base64.URLEncoding.EncodeToString([]byte(data))
}

// DecodeCursor decodes a base64 cursor string into a Cursor struct
func DecodeCursor(cursorStr string) (*Cursor, error) {
	if cursorStr == "" {
		return nil, nil
	}

	decoded, err := base64.URLEncoding.DecodeString(cursorStr)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor format: failed to decode base64")
	}

	parts := strings.Split(string(decoded), ":")
	if len(parts) != 4 {
		return nil, fmt.Errorf("invalid cursor format: expected 4 parts, got %d", len(parts))
	}

	// Validate sortKey to prevent injection attacks
	sortKey := parts[0]
	validSortKeys := map[string]bool{
		"trending":  true,
		"popular":   true,
		"new":       true,
		"top":       true,
		"discussed": true,
		"hot":       true,
		"rising":    true,
	}
	if !validSortKeys[sortKey] {
		return nil, fmt.Errorf("invalid cursor format: invalid sort key %q", sortKey)
	}

	sortValue, err := strconv.ParseFloat(parts[1], 64)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor format: invalid sort value")
	}

	clipID := parts[2]
	if _, err := uuid.Parse(clipID); err != nil {
		return nil, fmt.Errorf("invalid cursor format: invalid clip ID")
	}

	createdAt, err := strconv.ParseInt(parts[3], 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor format: invalid created_at timestamp")
	}

	return &Cursor{
		SortKey:   sortKey,
		SortValue: sortValue,
		ClipID:    clipID,
		CreatedAt: createdAt,
	}, nil
}
