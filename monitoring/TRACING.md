# Distributed Tracing with OpenTelemetry and Jaeger

This document describes the distributed tracing setup using OpenTelemetry and Jaeger for request visibility across services.

## Overview

The Clipper backend now includes distributed tracing capabilities that allow you to:
- Track requests across the entire application stack
- Monitor database query performance
- Observe external service call latency (Redis, OpenSearch, HTTP APIs)
- Debug performance bottlenecks
- Analyze request flow and dependencies

## Architecture

- **OpenTelemetry SDK**: Generates and exports trace data
- **Jaeger**: Stores and visualizes distributed traces
- **OTLP Protocol**: Standard protocol for trace export (gRPC)
- **Sampling**: Configurable trace sampling rate (default: 10%)

## Quick Start

### 1. Start Jaeger

Using Docker Compose:

```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d jaeger
```

This starts Jaeger with:
- UI: http://localhost:16686
- OTLP gRPC endpoint: localhost:4317
- OTLP HTTP endpoint: localhost:4318

### 2. Enable Tracing in Backend

Update your `.env` file:

```bash
# Enable distributed tracing
TELEMETRY_ENABLED=true
TELEMETRY_SERVICE_NAME=clipper-backend
TELEMETRY_SERVICE_VERSION=1.0.0
TELEMETRY_OTLP_ENDPOINT=localhost:4317
TELEMETRY_INSECURE=true
TELEMETRY_TRACES_SAMPLE_RATE=0.1  # 10% sampling
TELEMETRY_ENVIRONMENT=development
```

### 3. Start the Backend

```bash
cd backend
go run cmd/api/main.go
```

### 4. Access Jaeger UI

Open http://localhost:16686 in your browser to view traces.

## What Gets Traced

The tracing implementation automatically captures:

### HTTP Requests
- All incoming HTTP requests via Gin middleware
- Request method, path, status code
- Request duration
- Query parameters and headers (configurable)

### Database Queries
- PostgreSQL queries via pgx
- Query text and parameters
- Query execution time
- Connection pool metrics

### Redis Operations
- All Redis commands (GET, SET, ZADD, etc.)
- Command arguments
- Response time
- Pipeline operations

### External HTTP Calls
- Outgoing HTTP requests to external APIs
- Request/response metadata
- HTTP status codes
- Network latency

## Configuration

### Sampling Rate

The sampling rate determines what percentage of requests are traced:

```bash
# 100% sampling (development)
TELEMETRY_TRACES_SAMPLE_RATE=1.0

# 10% sampling (production recommended)
TELEMETRY_TRACES_SAMPLE_RATE=0.1

# 1% sampling (high-traffic production)
TELEMETRY_TRACES_SAMPLE_RATE=0.01
```

### Service Identification

Each service should have a unique name and version:

```bash
TELEMETRY_SERVICE_NAME=clipper-backend
TELEMETRY_SERVICE_VERSION=1.2.3
TELEMETRY_ENVIRONMENT=production
```

### Security

For production deployments with TLS:

```bash
TELEMETRY_INSECURE=false
TELEMETRY_OTLP_ENDPOINT=jaeger.example.com:4317
```

## Using Traces

### Finding Traces

1. Open Jaeger UI: http://localhost:16686
2. Select service: `clipper-backend`
3. Choose operation (e.g., `GET /api/v1/clips`)
4. Click "Find Traces"

### Analyzing Performance

Traces show:
- **Total duration**: End-to-end request time
- **Span breakdown**: Time spent in each component
- **Database queries**: Query text and execution time
- **External calls**: API latency and response status
- **Errors**: Exception details and stack traces

### Example Trace Flow

```
HTTP Request: GET /api/v1/clips
├── Database Query: SELECT * FROM clips (50ms)
├── Redis GET: hot_clips (2ms)
├── OpenSearch Query: clips index (100ms)
└── Response Serialization (5ms)
Total: 157ms
```

## Context Propagation

Traces automatically propagate across:
- HTTP boundaries (via W3C Trace Context headers)
- Internal service calls
- Database connections
- Redis operations
- Background jobs

The context is maintained using standard W3C Trace Context headers:
- `traceparent`: Contains trace and span IDs
- `tracestate`: Optional vendor-specific data

## Performance Impact

Tracing has minimal overhead:
- **CPU**: < 1% with 10% sampling
- **Memory**: ~10MB per 100K spans
- **Network**: Async batch export minimizes latency

## Troubleshooting

### No traces appearing in Jaeger

1. Check if Jaeger is running:
   ```bash
   docker ps | grep jaeger
   curl http://localhost:16686/api/services
   ```

2. Verify backend configuration:
   ```bash
   grep TELEMETRY .env
   ```

3. Check backend logs for initialization:
   ```
   Telemetry initialized: service=clipper-backend, endpoint=localhost:4317, sample_rate=0.10
   ```

### Traces incomplete or missing spans

1. Ensure sampling rate is high enough for testing:
   ```bash
   TELEMETRY_TRACES_SAMPLE_RATE=1.0
   ```

2. Check for context propagation in custom code
3. Verify all instrumented clients are properly initialized

### High memory usage

1. Reduce sampling rate:
   ```bash
   TELEMETRY_TRACES_SAMPLE_RATE=0.05  # 5%
   ```

2. Configure Jaeger retention:
   ```yaml
   # docker-compose.monitoring.yml
   environment:
     - SPAN_STORAGE_TYPE=badger
     - BADGER_TTL=72h  # 3 days retention
   ```

## Production Recommendations

1. **Sampling**: Use 5-10% sampling in production
2. **Storage**: Configure persistent storage for Jaeger
3. **Security**: Enable TLS for OTLP endpoint
4. **Monitoring**: Set up alerts for trace export failures
5. **Retention**: Configure appropriate trace retention (7-30 days)

## Further Reading

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Go OpenTelemetry Guide](https://opentelemetry.io/docs/instrumentation/go/)
