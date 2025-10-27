package opensearch

import (
"context"
"crypto/tls"
"fmt"
"net/http"
"time"

"github.com/opensearch-project/opensearch-go/v2"
"github.com/opensearch-project/opensearch-go/v2/opensearchapi"
)

// Config holds OpenSearch configuration
type Config struct {
URL      string
Username string
Password string
}

// Client wraps the OpenSearch client
type Client struct {
client *opensearch.Client
}

// NewClient creates a new OpenSearch client
func NewClient(cfg *Config) (*Client, error) {
if cfg.URL == "" {
return nil, fmt.Errorf("OpenSearch URL is required")
}

// Configure TLS (skip verification for dev, enable for production)
transport := &http.Transport{
TLSClientConfig: &tls.Config{
InsecureSkipVerify: true, // TODO: Make this configurable
},
MaxIdleConns:        10,
MaxIdleConnsPerHost: 10,
IdleConnTimeout:     90 * time.Second,
}

// Build client config
clientCfg := opensearch.Config{
Addresses: []string{cfg.URL},
Transport: transport,
}

// Add authentication if credentials are provided
if cfg.Username != "" && cfg.Password != "" {
clientCfg.Username = cfg.Username
clientCfg.Password = cfg.Password
}

// Create client
client, err := opensearch.NewClient(clientCfg)
if err != nil {
return nil, fmt.Errorf("failed to create OpenSearch client: %w", err)
}

return &Client{client: client}, nil
}

// Ping checks if OpenSearch is reachable
func (c *Client) Ping(ctx context.Context) error {
req := opensearchapi.PingRequest{}
res, err := req.Do(ctx, c.client)
if err != nil {
return fmt.Errorf("ping failed: %w", err)
}
defer res.Body.Close()

if res.IsError() {
return fmt.Errorf("ping returned error: %s", res.Status())
}

return nil
}

// GetClient returns the underlying OpenSearch client
func (c *Client) GetClient() *opensearch.Client {
return c.client
}

// Close closes the client connection
func (c *Client) Close() error {
// OpenSearch Go client doesn't have explicit close
// Connections are managed by the http.Transport
return nil
}
