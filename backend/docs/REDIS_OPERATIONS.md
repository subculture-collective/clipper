# Redis Operations Guide

This guide covers common Redis operations for development, debugging, and production maintenance.

## Table of Contents

- [Connection](#connection)
- [Basic Operations](#basic-operations)
- [Debugging Cache Issues](#debugging-cache-issues)
- [Performance Monitoring](#performance-monitoring)
- [Maintenance Tasks](#maintenance-tasks)
- [Production Operations](#production-operations)
- [Troubleshooting](#troubleshooting)

## Connection

### Local Development

Connect to Redis running in Docker:

```bash
# Using redis-cli
docker exec -it clipper-redis redis-cli

# Alternative: Using redis-cli installed locally
redis-cli -h localhost -p 6379
```

### Production

```bash
# SSH tunnel (recommended for security)
ssh -L 6379:localhost:6379 user@production-server
redis-cli -h localhost -p 6379

# Direct connection (if firewall allows)
redis-cli -h redis.production.com -p 6379 -a <password>
```

### Using Redis from Go Code

```go
import redispkg "github.com/subculture-collective/clipper/pkg/redis"

// Create client
cfg := &config.RedisConfig{
    Host:     "localhost",
    Port:     "6379",
    Password: "",
    DB:       0,
}
client, err := redispkg.NewClient(cfg)
```

## Basic Operations

### View All Keys

```bash
# Scan all keys (production-safe, doesn't block)
redis-cli --scan

# Scan with pattern
redis-cli --scan --pattern "feed:*"

# Count keys matching pattern
redis-cli --scan --pattern "feed:hot:*" | wc -l

# DANGER: KEYS command (blocks Redis, avoid in production)
redis-cli KEYS "feed:*"
```

### Get/Set Values

```bash
# Get a value
redis-cli GET "clip:123e4567-e89b-12d3-a456-426614174000"

# Set a value with expiration (10 minutes)
redis-cli SETEX "test:key" 600 "test value"

# Set without expiration
redis-cli SET "test:key" "test value"

# Check if key exists
redis-cli EXISTS "feed:hot:page:1"
```

### Delete Keys

```bash
# Delete single key
redis-cli DEL "feed:hot:page:1"

# Delete multiple keys
redis-cli DEL "key1" "key2" "key3"

# Delete all keys matching pattern
redis-cli --scan --pattern "feed:hot:*" | xargs redis-cli DEL

# Delete all keys in database (DANGEROUS!)
redis-cli FLUSHDB

# Delete all keys in all databases (VERY DANGEROUS!)
redis-cli FLUSHALL
```

### Check TTL

```bash
# Get remaining TTL in seconds
redis-cli TTL "feed:hot:page:1"

# Get remaining TTL in milliseconds
redis-cli PTTL "feed:hot:page:1"

# Set/update TTL
redis-cli EXPIRE "feed:hot:page:1" 300
```

### Inspect Key Type and Size

```bash
# Get key type
redis-cli TYPE "feed:hot:page:1"

# Get memory usage
redis-cli MEMORY USAGE "feed:hot:page:1"

# Get string length
redis-cli STRLEN "feed:hot:page:1"
```

## Debugging Cache Issues

### Find Problematic Keys

```bash
# Find large keys
redis-cli --bigkeys

# Find keys with no TTL
redis-cli --scan | xargs redis-cli TTL | grep -B1 "\-1"

# Sample random keys
redis-cli --scan --pattern "*" | head -n 100
```

### Inspect Cache Contents

```bash
# Pretty print JSON value
redis-cli GET "clip:123" | jq '.'

# Dump key in serialized format
redis-cli DUMP "feed:hot:page:1"

# Get key info
redis-cli OBJECT ENCODING "feed:hot:page:1"
redis-cli OBJECT IDLETIME "feed:hot:page:1"
redis-cli OBJECT REFCOUNT "feed:hot:page:1"
```

### Monitor Cache Activity

```bash
# Monitor all commands in real-time (WARNING: verbose in production)
redis-cli MONITOR

# Monitor with pattern filter (requires external tools)
redis-cli MONITOR | grep "GET.*feed:hot"

# Watch specific key for changes
watch -n 1 'redis-cli GET "feed:hot:page:1"'
```

### Trace Cache Misses

```bash
# Enable slow log (commands taking > 10ms)
redis-cli CONFIG SET slowlog-log-slower-than 10000

# View slow log
redis-cli SLOWLOG GET 10

# Reset slow log
redis-cli SLOWLOG RESET
```

## Performance Monitoring

### Get Redis Stats

```bash
# General info
redis-cli INFO

# Specific section
redis-cli INFO stats
redis-cli INFO memory
redis-cli INFO keyspace
redis-cli INFO clients

# Server stats
redis-cli INFO server
```

### Key Performance Metrics

```bash
# Hit rate calculation
redis-cli INFO stats | grep -E "keyspace_(hits|misses)"

# Memory usage
redis-cli INFO memory | grep "used_memory_human"

# Operations per second
redis-cli INFO stats | grep "instantaneous_ops_per_sec"

# Connected clients
redis-cli INFO clients | grep "connected_clients"

# Evicted keys
redis-cli INFO stats | grep "evicted_keys"
```

### Continuous Monitoring

```bash
# Watch stats update every 2 seconds
watch -n 2 'redis-cli INFO stats | grep -E "(hits|misses|ops_per_sec)"'

# Log stats to file
while true; do
    date >> redis_stats.log
    redis-cli INFO stats >> redis_stats.log
    sleep 60
done
```

### Calculate Hit Rate

```bash
#!/bin/bash
HITS=$(redis-cli INFO stats | grep "keyspace_hits" | cut -d: -f2 | tr -d '\r')
MISSES=$(redis-cli INFO stats | grep "keyspace_misses" | cut -d: -f2 | tr -d '\r')
TOTAL=$((HITS + MISSES))
if [ $TOTAL -gt 0 ]; then
    HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
    echo "Hit Rate: ${HIT_RATE}%"
else
    echo "No cache activity yet"
fi
```

## Maintenance Tasks

### Backup Redis Data

```bash
# Trigger background save
redis-cli BGSAVE

# Check last save time
redis-cli LASTSAVE

# Synchronous save (blocks Redis)
redis-cli SAVE

# Copy RDB file
docker cp clipper-redis:/data/dump.rdb ./backup/dump.rdb
```

### Restore from Backup

```bash
# Stop Redis
docker stop clipper-redis

# Copy backup
docker cp ./backup/dump.rdb clipper-redis:/data/dump.rdb

# Start Redis
docker start clipper-redis
```

### Clear Cache Safely

```bash
# Clear specific cache type
redis-cli --scan --pattern "feed:hot:*" | xargs redis-cli DEL

# Clear old sessions (example)
redis-cli --scan --pattern "session:*" | while read key; do
    ttl=$(redis-cli TTL "$key")
    if [ $ttl -lt 0 ]; then
        redis-cli DEL "$key"
    fi
done
```

### Optimize Memory

```bash
# Analyze memory usage by key type
redis-cli --bigkeys

# Find keys without TTL
redis-cli --scan | while read key; do
    ttl=$(redis-cli TTL "$key")
    if [ $ttl -eq -1 ]; then
        echo "$key has no TTL"
    fi
done

# Set TTL on keys without expiration
redis-cli --scan | while read key; do
    ttl=$(redis-cli TTL "$key")
    if [ $ttl -eq -1 ]; then
        redis-cli EXPIRE "$key" 3600  # 1 hour
    fi
done
```

## Production Operations

### Pre-Deployment Tasks

```bash
# Check current memory usage
redis-cli INFO memory | grep "used_memory_human"

# Check number of keys
redis-cli DBSIZE

# Get connection count
redis-cli INFO clients | grep "connected_clients"

# Verify AOF is enabled
redis-cli CONFIG GET appendonly
```

### Post-Deployment Tasks

```bash
# Warm cache (using API endpoint)
curl http://localhost:8080/admin/cache/warm

# Verify cache is being populated
redis-cli --scan --pattern "feed:*" | wc -l

# Monitor hit rate
watch -n 5 'redis-cli INFO stats | grep -E "(hits|misses)"'
```

### Rolling Restart

```bash
# Graceful restart with data persistence
redis-cli BGSAVE
sleep 5
docker restart clipper-redis

# Verify data persisted
redis-cli DBSIZE
```

### Scale Redis

```bash
# Increase memory limit (requires restart)
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG REWRITE

# Or update docker-compose.yml and restart
docker-compose restart redis
```

## Troubleshooting

### High Memory Usage

**Diagnosis:**
```bash
# Check memory usage
redis-cli INFO memory

# Find large keys
redis-cli --bigkeys

# Check number of keys
redis-cli DBSIZE
```

**Solutions:**
```bash
# Reduce TTLs
# Clear old data
redis-cli --scan --pattern "old:*" | xargs redis-cli DEL

# Increase max memory in docker-compose.yml
# Enable eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Low Hit Rate

**Diagnosis:**
```bash
# Check hit/miss ratio
redis-cli INFO stats | grep keyspace

# Check TTLs
redis-cli --scan | head -n 10 | xargs -I {} redis-cli TTL {}

# Sample keys
redis-cli RANDOMKEY
```

**Solutions:**
```bash
# Increase TTLs
# Verify cache warming is working
# Check invalidation isn't too aggressive

# Test cache population
curl http://localhost:8080/api/v1/clips?page=1
redis-cli EXISTS "feed:hot:page:1"
```

### Connection Issues

**Diagnosis:**
```bash
# Check if Redis is running
redis-cli PING

# Check connection count
redis-cli INFO clients

# Check for timeouts
redis-cli --latency

# Test connection
redis-cli --latency-history
```

**Solutions:**
```bash
# Increase connection pool size (in code)
# Check network latency
# Verify firewall rules
# Check Docker network

# Restart Redis
docker restart clipper-redis
```

### Slow Performance

**Diagnosis:**
```bash
# Check slow log
redis-cli SLOWLOG GET 10

# Monitor latency
redis-cli --latency

# Check for long-running commands
redis-cli SLOWLOG GET

# Check CPU usage
docker stats clipper-redis
```

**Solutions:**
```bash
# Avoid KEYS command (use SCAN)
# Enable pipelining for batch operations
# Reduce key size
# Use appropriate data structures

# Reset slow log after investigation
redis-cli SLOWLOG RESET
```

### Data Loss

**Diagnosis:**
```bash
# Check if AOF is enabled
redis-cli CONFIG GET appendonly

# Check last save time
redis-cli LASTSAVE

# Check persistence config
redis-cli CONFIG GET save
```

**Solutions:**
```bash
# Enable AOF persistence
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG REWRITE

# Force save
redis-cli BGSAVE

# Restore from backup
docker cp backup/dump.rdb clipper-redis:/data/
docker restart clipper-redis
```

## Useful Scripts

### Cache Stats Dashboard

```bash
#!/bin/bash
# cache_stats.sh

while true; do
    clear
    echo "=== Redis Cache Statistics ==="
    echo "Time: $(date)"
    echo ""
    
    HITS=$(redis-cli INFO stats | grep "keyspace_hits" | cut -d: -f2 | tr -d '\r')
    MISSES=$(redis-cli INFO stats | grep "keyspace_misses" | cut -d: -f2 | tr -d '\r')
    TOTAL=$((HITS + MISSES))
    
    if [ $TOTAL -gt 0 ]; then
        HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
        echo "Hit Rate: ${HIT_RATE}%"
    fi
    
    echo "Hits: $HITS"
    echo "Misses: $MISSES"
    echo ""
    
    redis-cli INFO memory | grep -E "(used_memory_human|used_memory_peak_human)"
    redis-cli INFO stats | grep "instantaneous_ops_per_sec"
    redis-cli INFO clients | grep "connected_clients"
    redis-cli DBSIZE
    
    sleep 5
done
```

### Clear Old Sessions

```bash
#!/bin/bash
# clear_old_sessions.sh

echo "Clearing expired sessions..."
COUNT=0

redis-cli --scan --pattern "session:*" | while read key; do
    TTL=$(redis-cli TTL "$key")
    if [ $TTL -lt 0 ]; then
        redis-cli DEL "$key"
        COUNT=$((COUNT + 1))
    fi
done

echo "Cleared $COUNT expired sessions"
```

### Export Cache Keys

```bash
#!/bin/bash
# export_cache_keys.sh

PATTERN="${1:-*}"
OUTPUT="cache_export_$(date +%Y%m%d_%H%M%S).json"

echo "[" > "$OUTPUT"

redis-cli --scan --pattern "$PATTERN" | while read key; do
    TYPE=$(redis-cli TYPE "$key")
    VALUE=$(redis-cli GET "$key" 2>/dev/null)
    TTL=$(redis-cli TTL "$key")
    
    echo "{\"key\":\"$key\",\"type\":\"$TYPE\",\"ttl\":$TTL}," >> "$OUTPUT"
done

# Remove trailing comma and close array
sed -i '$ s/,$//' "$OUTPUT"
echo "]" >> "$OUTPUT"

echo "Exported to $OUTPUT"
```

## Best Practices

1. **Always use SCAN instead of KEYS** in production
2. **Set appropriate TTLs** on all keys to prevent memory leaks
3. **Monitor hit rate** regularly (target > 80%)
4. **Enable AOF persistence** for durability
5. **Use pipelining** for bulk operations
6. **Set maxmemory** and eviction policy
7. **Regular backups** before major changes
8. **Test cache clearing** in staging first
9. **Monitor slow log** for performance issues
10. **Use Redis CLI carefully** in production

## Resources

- [Redis Commands](https://redis.io/commands)
- [Redis Best Practices](https://redis.io/topics/best-practices)
- [Redis Performance](https://redis.io/topics/performance)
- [Redis Persistence](https://redis.io/topics/persistence)
