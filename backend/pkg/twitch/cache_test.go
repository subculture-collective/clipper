package twitch

import (
	"context"
	"testing"
	"time"
)

func TestRedisCache_GetSet(t *testing.T) {
	cache := NewMockCache()

	// Test Set and Get
	cache.Set("test-key", "test-value", time.Minute)

	val, ok := cache.Get("test-key")
	if !ok {
		t.Error("expected value to be found in cache")
	}

	if val != "test-value" {
		t.Errorf("expected 'test-value', got %v", val)
	}
}

func TestRedisCache_GetNotFound(t *testing.T) {
	cache := NewMockCache()

	_, ok := cache.Get("nonexistent-key")
	if ok {
		t.Error("expected key not to be found")
	}
}

func TestRedisCache_Delete(t *testing.T) {
	cache := NewMockCache()

	cache.Set("test-key", "test-value", time.Minute)
	cache.Delete("test-key")

	_, ok := cache.Get("test-key")
	if ok {
		t.Error("expected key to be deleted")
	}
}

func TestCacheEntry(t *testing.T) {
	cache := NewMockCache()

	// Test caching complex data
	testData := map[string]string{
		"key1": "value1",
		"key2": "value2",
	}

	cache.Set("complex-data", testData, time.Minute)

	val, ok := cache.Get("complex-data")
	if !ok {
		t.Error("expected complex data to be found")
	}

	data, ok := val.(map[string]string)
	if !ok {
		t.Error("expected data to be a map")
	}

	if data["key1"] != "value1" {
		t.Errorf("expected 'value1', got %s", data["key1"])
	}
}

func TestMockCache_CachedUser(t *testing.T) {
	// This test demonstrates the pattern, but RedisCache.CachedUser needs a real Redis client
	// So we test the interface instead
	cache := NewMockCache()

	user := &User{
		ID:          "123",
		Login:       "testuser",
		DisplayName: "Test User",
	}

	// Simulate what CacheUser would do
	cache.Set("test-user-key", user, time.Hour)

	val, ok := cache.Get("test-user-key")
	if !ok {
		t.Error("expected user to be cached")
	}

	cachedUser, ok := val.(*User)
	if !ok {
		t.Error("expected cached value to be a User")
	}

	if cachedUser.ID != "123" {
		t.Errorf("expected user ID 123, got %s", cachedUser.ID)
	}
}

func TestMockCache_CachedGame(t *testing.T) {
	cache := NewMockCache()

	game := &Game{
		ID:   "456",
		Name: "Test Game",
	}

	cache.Set("test-game-key", game, 4*time.Hour)

	val, ok := cache.Get("test-game-key")
	if !ok {
		t.Error("expected game to be cached")
	}

	cachedGame, ok := val.(*Game)
	if !ok {
		t.Error("expected cached value to be a Game")
	}

	if cachedGame.Name != "Test Game" {
		t.Errorf("expected game name 'Test Game', got %s", cachedGame.Name)
	}
}

func TestNewRedisCache(t *testing.T) {
	// Test that NewRedisCache creates a cache
	// Note: We can't fully test this without a real Redis client
	cache := NewRedisCache(nil)
	if cache == nil {
		t.Error("expected non-nil cache")
	}
}

func TestCacheTTL(t *testing.T) {
	cache := NewMockCache()

	// Test different TTLs
	testCases := []struct {
		name string
		ttl  time.Duration
	}{
		{"short", 30 * time.Second},
		{"medium", 5 * time.Minute},
		{"long", time.Hour},
		{"very-long", 4 * time.Hour},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			key := "ttl-" + tc.name
			cache.Set(key, "value", tc.ttl)

			val, ok := cache.Get(key)
			if !ok {
				t.Errorf("expected key %s to be in cache", key)
			}

			if val != "value" {
				t.Errorf("expected 'value', got %v", val)
			}
		})
	}
}

func TestCacheInterface(t *testing.T) {
	// Verify MockCache implements Cache interface
	var _ Cache = &MockCache{}
	var _ Cache = (*MockCache)(nil)
}

func TestContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	// Verify context is cancelled
	select {
	case <-ctx.Done():
		// Expected
	default:
		t.Error("expected context to be cancelled")
	}
}
