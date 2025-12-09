# Systemd Configuration for Clipper Scraper

This directory contains systemd service and timer units for running the Clipper clip scraper automatically.

## Installation

### 1. Copy Service Files

```bash
# Copy service and timer files to systemd directory
sudo cp clipper-scraper.service /etc/systemd/system/
sudo cp clipper-scraper.timer /etc/systemd/system/

# Set correct permissions
sudo chmod 644 /etc/systemd/system/clipper-scraper.service
sudo chmod 644 /etc/systemd/system/clipper-scraper.timer
```

### 2. Update Paths

Edit the service file to match your installation:

```bash
sudo nano /etc/systemd/system/clipper-scraper.service
```

Update these values:
- `User=clipper` - Change to your application user
- `Group=clipper` - Change to your application group
- `WorkingDirectory=/opt/clipper/backend` - Change to your installation path
- `ExecStart=/opt/clipper/backend/bin/scrape_clips` - Change to your binary path
- `EnvironmentFile=-/opt/clipper/backend/.env` - Change to your .env path

### 3. Reload Systemd

```bash
sudo systemctl daemon-reload
```

### 4. Enable and Start Timer

```bash
# Enable timer to start on boot
sudo systemctl enable clipper-scraper.timer

# Start timer now
sudo systemctl start clipper-scraper.timer
```

## Usage

### Check Timer Status

```bash
# Check if timer is active
sudo systemctl status clipper-scraper.timer

# List all timers
sudo systemctl list-timers

# View detailed timer info
sudo systemctl show clipper-scraper.timer
```

### View Service Status

```bash
# Check last run status
sudo systemctl status clipper-scraper.service
```

### View Logs

```bash
# View all logs
sudo journalctl -u clipper-scraper.service

# Follow logs in real-time
sudo journalctl -u clipper-scraper.service -f

# View logs from last run
sudo journalctl -u clipper-scraper.service -n 100

# View logs from specific date
sudo journalctl -u clipper-scraper.service --since "2024-01-01"
```

### Manual Execution

```bash
# Run service manually (bypasses timer)
sudo systemctl start clipper-scraper.service

# Watch logs while running
sudo journalctl -u clipper-scraper.service -f
```

### Stop/Disable Timer

```bash
# Stop timer (prevents future runs)
sudo systemctl stop clipper-scraper.timer

# Disable timer (won't start on boot)
sudo systemctl disable clipper-scraper.timer

# Stop running service
sudo systemctl stop clipper-scraper.service
```

### Restart After Changes

```bash
# After editing service or timer files
sudo systemctl daemon-reload
sudo systemctl restart clipper-scraper.timer
```

## Configuration

### Changing Schedule

Edit the timer file:

```bash
sudo nano /etc/systemd/system/clipper-scraper.timer
```

Common schedules:

```ini
# Daily at 2 AM
OnCalendar=*-*-* 02:00:00

# Every 6 hours
OnCalendar=*-*-* 00,06,12,18:00:00

# Weekly on Sunday at 2 AM
OnCalendar=Sun *-*-* 02:00:00

# Twice daily (2 AM and 2 PM)
OnCalendar=*-*-* 02,14:00:00
```

After changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart clipper-scraper.timer
```

### Adding Scraper Options

Edit the service file:

```bash
sudo nano /etc/systemd/system/clipper-scraper.service
```

Modify `ExecStart`:

```ini
# With custom options
ExecStart=/opt/clipper/backend/bin/scrape_clips --batch-size 100 --min-views 200

# With dry-run
ExecStart=/opt/clipper/backend/bin/scrape_clips --dry-run
```

## Monitoring

### Check Next Run Time

```bash
sudo systemctl list-timers clipper-scraper.timer
```

### Enable Email Notifications

Install and configure `mailutils`:

```bash
sudo apt-get install mailutils
```

Edit service file to add email on failure:

```ini
[Service]
# ... existing config ...
OnFailure=status-email@%n.service
```

### Export Logs

```bash
# Export logs to file
sudo journalctl -u clipper-scraper.service > scraper-logs.txt

# Export logs as JSON
sudo journalctl -u clipper-scraper.service -o json > scraper-logs.json
```

## Troubleshooting

### Timer Not Running

```bash
# Check timer status
sudo systemctl status clipper-scraper.timer

# Check for errors
sudo journalctl -u clipper-scraper.timer -xe
```

### Service Fails to Start

```bash
# Check service status
sudo systemctl status clipper-scraper.service

# View detailed logs
sudo journalctl -u clipper-scraper.service -xe

# Test manually
cd /opt/clipper/backend
./bin/scrape_clips --dry-run
```

### Permission Issues

```bash
# Check file permissions
ls -la /opt/clipper/backend/bin/scrape_clips

# Make executable
sudo chmod +x /opt/clipper/backend/bin/scrape_clips

# Check user/group
id clipper
```

### Environment Variables Not Loading

Ensure `.env` file exists and is readable:

```bash
ls -la /opt/clipper/backend/.env
sudo chmod 640 /opt/clipper/backend/.env
sudo chown clipper:clipper /opt/clipper/backend/.env
```

## Security Considerations

The service includes several security hardening options:

- `NoNewPrivileges=true` - Prevents privilege escalation
- `PrivateTmp=true` - Private /tmp directory
- `ProtectSystem=strict` - Read-only system directories
- `ProtectHome=true` - Inaccessible home directories
- Resource limits (Memory, CPU)

Adjust based on your security requirements.

## Uninstallation

```bash
# Stop and disable timer
sudo systemctl stop clipper-scraper.timer
sudo systemctl disable clipper-scraper.timer

# Remove service files
sudo rm /etc/systemd/system/clipper-scraper.service
sudo rm /etc/systemd/system/clipper-scraper.timer

# Reload systemd
sudo systemctl daemon-reload
```
