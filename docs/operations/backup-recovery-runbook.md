---
title: "Backup & Recovery Runbook"
summary: "Operational runbook for automated backup and recovery procedures including daily backups, PITR, restore testing, and incident response."
tags: ["operations", "backup", "recovery", "pitr", "disaster-recovery"]
area: "operations"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-01-02
aliases: ["backup runbook", "recovery runbook", "pitr runbook"]
related_issues:
  - "subculture-collective/clipper#863"
  - "subculture-collective/clipper#805"
---

# Backup & Recovery Runbook

Operational procedures for Clipper's automated backup and recovery system including daily database backups, Point-in-Time Recovery (PITR), automated restore testing, and incident response.

## Table of Contents

- [Overview](#overview)
- [Backup System Architecture](#backup-system-architecture)
- [Daily Operations](#daily-operations)
- [Monitoring & Alerts](#monitoring--alerts)
- [Recovery Procedures](#recovery-procedures)
- [Troubleshooting](#troubleshooting)
- [RTO/RPO Targets](#rtorpo-targets)
- [Related Documentation](#related-documentation)

---

## Overview

### Backup Strategy

Clipper implements a comprehensive backup strategy:

1. **Daily Full Backups**: Automated PostgreSQL dumps at 2 AM UTC
2. **Continuous WAL Archiving**: Point-in-Time Recovery with 7-day window
3. **Daily Volume Snapshots**: PersistentVolume snapshots at 3 AM UTC
4. **Monthly Restore Tests**: Automated validation on the 1st of each month at 4 AM UTC
5. **Cross-Region Storage**: All backups stored in multi-region cloud storage

### RTO and RPO Targets

| Metric | Target | Maximum |
|--------|--------|---------|
| **Recovery Time Objective (RTO)** | < 30 minutes | 1 hour |
| **Recovery Point Objective (RPO)** | < 5 minutes | 15 minutes |
| **PITR Window** | 7 days | 7 days |
| **Backup Retention** | 30 days | 30 days |

### Components

- **Backup CronJobs**: `infrastructure/k8s/base/backup-cronjobs.yaml`
- **PITR Configuration**: `infrastructure/k8s/base/postgres-pitr-config.yaml`
- **Monitoring Alerts**: `monitoring/alerts.yml` (backup section)
- **Cloud Storage**: Multi-region GCS/S3/Azure Blob Storage

---

## Backup System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Primary Region (Kubernetes)                 │
│                                                               │
│  ┌────────────────┐         ┌────────────────┐             │
│  │  PostgreSQL    │         │  Volume        │             │
│  │  StatefulSet   │         │  Snapshots     │             │
│  └────────┬───────┘         └────────┬───────┘             │
│           │                          │                       │
│           │ WAL Archiving            │ Daily Snapshots      │
│           │ (5 min intervals)        │ (3 AM UTC)          │
│           │                          │                       │
│  ┌────────▼────────────────────────▼────────┐              │
│  │  Backup CronJobs (backup-operator SA)    │              │
│  │  - postgres-backup (2 AM UTC)            │              │
│  │  - volume-snapshot (3 AM UTC)            │              │
│  │  - restore-test (monthly, 1st at 4 AM)   │              │
│  └────────┬─────────────────────────────────┘              │
└───────────┼─────────────────────────────────────────────────┘
            │
            │ Encrypted Upload
            ▼
┌─────────────────────────────────────────────────────────────┐
│        Multi-Region Cloud Storage (GCS/S3/Azure)            │
│                                                               │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  database/      │  │  wal-archive/│  │  snapshots/    │ │
│  │  postgres-*.gz  │  │  WAL files   │  │  volume snaps  │ │
│  │  (30 days)      │  │  (7 days)    │  │  (14 days)     │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
│                                                               │
│  Encryption: AES256 at rest                                  │
│  Replication: Multi-region (us-central1 + us-east1)         │
└─────────────────────────────────────────────────────────────┘
            │
            │ Monthly Restore Test
            ▼
┌─────────────────────────────────────────────────────────────┐
│              Restore Test Namespace (ephemeral)              │
│                                                               │
│  - Download latest backup                                    │
│  - Restore to test database                                  │
│  - Validate data integrity                                   │
│  - Measure RTO (target: < 1 hour)                           │
│  - Report metrics to Prometheus                              │
│  - Cleanup test resources                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Daily Operations

### Verifying Backups

Check backup status daily:

```bash
# Check recent backup jobs
kubectl get jobs -n clipper-production | grep postgres-backup

# View latest backup job logs
kubectl logs -n clipper-production \
  $(kubectl get jobs -n clipper-production -l app=postgres-backup \
  -o jsonpath='{.items[-1:].metadata.name}')

# Check backup metrics
kubectl port-forward -n clipper-monitoring svc/prometheus 9090:9090
# Open http://localhost:9090 and query: postgres_backup_timestamp
```

### Verifying WAL Archiving

Monitor WAL archiving status:

```bash
# Check WAL archive status
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U clipper -d clipper_db -c "SELECT * FROM pg_stat_archiver;"

# List recent WAL archives in cloud storage
# GCP:
gsutil ls -l gs://clipper-backups-prod/wal-archive/ | tail -20

# AWS:
aws s3 ls s3://clipper-backups-prod/wal-archive/ --recursive | tail -20

# Azure:
az storage blob list \
  --account-name clipperbackupsprod \
  --container-name clipper-backups-prod \
  --prefix wal-archive/ \
  --num-results 20
```

**Expected Output**:
- `archived_count` should be increasing
- `last_archived_time` should be within last 5-10 minutes
- `failed_count` should be 0

### Checking Cloud Storage

Verify backup files exist:

```bash
# GCP: List database backups
gsutil ls -lh gs://clipper-backups-prod/database/

# AWS: List database backups
aws s3 ls s3://clipper-backups-prod/database/ --human-readable

# Azure: List database backups
az storage blob list \
  --account-name clipperbackupsprod \
  --container-name clipper-backups-prod \
  --prefix database/
```

**Expected**: 
- 30 daily backups (retention policy)
- Latest backup from today (within last 24 hours)
- File sizes reasonable (varies based on data volume)

### Volume Snapshots

Check volume snapshots:

```bash
# List recent snapshots
kubectl get volumesnapshot -n clipper-production

# Describe specific snapshot
kubectl describe volumesnapshot postgres-snapshot-20260102-030000 -n clipper-production
```

**Expected**:
- 14 snapshots (retention policy)
- Latest snapshot from today
- Status: `ReadyToUse: true`

---

## Monitoring & Alerts

### Prometheus Metrics

Key metrics exposed to Prometheus:

```promql
# Backup success/failure
postgres_backup_success

# Backup timestamp (Unix timestamp)
postgres_backup_timestamp

# Backup size in bytes
postgres_backup_size_bytes

# Restore test success/failure
postgres_restore_test_success

# Restore test timestamp
postgres_restore_test_timestamp

# Restore test duration (seconds)
postgres_restore_test_duration_seconds

# Restore test data counts
postgres_restore_test_clip_count
postgres_restore_test_user_count

# WAL archiving metrics (from pg_stat_archiver)
pg_stat_archiver_archived_count
pg_stat_archiver_failed_count
pg_stat_archiver_last_archived_time
```

### Alert Rules

Active alerts for backup system (configured in `monitoring/alerts.yml`):

| Alert | Severity | Trigger | Description |
|-------|----------|---------|-------------|
| **BackupJobFailed** | Critical | No backup in 24h | Daily backups failing |
| **BackupJobNotRunning** | Critical | No metrics found | Backup CronJob not configured |
| **WALArchivingLag** | Warning | Archive > 15 min old | PITR window at risk |
| **WALArchivingFailed** | Critical | Archive failures | PITR compromised |
| **RestoreTestFailed** | Critical | Test fails | Backup integrity issue |
| **RestoreTestNotRun** | Warning | No test in 31 days | Monthly testing overdue |
| **RestoreRTOExceeded** | Warning | Restore > 1 hour | RTO target missed |
| **BackupStorageLow** | Warning | Storage > 85% full | Need more capacity |
| **VolumeSnapshotFailed** | Warning | Snapshot not ready | Snapshot creation issue |
| **NoRecentVolumeSnapshot** | Warning | No snapshot in 48h | Snapshot CronJob issue |

### Grafana Dashboards

Monitor backups in Grafana:

1. Navigate to **System Health** dashboard
2. Check **Backup & Recovery** panel
3. View backup timeline, success rates, and RTO/RPO metrics

---

## Recovery Procedures

### Full Database Restore

**Scenario**: Restore database from latest backup

**Steps**:

1. **Stop Applications** (to prevent data changes):
   ```bash
   kubectl scale deployment clipper-backend --replicas=0 -n clipper-production
   ```

2. **Download Latest Backup**:
   ```bash
   # GCP:
   LATEST=$(gsutil ls gs://clipper-backups-prod/database/ | grep postgres-backup | tail -1)
   gsutil cp $LATEST ./backup.sql.gz
   
   # AWS:
   LATEST=$(aws s3 ls s3://clipper-backups-prod/database/ | grep postgres-backup | tail -1 | awk '{print $4}')
   aws s3 cp s3://clipper-backups-prod/database/$LATEST ./backup.sql.gz
   
   # Azure:
   LATEST=$(az storage blob list --account-name clipperbackupsprod --container-name clipper-backups-prod --prefix database/postgres-backup- --query "sort_by([].{name:name, modified:properties.lastModified}, &modified)[-1].name" -o tsv)
   az storage blob download --account-name clipperbackupsprod --container-name clipper-backups-prod --name $LATEST --file ./backup.sql.gz
   ```

3. **Copy Backup to Database Pod**:
   ```bash
   kubectl cp ./backup.sql.gz clipper-production/postgres-0:/tmp/backup.sql.gz
   ```

4. **Restore Database**:
   ```bash
   kubectl exec -it statefulset/postgres -n clipper-production -- bash
   
   # Inside pod:
   export PGPASSWORD=<password>
   pg_restore -U clipper -d clipper_db -c -F c /tmp/backup.sql.gz
   
   # Verify restore
   psql -U clipper -d clipper_db -c "SELECT COUNT(*) FROM clips;"
   psql -U clipper -d clipper_db -c "SELECT COUNT(*) FROM users;"
   
   # Cleanup
   rm /tmp/backup.sql.gz
   exit
   ```

5. **Restart Applications**:
   ```bash
   kubectl scale deployment clipper-backend --replicas=3 -n clipper-production
   ```

6. **Verify Service**:
   ```bash
   kubectl get pods -n clipper-production
   curl https://clpr.tv/api/health/ready
   ```

**Estimated RTO**: 20-30 minutes

---

### Point-in-Time Recovery (PITR)

**Scenario**: Restore database to specific point in time (e.g., before accidental data deletion)

**Prerequisites**:
- WAL archiving must be enabled and healthy
- Target time must be within PITR window (7 days)
- Base backup must exist before target time

**Steps**:

1. **Identify Target Time**:
   ```bash
   # Example: Restore to 2026-01-02 14:30:00 UTC
   TARGET_TIME="2026-01-02 14:30:00 UTC"
   ```

2. **Stop Applications**:
   ```bash
   kubectl scale deployment clipper-backend --replicas=0 -n clipper-production
   ```

3. **Stop Database**:
   ```bash
   kubectl scale statefulset postgres --replicas=0 -n clipper-production
   ```

4. **Find Base Backup Before Target Time**:
   ```bash
   # GCP:
   gsutil ls -l gs://clipper-backups-prod/database/ | grep postgres-backup | \
     awk '{if ($2 < "2026-01-02") print $3}' | tail -1
   ```

5. **Create Recovery Configuration**:
   ```bash
   kubectl exec -it statefulset/postgres -n clipper-production -- bash
   
   cat > /var/lib/postgresql/data/recovery.conf <<EOF
   restore_command = '/var/lib/postgresql/restore-command.sh %f %p'
   recovery_target_time = '${TARGET_TIME}'
   recovery_target_action = 'promote'
   EOF
   ```

6. **Restore Base Backup** (see Full Database Restore steps 2-4)

7. **Start Database** (will automatically apply WAL files to target time):
   ```bash
   kubectl scale statefulset postgres --replicas=1 -n clipper-production
   
   # Monitor recovery progress
   kubectl logs -f statefulset/postgres -n clipper-production
   ```

8. **Verify Recovery**:
   ```bash
   kubectl exec -it statefulset/postgres -n clipper-production -- \
     psql -U clipper -d clipper_db -c "SELECT now(), COUNT(*) FROM clips;"
   ```

9. **Restart Applications**:
   ```bash
   kubectl scale deployment clipper-backend --replicas=3 -n clipper-production
   ```

**Estimated RTO**: 30-60 minutes (depends on WAL volume)

**RPO**: Recovery point = target time (data loss limited to target time specified)

---

### Restore from Volume Snapshot

**Scenario**: Restore database from volume snapshot

**Steps**:

1. **List Available Snapshots**:
   ```bash
   kubectl get volumesnapshot -n clipper-production
   ```

2. **Stop Applications and Database**:
   ```bash
   kubectl scale deployment clipper-backend --replicas=0 -n clipper-production
   kubectl scale statefulset postgres --replicas=0 -n clipper-production
   ```

3. **Create New PVC from Snapshot**:
   ```bash
   kubectl apply -f - <<EOF
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
     name: postgres-data-restored
     namespace: clipper-production
   spec:
     dataSource:
       name: postgres-snapshot-20260102-030000
       kind: VolumeSnapshot
       apiGroup: snapshot.storage.k8s.io
     accessModes:
       - ReadWriteOnce
     storageClassName: standard
     resources:
       requests:
         storage: 50Gi
   EOF
   ```

4. **Update StatefulSet to Use Restored PVC**:
   ```bash
   # Note: StatefulSet volumeClaimTemplates are immutable
   # Must delete and recreate StatefulSet
   
   kubectl delete statefulset postgres -n clipper-production --cascade=orphan
   
   # Edit StatefulSet manifest to reference postgres-data-restored
   # Then apply:
   kubectl apply -f postgres-statefulset-restored.yaml
   ```

5. **Restart Database and Applications**:
   ```bash
   kubectl scale statefulset postgres --replicas=1 -n clipper-production
   kubectl scale deployment clipper-backend --replicas=3 -n clipper-production
   ```

**Estimated RTO**: 30-45 minutes

---

## Troubleshooting

### Backup Failures

**Alert**: `BackupJobFailed`

**Investigation**:

```bash
# Check failed backup job
kubectl get jobs -n clipper-production | grep postgres-backup | grep -v Complete

# View logs
FAILED_JOB=$(kubectl get jobs -n clipper-production -l app=postgres-backup \
  -o jsonpath='{.items[?(@.status.failed>0)].metadata.name}' | tail -1)
kubectl logs -n clipper-production job/$FAILED_JOB

# Check backup-operator ServiceAccount permissions
kubectl auth can-i --as=system:serviceaccount:clipper-production:backup-operator \
  get pods -n clipper-production
```

**Common Causes**:

1. **Cloud Storage Permission Denied**:
   - Verify ServiceAccount has write permissions to bucket
   - Check IAM roles/policies
   - For GCP: Verify Workload Identity binding
   - For AWS: Verify IRSA configuration
   - For Azure: Verify Managed Identity

2. **PostgreSQL Connection Failed**:
   - Verify `postgres-secret` exists and is correct
   - Check PostgreSQL service is accessible
   - Test connection: `kubectl exec -it statefulset/postgres -n clipper-production -- psql -U clipper -d clipper_db -c "SELECT 1;"`

3. **Insufficient Disk Space**:
   - Check `/tmp` space in backup pod
   - Increase resources in CronJob spec

4. **Backup Timeout**:
   - Increase `activeDeadlineSeconds` in CronJob
   - Check database size and backup duration

**Resolution**:

```bash
# Manual backup trigger (for testing)
kubectl create job --from=cronjob/postgres-backup postgres-backup-manual -n clipper-production

# Watch job progress
kubectl logs -f job/postgres-backup-manual -n clipper-production
```

---

### WAL Archiving Lag

**Alert**: `WALArchivingLag`

**Investigation**:

```bash
# Check WAL archiver status
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U clipper -d clipper_db -c "SELECT * FROM pg_stat_archiver;"

# Check PostgreSQL logs
kubectl logs -f statefulset/postgres -n clipper-production | grep -i archive
```

**Common Causes**:

1. **Cloud Storage Write Failures**:
   - Check cloud provider status
   - Verify archive command in `postgres-pitr-config.yaml`
   - Test upload manually from PostgreSQL pod

2. **Archive Command Error**:
   - Review `archive_command` configuration
   - Check `/archive` directory space
   - Verify archive script permissions

3. **High Transaction Volume**:
   - WAL files generated faster than archived
   - Consider increasing `archive_timeout`
   - Scale up archive bandwidth

**Resolution**:

```bash
# Manually trigger WAL archive
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U postgres -c "SELECT pg_switch_wal();"

# Check archive directory
kubectl exec -it statefulset/postgres -n clipper-production -- \
  ls -lh /archive/
```

---

### WAL Archiving Failures

**Alert**: `WALArchivingFailed`

**Investigation**:

```bash
# Check failed archive count
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U clipper -d clipper_db -c \
  "SELECT failed_count, last_failed_wal, last_failed_time FROM pg_stat_archiver;"

# Review PostgreSQL error logs
kubectl logs statefulset/postgres -n clipper-production | grep -i "archive.*failed"
```

**Resolution**:

1. Fix underlying issue (cloud storage, permissions, network)
2. Clear failed archive state:
   ```bash
   kubectl exec -it statefulset/postgres -n clipper-production -- \
     psql -U postgres -c "SELECT pg_stat_reset_shared('archiver');"
   ```
3. Verify archiving resumes

---

### Restore Test Failures

**Alert**: `RestoreTestFailed`

**Investigation**:

```bash
# Check failed restore test job
kubectl logs -n clipper-production \
  $(kubectl get jobs -n clipper-production -l app=restore-test \
  -o jsonpath='{.items[-1:].metadata.name}')

# Check restore test metrics
kubectl port-forward -n clipper-monitoring svc/prometheus 9090:9090
# Query: postgres_restore_test_success
# Query: postgres_restore_test_duration_seconds
```

**Common Causes**:

1. **Backup File Corrupt**:
   - Download and inspect backup manually
   - Verify backup file size is reasonable
   - Test restore locally

2. **Insufficient Resources**:
   - Increase memory/CPU in restore-test CronJob
   - Check pod events: `kubectl describe pod <restore-test-pod>`

3. **Database Connection Issues**:
   - Verify PostgreSQL is accessible
   - Check test database creation permissions

**Resolution**:

```bash
# Manual restore test
kubectl create job --from=cronjob/restore-test restore-test-manual -n clipper-production

# Monitor progress
kubectl logs -f job/restore-test-manual -n clipper-production
```

---

### RTO Exceeded

**Alert**: `RestoreRTOExceeded`

**Investigation**:

```bash
# Check restore duration
kubectl port-forward -n clipper-monitoring svc/prometheus 9090:9090
# Query: postgres_restore_test_duration_seconds

# Review restore test logs for slow operations
kubectl logs -n clipper-production \
  $(kubectl get jobs -n clipper-production -l app=restore-test \
  -o jsonpath='{.items[-1:].metadata.name}') | grep "duration"
```

**Optimization**:

1. **Increase Restore Test Resources**:
   - Edit `backup-cronjobs.yaml` and increase CPU/memory
   - Test with higher resources: `kubectl apply -f backup-cronjobs.yaml`

2. **Optimize Database Configuration**:
   - Increase `maintenance_work_mem` during restore
   - Use parallel restore: `pg_restore -j 4` (4 parallel jobs)

3. **Use Volume Snapshots for Faster Recovery**:
   - Volume snapshots restore faster than SQL dumps
   - Consider snapshot-based recovery for RTO-critical scenarios

---

### Storage Capacity Issues

**Alert**: `BackupStorageLow`

**Investigation**:

```bash
# GCP: Check bucket size
gsutil du -sh gs://clipper-backups-prod/

# AWS: Check bucket size
aws s3 ls s3://clipper-backups-prod/ --recursive --summarize | grep "Total Size"

# Azure: Check container size
az storage blob list --account-name clipperbackupsprod \
  --container-name clipper-backups-prod \
  --query "[].properties.contentLength" | \
  jq 'add / 1024 / 1024 / 1024' # Convert to GB
```

**Resolution**:

1. **Reduce Retention Period** (if acceptable):
   - Edit `backup-config` ConfigMap
   - Decrease `RETENTION_DAYS` from 30 to 21 or 14
   - Apply: `kubectl apply -f backup-config.yaml`

2. **Increase Storage Quota**:
   - Provision larger bucket/container
   - Update billing limits

3. **Archive Old Backups** (cold storage):
   ```bash
   # GCP: Move to Nearline/Coldline storage
   gsutil rewrite -s NEARLINE gs://clipper-backups-prod/database/postgres-backup-20250901*
   
   # AWS: Move to Glacier
   aws s3 cp s3://clipper-backups-prod/database/ s3://clipper-backups-archive/ \
     --recursive --storage-class GLACIER --exclude "*" --include "postgres-backup-202509*"
   ```

---

### Snapshot Not Running

**Alert**: `NoRecentVolumeSnapshot`

**Investigation**:

```bash
# Check volume-snapshot CronJob
kubectl get cronjob volume-snapshot -n clipper-production

# Check recent jobs
kubectl get jobs -n clipper-production | grep volume-snapshot

# View logs
kubectl logs -n clipper-production \
  $(kubectl get jobs -n clipper-production -l app=volume-snapshot \
  -o jsonpath='{.items[-1:].metadata.name}')
```

**Common Causes**:

1. **VolumeSnapshotClass Not Found**:
   - Verify snapshot class exists: `kubectl get volumesnapshotclass`
   - Update `VOLUME_SNAPSHOT_CLASS` in `backup-config` ConfigMap

2. **CSI Driver Not Installed**:
   - Install CSI snapshot controller
   - GCP: Verify GCE Persistent Disk CSI Driver
   - AWS: Verify EBS CSI Driver
   - Azure: Verify Azure Disk CSI Driver

3. **Permission Issues**:
   - Verify `backup-operator` ServiceAccount has snapshot permissions
   - Check RBAC: `kubectl auth can-i create volumesnapshots --as=system:serviceaccount:clipper-production:backup-operator`

**Resolution**:

```bash
# Manual snapshot trigger
kubectl create job --from=cronjob/volume-snapshot volume-snapshot-manual -n clipper-production

# Watch job progress
kubectl logs -f job/volume-snapshot-manual -n clipper-production
```

---

## RTO/RPO Targets

### Service Level Objectives

| Recovery Type | RTO Target | RPO Target | Validation Method |
|---------------|-----------|-----------|-------------------|
| **Full Restore** | < 30 min | < 24 hours | Monthly restore test |
| **PITR** | < 60 min | < 15 min | Quarterly PITR test |
| **Volume Snapshot** | < 30 min | < 24 hours | Manual validation |

### Testing Schedule

| Test Type | Frequency | Duration | Last Run | Next Run |
|-----------|-----------|----------|----------|----------|
| **Backup Validation** | Daily | 5 min | Check logs | Automated |
| **Restore Test** | Monthly (1st) | 30-60 min | Check metrics | 2026-02-01 |
| **PITR Test** | Quarterly | 60-90 min | Manual | 2026-04-01 |
| **Full DR Drill** | Semi-annually | 2-4 hours | Manual | 2026-07-01 |

### Monitoring RTO/RPO

```bash
# Check latest restore test RTO
kubectl port-forward -n clipper-monitoring svc/prometheus 9090:9090
# Query: postgres_restore_test_duration_seconds

# Check WAL archiving lag (affects RPO)
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U clipper -d clipper_db -c \
  "SELECT now() - last_archived_time AS archive_lag FROM pg_stat_archiver;"
```

**RTO/RPO Compliance**:
- **RTO**: Restore duration < 3600 seconds (1 hour)
- **RPO**: WAL archive lag < 900 seconds (15 minutes)

---

## Related Documentation

- [[kubernetes-disaster-recovery|Kubernetes Disaster Recovery]] - Complete DR procedures
- [[kubernetes-runbook|Kubernetes Operations Runbook]] - Day-to-day operations
- [[monitoring|Monitoring & Observability]] - Alerting and metrics
- [[../backend/architecture|Backend Architecture]] - System design

## Related Issues

- [#863 - Automated Backup & Recovery](https://github.com/subculture-collective/clipper/issues/863) - This implementation
- [#805 - Roadmap 5.0 Master Tracker](https://github.com/subculture-collective/clipper/issues/805) - Roadmap tracking
- [#852 - Kubernetes Cluster Setup](https://github.com/subculture-collective/clipper/issues/852) - Infrastructure setup

---

**Last Updated**: 2025-01-02  
**Owner**: Operations Team  
**Review Cycle**: Quarterly

[[index|← Back to Operations]]
