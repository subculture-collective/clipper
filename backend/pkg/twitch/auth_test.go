package twitch

import (
	"context"
	"net/http"
	"testing"
	"time"
)

func TestAuthManager_GetToken(t *testing.T) {
	cache := NewMockCache()
	httpClient := &http.Client{Timeout: 10 * time.Second}
	authManager := NewAuthManager("test-client", "test-secret", httpClient, cache)

	// Set a valid token
	authManager.accessToken = "test-token"
	authManager.tokenExpiry = time.Now().Add(time.Hour)

	token, err := authManager.GetToken(context.Background())
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if token != "test-token" {
		t.Errorf("expected token 'test-token', got %s", token)
	}
}

func TestAuthManager_LoadFromCache(t *testing.T) {
	cache := NewMockCache()
	httpClient := &http.Client{Timeout: 10 * time.Second}
	authManager := NewAuthManager("test-client", "test-secret", httpClient, cache)

	// Set up cache with token
	expiry := time.Now().Add(time.Hour)
	cache.Set(cacheKeyPrefix+"access_token", "cached-token", time.Hour)
	cache.Set(cacheKeyPrefix+"token_expiry", expiry.Format(time.RFC3339), time.Hour)

	err := authManager.LoadFromCache(context.Background())
	if err != nil {
		t.Errorf("unexpected error loading from cache: %v", err)
	}

	if authManager.accessToken != "cached-token" {
		t.Errorf("expected token 'cached-token', got %s", authManager.accessToken)
	}
}

func TestAuthManager_LoadFromCache_NotFound(t *testing.T) {
	cache := NewMockCache()
	httpClient := &http.Client{Timeout: 10 * time.Second}
	authManager := NewAuthManager("test-client", "test-secret", httpClient, cache)

	err := authManager.LoadFromCache(context.Background())
	if err == nil {
		t.Error("expected error when cache is empty")
	}
}

func TestAuthManager_SaveToCache(t *testing.T) {
	cache := NewMockCache()
	httpClient := &http.Client{Timeout: 10 * time.Second}
	authManager := NewAuthManager("test-client", "test-secret", httpClient, cache)

	authManager.accessToken = "test-token"
	authManager.tokenExpiry = time.Now().Add(time.Hour)

	err := authManager.SaveToCache(context.Background())
	if err != nil {
		t.Errorf("unexpected error saving to cache: %v", err)
	}

	// Verify token is in cache
	token, ok := cache.Get(cacheKeyPrefix + "access_token")
	if !ok {
		t.Error("token not found in cache")
	}

	if token != "test-token" {
		t.Errorf("expected cached token 'test-token', got %v", token)
	}
}
