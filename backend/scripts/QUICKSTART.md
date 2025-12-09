# Clipper Scraper - Quick Start Guide

Get the targeted clip scraper running in 5 minutes.

## Prerequisites

- Go 1.24.7+
- PostgreSQL database with Clipper schema
- Redis instance
- Twitch API credentials

## Setup

### 1. Configure Environment

Ensure your `.env` file has:

```bash
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
DB_HOST=localhost
DB_PORT=5432
DB_USER=clipper
DB_PASSWORD=your_password
DB_NAME=clipper_db
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. Build the Scraper

```bash
cd backend
go build -o bin/scrape_clips ./scripts/scrape_clips.go
```

### 3. Test with Dry Run

```bash
# This will query broadcasters but won't insert clips
./bin/scrape_clips --dry-run
```

**Expected output:**
```
=== Clipper Targeted Scraper ===
Configuration:
  Dry Run: true
  Batch Size: 50 clips per broadcaster
  Max Age: 30 days
  Min Views: 100
  Lookback: 30 days

✓ Database connection established
✓ Redis connection established
✓ Twitch API client initialized

Found X broadcasters with submissions in the last 30 days
...
```

### 4. Run for Real

```bash
# This will actually insert clips
./bin/scrape_clips
```

## Common Use Cases

### Daily Automated Scraping

**Option 1: Cron**

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM UTC)
0 2 * * * cd /opt/clipper/backend && ./bin/scrape_clips >> /var/log/clipper/scraper.log 2>&1
```

**Option 2: Systemd**

```bash
# Copy service files
sudo cp scripts/systemd/*.service /etc/systemd/system/
sudo cp scripts/systemd/*.timer /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable clipper-scraper.timer
sudo systemctl start clipper-scraper.timer

# Check status
sudo systemctl status clipper-scraper.timer
```

### Manual Scraping for Specific Broadcasters

```bash
# Scrape only these broadcasters
./bin/scrape_clips --broadcasters "xQc,Pokimane,shroud"
```

### High-Volume Scraping

```bash
# More clips per broadcaster, lower view threshold
./bin/scrape_clips --batch-size 100 --min-views 50
```

### Recent Clips Only

```bash
# Only clips from last 7 days
./bin/scrape_clips --max-age-days 7
```

## Monitoring

### View Logs

**Cron:**
```bash
tail -f /var/log/clipper/scraper.log
```

**Systemd:**
```bash
sudo journalctl -u clipper-scraper.service -f
```

### Check Last Run

**Systemd:**
```bash
sudo systemctl status clipper-scraper.service
```

## Troubleshooting

### No Broadcasters Found

**Cause**: No submissions in the database in the lookback period.

**Solution**: 
```bash
# Check submissions
psql -h localhost -U clipper -d clipper_db -c "SELECT COUNT(*) FROM clip_submissions WHERE created_at > NOW() - INTERVAL '30 days';"

# Try longer lookback or manual list
./bin/scrape_clips --lookback-days 60
./bin/scrape_clips --broadcasters "popular_broadcaster"
```

### Rate Limiting

**Cause**: Hitting Twitch API rate limit (800 req/min).

**Solution**: The client handles this automatically with exponential backoff. Be patient or reduce batch size.

### Database Connection Failed

**Cause**: Database not running or wrong credentials.

**Solution**:
```bash
# Test connection
psql -h localhost -U clipper -d clipper_db

# Check .env file
cat .env | grep DB_
```

### Script Hangs

**Cause**: Waiting for rate limit or network issues.

**Solution**: Check logs for "Rate limit reached" or "waiting" messages. The script will continue automatically.

## Performance Tips

1. **Start Small**: Use `--batch-size 25` initially
2. **Filter by Views**: Use `--min-views 200` to reduce noise
3. **Recent Clips**: Use `--max-age-days 14` for fresher content
4. **Off-Peak Hours**: Schedule during low-traffic times (2-4 AM)
5. **Monitor API Usage**: Check logs for "API calls made" metric

## Next Steps

- 📖 Read full documentation: [README_SCRAPER.md](README_SCRAPER.md)
- ⚙️ Configure systemd: [systemd/README.md](systemd/README.md)
- 📅 Set up scheduling: [cron.example](cron.example)
- 🔍 Monitor performance and adjust settings

## Getting Help

- Check [README_SCRAPER.md](README_SCRAPER.md) for detailed troubleshooting
- View logs for error messages
- Ensure all prerequisites are met
- Test with `--dry-run` first

## Quick Reference

```bash
# Build
go build -o bin/scrape_clips ./scripts/scrape_clips.go

# Test
./bin/scrape_clips --dry-run

# Run
./bin/scrape_clips

# Custom
./bin/scrape_clips --batch-size 100 --min-views 200 --max-age-days 14

# Specific broadcasters
./bin/scrape_clips --broadcasters "xQc,Pokimane"

# Help
./bin/scrape_clips -help
```

That's it! You're ready to scrape clips. 🎬
