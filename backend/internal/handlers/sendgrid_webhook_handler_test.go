package handlers

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/subculture-collective/clipper/internal/models"
)

// generateTestKeyPair generates an ECDSA key pair for testing
func generateTestKeyPair() (*ecdsa.PrivateKey, string, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, "", err
	}

	// Export public key to PEM format
	pubKeyBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		return nil, "", err
	}

	pubKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	})

	return privateKey, string(pubKeyPEM), nil
}

// signPayload signs a payload with the given private key (SendGrid format)
func signPayload(privateKey *ecdsa.PrivateKey, timestamp string, payload []byte) (string, error) {
	// Construct signed payload: timestamp + body
	signedPayload := timestamp + string(payload)

	// Hash with SHA-256
	hash := sha256.Sum256([]byte(signedPayload))

	// Sign the hash
	r, s, err := ecdsa.Sign(rand.Reader, privateKey, hash[:])
	if err != nil {
		return "", err
	}

	// Encode as r||s (32 bytes each for P-256)
	// Pad to ensure r and s are each 32 bytes
	rBytes := make([]byte, 32)
	sBytes := make([]byte, 32)
	r.FillBytes(rBytes)
	s.FillBytes(sBytes)
	
	sig := append(rBytes, sBytes...)
	return base64.StdEncoding.EncodeToString(sig), nil
}

// mockEmailLogRepo is a simple mock that does nothing
type mockEmailLogRepo struct{}

func (m *mockEmailLogRepo) CreateEmailLog(ctx context.Context, log *models.EmailLog) error {
	return nil
}

func (m *mockEmailLogRepo) UpdateEmailLog(ctx context.Context, log *models.EmailLog) error {
	return nil
}

func (m *mockEmailLogRepo) GetEmailLogByMessageID(ctx context.Context, messageID string) (*models.EmailLog, error) {
	return nil, nil
}

func TestWebhookSignatureVerification_ValidSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Generate test key pair
	privateKey, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	// Create handler with public key
	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)
	
	// Use reflection or direct assignment to set mock repo for event processing
	// Since we just want to test signature verification, we'll create a minimal test
	// that doesn't process events

	// Create test event
	events := []models.SendGridWebhookEvent{
		{
			Email:       "test@example.com",
			Timestamp:   time.Now().Unix(),
			Event:       "delivered",
			SgMessageID: "test-message-id",
			SgEventID:   "test-event-id",
		},
	}
	payload, err := json.Marshal(events)
	assert.NoError(t, err)

	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	signature, err := signPayload(privateKey, timestamp, payload)
	assert.NoError(t, err)

	// Test verifySignature directly
	err = handler.verifySignature(payload, signature, timestamp)
	assert.NoError(t, err, "Valid signature should be accepted")
}

func TestWebhookSignatureVerification_InvalidSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Generate test key pair
	_, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	// Create handler with public key
	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	// Create test event
	events := []models.SendGridWebhookEvent{
		{
			Email:       "test@example.com",
			Timestamp:   time.Now().Unix(),
			Event:       "delivered",
			SgMessageID: "test-message-id",
		},
	}
	payload, err := json.Marshal(events)
	assert.NoError(t, err)

	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	
	// Create invalid signature (just random data)
	invalidSig := make([]byte, 64)
	rand.Read(invalidSig)
	invalidSignature := base64.StdEncoding.EncodeToString(invalidSig)

	// Test verifySignature directly
	err = handler.verifySignature(payload, invalidSignature, timestamp)
	assert.Error(t, err, "Invalid signature should be rejected")
	assert.Contains(t, err.Error(), "invalid signature")
}

func TestWebhookSignatureVerification_MissingSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Generate test key pair
	_, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	// Create handler with public key
	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	payload := []byte(`[{"email":"test@example.com"}]`)
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)

	// Test with empty signature
	err = handler.verifySignature(payload, "", timestamp)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "empty signature")
}

func TestWebhookSignatureVerification_MissingTimestamp(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Generate test key pair
	_, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	// Create handler with public key
	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	payload := []byte(`[{"email":"test@example.com"}]`)

	// Test with empty timestamp
	err = handler.verifySignature(payload, "some-signature", "")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "empty timestamp")
}

func TestWebhookSignatureVerification_ExpiredTimestamp(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Generate test key pair
	privateKey, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	// Create handler with public key
	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	// Create test event
	events := []models.SendGridWebhookEvent{
		{
			Email:     "test@example.com",
			Timestamp: time.Now().Unix(),
			Event:     "delivered",
		},
	}
	payload, err := json.Marshal(events)
	assert.NoError(t, err)

	// Create expired timestamp (6 minutes ago)
	expiredTime := time.Now().Add(-6 * time.Minute)
	timestamp := strconv.FormatInt(expiredTime.Unix(), 10)
	signature, err := signPayload(privateKey, timestamp, payload)
	assert.NoError(t, err)

	// Test verifySignature directly
	err = handler.verifySignature(payload, signature, timestamp)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "timestamp too old")
}

func TestWebhookSignatureVerification_FutureTimestamp(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Generate test key pair
	privateKey, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	// Create handler with public key
	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	// Create test event
	events := []models.SendGridWebhookEvent{
		{
			Email:     "test@example.com",
			Timestamp: time.Now().Unix(),
			Event:     "delivered",
		},
	}
	payload, err := json.Marshal(events)
	assert.NoError(t, err)

	// Create future timestamp (1 hour from now)
	futureTime := time.Now().Add(1 * time.Hour)
	timestamp := strconv.FormatInt(futureTime.Unix(), 10)
	signature, err := signPayload(privateKey, timestamp, payload)
	assert.NoError(t, err)

	// Test verifySignature directly
	err = handler.verifySignature(payload, signature, timestamp)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "timestamp is in the future")
}

func TestWebhookSignatureVerification_MalformedSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Generate test key pair
	_, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	// Create handler with public key
	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	payload := []byte(`[{"email":"test@example.com"}]`)
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)

	// Test with invalid base64
	err = handler.verifySignature(payload, "not-valid-base64!@#$", timestamp)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid signature encoding")
}

func TestWebhookSignatureVerification_NoPublicKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create handler without public key (empty string)
	handler := NewSendGridWebhookHandler(nil, "")

	// Verify that handler was created but publicKey is nil
	assert.Nil(t, handler.publicKey, "Handler should have nil publicKey when empty string is provided")
}

func TestWebhookSignatureVerification_InvalidPublicKey(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create handler with invalid public key
	handler := NewSendGridWebhookHandler(nil, "invalid-pem-key")

	// Verify that handler was created but publicKey is nil
	assert.Nil(t, handler.publicKey, "Handler should have nil publicKey when invalid PEM is provided")
}

func TestParseECDSAPublicKey_ValidPEM(t *testing.T) {
	// Generate test key pair
	_, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	// Parse it back
	publicKey, err := parseECDSAPublicKey(publicKeyPEM)
	assert.NoError(t, err)
	assert.NotNil(t, publicKey)
	assert.Equal(t, elliptic.P256(), publicKey.Curve)
}

func TestParseECDSAPublicKey_InvalidPEM(t *testing.T) {
	publicKey, err := parseECDSAPublicKey("not-a-pem-key")
	assert.Error(t, err)
	assert.Nil(t, publicKey)
	assert.Contains(t, err.Error(), "failed to parse PEM block")
}

func TestParseECDSAPublicKey_WrongKeyType(t *testing.T) {
	// Create a non-ECDSA key (just test invalid format)
	invalidPEM := `-----BEGIN PUBLIC KEY-----
invalid key data here
-----END PUBLIC KEY-----`

	publicKey, err := parseECDSAPublicKey(invalidPEM)
	assert.Error(t, err)
	assert.Nil(t, publicKey)
}

func TestWebhookSignatureVerification_InvalidTimestampFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)

	_, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	payload := []byte(`[{"email":"test@example.com"}]`)

	err = handler.verifySignature(payload, "dGVzdA==", "not-a-number")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid timestamp format")
}

func TestWebhookSignatureVerification_SignatureWithDifferentPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	privateKey, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	// Sign one payload
	payload1 := []byte(`[{"email":"test1@example.com"}]`)
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	signature, err := signPayload(privateKey, timestamp, payload1)
	assert.NoError(t, err)

	// Try to verify with different payload
	payload2 := []byte(`[{"email":"test2@example.com"}]`)
	err = handler.verifySignature(payload2, signature, timestamp)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid signature")
}

func TestWebhookSignatureVerification_SignatureWithDifferentTimestamp(t *testing.T) {
	gin.SetMode(gin.TestMode)

	privateKey, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	payload := []byte(`[{"email":"test@example.com"}]`)
	timestamp1 := strconv.FormatInt(time.Now().Unix(), 10)
	signature, err := signPayload(privateKey, timestamp1, payload)
	assert.NoError(t, err)

	// Try to verify with different timestamp
	timestamp2 := strconv.FormatInt(time.Now().Unix()-1, 10)
	err = handler.verifySignature(payload, signature, timestamp2)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid signature")
}

func TestWebhookSignatureVerification_EdgeCaseShortSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)

	_, publicKeyPEM, err := generateTestKeyPair()
	assert.NoError(t, err)

	handler := NewSendGridWebhookHandler(nil, publicKeyPEM)

	payload := []byte(`[{"email":"test@example.com"}]`)
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)

	// Create a short signature (less than 64 bytes when decoded)
	shortSig := base64.StdEncoding.EncodeToString([]byte("short"))
	err = handler.verifySignature(payload, shortSig, timestamp)
	assert.Error(t, err)
}
