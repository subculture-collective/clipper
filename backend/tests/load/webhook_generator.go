package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

// WebhookEvent represents a test webhook event
type WebhookEvent struct {
	Event     string                 `json:"event"`
	EventID   string                 `json:"event_id"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

// WebhookTestCase represents a test event with expected behavior
type WebhookTestCase struct {
	Event            WebhookEvent
	Payload          string
	Signature        string
	ExpectedOutcome  string // "success", "failure", "timeout"
	InvalidSignature bool
}

// WebhookGenerator generates test webhook events
type WebhookGenerator struct {
	secret string
	rand   *rand.Rand
}

// NewWebhookGenerator creates a new webhook generator
func NewWebhookGenerator(secret string) *WebhookGenerator {
	return &WebhookGenerator{
		secret: secret,
		rand:   rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// GenerateSignature generates HMAC-SHA256 signature for a payload
func (g *WebhookGenerator) GenerateSignature(payload string) string {
	h := hmac.New(sha256.New, []byte(g.secret))
	h.Write([]byte(payload))
	return hex.EncodeToString(h.Sum(nil))
}

// GenerateInvalidSignature generates an invalid signature for testing
func (g *WebhookGenerator) GenerateInvalidSignature() string {
	// Generate random bytes to simulate an invalid but realistic-looking signature
	randomBytes := make([]byte, 32)
	g.rand.Read(randomBytes)
	return hex.EncodeToString(randomBytes)
}

// GenerateClipSubmittedEvent generates a clip.submitted event
func (g *WebhookGenerator) GenerateClipSubmittedEvent() WebhookEvent {
	return WebhookEvent{
		Event:     "clip.submitted",
		EventID:   uuid.New().String(),
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"submission_id": uuid.New().String(),
			"clip_id":       uuid.New().String(),
			"user_id":       uuid.New().String(),
			"title":         fmt.Sprintf("Test Clip %d", g.rand.Intn(10000)),
			"description":   "Test clip for load testing",
			"game":          g.randomGame(),
			"submitted_at":  time.Now().Format(time.RFC3339),
		},
	}
}

// GenerateClipApprovedEvent generates a clip.approved event
func (g *WebhookGenerator) GenerateClipApprovedEvent() WebhookEvent {
	return WebhookEvent{
		Event:     "clip.approved",
		EventID:   uuid.New().String(),
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"clip_id":     uuid.New().String(),
			"user_id":     uuid.New().String(),
			"approved_by": uuid.New().String(),
			"approved_at": time.Now().Format(time.RFC3339),
		},
	}
}

// GenerateClipRejectedEvent generates a clip.rejected event
func (g *WebhookGenerator) GenerateClipRejectedEvent() WebhookEvent {
	return WebhookEvent{
		Event:     "clip.rejected",
		EventID:   uuid.New().String(),
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"submission_id": uuid.New().String(),
			"clip_id":       uuid.New().String(),
			"user_id":       uuid.New().String(),
			"rejected_by":   uuid.New().String(),
			"rejected_at":   time.Now().Format(time.RFC3339),
			"reason":        "Does not meet content guidelines",
		},
	}
}

// GenerateTestCase generates a single test case with specified outcome
func (g *WebhookGenerator) GenerateTestCase(eventType string, outcome string) (*WebhookTestCase, error) {
	var event WebhookEvent

	switch eventType {
	case "clip.submitted":
		event = g.GenerateClipSubmittedEvent()
	case "clip.approved":
		event = g.GenerateClipApprovedEvent()
	case "clip.rejected":
		event = g.GenerateClipRejectedEvent()
	case "random":
		// Randomly select an event type
		eventTypes := []string{"clip.submitted", "clip.approved", "clip.rejected"}
		eventType = eventTypes[g.rand.Intn(len(eventTypes))]
		return g.GenerateTestCase(eventType, outcome)
	default:
		return nil, fmt.Errorf("unknown event type: %s", eventType)
	}

	payload, err := json.Marshal(event)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal event: %w", err)
	}

	testCase := &WebhookTestCase{
		Event:           event,
		Payload:         string(payload),
		ExpectedOutcome: outcome,
	}

	// Generate signature based on outcome
	if outcome == "invalid_signature" {
		testCase.Signature = g.GenerateInvalidSignature()
		testCase.InvalidSignature = true
	} else {
		testCase.Signature = g.GenerateSignature(string(payload))
		testCase.InvalidSignature = false
	}

	return testCase, nil
}

// GenerateTestBatch generates a batch of test cases with mixed outcomes
func (g *WebhookGenerator) GenerateTestBatch(count int) ([]*WebhookTestCase, error) {
	testCases := make([]*WebhookTestCase, 0, count)

	// Distribution of outcomes:
	// 70% success
	// 15% failure (server errors)
	// 10% timeout (network delays)
	// 5% invalid signature

	for i := 0; i < count; i++ {
		var outcome string
		roll := g.rand.Float64()

		if roll < 0.70 {
			outcome = "success"
		} else if roll < 0.85 {
			outcome = "failure"
		} else if roll < 0.95 {
			outcome = "timeout"
		} else {
			outcome = "invalid_signature"
		}

		testCase, err := g.GenerateTestCase("random", outcome)
		if err != nil {
			return nil, fmt.Errorf("failed to generate test case %d: %w", i, err)
		}

		testCases = append(testCases, testCase)
	}

	return testCases, nil
}

// randomGame returns a random game name for testing
func (g *WebhookGenerator) randomGame() string {
	games := []string{
		"Valorant",
		"League of Legends",
		"Counter-Strike 2",
		"Dota 2",
		"Apex Legends",
		"Overwatch 2",
		"Fortnite",
		"Call of Duty",
		"Rocket League",
		"Rainbow Six Siege",
	}
	return games[g.rand.Intn(len(games))]
}

// SaveTestCasesToFile saves test cases to a JSON file
func SaveTestCasesToFile(testCases []*WebhookTestCase, filename string) error {
	data, err := json.MarshalIndent(testCases, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal test cases: %w", err)
	}

	// Note: In actual implementation, would write to file
	// For now, just print summary
	fmt.Printf("Generated %d test cases (total size: %d bytes)\n", len(testCases), len(data))
	return nil
}

// PrintTestCasesSummary prints a summary of test cases
func PrintTestCasesSummary(testCases []*WebhookTestCase) {
	successCount := 0
	failureCount := 0
	timeoutCount := 0
	invalidSigCount := 0

	eventCounts := make(map[string]int)

	for _, tc := range testCases {
		eventCounts[tc.Event.Event]++

		switch tc.ExpectedOutcome {
		case "success":
			successCount++
		case "failure":
			failureCount++
		case "timeout":
			timeoutCount++
		case "invalid_signature":
			invalidSigCount++
		}
	}

	fmt.Println("\n=== Test Cases Summary ===")
	fmt.Printf("Total: %d\n", len(testCases))
	fmt.Printf("Success: %d (%.1f%%)\n", successCount, float64(successCount)/float64(len(testCases))*100)
	fmt.Printf("Failure: %d (%.1f%%)\n", failureCount, float64(failureCount)/float64(len(testCases))*100)
	fmt.Printf("Timeout: %d (%.1f%%)\n", timeoutCount, float64(timeoutCount)/float64(len(testCases))*100)
	fmt.Printf("Invalid Signature: %d (%.1f%%)\n", invalidSigCount, float64(invalidSigCount)/float64(len(testCases))*100)
	fmt.Println("\nEvent Distribution:")
	for event, count := range eventCounts {
		fmt.Printf("  %s: %d (%.1f%%)\n", event, count, float64(count)/float64(len(testCases))*100)
	}
}

// PrintSampleTestCase prints a sample test case for verification
func PrintSampleTestCase(tc *WebhookTestCase) {
	fmt.Println("\n=== Sample Test Case ===")
	fmt.Printf("Event Type: %s\n", tc.Event.Event)
	fmt.Printf("Event ID: %s\n", tc.Event.EventID)
	fmt.Printf("Expected Outcome: %s\n", tc.ExpectedOutcome)
	fmt.Printf("Invalid Signature: %t\n", tc.InvalidSignature)
	fmt.Printf("Signature: %s\n", tc.Signature)
	fmt.Printf("Payload:\n%s\n", tc.Payload)
}

func main() {
	secret := flag.String("secret", "test-webhook-secret-12345", "Webhook secret for signature generation")
	count := flag.Int("count", 100, "Number of test events to generate")
	showSample := flag.Bool("sample", false, "Show a sample test case")

	flag.Parse()

	log.Printf("Generating %d test webhook events with secret: %s\n", *count, *secret)

	generator := NewWebhookGenerator(*secret)

	testCases, err := generator.GenerateTestBatch(*count)
	if err != nil {
		log.Fatalf("Failed to generate test batch: %v", err)
	}

	PrintTestCasesSummary(testCases)

	if *showSample && len(testCases) > 0 {
		PrintSampleTestCase(testCases[0])
	}

	// Save to file (commented out for now)
	// if err := SaveTestCasesToFile(testCases, "webhook_test_cases.json"); err != nil {
	// 	log.Fatalf("Failed to save test cases: %v", err)
	// }

	log.Println("\nWebhook test event generation completed successfully!")
}
