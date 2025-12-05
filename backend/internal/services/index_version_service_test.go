package services

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestGetVersionedIndexName(t *testing.T) {
	tests := []struct {
		name      string
		baseIndex string
		version   int
		expected  string
	}{
		{
			name:      "clips version 1",
			baseIndex: "clips",
			version:   1,
			expected:  "clips_v1",
		},
		{
			name:      "clips version 10",
			baseIndex: "clips",
			version:   10,
			expected:  "clips_v10",
		},
		{
			name:      "users version 5",
			baseIndex: "users",
			version:   5,
			expected:  "users_v5",
		},
		{
			name:      "tags version 0",
			baseIndex: "tags",
			version:   0,
			expected:  "tags_v0",
		},
		{
			name:      "games version 100",
			baseIndex: "games",
			version:   100,
			expected:  "games_v100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getVersionedIndexName(tt.baseIndex, tt.version)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestParseVersionFromIndexName(t *testing.T) {
	tests := []struct {
		name       string
		baseIndex  string
		indexName  string
		expected   int
		shouldParse bool
	}{
		{
			name:       "clips_v1",
			baseIndex:  "clips",
			indexName:  "clips_v1",
			expected:   1,
			shouldParse: true,
		},
		{
			name:       "clips_v10",
			baseIndex:  "clips",
			indexName:  "clips_v10",
			expected:   10,
			shouldParse: true,
		},
		{
			name:       "users_v5",
			baseIndex:  "users",
			indexName:  "users_v5",
			expected:   5,
			shouldParse: true,
		},
		{
			name:       "non-versioned index",
			baseIndex:  "clips",
			indexName:  "clips",
			expected:   0,
			shouldParse: false,
		},
		{
			name:       "different base index",
			baseIndex:  "clips",
			indexName:  "users_v1",
			expected:   0,
			shouldParse: false,
		},
		{
			name:       "malformed version",
			baseIndex:  "clips",
			indexName:  "clips_vABC",
			expected:   0,
			shouldParse: false,
		},
		{
			name:       "empty index name",
			baseIndex:  "clips",
			indexName:  "",
			expected:   0,
			shouldParse: false,
		},
		{
			name:       "clips_v0",
			baseIndex:  "clips",
			indexName:  "clips_v0",
			expected:   0,
			shouldParse: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			version, ok := parseVersionFromIndexName(tt.baseIndex, tt.indexName)
			assert.Equal(t, tt.shouldParse, ok, "parse success mismatch")
			if tt.shouldParse {
				assert.Equal(t, tt.expected, version, "version mismatch")
			}
		})
	}
}

func TestIndexVersionInfo_Empty(t *testing.T) {
	info := &IndexVersionInfo{
		BaseIndex:   "clips",
		AllVersions: []IndexVersion{},
	}

	assert.Equal(t, "clips", info.BaseIndex)
	assert.Empty(t, info.AllVersions)
	assert.Nil(t, info.ActiveVersion)
	assert.Equal(t, 0, info.TotalVersions)
	assert.Equal(t, 0, info.LatestVersion)
}

func TestIndexVersion_Fields(t *testing.T) {
	version := IndexVersion{
		Name:      "clips_v1",
		Version:   1,
		Alias:     "clips",
		DocCount:  1000,
		SizeBytes: 1024 * 1024,
		IsActive:  true,
	}

	assert.Equal(t, "clips_v1", version.Name)
	assert.Equal(t, 1, version.Version)
	assert.Equal(t, "clips", version.Alias)
	assert.Equal(t, int64(1000), version.DocCount)
	assert.Equal(t, int64(1024*1024), version.SizeBytes)
	assert.True(t, version.IsActive)
}

func TestDefaultRebuildConfig(t *testing.T) {
	config := DefaultRebuildConfig()

	assert.Equal(t, 100, config.BatchSize)
	assert.Equal(t, 2, config.KeepOldVersions)
	assert.True(t, config.SwapAfterBuild)
	assert.True(t, config.Verbose)
	assert.Equal(t, 100*time.Millisecond, config.BatchDelay)
}

func TestRebuildConfig_Custom(t *testing.T) {
	config := &RebuildConfig{
		BatchSize:       500,
		KeepOldVersions: 5,
		SwapAfterBuild:  false,
		Verbose:         false,
		BatchDelay:      200 * time.Millisecond,
	}

	assert.Equal(t, 500, config.BatchSize)
	assert.Equal(t, 5, config.KeepOldVersions)
	assert.False(t, config.SwapAfterBuild)
	assert.False(t, config.Verbose)
	assert.Equal(t, 200*time.Millisecond, config.BatchDelay)
}

func TestRebuildResult_Success(t *testing.T) {
	result := RebuildResult{
		BaseIndex:      "clips",
		NewVersion:     2,
		NewIndexName:   "clips_v2",
		DocCount:       1000,
		SwappedAlias:   true,
		DeletedIndices: []string{"clips_v0"},
	}

	assert.Equal(t, "clips", result.BaseIndex)
	assert.Equal(t, 2, result.NewVersion)
	assert.Equal(t, "clips_v2", result.NewIndexName)
	assert.Equal(t, int64(1000), result.DocCount)
	assert.True(t, result.SwappedAlias)
	assert.Len(t, result.DeletedIndices, 1)
	assert.Empty(t, result.Error)
}

func TestRebuildResult_WithError(t *testing.T) {
	result := RebuildResult{
		BaseIndex:    "clips",
		NewVersion:   2,
		NewIndexName: "clips_v2",
		Error:        "failed to create index",
	}

	assert.Equal(t, "clips", result.BaseIndex)
	assert.NotEmpty(t, result.Error)
	assert.Equal(t, "failed to create index", result.Error)
}

func TestRebuildAllResult_Success(t *testing.T) {
	result := RebuildAllResult{
		Results: []RebuildResult{
			{BaseIndex: "clips", NewVersion: 1, DocCount: 1000},
			{BaseIndex: "users", NewVersion: 1, DocCount: 100},
		},
		Success: true,
	}

	assert.True(t, result.Success)
	assert.Len(t, result.Results, 2)
	assert.Empty(t, result.Errors)
}

func TestRebuildAllResult_WithErrors(t *testing.T) {
	result := RebuildAllResult{
		Results: []RebuildResult{
			{BaseIndex: "clips", NewVersion: 1, DocCount: 1000},
			{BaseIndex: "users", Error: "failed"},
		},
		Success: false,
		Errors:  []string{"users: failed"},
	}

	assert.False(t, result.Success)
	assert.Len(t, result.Results, 2)
	assert.Len(t, result.Errors, 1)
	assert.Contains(t, result.Errors[0], "users")
}

func TestIndexConstants(t *testing.T) {
	// Verify index constants match expected values
	assert.Equal(t, "clips", ClipsIndex)
	assert.Equal(t, "users", UsersIndex)
	assert.Equal(t, "games", GamesIndex)
	assert.Equal(t, "tags", TagsIndex)
}
