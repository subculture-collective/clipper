# Integration Test Mocks

This directory contains interface-based mocks for external dependencies used in integration tests.

## Available Mocks

### TwitchClientMock
Mock implementation for Twitch API client operations.

**Features:**
- Mock clips, users, games, and streams
- Call tracking for all operations
- Error injection for testing failure scenarios
- Latency simulation for performance testing
- Thread-safe operations

**Usage:**
```go
mockTwitch := mocks.NewMockTwitchClient()

// Add mock data
mockTwitch.AddUser(&twitch.User{
    ID:    "12345",
    Login: "testuser",
    DisplayName: "Test User",
})

mockTwitch.AddClip(&twitch.Clip{
    ID:            "clip123",
    BroadcasterID: "12345",
    Title:         "Epic Clip",
})

// Use in tests
users, err := mockTwitch.GetUsers(ctx, []string{"12345"}, nil)
require.NoError(t, err)
require.Len(t, users.Data, 1)

// Verify calls
assert.Equal(t, 1, mockTwitch.GetUsersCalls)

// Test error scenarios
mockTwitch.GetUsersError = errors.New("API unavailable")
_, err = mockTwitch.GetUsers(ctx, []string{"12345"}, nil)
require.Error(t, err)
```

### EmailServiceMock
Mock implementation for email service operations.

**Features:**
- Stores all "sent" emails for verification
- Template email support
- Call tracking
- Error injection
- Recipient-specific failure simulation
- Query helpers for verification

**Usage:**
```go
mockEmail := mocks.NewMockEmailService()

// Send email
err := mockEmail.SendEmail(
    []string{"user@example.com"},
    "Welcome",
    "<h1>Welcome!</h1>",
    "Welcome!",
)
require.NoError(t, err)

// Verify email was sent
emails := mockEmail.GetEmailsSentTo("user@example.com")
require.Len(t, emails, 1)
assert.Equal(t, "Welcome", emails[0].Subject)

// Test template emails
err = mockEmail.SendTemplateEmail(
    []string{"user@example.com"},
    "welcome-template",
    map[string]interface{}{"name": "John"},
)
require.NoError(t, err)

templateEmails := mockEmail.GetEmailsWithTemplate("welcome-template")
require.Len(t, templateEmails, 1)
```

### StripeClientMock
Mock implementation for Stripe payment operations.

**Features:**
- Mock customers, subscriptions, and checkout sessions
- Webhook event simulation
- Call tracking
- Error injection
- Status management (active, canceled, etc.)

**Usage:**
```go
mockStripe := mocks.NewMockStripeClient()

// Create customer
customerID, err := mockStripe.CreateCustomer(
    "user@example.com",
    map[string]string{"user_id": "123"},
)
require.NoError(t, err)

// Create subscription
subID, err := mockStripe.CreateSubscription(customerID, "price_123")
require.NoError(t, err)

// Get subscription
sub, err := mockStripe.GetSubscription(subID)
require.NoError(t, err)
assert.Equal(t, "active", sub.Status)

// Cancel subscription
err = mockStripe.CancelSubscription(subID)
require.NoError(t, err)

sub, _ = mockStripe.GetSubscription(subID)
assert.Equal(t, "canceled", sub.Status)

// Verify call counts
assert.Equal(t, 1, mockStripe.CreateCustomerCalls)
assert.Equal(t, 1, mockStripe.CreateSubscriptionCalls)
```

### StorageServiceMock
Mock implementation for file storage/CDN operations.

**Features:**
- In-memory file storage
- URL generation
- File existence checking
- Query by prefix
- Call tracking
- Error injection

**Usage:**
```go
mockStorage := mocks.NewMockStorageService()

// Upload file
content := bytes.NewReader([]byte("test content"))
url, err := mockStorage.UploadFile("files/test.txt", content, "text/plain")
require.NoError(t, err)
assert.Contains(t, url, "files/test.txt")

// Check file exists
exists, err := mockStorage.FileExists("files/test.txt")
require.NoError(t, err)
assert.True(t, exists)

// Get file
file, err := mockStorage.GetFile("files/test.txt")
require.NoError(t, err)
assert.Equal(t, []byte("test content"), file.Content)

// List files with prefix
files := mockStorage.GetFilesByPrefix("files/")
require.Len(t, files, 1)

// Delete file
err = mockStorage.DeleteFile("files/test.txt")
require.NoError(t, err)
```

## Common Patterns

### Reset Between Tests
Always reset mocks between test cases to ensure isolation:

```go
func TestSomething(t *testing.T) {
    mockTwitch := mocks.NewMockTwitchClient()
    defer mockTwitch.Reset()

    t.Run("Case1", func(t *testing.T) {
        // Test case 1
    })

    t.Run("Case2", func(t *testing.T) {
        mockTwitch.Reset() // Reset state between subtests
        // Test case 2
    })
}
```

### Error Injection
Test error handling by injecting errors:

```go
mockEmail := mocks.NewMockEmailService()

// Inject error
mockEmail.SendEmailError = errors.New("SMTP connection failed")

err := mockEmail.SendEmail([]string{"test@example.com"}, "Test", "", "")
require.Error(t, err)
assert.Contains(t, err.Error(), "SMTP connection failed")
```

### Latency Simulation
Test timeout handling and performance:

```go
mockStripe := mocks.NewMockStripeClient()
mockStripe.SimulateLatency = 2 * time.Second

start := time.Now()
_, err := mockStripe.CreateCustomer("test@example.com", nil)
elapsed := time.Since(start)

require.NoError(t, err)
assert.GreaterOrEqual(t, elapsed, 2*time.Second)
```

### Recipient-Specific Failures (Email)
Test handling of partial failures:

```go
mockEmail := mocks.NewMockEmailService()
mockEmail.FailOnRecipient = "blocked@example.com"

// This succeeds
err := mockEmail.SendEmail([]string{"valid@example.com"}, "Test", "", "")
require.NoError(t, err)

// This fails
err = mockEmail.SendEmail([]string{"blocked@example.com"}, "Test", "", "")
require.Error(t, err)
```

## Testing Best Practices

1. **Always reset mocks** between test cases to ensure isolation
2. **Verify call counts** to ensure the right number of operations occurred
3. **Test error scenarios** using error injection
4. **Use latency simulation** sparingly to test timeouts without slowing down the suite
5. **Check mock state** (e.g., emails sent, files uploaded) to verify side effects
6. **Keep mock data minimal** - only add what's needed for the specific test

## Thread Safety

All mocks are thread-safe and can be used in parallel tests:

```go
t.Run("Parallel", func(t *testing.T) {
    mockTwitch := mocks.NewMockTwitchClient()
    
    for i := 0; i < 10; i++ {
        i := i // capture loop variable
        t.Run(fmt.Sprintf("Case%d", i), func(t *testing.T) {
            t.Parallel()
            
            // Safe to use mockTwitch concurrently
            mockTwitch.AddUser(&twitch.User{
                ID:    fmt.Sprintf("user%d", i),
                Login: fmt.Sprintf("user%d", i),
            })
        })
    }
})
```

## Extending Mocks

When adding new methods to mocks:

1. Add the method to the interface at the top of the file
2. Implement the method with proper locking
3. Add call tracking
4. Support error injection via a corresponding error field
5. Update this README with usage examples
6. Write a test demonstrating the new functionality
