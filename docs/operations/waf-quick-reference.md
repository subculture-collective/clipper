---
title: "WAF Quick Reference"
summary: "Quick reference guide for WAF operations and troubleshooting"
tags: ['operations', 'security', 'waf', 'quick-reference']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
---

# WAF Quick Reference

One-page reference for common WAF operations and troubleshooting.

## Quick Deploy

```bash
# 1. Copy WAF config to Caddy container
docker cp Caddyfile.waf caddy:/etc/caddy/Caddyfile

# 2. Reload Caddy (zero-downtime)
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# 3. Monitor for issues
docker exec caddy tail -f /var/log/caddy/security.log
```

## Quick Rollback

```bash
# Restore original Caddyfile
docker cp Caddyfile caddy:/etc/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Quick Status Check

```bash
# Check which config is active
docker exec caddy cat /etc/caddy/Caddyfile | head -5

# Check recent blocks
docker exec caddy tail -20 /var/log/caddy/security.log | jq -r '.["X-WAF-Block-Reason"]'

# Count blocks in last hour
docker exec caddy bash -c "grep $(date -u +%Y-%m-%d) /var/log/caddy/security.log | wc -l"
```

## Protection Rules Summary

| Rule | Pattern | Response |
|------|---------|----------|
| SQLi | `UNION SELECT`, `INSERT INTO`, etc. | 403 |
| XSS | `<script>`, `javascript:`, etc. | 403 |
| Path Traversal | `../`, `/etc/passwd` | 403 |
| Scanner Bots | `sqlmap`, `nikto`, `nmap`, etc. | 403 |
| Invalid Methods | TRACE, CONNECT, etc. | 405 |
| Large Requests | >10MB general, >5MB API | 413 |

## Common Commands

### View Blocks
```bash
# Last 50 blocked requests
docker exec caddy tail -50 /var/log/caddy/security.log | jq .

# Blocks by reason
docker exec caddy jq -r '.["X-WAF-Block-Reason"]' /var/log/caddy/security.log | sort | uniq -c

# Top blocked IPs
docker exec caddy jq -r '.request.remote_ip' /var/log/caddy/security.log | sort | uniq -c | sort -rn | head -10
```

### Test Protections
```bash
# Test SQLi block
curl -v "https://clpr.tv/api/v1/clips?id=1'%20UNION%20SELECT%20*"

# Test XSS block
curl -v "https://clpr.tv/?q=<script>alert(1)</script>"

# Test scanner block
curl -v -A "sqlmap/1.0" https://clpr.tv/
```

### Whitelist IP

Add to backend environment in `docker-compose.prod.yml`:
```yaml
environment:
  - RATE_LIMIT_WHITELIST_IPS=10.0.0.5,192.168.1.100
```

Then restart backend:
```bash
docker-compose restart backend
```

## Troubleshooting

### Users Getting 403 Errors

1. Check security log for their requests
2. Identify blocking rule
3. If false positive: adjust pattern or whitelist
4. Deploy fix to staging first

### High Block Rate

1. Check if under attack: `docker exec caddy tail -100 /var/log/caddy/security.log`
2. Look for pattern: all from same IP? Same attack type?
3. If attack: monitor and ensure backend rate limiting is working
4. If false positive: adjust rules urgently

### Caddy High CPU

1. Check request rate: `docker stats caddy`
2. Review access log volume: `wc -l /var/log/caddy/access.log`
3. Consider adding edge rate limiting plugin
4. Scale horizontally if needed

## Files

- WAF Config: `/home/runner/work/clipper/clipper/Caddyfile.waf`
- Production Config: `/home/runner/work/clipper/clipper/Caddyfile`
- Logs: `/var/log/caddy/security.log` (in Caddy container)
- Documentation: `/home/runner/work/clipper/clipper/docs/operations/waf-protection.md`

## Key Metrics

Monitor these in your observability platform:

- `waf_blocks_total` - Total blocked requests
- `waf_blocks_by_reason` - Blocks grouped by rule
- `waf_false_positive_rate` - User complaints / total blocks
- `caddy_cpu_usage` - Caddy resource usage
- `caddy_request_latency_p95` - Latency impact

## Emergency Contacts

- On-call ops: #ops-oncall
- Security team: #security
- Incident commander: See on-call schedule

---

**See Also**: [Full WAF Documentation](./waf-protection.md)
