//go:build integration

package mocks_test

import (
	"bytes"
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/pkg/twitch"
	"github.com/subculture-collective/clipper/tests/integration/mocks"
)

// TestMockTwitchClient demonstrates the usage of the Twitch mock
func TestMockTwitchClient(t *testing.T) {
	mockTwitch := mocks.NewMockTwitchClient()
	defer mockTwitch.Reset()

	t.Run("GetUsers_Success", func(t *testing.T) {
		// Add mock user
		mockTwitch.AddUser(&twitch.User{
			ID:          "12345",
			Login:       "testuser",
			DisplayName: "Test User",
		})

		// Call the mock
		ctx := context.Background()
		users, err := mockTwitch.GetUsers(ctx, []string{"12345"}, nil)

		// Verify
		require.NoError(t, err)
		require.Len(t, users.Data, 1)
		assert.Equal(t, "testuser", users.Data[0].Login)
		assert.Equal(t, 1, mockTwitch.GetUsersCalls)
	})

	t.Run("GetUsers_ErrorInjection", func(t *testing.T) {
		mockTwitch.Reset()
		mockTwitch.GetUsersError = errors.New("API unavailable")

		ctx := context.Background()
		_, err := mockTwitch.GetUsers(ctx, []string{"12345"}, nil)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "API unavailable")
	})

	t.Run("ValidateClip_NotFound", func(t *testing.T) {
		mockTwitch.Reset()

		ctx := context.Background()
		_, err := mockTwitch.ValidateClip(ctx, "nonexistent")

		require.Error(t, err)
		assert.Contains(t, err.Error(), "clip not found")
	})
}

// TestMockEmailService demonstrates the usage of the Email mock
func TestMockEmailService(t *testing.T) {
	mockEmail := mocks.NewMockEmailService()
	defer mockEmail.Reset()

	t.Run("SendEmail_Success", func(t *testing.T) {
		err := mockEmail.SendEmail(
			[]string{"user@example.com"},
			"Welcome",
			"<h1>Welcome!</h1>",
			"Welcome!",
		)

		require.NoError(t, err)
		assert.Equal(t, 1, mockEmail.SendEmailCalls)

		// Verify email was stored
		emails := mockEmail.GetEmailsSentTo("user@example.com")
		require.Len(t, emails, 1)
		assert.Equal(t, "Welcome", emails[0].Subject)
	})

	t.Run("SendTemplateEmail_Success", func(t *testing.T) {
		mockEmail.Reset()

		err := mockEmail.SendTemplateEmail(
			[]string{"user@example.com"},
			"welcome-template",
			map[string]interface{}{"name": "John"},
		)

		require.NoError(t, err)

		// Verify template email
		templateEmails := mockEmail.GetEmailsWithTemplate("welcome-template")
		require.Len(t, templateEmails, 1)
		assert.Equal(t, "John", templateEmails[0].TemplateData["name"])
	})

	t.Run("SendEmail_RecipientFailure", func(t *testing.T) {
		mockEmail.Reset()
		mockEmail.FailOnRecipient = "blocked@example.com"

		err := mockEmail.SendEmail(
			[]string{"blocked@example.com"},
			"Test",
			"",
			"",
		)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "blocked@example.com")
	})
}

// TestMockStripeClient demonstrates the usage of the Stripe mock
func TestMockStripeClient(t *testing.T) {
	mockStripe := mocks.NewMockStripeClient()
	defer mockStripe.Reset()

	t.Run("CreateCustomer_Success", func(t *testing.T) {
		customerID, err := mockStripe.CreateCustomer(
			"user@example.com",
			map[string]string{"user_id": "123"},
		)

		require.NoError(t, err)
		assert.NotEmpty(t, customerID)
		assert.Equal(t, 1, mockStripe.CreateCustomerCalls)

		// Verify customer was stored
		customer, err := mockStripe.GetCustomer(customerID)
		require.NoError(t, err)
		assert.Equal(t, "user@example.com", customer.Email)
	})

	t.Run("SubscriptionLifecycle", func(t *testing.T) {
		mockStripe.Reset()

		// Create customer
		customerID, err := mockStripe.CreateCustomer("user@example.com", nil)
		require.NoError(t, err)

		// Create subscription
		subID, err := mockStripe.CreateSubscription(customerID, "price_123")
		require.NoError(t, err)
		assert.NotEmpty(t, subID)

		// Get subscription
		sub, err := mockStripe.GetSubscription(subID)
		require.NoError(t, err)
		assert.Equal(t, "active", sub.Status)

		// Cancel subscription
		err = mockStripe.CancelSubscription(subID)
		require.NoError(t, err)

		// Verify cancellation
		sub, err = mockStripe.GetSubscription(subID)
		require.NoError(t, err)
		assert.Equal(t, "canceled", sub.Status)
		assert.NotNil(t, sub.CanceledAt)
	})

	t.Run("CreateSubscription_InvalidCustomer", func(t *testing.T) {
		mockStripe.Reset()

		_, err := mockStripe.CreateSubscription("invalid", "price_123")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "customer not found")
	})
}

// TestMockStorageService demonstrates the usage of the Storage mock
func TestMockStorageService(t *testing.T) {
	mockStorage := mocks.NewMockStorageService()
	defer mockStorage.Reset()

	t.Run("UploadFile_Success", func(t *testing.T) {
		content := bytes.NewReader([]byte("test content"))
		url, err := mockStorage.UploadFile("files/test.txt", content, "text/plain")

		require.NoError(t, err)
		assert.Contains(t, url, "files/test.txt")
		assert.Equal(t, 1, mockStorage.UploadFileCalls)

		// Verify file exists
		exists, err := mockStorage.FileExists("files/test.txt")
		require.NoError(t, err)
		assert.True(t, exists)
	})

	t.Run("GetFile_Success", func(t *testing.T) {
		mockStorage.Reset()

		// Upload file
		content := bytes.NewReader([]byte("test content"))
		_, err := mockStorage.UploadFile("files/test.txt", content, "text/plain")
		require.NoError(t, err)

		// Get file
		file, err := mockStorage.GetFile("files/test.txt")
		require.NoError(t, err)
		assert.Equal(t, []byte("test content"), file.Content)
		assert.Equal(t, "text/plain", file.ContentType)
	})

	t.Run("DeleteFile_Success", func(t *testing.T) {
		mockStorage.Reset()

		// Upload file
		content := bytes.NewReader([]byte("test content"))
		_, err := mockStorage.UploadFile("files/test.txt", content, "text/plain")
		require.NoError(t, err)

		// Delete file
		err = mockStorage.DeleteFile("files/test.txt")
		require.NoError(t, err)

		// Verify file is gone
		exists, err := mockStorage.FileExists("files/test.txt")
		require.NoError(t, err)
		assert.False(t, exists)
	})

	t.Run("GetFilesByPrefix", func(t *testing.T) {
		mockStorage.Reset()

		// Upload multiple files
		files := []string{"users/1/avatar.jpg", "users/2/avatar.jpg", "clips/1/thumbnail.jpg"}
		for _, key := range files {
			content := bytes.NewReader([]byte("content"))
			_, err := mockStorage.UploadFile(key, content, "image/jpeg")
			require.NoError(t, err)
		}

		// Get files with prefix
		userFiles := mockStorage.GetFilesByPrefix("users/")
		require.Len(t, userFiles, 2)

		clipFiles := mockStorage.GetFilesByPrefix("clips/")
		require.Len(t, clipFiles, 1)
	})
}

// TestMockLatencySimulation demonstrates latency simulation
func TestMockLatencySimulation(t *testing.T) {
	t.Run("TwitchLatency", func(t *testing.T) {
		mockTwitch := mocks.NewMockTwitchClient()
		mockTwitch.SimulateLatency = 100 * time.Millisecond

		mockTwitch.AddUser(&twitch.User{ID: "123", Login: "test"})

		start := time.Now()
		ctx := context.Background()
		_, err := mockTwitch.GetUsers(ctx, []string{"123"}, nil)
		elapsed := time.Since(start)

		require.NoError(t, err)
		assert.GreaterOrEqual(t, elapsed, 100*time.Millisecond)
	})
}

// TestMockParallelSafety demonstrates thread-safe mock operations
func TestMockParallelSafety(t *testing.T) {
	mockTwitch := mocks.NewMockTwitchClient()
	ctx := context.Background()

	// Add initial data
	for i := 0; i < 10; i++ {
		mockTwitch.AddUser(&twitch.User{
			ID:    string(rune('0' + i)),
			Login: string(rune('a' + i)),
		})
	}

	// Run parallel operations
	t.Run("Parallel", func(t *testing.T) {
		for i := 0; i < 10; i++ {
			i := i
			t.Run("Case", func(t *testing.T) {
				t.Parallel()

				// Safe to call concurrently
				_, err := mockTwitch.GetUsers(ctx, []string{string(rune('0' + i))}, nil)
				require.NoError(t, err)
			})
		}
	})

	// Verify all calls were tracked
	assert.GreaterOrEqual(t, mockTwitch.GetUsersCalls, 10)
}
