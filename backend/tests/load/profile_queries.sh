#!/usr/bin/env bash
#
# Query Profiling and N+1 Detection Harness
# 
# This script captures database query patterns during load tests to:
# 1. Identify N+1 query problems
# 2. Capture EXPLAIN ANALYZE output for slow queries
# 3. Monitor query counts per endpoint
# 4. Generate profiling reports
#
# Usage:
#   ./profile_queries.sh <endpoint_name> [duration_seconds]
#
# Example:
#   ./profile_queries.sh feed_list 60
#   ./profile_queries.sh search 120

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE_DIR="${SCRIPT_DIR}/../profiles/queries"
ENDPOINT_NAME="${1:-mixed}"
DURATION="${2:-60}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROFILE_OUTPUT_DIR="${PROFILE_DIR}/${ENDPOINT_NAME}_${TIMESTAMP}"

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-clipper_load_test}"
DB_USER="${DB_USER:-clipper}"
DB_PASSWORD="${DB_PASSWORD:-clipper_password}"

# Thresholds for detection
SLOW_QUERY_THRESHOLD_MS="${SLOW_QUERY_THRESHOLD_MS:-100}"
N_PLUS_ONE_QUERY_COUNT="${N_PLUS_ONE_QUERY_COUNT:-10}"

echo "=== Query Profiling Harness ==="
echo "Endpoint: ${ENDPOINT_NAME}"
echo "Duration: ${DURATION} seconds"
echo "Output: ${PROFILE_OUTPUT_DIR}"
echo ""

# Create output directory
mkdir -p "${PROFILE_OUTPUT_DIR}"

# Enable query logging temporarily
echo "Enabling PostgreSQL query logging..."
export PGPASSWORD="${DB_PASSWORD}"

# Enable pg_stat_statements if not already enabled
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c \
  "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;" 2>/dev/null || true

# Reset statistics
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c \
  "SELECT pg_stat_statements_reset();" >/dev/null

# Capture initial state
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -F"," -c \
  "SELECT now() AS timestamp, query, calls, total_exec_time, mean_exec_time, min_exec_time, max_exec_time
   FROM pg_stat_statements
   ORDER BY total_exec_time DESC
   LIMIT 100;" > "${PROFILE_OUTPUT_DIR}/queries_before.csv"

echo "Capturing baseline query stats..."
echo ""
echo "Starting load test for ${DURATION} seconds..."
echo "Run your k6 test now, or it will auto-start in 5 seconds..."
sleep 5

# Run k6 load test for the endpoint
K6_SCENARIO="${SCRIPT_DIR}/../scenarios/benchmarks/${ENDPOINT_NAME}.js"
if [ ! -f "${K6_SCENARIO}" ]; then
  K6_SCENARIO="${SCRIPT_DIR}/../scenarios/${ENDPOINT_NAME}.js"
fi

if [ -f "${K6_SCENARIO}" ]; then
  echo "Running k6 scenario: ${K6_SCENARIO}"
  k6 run --duration "${DURATION}s" \
    --out json="${PROFILE_OUTPUT_DIR}/k6_results.json" \
    "${K6_SCENARIO}" &
  K6_PID=$!
  
  # Wait for k6 to complete
  wait ${K6_PID}
else
  echo "Warning: k6 scenario not found at ${K6_SCENARIO}"
  echo "Sleeping for ${DURATION} seconds while you run your test manually..."
  sleep "${DURATION}"
fi

echo ""
echo "Load test complete. Capturing query statistics..."

# Capture query statistics after load test
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -F"," -c \
  "SELECT now() AS timestamp, query, calls, total_exec_time, mean_exec_time, min_exec_time, max_exec_time, stddev_exec_time
   FROM pg_stat_statements
   WHERE calls > 0
   ORDER BY total_exec_time DESC
   LIMIT 100;" > "${PROFILE_OUTPUT_DIR}/queries_after.csv"

# Identify slow queries
echo "Analyzing slow queries (>${SLOW_QUERY_THRESHOLD_MS}ms)..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -F"," -c \
  "SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   WHERE mean_exec_time > ${SLOW_QUERY_THRESHOLD_MS}
     AND calls > 0
   ORDER BY mean_exec_time DESC;" > "${PROFILE_OUTPUT_DIR}/slow_queries.csv"

# Detect potential N+1 queries (high call count with low execution time each)
echo "Detecting potential N+1 query patterns..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -F"," -c \
  "SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   WHERE calls > ${N_PLUS_ONE_QUERY_COUNT}
     AND mean_exec_time < 10  -- Fast individual queries
     AND query NOT LIKE '%pg_stat%'  -- Exclude monitoring queries
   ORDER BY calls DESC;" > "${PROFILE_OUTPUT_DIR}/n_plus_one_candidates.csv"

# Capture EXPLAIN ANALYZE for top slow queries
echo "Capturing EXPLAIN ANALYZE for slow queries..."
cat > "${PROFILE_OUTPUT_DIR}/explain_analyze.txt" << EOF
# EXPLAIN ANALYZE Results for Slow Queries
# Generated: $(date)
# Endpoint: ${ENDPOINT_NAME}

EOF

# Get unique slow queries and explain them
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -c \
  "SELECT DISTINCT query
   FROM pg_stat_statements
   WHERE mean_exec_time > ${SLOW_QUERY_THRESHOLD_MS}
     AND calls > 0
     AND query NOT LIKE 'EXPLAIN%'
     AND query NOT LIKE '%pg_stat%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;" | while IFS= read -r query; do
  
  if [ -n "$query" ]; then
    echo "" >> "${PROFILE_OUTPUT_DIR}/explain_analyze.txt"
    echo "=== Query: ${query:0:100}... ===" >> "${PROFILE_OUTPUT_DIR}/explain_analyze.txt"
    echo "" >> "${PROFILE_OUTPUT_DIR}/explain_analyze.txt"
    
    # Attempt to EXPLAIN the query (may fail for some queries)
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c \
      "EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT) ${query};" \
      >> "${PROFILE_OUTPUT_DIR}/explain_analyze.txt" 2>&1 || \
      echo "Could not explain this query" >> "${PROFILE_OUTPUT_DIR}/explain_analyze.txt"
    echo "" >> "${PROFILE_OUTPUT_DIR}/explain_analyze.txt"
  fi
done

# Generate summary report
cat > "${PROFILE_OUTPUT_DIR}/REPORT.md" << EOF
# Query Profile Report

**Endpoint:** ${ENDPOINT_NAME}  
**Timestamp:** ${TIMESTAMP}  
**Duration:** ${DURATION} seconds  
**Slow Query Threshold:** ${SLOW_QUERY_THRESHOLD_MS}ms  

## Summary

EOF

# Count queries
TOTAL_QUERIES=$(wc -l < "${PROFILE_OUTPUT_DIR}/queries_after.csv" || echo "0")
SLOW_QUERIES=$(wc -l < "${PROFILE_OUTPUT_DIR}/slow_queries.csv" || echo "0")
N_PLUS_ONE=$(wc -l < "${PROFILE_OUTPUT_DIR}/n_plus_one_candidates.csv" || echo "0")

cat >> "${PROFILE_OUTPUT_DIR}/REPORT.md" << EOF
- **Total Unique Queries:** ${TOTAL_QUERIES}
- **Slow Queries (>${SLOW_QUERY_THRESHOLD_MS}ms):** ${SLOW_QUERIES}
- **Potential N+1 Patterns:** ${N_PLUS_ONE}

## Top Slow Queries

\`\`\`
EOF

# Add slow queries to report
head -20 "${PROFILE_OUTPUT_DIR}/slow_queries.csv" >> "${PROFILE_OUTPUT_DIR}/REPORT.md" 2>/dev/null || echo "No slow queries detected" >> "${PROFILE_OUTPUT_DIR}/REPORT.md"

cat >> "${PROFILE_OUTPUT_DIR}/REPORT.md" << EOF
\`\`\`

## Potential N+1 Query Patterns

These queries were called many times with fast individual execution:

\`\`\`
EOF

head -20 "${PROFILE_OUTPUT_DIR}/n_plus_one_candidates.csv" >> "${PROFILE_OUTPUT_DIR}/REPORT.md" 2>/dev/null || echo "No N+1 patterns detected" >> "${PROFILE_OUTPUT_DIR}/REPORT.md"

cat >> "${PROFILE_OUTPUT_DIR}/REPORT.md" << EOF
\`\`\`

## Recommendations

EOF

# Generate recommendations based on findings
if [ "$SLOW_QUERIES" -gt 5 ]; then
  cat >> "${PROFILE_OUTPUT_DIR}/REPORT.md" << EOF
- **High number of slow queries detected (${SLOW_QUERIES})**: Review EXPLAIN ANALYZE output in \`explain_analyze.txt\` and consider:
  - Adding database indexes
  - Optimizing query structure
  - Adding query result caching
EOF
fi

if [ "$N_PLUS_ONE" -gt 3 ]; then
  cat >> "${PROFILE_OUTPUT_DIR}/REPORT.md" << EOF
- **N+1 query patterns detected (${N_PLUS_ONE} patterns)**: Consider:
  - Using JOIN instead of separate queries
  - Implementing eager loading/batch loading
  - Using DataLoader pattern for GraphQL-style batching
EOF
fi

cat >> "${PROFILE_OUTPUT_DIR}/REPORT.md" << EOF

## Files

- \`queries_before.csv\` - Baseline query statistics
- \`queries_after.csv\` - Query statistics after load test
- \`slow_queries.csv\` - Queries exceeding ${SLOW_QUERY_THRESHOLD_MS}ms threshold
- \`n_plus_one_candidates.csv\` - Potential N+1 query patterns
- \`explain_analyze.txt\` - EXPLAIN ANALYZE output for slow queries
- \`k6_results.json\` - Load test results

## Next Steps

1. Review slow queries and EXPLAIN ANALYZE output
2. Identify and fix N+1 query patterns
3. Add missing indexes
4. Implement caching for frequent queries
5. Re-run profiling to validate improvements
EOF

echo ""
echo "=== Profiling Complete ==="
echo ""
echo "Results saved to: ${PROFILE_OUTPUT_DIR}"
echo ""
echo "Summary:"
echo "  Total Queries: ${TOTAL_QUERIES}"
echo "  Slow Queries: ${SLOW_QUERIES}"
echo "  N+1 Candidates: ${N_PLUS_ONE}"
echo ""
echo "View report: cat ${PROFILE_OUTPUT_DIR}/REPORT.md"
echo ""

# Print summary if there are issues
if [ "$SLOW_QUERIES" -gt 0 ] || [ "$N_PLUS_ONE" -gt 0 ]; then
  echo "⚠️  Performance issues detected!"
  [ "$SLOW_QUERIES" -gt 0 ] && echo "   - ${SLOW_QUERIES} slow queries"
  [ "$N_PLUS_ONE" -gt 0 ] && echo "   - ${N_PLUS_ONE} potential N+1 patterns"
  exit 1
else
  echo "✓ No significant performance issues detected"
  exit 0
fi
