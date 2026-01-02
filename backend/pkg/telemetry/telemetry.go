package telemetry

import (
"context"
"fmt"
"log"
"time"

"go.opentelemetry.io/otel"
"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
"go.opentelemetry.io/otel/propagation"
"go.opentelemetry.io/otel/sdk/resource"
sdktrace "go.opentelemetry.io/otel/sdk/trace"
semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
"go.opentelemetry.io/otel/trace"
"google.golang.org/grpc/credentials/insecure"
)

// Config holds telemetry configuration
type Config struct {
Enabled          bool
ServiceName      string
ServiceVersion   string
OTLPEndpoint     string
Insecure         bool
TracesSampleRate float64
Environment      string
}

var tracerProvider *sdktrace.TracerProvider

// Init initializes OpenTelemetry with Jaeger exporter
func Init(cfg *Config) error {
if !cfg.Enabled {
log.Println("Telemetry disabled")
return nil
}

ctx := context.Background()

// Create resource with service information
res, err := resource.New(ctx,
resource.WithAttributes(
semconv.ServiceNameKey.String(cfg.ServiceName),
semconv.ServiceVersionKey.String(cfg.ServiceVersion),
semconv.DeploymentEnvironmentKey.String(cfg.Environment),
),
)
if err != nil {
return fmt.Errorf("failed to create resource: %w", err)
}

// Set up OTLP trace exporter
var opts []otlptracegrpc.Option
opts = append(opts, otlptracegrpc.WithEndpoint(cfg.OTLPEndpoint))

if cfg.Insecure {
opts = append(opts, otlptracegrpc.WithTLSCredentials(insecure.NewCredentials()))
}

exporter, err := otlptracegrpc.New(ctx, opts...)
if err != nil {
return fmt.Errorf("failed to create trace exporter: %w", err)
}

// Create trace provider with batch processor and sampling
tp := sdktrace.NewTracerProvider(
sdktrace.WithBatcher(exporter),
sdktrace.WithResource(res),
sdktrace.WithSampler(sdktrace.TraceIDRatioBased(cfg.TracesSampleRate)),
)

// Set global trace provider
otel.SetTracerProvider(tp)

// Set global propagator to W3C Trace Context
otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
propagation.TraceContext{},
propagation.Baggage{},
))

tracerProvider = tp

log.Printf("Telemetry initialized: service=%s, endpoint=%s, sample_rate=%.2f", 
cfg.ServiceName, cfg.OTLPEndpoint, cfg.TracesSampleRate)

return nil
}

// Shutdown gracefully shuts down the tracer provider
func Shutdown(ctx context.Context) error {
if tracerProvider == nil {
return nil
}

// Set a timeout for shutdown
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

if err := tracerProvider.Shutdown(ctx); err != nil {
return fmt.Errorf("failed to shutdown tracer provider: %w", err)
}

log.Println("Telemetry shutdown successfully")
return nil
}

// GetTracer returns a tracer for the given name
func GetTracer(name string) trace.Tracer {
return otel.Tracer(name)
}
