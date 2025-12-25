# Background Jobs Dashboard

This dashboard provides comprehensive monitoring for Clipper's background job schedulers.

## Quick Access

- **Grafana**: <http://localhost:3000/d/background-jobs>
- **JSON**: `monitoring/dashboards/background-jobs.json`

## Overview

The Background Jobs dashboard monitors all periodic maintenance tasks in Clipper:

- **hot_score_refresh**: Updates hot scores for trending clips (every 5 minutes)
- **trending_score_refresh**: Recalculates trending scores (every 60 minutes)
- **clip_sync**: Syncs clips from Twitch API (every 15 minutes)
- **reputation_tasks**: Awards badges and updates user stats (every 6 hours)
- **webhook_retry**: Retries failed webhook deliveries (every 1 minute)
- **embedding_generation**: Generates embeddings for new clips (configurable)

## Dashboard Panels

### 1. Job Execution Status Overview
**Type**: Stat Panel  
**Metric**: Success and failure rates per minute  
**Purpose**: Quick health check of all jobs  
**Thresholds**:
- Green: Normal operation
- Yellow: > 0.1 failures/min
- Red: > 1 failure/min

### 2. Job Success Rate (%)
**Type**: Gauge  
**Metric**: Overall success rate across all jobs  
**Purpose**: Executive summary of job health  
**Thresholds**:
- Red: < 50%
- Yellow: 50-90%
- Green: > 90%

### 3. Job Queue Sizes
**Type**: Time Series  
**Metric**: Current queue size per job  
**Purpose**: Monitor queue growth and capacity  
**Alert Triggers**:
- Warning: Queue > 100 and growing
- Critical: Queue > 1000

### 4. Job Execution Rate by Job
**Type**: Time Series  
**Metric**: Success and failure execution rates  
**Purpose**: Track execution frequency and failures per job  
**Legend**: Shows last value and mean rate

### 5. Job Duration (P95) by Job
**Type**: Time Series  
**Metric**: P95 and P50 execution duration  
**Purpose**: Performance monitoring and trend analysis  
**Alert Triggers**:
- Warning: P95 > 300 seconds
- Critical: P95 > 600 seconds

### 6. Time Since Last Successful Run
**Type**: Stat Panel with Thresholds  
**Metric**: Minutes since last successful execution  
**Purpose**: Staleness detection  
**Thresholds**:
- Green: < 120 minutes
- Yellow: 120-360 minutes
- Red: > 360 minutes

### 7. Items Processed Rate by Job
**Type**: Time Series  
**Metric**: Rate of items processed (success/failed/skipped)  
**Purpose**: Throughput monitoring  
**Legend**: Shows last, mean, and total values

### 8. Job Failure Rate by Job
**Type**: Bar Gauge  
**Metric**: Current failure rate percentage per job  
**Purpose**: Quick identification of problematic jobs  
**Thresholds**:
- Green: < 5%
- Yellow: 5-20%
- Red: > 20%

### 9. Job Execution Heatmap
**Type**: Heatmap  
**Metric**: Execution duration distribution  
**Purpose**: Identify patterns and outliers  
**Color Scheme**: Spectral (blue to red)

### 10. Job Execution Details Table
**Type**: Table with Conditional Formatting  
**Columns**:
- Job Name
- Success/min
- Failures/min
- P95 Duration (s)
- Time Since Success (min)

**Purpose**: Comprehensive job status at a glance  
**Formatting**: Color-coded cells based on thresholds

## Using the Dashboard

### Health Check Workflow
1. Check **Job Success Rate** gauge - should be > 90%
2. Review **Time Since Last Success** - all jobs should be green
3. Scan **Job Failure Rate** bar gauge - identify any red bars
4. Check **Job Queue Sizes** - ensure no unusual growth

### Performance Investigation
1. Review **Job Duration (P95)** trends
2. Check if duration correlates with **Items Processed Rate**
3. Use **Heatmap** to identify patterns in execution times
4. Compare P50 vs P95 to identify outliers

### Troubleshooting Failed Jobs
1. Identify failing job in **Execution Rate** panel (red lines)
2. Check **Time Since Last Success** for staleness
3. Review **Failure Rate** for severity
4. Check **Queue Sizes** for backlog
5. Refer to [runbook](../../docs/operations/runbooks/background-jobs.md)

## Metrics Reference

All metrics are collected via `pkg/metrics/job_metrics.go`:

```promql
# Total executions
job_execution_total{job_name="hot_score_refresh", status="success"}

# Execution duration
job_execution_duration_seconds{job_name="hot_score_refresh"}

# Last success timestamp
job_last_success_timestamp_seconds{job_name="hot_score_refresh"}

# Items processed
job_items_processed_total{job_name="clip_sync", status="success"}

# Queue size
job_queue_size{job_name="webhook_retry"}
```

## Alert Integration

This dashboard complements the following alerts configured in `monitoring/alerts.yml`:

- **BackgroundJobFailing**: Fires when failure rate > 5% over a 10-minute window
- **BackgroundJobCriticalFailureRate**: Fires when failure rate > 50% over a 5-minute window
- **BackgroundJobNotRunning**: Fires when no success for > 2 hours (Note: may not detect failures in jobs with intervals > 2h like reputation_tasks)
- **BackgroundJobCriticallyStale**: Fires when no success for > 24 hours
- **BackgroundJobHighDuration**: Fires when P95 > 300 seconds
- **BackgroundJobCriticalDuration**: Fires when P95 > 600 seconds
- **BackgroundJobQueueGrowing**: Fires when queue growing rapidly
- **BackgroundJobCriticalQueueSize**: Fires when queue > 1000
- **BackgroundJobHighItemFailureRate**: Fires when item failure > 20%

## Customization

### Time Range
Default: Last 6 hours  
Recommended ranges:
- Real-time monitoring: Last 15 minutes
- Trend analysis: Last 24 hours
- Capacity planning: Last 7 days

### Refresh Rate
Default: 30 seconds  
Can be adjusted based on needs:
- Active incidents: 10 seconds
- Normal monitoring: 30-60 seconds
- Historical analysis: Off

### Adding New Jobs

When adding a new background job:

1. Instrument the job with metrics:
   ```go
   import "github.com/subculture-collective/clipper/pkg/metrics"

   func (s *MyScheduler) runJob(ctx context.Context) {
       jobName := "my_new_job"
       startTime := time.Now()

       err := s.doWork(ctx)
       duration := time.Since(startTime)

       metrics.JobExecutionDuration.WithLabelValues(jobName).Observe(duration.Seconds())
       
       if err != nil {
           metrics.JobExecutionTotal.WithLabelValues(jobName, "failed").Inc()
           return
       }

       metrics.JobExecutionTotal.WithLabelValues(jobName, "success").Inc()
       metrics.JobLastSuccessTimestamp.WithLabelValues(jobName).Set(float64(time.Now().Unix()))
   }
   ```

2. The dashboard will automatically include the new job in all panels

3. Add job-specific alerts if needed in `monitoring/alerts.yml`

4. Update runbook documentation

## Related Documentation

- [Runbook: Background Jobs](../../docs/operations/runbooks/background-jobs.md)
- [Monitoring Overview](../README.md)
- [Alert Rules](../alerts.yml)
- [Operations: Monitoring](../../docs/operations/monitoring.md)

## Maintenance

This dashboard is automatically provisioned via `monitoring/dashboards/dashboards.yml`.

To update:
1. Edit `monitoring/dashboards/background-jobs.json`
2. Restart Grafana or wait for auto-reload (if configured)
3. Changes are version-controlled and deploy with the application

## Support

For questions or issues with the dashboard:
1. Check the [runbook](../../docs/operations/runbooks/background-jobs.md)
2. Review recent changes to background jobs
3. Verify Prometheus is scraping metrics: <http://localhost:9090/targets>
4. Check Grafana data source: Settings > Data Sources > Prometheus
