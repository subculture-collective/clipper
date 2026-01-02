package telemetry

import (
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewHTTPClient(t *testing.T) {
	client := NewHTTPClient()

	assert.NotNil(t, client)
	assert.NotNil(t, client.Transport)
}

func TestWrapHTTPClient(t *testing.T) {
	tests := []struct {
		name   string
		client *http.Client
	}{
		{
			name:   "nil client",
			client: nil,
		},
		{
			name: "client with custom timeout",
			client: &http.Client{
				Timeout: 30 * time.Second,
			},
		},
		{
			name: "client with nil transport",
			client: &http.Client{
				Transport: nil,
				Timeout:   10 * time.Second,
			},
		},
		{
			name: "client with custom transport",
			client: &http.Client{
				Transport: http.DefaultTransport,
				Timeout:   5 * time.Second,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			wrapped := WrapHTTPClient(tt.client)

			assert.NotNil(t, wrapped)
			assert.NotNil(t, wrapped.Transport)

			if tt.client != nil && tt.client.Timeout > 0 {
				assert.Equal(t, tt.client.Timeout, wrapped.Timeout)
			}
		})
	}
}

func TestWrapHTTPClientPreservesConfig(t *testing.T) {
	originalClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	wrapped := WrapHTTPClient(originalClient)

	assert.NotNil(t, wrapped)
	assert.Equal(t, originalClient.Timeout, wrapped.Timeout)
	assert.NotNil(t, wrapped.CheckRedirect)
	assert.NotNil(t, wrapped.Transport)
}
