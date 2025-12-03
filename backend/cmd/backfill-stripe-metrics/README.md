# Stripe Metrics Backfill Job

This command syncs subscription and invoice data from Stripe to ensure the revenue metrics dashboard has accurate historical data.

## Usage

```bash
# Run with defaults (sync up to 100 records)
go run ./cmd/backfill-stripe-metrics

# Dry run mode - see what would be synced without making changes
go run ./cmd/backfill-stripe-metrics -dry-run

# Sync more records
go run ./cmd/backfill-stripe-metrics -limit 500
```

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `-dry-run` | `false` | Run without making database changes |
| `-limit` | `100` | Maximum number of records to sync per type |

## What Gets Synced

1. **Subscriptions**: Updates local subscription records with current status from Stripe
2. **Invoices**: Logs paid invoices as subscription events for revenue tracking

## Prerequisites

- `STRIPE_SECRET_KEY` must be set in environment or `.env` file
- Database must be accessible
- Subscriptions table must have `stripe_customer_id` populated

## Scheduling

For ongoing data freshness, consider running this job periodically (e.g., daily via cron):

```bash
0 2 * * * cd /path/to/clipper/backend && go run ./cmd/backfill-stripe-metrics >> /var/log/stripe-backfill.log 2>&1
```

The revenue dashboard also receives real-time updates via Stripe webhooks, so backfill is mainly for historical data and recovery scenarios.
