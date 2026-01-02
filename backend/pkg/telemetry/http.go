package telemetry

import (
"net/http"

"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// WrapHTTPClient wraps an HTTP client with OpenTelemetry instrumentation
func WrapHTTPClient(client *http.Client) *http.Client {
if client == nil {
client = http.DefaultClient
}

// Create a new client with the same config but wrapped transport
return &http.Client{
Transport:     otelhttp.NewTransport(client.Transport),
CheckRedirect: client.CheckRedirect,
Jar:           client.Jar,
Timeout:       client.Timeout,
}
}

// NewHTTPClient creates a new HTTP client with OpenTelemetry instrumentation
func NewHTTPClient() *http.Client {
return &http.Client{
Transport: otelhttp.NewTransport(http.DefaultTransport),
}
}
