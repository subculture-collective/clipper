#!/bin/bash

# Soak Test Monitoring Script
# Continuously monitors system during soak tests and collects profiles

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080}"
MONITOR_DIR="soak_monitoring/$(date +%Y%m%d_%H%M%S)"
INTERVAL_MINUTES="${INTERVAL_MINUTES:-15}"
DURATION_HOURS="${DURATION_HOURS:-24}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Soak Test Monitoring${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Monitor Directory: $MONITOR_DIR"
echo "  Sampling Interval: $INTERVAL_MINUTES minutes"
echo "  Expected Duration: $DURATION_HOURS hours"
echo ""

# Create monitoring directory
mkdir -p "$MONITOR_DIR"
mkdir -p "$MONITOR_DIR/profiles"
mkdir -p "$MONITOR_DIR/metrics"
mkdir -p "$MONITOR_DIR/health"

# Check backend availability
if ! curl -s "$BASE_URL/api/v1/health" > /dev/null; then
    echo -e "${RED}✗ Backend is not accessible at $BASE_URL${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend is accessible${NC}"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ jq is not installed${NC}"
    echo "  jq is required for JSON parsing"
    echo "  Install it with: apt-get install jq (Debian/Ubuntu) or brew install jq (macOS)"
    exit 1
fi
echo -e "${GREEN}✓ jq is installed${NC}"
echo ""

# Initialize CSV files for trend tracking
cat > "$MONITOR_DIR/memory_trends.csv" << EOF
timestamp,heap_alloc_mb,heap_sys_mb,heap_idle_mb,heap_inuse_mb,num_gc,goroutines
EOF

cat > "$MONITOR_DIR/response_trends.csv" << EOF
timestamp,health_duration_ms,health_status,db_connections,cache_hit_rate
EOF

echo -e "${YELLOW}Starting monitoring loop...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop monitoring${NC}"
echo ""

# Track start time
START_TIME=$(date +%s)
SAMPLE_COUNT=0

# Function to collect profiles
collect_profiles() {
    local timestamp=$1
    local sample_num=$2
    
    echo -e "${BLUE}[Sample $sample_num] Collecting profiles at $timestamp${NC}"
    
    # Collect heap profile
    if curl -s "$BASE_URL/debug/pprof/heap" > "$MONITOR_DIR/profiles/heap_${timestamp}.pb.gz"; then
        echo "  ✓ Heap profile saved"
    else
        echo -e "${RED}  ✗ Failed to collect heap profile${NC}"
    fi
    
    # Collect goroutine profile
    if curl -s "$BASE_URL/debug/pprof/goroutine" > "$MONITOR_DIR/profiles/goroutine_${timestamp}.pb.gz"; then
        echo "  ✓ Goroutine profile saved"
    else
        echo -e "${RED}  ✗ Failed to collect goroutine profile${NC}"
    fi
    
    # Collect allocs profile
    if curl -s "$BASE_URL/debug/pprof/allocs" > "$MONITOR_DIR/profiles/allocs_${timestamp}.pb.gz"; then
        echo "  ✓ Allocs profile saved"
    else
        echo -e "${RED}  ✗ Failed to collect allocs profile${NC}"
    fi
}

# Function to collect metrics
collect_metrics() {
    local timestamp=$1
    
    # Collect Prometheus metrics
    if curl -s "$BASE_URL/debug/metrics" > "$MONITOR_DIR/metrics/metrics_${timestamp}.txt"; then
        echo "  ✓ Prometheus metrics saved"
    else
        echo -e "${RED}  ✗ Failed to collect metrics${NC}"
    fi
    
    # Collect health check data
    local health_start=$(date +%s%3N)
    local health_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/health")
    local health_end=$(date +%s%3N)
    local health_duration=$((health_end - health_start))
    local health_status=$(echo "$health_response" | tail -1)
    local health_body=$(echo "$health_response" | head -n -1)
    
    echo "$health_body" > "$MONITOR_DIR/health/health_${timestamp}.json"
    echo "  ✓ Health check saved (${health_duration}ms, status: $health_status)"
    
    # Extract key metrics from health check
    local db_connections=$(echo "$health_body" | jq -r '.database.connections // 0' 2>/dev/null || echo "0")
    local cache_hit_rate=$(echo "$health_body" | jq -r '.cache.hit_rate // 0' 2>/dev/null || echo "0")
    
    # Append to response trends CSV
    echo "${timestamp},${health_duration},${health_status},${db_connections},${cache_hit_rate}" >> "$MONITOR_DIR/response_trends.csv"
}

# Function to extract memory stats
extract_memory_stats() {
    local timestamp=$1
    local metrics_file="$MONITOR_DIR/metrics/metrics_${timestamp}.txt"
    
    if [ ! -f "$metrics_file" ]; then
        return
    fi
    
    # Parse Go runtime metrics
    local heap_alloc=$(grep "^go_memstats_alloc_bytes " "$metrics_file" | awk '{print $2}' || echo "0")
    local heap_sys=$(grep "^go_memstats_sys_bytes " "$metrics_file" | awk '{print $2}' || echo "0")
    local heap_idle=$(grep "^go_memstats_heap_idle_bytes " "$metrics_file" | awk '{print $2}' || echo "0")
    local heap_inuse=$(grep "^go_memstats_heap_inuse_bytes " "$metrics_file" | awk '{print $2}' || echo "0")
    local num_gc=$(grep "^go_memstats_gc_completed_total " "$metrics_file" | awk '{print $2}' || echo "0")
    local goroutines=$(grep "^go_goroutines " "$metrics_file" | awk '{print $2}' || echo "0")
    
    # Convert to MB
    local heap_alloc_mb=$(echo "scale=2; $heap_alloc / 1024 / 1024" | bc -l 2>/dev/null || echo "0")
    local heap_sys_mb=$(echo "scale=2; $heap_sys / 1024 / 1024" | bc -l 2>/dev/null || echo "0")
    local heap_idle_mb=$(echo "scale=2; $heap_idle / 1024 / 1024" | bc -l 2>/dev/null || echo "0")
    local heap_inuse_mb=$(echo "scale=2; $heap_inuse / 1024 / 1024" | bc -l 2>/dev/null || echo "0")
    
    # Append to memory trends CSV
    echo "${timestamp},${heap_alloc_mb},${heap_sys_mb},${heap_idle_mb},${heap_inuse_mb},${num_gc},${goroutines}" >> "$MONITOR_DIR/memory_trends.csv"
    
    echo "  ✓ Memory stats: Heap ${heap_alloc_mb}MB, Goroutines ${goroutines}, GCs ${num_gc}"
}

# Function to generate interim report
generate_interim_report() {
    local current_hour=$1
    
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Interim Report - ${current_hour}h Elapsed${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    # Analyze memory trends
    if [ -f "$MONITOR_DIR/memory_trends.csv" ]; then
        local first_mem=$(tail -n +2 "$MONITOR_DIR/memory_trends.csv" | head -1 | cut -d',' -f2)
        local last_mem=$(tail -1 "$MONITOR_DIR/memory_trends.csv" | cut -d',' -f2)
        
        if [ ! -z "$first_mem" ] && [ ! -z "$last_mem" ]; then
            local mem_change=$(echo "scale=2; $last_mem - $first_mem" | bc -l 2>/dev/null || echo "0")
            local mem_change_pct=$(echo "scale=1; ($mem_change / $first_mem) * 100" | bc -l 2>/dev/null || echo "0")
            
            echo "Memory Trend:"
            echo "  Initial: ${first_mem}MB"
            echo "  Current: ${last_mem}MB"
            echo "  Change: ${mem_change}MB (${mem_change_pct}%)"
            
            if (( $(echo "$mem_change_pct > 20" | bc -l 2>/dev/null || echo "0") )); then
                echo -e "  ${RED}⚠️  WARNING: Memory increased by >20%${NC}"
            elif (( $(echo "$mem_change_pct > 10" | bc -l 2>/dev/null || echo "0") )); then
                echo -e "  ${YELLOW}⚠️  CAUTION: Memory increased by >10%${NC}"
            else
                echo -e "  ${GREEN}✓ Memory stable${NC}"
            fi
        fi
    fi
    
    # Analyze goroutine trends
    if [ -f "$MONITOR_DIR/memory_trends.csv" ]; then
        local first_goroutines=$(tail -n +2 "$MONITOR_DIR/memory_trends.csv" | head -1 | cut -d',' -f7)
        local last_goroutines=$(tail -1 "$MONITOR_DIR/memory_trends.csv" | cut -d',' -f7)
        
        if [ ! -z "$first_goroutines" ] && [ ! -z "$last_goroutines" ]; then
            local gor_change=$((last_goroutines - first_goroutines))
            
            echo ""
            echo "Goroutine Trend:"
            echo "  Initial: ${first_goroutines}"
            echo "  Current: ${last_goroutines}"
            echo "  Change: ${gor_change}"
            
            if [ $gor_change -gt 100 ]; then
                echo -e "  ${RED}⚠️  WARNING: Goroutine count increased by >100${NC}"
            elif [ $gor_change -gt 50 ]; then
                echo -e "  ${YELLOW}⚠️  CAUTION: Goroutine count increased by >50${NC}"
            else
                echo -e "  ${GREEN}✓ Goroutines stable${NC}"
            fi
        fi
    fi
    
    echo -e "${YELLOW}========================================${NC}"
    echo ""
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Monitoring stopped${NC}"
    
    # Generate final report
    cat > "$MONITOR_DIR/MONITORING_REPORT.md" << EOF
# Soak Test Monitoring Report

**Start Time**: $(date -r $START_TIME 2>/dev/null || date -d @$START_TIME)
**End Time**: $(date)
**Samples Collected**: $SAMPLE_COUNT
**Monitoring Interval**: $INTERVAL_MINUTES minutes

## Files Collected

- **Profiles**: $MONITOR_DIR/profiles/
  - Heap profiles (*.pb.gz)
  - Goroutine profiles (*.pb.gz)
  - Allocation profiles (*.pb.gz)
  
- **Metrics**: $MONITOR_DIR/metrics/
  - Prometheus metrics snapshots
  
- **Health Checks**: $MONITOR_DIR/health/
  - Health check responses

- **Trend Data**:
  - memory_trends.csv - Memory and goroutine trends
  - response_trends.csv - Response time and health trends

## Analysis Commands

### Memory Analysis

Compare first and last heap profiles:
\`\`\`bash
go tool pprof -base \$(ls $MONITOR_DIR/profiles/heap_*.pb.gz | head -1) \$(ls $MONITOR_DIR/profiles/heap_*.pb.gz | tail -1)
\`\`\`

View memory trends:
\`\`\`bash
cat $MONITOR_DIR/memory_trends.csv
\`\`\`

### Goroutine Analysis

View goroutine profile:
\`\`\`bash
go tool pprof -http=:8081 \$(ls $MONITOR_DIR/profiles/goroutine_*.pb.gz | tail -1)
\`\`\`

### Response Time Analysis

View response trends:
\`\`\`bash
cat $MONITOR_DIR/response_trends.csv
\`\`\`

## Recommendations

1. Review memory trends for continuous growth
2. Check goroutine counts for leaks
3. Compare baseline vs. final profiles
4. Analyze response time degradation
5. Check for connection pool issues

EOF
    
    echo ""
    echo -e "${GREEN}Monitoring report saved to: $MONITOR_DIR/MONITORING_REPORT.md${NC}"
    echo ""
    
    exit 0
}

# Set up trap for Ctrl+C
trap cleanup SIGINT SIGTERM

# Main monitoring loop
while true; do
    SAMPLE_COUNT=$((SAMPLE_COUNT + 1))
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    CURRENT_TIME=$(date +%s)
    ELAPSED_HOURS=$(echo "scale=1; ($CURRENT_TIME - $START_TIME) / 3600" | bc -l)
    
    echo ""
    echo -e "${BLUE}========== Sample $SAMPLE_COUNT (${ELAPSED_HOURS}h elapsed) ==========${NC}"
    
    # Collect data
    collect_profiles "$TIMESTAMP" "$SAMPLE_COUNT"
    collect_metrics "$TIMESTAMP"
    extract_memory_stats "$TIMESTAMP"
    
    # Generate interim report every 4 hours (based on elapsed time, not sample count)
    ELAPSED_HOURS_INT=$(echo "$ELAPSED_HOURS / 1" | bc)
    if [ $((ELAPSED_HOURS_INT % 4)) -eq 0 ] && [ $ELAPSED_HOURS_INT -gt 0 ]; then
        # Only generate if we haven't already generated for this 4-hour mark
        LAST_REPORT_HOUR=${LAST_REPORT_HOUR:-0}
        if [ $ELAPSED_HOURS_INT -gt $LAST_REPORT_HOUR ]; then
            generate_interim_report "$ELAPSED_HOURS_INT"
            LAST_REPORT_HOUR=$ELAPSED_HOURS_INT
        fi
    fi
    
    echo ""
    echo -e "${GREEN}Next sample in $INTERVAL_MINUTES minutes...${NC}"
    
    # Sleep for configured interval
    sleep $((INTERVAL_MINUTES * 60))
done
