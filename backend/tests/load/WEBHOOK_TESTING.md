# Webhook Load Testing

This directory contains load testing scenarios for webhook delivery and DLQ replay operations.

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed
- Backend server running (`make backend-dev`)
- Test database seeded with webhook subscriptions

## Test Scenarios

### 1. Webhook Delivery Load Test

Tests webhook delivery at scale with mixed outcomes.

**File:** `scenarios/webhook_delivery.js`

**What it tests:**
- 10,000+ webhook event deliveries
- Mixed outcomes (70% success, 15% failure, 10% timeout, 5% invalid signature)
- Signature verification enforcement
- Throughput and latency under load
- Event type distribution (60% clip.submitted, 25% clip.approved, 15% clip.rejected)

**Prerequisites:**
- A webhook receiver endpoint must be configured at `/webhook/test` or set `BASE_URL` to point to a test webhook receiver
- For testing with actual webhook processing, deploy the example webhook receivers from `examples/webhooks/`

**Run:**
```bash
# Basic run with defaults
k6 run backend/tests/load/scenarios/webhook_delivery.js

# With custom configuration
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e WEBHOOK_SECRET=your_secret \
  -e TARGET_EVENTS=10000 \
  backend/tests/load/scenarios/webhook_delivery.js

# With HTML report
k6 run --out json=webhook_delivery_results.json \
  backend/tests/load/scenarios/webhook_delivery.js
```

**Key Metrics:**
- `webhook_delivery_success` - Successful deliveries
- `webhook_delivery_failure` - Failed deliveries
- `webhook_signature_verified` - Valid signatures
- `webhook_signature_rejected` - Invalid signatures
- `webhook_delivery_duration` - Latency percentiles

**Thresholds:**
- p95 latency < 500ms
- p99 latency < 1000ms
- Success rate > 90%
- Valid signature rate > 95%
- HTTP failure rate < 5%

### 2. DLQ Replay Load Test

Tests dead-letter queue replay operations with rate limiting.

**File:** `scenarios/webhook_dlq_replay.js`

**What it tests:**
- Fetching DLQ items (paginated)
- Single item replay with rate limiting
- Bulk replay operations (50 items/batch)
- Rate limit enforcement (429 responses)
- Replay success/failure tracking

**Prerequisites:**
- Admin authentication token with DLQ access
- For realistic testing, seed the DLQ with failed deliveries first
- **Note:** The test uses mock DLQ item IDs by default. For end-to-end testing:
  1. Seed DLQ with known failed deliveries
  2. Modify the test to fetch actual DLQ item IDs from `/api/v1/admin/webhooks/dlq`
  3. Use those IDs for replay operations

**Run:**
```bash
# Basic run (requires auth token)
k6 run \
  -e AUTH_TOKEN=your_admin_token \
  backend/tests/load/scenarios/webhook_dlq_replay.js

# With custom configuration
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e AUTH_TOKEN=your_admin_token \
  -e DLQ_SIZE=1000 \
  backend/tests/load/scenarios/webhook_dlq_replay.js
```

**Key Metrics:**
- `webhook_dlq_replay_success` - Successful replays
- `webhook_dlq_replay_failure` - Failed replays
- `webhook_dlq_replay_rate_limited` - Rate limited requests
- `dlq_items_fetched` - DLQ items retrieved
- `webhook_dlq_replay_duration` - Replay latency

**Thresholds:**
- p95 replay latency < 2000ms
- p99 replay latency < 5000ms
- Success rate > 80%
- Fetch failure rate < 1%
- Replay failure rate < 10%

## Test Event Generator

Generate test webhook events for manual testing.

**File:** `webhook_generator.go`

**Build:**
```bash
cd backend/tests/load
go build -o webhook_generator webhook_generator.go
```

**Run:**
```bash
# Generate 100 test events
./webhook_generator -count 100

# Generate 10,000 events with custom secret
./webhook_generator -count 10000 -secret "my-webhook-secret"

# Show sample test case
./webhook_generator -count 10 -sample
```

**Output:**
- Summary of generated events
- Event type distribution
- Outcome distribution
- Sample event with signature

**Use Cases:**
- Manual webhook testing
- Seeding DLQ for testing
- Validating signature generation
- Testing webhook consumers

## Integration Tests

Go-based integration tests for webhook delivery at scale.

**File:** `tests/integration/webhooks/webhook_delivery_scale_test.go`

**Run:**
```bash
# Run all tests (including scale test)
cd backend
go test ./tests/integration/webhooks/... -v

# Run with short mode (skip scale test)
go test ./tests/integration/webhooks/... -v -short

# Run specific test
go test ./tests/integration/webhooks/... -v -run TestWebhookDeliveryAtScale

# Run with race detector
go test ./tests/integration/webhooks/... -v -race
```

**Tests:**
- `TestWebhookSignatureVerificationEnforced` - Signature validation
- `TestWebhookIdempotency` - Duplicate event handling
- `TestWebhookExponentialBackoff` - Retry delay calculation
- `TestWebhookDLQMetadata` - DLQ item completeness
- `TestWebhookDeliveryAtScale` - 1,000 concurrent deliveries
- `TestWebhookCorrelationIDs` - Unique delivery tracking

## Environment Variables

### Common Variables

- `BASE_URL` - API base URL (default: `http://localhost:8080`)
- `AUTH_TOKEN` - Admin authentication token (required for DLQ tests)

### Webhook Delivery Test

- `WEBHOOK_SECRET` - Secret for signature generation (default: `test-webhook-secret-12345`)
- `TARGET_EVENTS` - Number of events to generate (default: `10000`)

### DLQ Replay Test

- `DLQ_SIZE` - Expected DLQ size (default: `1000`)

## Interpreting Results

### Successful Test Run

```
webhook_delivery_success.............: 9500
webhook_delivery_failure.............: 500
webhook_signature_verified...........: 9500
webhook_delivery_duration (p95)......: 350ms
webhook_delivery_duration (p99)......: 800ms
http_req_failed......................: 2.5%
```

### Warning Signs

- **High failure rate (>10%):** Check subscriber endpoints
- **High p95 latency (>500ms):** Performance degradation
- **Many rate limits (>5%):** Reduce replay rate
- **Network errors:** Check connectivity

### Critical Issues

- **Success rate <70%:** Stop and investigate
- **p99 latency >5000ms:** System overloaded
- **HTTP failures >10%:** Backend issue
- **All replays failing:** Subscription inactive or endpoint down

## Monitoring During Tests

### Watch Prometheus Metrics

```bash
# Watch webhook delivery metrics
watch -n 5 'curl -s http://localhost:9090/metrics | grep webhook_delivery'

# Watch DLQ metrics
watch -n 5 'curl -s http://localhost:9090/metrics | grep webhook_dlq'
```

### Check Backend Logs

```bash
# Follow webhook logs
tail -f backend.log | grep WEBHOOK

# Follow DLQ logs
tail -f backend.log | grep WEBHOOK_DLQ
```

### Monitor Database

```sql
-- Check webhook delivery status
SELECT status, COUNT(*) 
FROM outbound_webhook_deliveries 
GROUP BY status;

-- Check DLQ size
SELECT COUNT(*) FROM outbound_webhook_dead_letter_queue;

-- Check pending deliveries
SELECT COUNT(*) 
FROM outbound_webhook_deliveries 
WHERE status = 'pending';
```

## Troubleshooting

### k6 Command Not Found

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6
```

### Test Fails to Connect

1. Verify backend is running: `curl http://localhost:8080/health`
2. Check BASE_URL environment variable
3. Ensure no firewall blocking

### Authentication Errors (DLQ Tests)

1. Obtain valid admin token
2. Set AUTH_TOKEN environment variable
3. Verify token hasn't expired

### Rate Limiting in Tests

Expected behavior:
- DLQ replay tests intentionally trigger rate limits
- Tests verify backoff behavior
- Adjust rate if consistently hitting limits

### Out of Memory

For very large tests (>100k events):
1. Reduce test volume
2. Increase available memory
3. Run tests in batches
4. Use distributed k6 execution

## Best Practices

1. **Start Small:** Run with 100 events first, then scale up
2. **Monitor Resources:** Watch CPU, memory, and database connections
3. **Clean Up:** Clear test data between runs
4. **Rate Limiting:** Respect subscriber endpoints
5. **Realistic Load:** Match production patterns
6. **Baseline First:** Establish performance baseline
7. **Gradual Ramp:** Use ramping VUs, not instant load

## Related Documentation

- [DLQ Replay Runbook](../../../docs/operations/webhook-dlq-replay-runbook.md)
- [Webhook Signature Verification](../../../docs/backend/webhook-signature-verification.md)
- [Webhook Subscription Management](../../../docs/backend/webhook-subscription-management.md)
- [Load Testing Guide](./README.md)

## Support

For issues or questions:
1. Check test logs for error messages
2. Review related documentation
3. Verify test prerequisites
4. Check GitHub issues
5. Contact platform team
