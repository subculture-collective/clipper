#!/usr/bin/env bash
#
# Run All Endpoint Benchmarks and Generate Consolidated Report
#
# This script:
# 1. Runs all endpoint benchmarks
# 2. Captures metrics for each endpoint
# 3. Generates consolidated report with pass/fail status
# 4. Compares against targets from endpoint-targets.yaml
# 5. Outputs trend data for visualization
#
# Usage:
#   ./run_all_benchmarks.sh [output_dir]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${1:-${SCRIPT_DIR}/profiles/benchmarks}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="${OUTPUT_DIR}/${TIMESTAMP}"
BENCHMARK_DIR="${SCRIPT_DIR}/scenarios/benchmarks"

echo "=== API Endpoint Benchmarks Suite ==="
echo "Timestamp: ${TIMESTAMP}"
echo "Output: ${REPORT_DIR}"
echo ""

# Create output directory
mkdir -p "${REPORT_DIR}"

# Check for k6
if ! command -v k6 > /dev/null; then
    echo "Error: k6 is not installed"
    echo "Install it with: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Find all benchmark scripts
BENCHMARKS=()
while IFS= read -r -d '' benchmark; do
    BENCHMARKS+=("$benchmark")
done < <(find "${BENCHMARK_DIR}" -name "*.js" -type f -print0 | sort -z)

if [ ${#BENCHMARKS[@]} -eq 0 ]; then
    echo "Error: No benchmark scripts found in ${BENCHMARK_DIR}"
    exit 1
fi

echo "Found ${#BENCHMARKS[@]} endpoint benchmarks to run"
echo ""

# Initialize results tracking
declare -a RESULTS
TOTAL_PASSED=0
TOTAL_FAILED=0

# Run each benchmark
for benchmark in "${BENCHMARKS[@]}"; do
    BENCHMARK_NAME=$(basename "$benchmark" .js)
    echo "========================================"
    echo "Running: ${BENCHMARK_NAME}"
    echo "========================================"
    echo ""
    
    # Run benchmark with JSON output
    OUTPUT_FILE="${REPORT_DIR}/${BENCHMARK_NAME}.json"
    LOG_FILE="${REPORT_DIR}/${BENCHMARK_NAME}.log"
    
    if k6 run --out json="${OUTPUT_FILE}" "$benchmark" 2>&1 | tee "$LOG_FILE"; then
        RESULT="PASS"
        ((TOTAL_PASSED++)) || true
    else
        RESULT="FAIL"
        ((TOTAL_FAILED++)) || true
    fi
    
    RESULTS+=("${BENCHMARK_NAME}:${RESULT}")
    
    echo ""
    echo "Result: ${RESULT}"
    echo ""
done

# Generate consolidated report
REPORT_FILE="${REPORT_DIR}/BENCHMARK_REPORT.md"

cat > "${REPORT_FILE}" << EOF
# API Endpoint Benchmarks Report

**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Duration:** ~${#BENCHMARKS[@]} benchmarks  
**Results:** ${TOTAL_PASSED} passed, ${TOTAL_FAILED} failed  

## Summary

EOF

# Add summary table
cat >> "${REPORT_FILE}" << EOF
| Endpoint | Status | p50 | p95 | p99 | Error Rate | RPS | Cache Hit % |
|----------|--------|-----|-----|-----|------------|-----|-------------|
EOF

# Function to extract metrics from k6 JSON output
extract_k6_metrics() {
    local json_file=$1
    local log_file=$2
    
    # Check if jq is available
    if ! command -v jq > /dev/null; then
        echo "See ${log_file##*/} | - | - | - | - | -"
        return
    fi
    
    # Extract summary metrics from k6 JSON output
    # k6 outputs newline-delimited JSON (NDJSON), one metric per line
    # We grep for Point type metrics and take the last 1000 to get recent data
    # This is sufficient for a typical k6 run summary (usually < 100 lines)
    local summary=$(grep '"type":"Point"' "$json_file" 2>/dev/null | tail -1000)
    
    if [ -z "$summary" ]; then
        # Fallback: try to parse end-of-test summary from log
        if [ -f "$log_file" ]; then
            # Extract metrics from console summary in log file
            local p50=$(grep -oP "p50:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            local p95=$(grep -oP "p95:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            local p99=$(grep -oP "p99:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            local error_rate=$(grep -oP "Error Rate:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            local rps=$(grep -oP "Throughput:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            local cache_hit=$(grep -oP "Cache Hit Rate:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            
            # Format with defaults
            p50=${p50:-N/A}
            p95=${p95:-N/A}
            p99=${p99:-N/A}
            error_rate=${error_rate:-N/A}
            rps=${rps:-N/A}
            cache_hit=${cache_hit:-N/A}
            
            # Add 'ms' suffix for timing values if they're numeric
            [[ $p50 =~ ^[0-9.]+$ ]] && p50="${p50}ms"
            [[ $p95 =~ ^[0-9.]+$ ]] && p95="${p95}ms"
            [[ $p99 =~ ^[0-9.]+$ ]] && p99="${p99}ms"
            [[ $error_rate =~ ^[0-9.]+$ ]] && error_rate="${error_rate}%"
            [[ $cache_hit =~ ^[0-9.]+$ ]] && cache_hit="${cache_hit}%"
            
            echo "$p50 | $p95 | $p99 | $error_rate | $rps | $cache_hit"
        else
            echo "N/A | N/A | N/A | N/A | N/A | N/A"
        fi
        return
    fi
    
    # Parse k6 JSON metrics using jq
    # Note: k6 outputs aggregate metrics, we try to use built-in percentiles first
    # Fallback to Point data if aggregate metrics unavailable
    local p50=$(echo "$summary" | jq -s '
        [.[] | select(.metric=="http_req_duration" and .type=="Metric")] |
        if length > 0 then 
            (.[0].data.thresholds."p(50)" // 0)
        else 
            ([.[] | select(.metric=="http_req_duration" and .type=="Point")] |
             map(.data.value) | sort | 
             if length > 0 then (.[length * 0.5 | floor]) else 0 end)
        end
    ' 2>/dev/null | xargs printf "%.2f")
    
    local p95=$(echo "$summary" | jq -s '
        [.[] | select(.metric=="http_req_duration" and .type=="Metric")] |
        if length > 0 then 
            (.[0].data.thresholds."p(95)" // 0)
        else 
            ([.[] | select(.metric=="http_req_duration" and .type=="Point")] |
             map(.data.value) | sort | 
             if length > 0 then (.[length * 0.95 | floor]) else 0 end)
        end
    ' 2>/dev/null | xargs printf "%.2f")
    
    local p99=$(echo "$summary" | jq -s '
        [.[] | select(.metric=="http_req_duration" and .type=="Metric")] |
        if length > 0 then 
            (.[0].data.thresholds."p(99)" // 0)
        else 
            ([.[] | select(.metric=="http_req_duration" and .type=="Point")] |
             map(.data.value) | sort | 
             if length > 0 then (.[length * 0.99 | floor]) else 0 end)
        end
    ' 2>/dev/null | xargs printf "%.2f")
    
    # Calculate error rate
    local error_rate=$(echo "$summary" | jq -s '
        [.[] | select(.metric=="endpoint_errors" and .type=="Point")] |
        if length > 0 then 
            (map(.data.value) | add / length * 100)
        else 0 end
    ' 2>/dev/null | xargs printf "%.2f")
    
    # Calculate RPS (requests per second) using k6's http_reqs Rate metric
    local rps=$(echo "$summary" | jq -s '
        [.[] | select(.metric=="http_reqs" and .type=="Rate")] |
        if length > 0 then (map(.data.value) | add / length) else 0 end
    ' 2>/dev/null | xargs printf "%.2f")
    
    # Calculate cache hit rate
    local cache_hit=$(echo "$summary" | jq -s '
        [.[] | select(.metric=="cache_hits" and .type=="Point")] |
        if length > 0 then 
            (map(.data.value) | add / length * 100)
        else 0 end
    ' 2>/dev/null | xargs printf "%.2f")
    
    # Use log file fallback if JSON parsing produced empty/zero results
    if [[ "$p50" == "0.00" ]] || [[ -z "$p50" ]]; then
        if [ -f "$log_file" ]; then
            p50=$(grep -oP "p50:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            p95=$(grep -oP "p95:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            p99=$(grep -oP "p99:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            error_rate=$(grep -oP "Error Rate:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            rps=$(grep -oP "Throughput:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
            cache_hit=$(grep -oP "Cache Hit Rate:\s+\K[\d.]+" "$log_file" 2>/dev/null | tail -1)
        fi
    fi
    
    # Format output with defaults
    p50=${p50:-N/A}
    p95=${p95:-N/A}
    p99=${p99:-N/A}
    error_rate=${error_rate:-N/A}
    rps=${rps:-N/A}
    cache_hit=${cache_hit:-N/A}
    
    # Add units if values are numeric
    [[ $p50 =~ ^[0-9.]+$ ]] && p50="${p50}ms"
    [[ $p95 =~ ^[0-9.]+$ ]] && p95="${p95}ms"
    [[ $p99 =~ ^[0-9.]+$ ]] && p99="${p99}ms"
    [[ $error_rate =~ ^[0-9.]+$ ]] && error_rate="${error_rate}%"
    [[ $cache_hit =~ ^[0-9.]+$ ]] && cache_hit="${cache_hit}%"
    
    echo "$p50 | $p95 | $p99 | $error_rate | $rps | $cache_hit"
}

# Parse results from JSON files and add to table
for result in "${RESULTS[@]}"; do
    IFS=':' read -r name status <<< "$result"
    JSON_FILE="${REPORT_DIR}/${name}.json"
    LOG_FILE="${REPORT_DIR}/${name}.log"
    
    if [ -f "$JSON_FILE" ] || [ -f "$LOG_FILE" ]; then
        # Extract metrics from k6 JSON output or log file
        METRICS=$(extract_k6_metrics "$JSON_FILE" "$LOG_FILE")
        cat >> "${REPORT_FILE}" << EOF
| ${name} | ${status} | ${METRICS} |
EOF
    else
        cat >> "${REPORT_FILE}" << EOF
| ${name} | ${status} | N/A | N/A | N/A | N/A | N/A | N/A |
EOF
    fi
done

cat >> "${REPORT_FILE}" << EOF

## Benchmark Details

EOF

# Add detailed results for each benchmark
for result in "${RESULTS[@]}"; do
    IFS=':' read -r name status <<< "$result"
    LOG_FILE="${REPORT_DIR}/${name}.log"
    
    cat >> "${REPORT_FILE}" << EOF
### ${name}

**Status:** ${status}

\`\`\`
EOF
    
    if [ -f "$LOG_FILE" ]; then
        # Extract summary from log (last 30 lines usually contain summary)
        tail -30 "$LOG_FILE" >> "${REPORT_FILE}"
    else
        echo "Log file not found" >> "${REPORT_FILE}"
    fi
    
    cat >> "${REPORT_FILE}" << EOF

\`\`\`

EOF
done

# Add recommendations section
cat >> "${REPORT_FILE}" << EOF
## Recommendations

EOF

if [ $TOTAL_FAILED -gt 0 ]; then
    cat >> "${REPORT_FILE}" << EOF
⚠️ **${TOTAL_FAILED} benchmark(s) failed to meet SLO targets**

Recommended actions:
1. Review failed benchmarks above for specific threshold violations
2. Run query profiling to identify bottlenecks:
   \`make test-benchmarks-with-profiling\`
3. Check for N+1 query patterns in profiling reports
4. Review cache hit rates - low rates indicate caching issues
5. Consider adding indexes for slow queries
6. Implement or optimize caching for endpoints with low cache hit rates

EOF
else
    cat >> "${REPORT_FILE}" << EOF
✓ **All benchmarks passed SLO targets**

Continue monitoring:
- Track trends over time for regression detection
- Capture baseline for this version
- Monitor cache hit rates in production
- Review query profiling periodically

EOF
fi

# Add next steps
cat >> "${REPORT_FILE}" << EOF
## Next Steps

1. **Review Report:** Review detailed results above
2. **Query Profiling:** Run \`make test-benchmarks-with-profiling\` for detailed query analysis
3. **Capture Baseline:** If all tests pass: \`make test-load-baseline-capture VERSION=vX.Y.Z\`
4. **Track Trends:** Store results for historical comparison
5. **Address Issues:** Fix any failing benchmarks before release

## Files

EOF

# List all output files
for file in "${REPORT_DIR}"/*; do
    filename=$(basename "$file")
    cat >> "${REPORT_FILE}" << EOF
- \`${filename}\`
EOF
done

cat >> "${REPORT_FILE}" << EOF

## Viewing Results

\`\`\`bash
# View this report
cat ${REPORT_FILE}

# View individual benchmark results
cat ${REPORT_DIR}/<benchmark_name>.log

# Run query profiling on failing endpoints
make test-profile-queries ENDPOINT=<endpoint_name> DURATION=60
\`\`\`

---
Generated by: run_all_benchmarks.sh  
Report Path: ${REPORT_FILE}
EOF

echo ""
echo "========================================"
echo "=== Benchmark Suite Complete ==="
echo "========================================"
echo ""
echo "Results:"
echo "  Total: ${#BENCHMARKS[@]} benchmarks"
echo "  Passed: ${TOTAL_PASSED}"
echo "  Failed: ${TOTAL_FAILED}"
echo ""
echo "Report: ${REPORT_FILE}"
echo ""

# Print summary table
echo "Summary:"
for result in "${RESULTS[@]}"; do
    IFS=':' read -r name status <<< "$result"
    if [ "$status" = "PASS" ]; then
        echo "  ✓ ${name}"
    else
        echo "  ✗ ${name}"
    fi
done

echo ""

# Exit with error if any benchmarks failed
if [ $TOTAL_FAILED -gt 0 ]; then
    echo "❌ ${TOTAL_FAILED} benchmark(s) failed"
    echo ""
    echo "Review report: ${REPORT_FILE}"
    echo "Run profiling: make test-benchmarks-with-profiling"
    exit 1
else
    echo "✅ All benchmarks passed!"
    echo ""
    echo "Consider capturing baseline: make test-load-baseline-capture VERSION=vX.Y.Z"
    exit 0
fi
