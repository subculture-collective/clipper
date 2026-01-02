package telemetry

import (
"context"
"testing"
"time"

"github.com/stretchr/testify/assert"
)

func TestInitDisabled(t *testing.T) {
cfg := &Config{
Enabled: false,
}

err := Init(cfg)
assert.NoError(t, err)
}

func TestInitWithInvalidEndpoint(t *testing.T) {
cfg := &Config{
Enabled:          true,
ServiceName:      "test-service",
ServiceVersion:   "1.0.0",
OTLPEndpoint:     "invalid:endpoint:9999",
Insecure:         true,
TracesSampleRate: 0.1,
Environment:      "test",
}

// This should not error even with invalid endpoint
// The exporter creation happens asynchronously
err := Init(cfg)
// We expect no error during initialization
// Actual connection errors will happen during trace export
assert.NoError(t, err)

// Cleanup
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
_ = Shutdown(ctx)
}

func TestGetTracer(t *testing.T) {
cfg := &Config{
Enabled:          true,
ServiceName:      "test-service",
ServiceVersion:   "1.0.0",
OTLPEndpoint:     "localhost:4317",
Insecure:         true,
TracesSampleRate: 1.0,
Environment:      "test",
}

err := Init(cfg)
assert.NoError(t, err)

tracer := GetTracer("test-tracer")
assert.NotNil(t, tracer)

// Cleanup
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
err = Shutdown(ctx)
assert.NoError(t, err)
}

func TestShutdownWithoutInit(t *testing.T) {
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()

err := Shutdown(ctx)
assert.NoError(t, err)
}

func TestSamplingRate(t *testing.T) {
tests := []struct {
name       string
sampleRate float64
}{
{
name:       "10% sampling",
sampleRate: 0.1,
},
{
name:       "50% sampling",
sampleRate: 0.5,
},
{
name:       "100% sampling",
sampleRate: 1.0,
},
{
name:       "0% sampling",
sampleRate: 0.0,
},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
cfg := &Config{
Enabled:          true,
ServiceName:      "test-service",
ServiceVersion:   "1.0.0",
OTLPEndpoint:     "localhost:4317",
Insecure:         true,
TracesSampleRate: tt.sampleRate,
Environment:      "test",
}

err := Init(cfg)
assert.NoError(t, err)

// Cleanup
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
_ = Shutdown(ctx)
})
}
}
