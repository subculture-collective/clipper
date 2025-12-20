package services

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/models"
)

// MockCDNRepository is a mock implementation of CDNRepository
type MockCDNRepository struct {
	mock.Mock
}

func (m *MockCDNRepository) CreateMetric(ctx context.Context, metric *models.CDNMetrics) error {
	args := m.Called(ctx, metric)
	return args.Error(0)
}

func TestCDNService_GetCacheHeaders(t *testing.T) {
	mockCDNRepo := new(MockCDNRepository)

	config := &config.CDNConfig{
		Enabled:  true,
		Provider: models.CDNProviderCloudflare,
		CacheTTL: 3600,
	}

	service := NewCDNService(mockCDNRepo, config)

	t.Run("get cache headers when enabled", func(t *testing.T) {
		headers := service.GetCacheHeaders()

		assert.NotEmpty(t, headers)
		assert.Contains(t, headers, "Cache-Control")
	})

	t.Run("get default headers when disabled", func(t *testing.T) {
		disabledConfig := &config.CDNConfig{Enabled: false}
		disabledService := NewCDNService(mockCDNRepo, disabledConfig)

		headers := disabledService.GetCacheHeaders()

		assert.NotEmpty(t, headers)
		assert.Contains(t, headers, "Cache-Control")
	})
}

func TestCDNService_GetCDNURL_Disabled(t *testing.T) {
	mockCDNRepo := new(MockCDNRepository)

	config := &config.CDNConfig{
		Enabled: false,
	}

	service := NewCDNService(mockCDNRepo, config)

	ctx := context.Background()
	clip := &models.Clip{
		TwitchClipID: "test-clip-123",
	}

	url, err := service.GetCDNURL(ctx, clip)

	assert.NoError(t, err)
	assert.Empty(t, url)
}

func TestCloudflareProvider_GenerateURL(t *testing.T) {
	provider := NewCloudflareProvider("zone-id", "api-key", 3600)

	videoURL := "https://clips.twitch.tv/test.mp4"
	clip := &models.Clip{
		TwitchClipID: "test-clip-123",
		VideoURL:     &videoURL,
	}

	url, err := provider.GenerateURL(clip)

	assert.NoError(t, err)
	assert.NotEmpty(t, url)
	assert.Contains(t, url, "cdn.cloudflare.clipper.gg")
}

func TestCloudflareProvider_GetCacheHeaders(t *testing.T) {
	provider := NewCloudflareProvider("zone-id", "api-key", 7200)

	headers := provider.GetCacheHeaders()

	assert.NotEmpty(t, headers)
	assert.Contains(t, headers, "Cache-Control")
	assert.Contains(t, headers["Cache-Control"], "7200")
}

func TestBunnyProvider_GenerateURL(t *testing.T) {
	provider := NewBunnyProvider("api-key", "storage-zone", 3600)

	videoURL := "https://clips.twitch.tv/test.mp4"
	clip := &models.Clip{
		TwitchClipID: "test-clip-123",
		VideoURL:     &videoURL,
	}

	url, err := provider.GenerateURL(clip)

	assert.NoError(t, err)
	assert.NotEmpty(t, url)
	assert.Contains(t, url, "b-cdn.net")
}

func TestBunnyProvider_GetCacheHeaders(t *testing.T) {
	provider := NewBunnyProvider("api-key", "storage-zone", 3600)

	headers := provider.GetCacheHeaders()

	assert.NotEmpty(t, headers)
	assert.Contains(t, headers, "Cache-Control")
}

func TestAWSCloudFrontProvider_GenerateURL(t *testing.T) {
	provider := NewAWSCloudFrontProvider("access-key", "secret-key", "us-east-1", 3600)

	videoURL := "https://clips.twitch.tv/test.mp4"
	clip := &models.Clip{
		TwitchClipID: "test-clip-123",
		VideoURL:     &videoURL,
	}

	url, err := provider.GenerateURL(clip)

	assert.NoError(t, err)
	assert.NotEmpty(t, url)
	assert.Contains(t, url, "cloudfront.net")
}

func TestAWSCloudFrontProvider_GetCacheHeaders(t *testing.T) {
	provider := NewAWSCloudFrontProvider("access-key", "secret-key", "us-east-1", 3600)

	headers := provider.GetCacheHeaders()

	assert.NotEmpty(t, headers)
	assert.Contains(t, headers, "Cache-Control")
	assert.Contains(t, headers, "X-Cache")
}
