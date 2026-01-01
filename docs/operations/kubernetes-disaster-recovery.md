---
title: "Kubernetes Disaster Recovery"
summary: "Comprehensive disaster recovery procedures for Kubernetes including backup strategies, restore procedures, failover processes, and PITR."
tags: ["operations", "kubernetes", "disaster-recovery", "backup"]
area: "operations"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2026-01-01
aliases: ["k8s-dr", "kubernetes dr", "k8s backup", "kubernetes disaster recovery"]
---

# Kubernetes Disaster Recovery

Complete disaster recovery procedures for Clipper's Kubernetes infrastructure including backup strategies, restore procedures, failover processes, and Point-in-Time Recovery (PITR).

## Table of Contents

- [Overview](#overview)
- [RTO and RPO](#rto-and-rpo)
- [Backup Strategies](#backup-strategies)
- [Database Backup & Restore](#database-backup--restore)
- [Application State Backup](#application-state-backup)
- [Cluster-Level Backup](#cluster-level-backup)
- [Restore Procedures](#restore-procedures)
- [Failover Procedures](#failover-procedures)
- [Point-in-Time Recovery (PITR)](#point-in-time-recovery-pitr)
- [Disaster Recovery Testing](#disaster-recovery-testing)
- [Incident Response Plan](#incident-response-plan)

---

## Overview

Clipper's disaster recovery strategy uses multiple layers of protection:

1. **Database Backups**: Automated daily backups with PITR capability
2. **Volume Snapshots**: PersistentVolume snapshots for stateful services
3. **Cluster Backups**: Configuration and resource manifests backup
4. **Application Backups**: User-uploaded content and generated assets
5. **Secrets Backup**: External secret manager backups
6. **Multi-Region**: Geographic redundancy for critical data

### DR Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Primary Region (us-central1)             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Kubernetes │  │ PostgreSQL │  │   Redis    │           │
│  │  Cluster   │  │  Primary   │  │  Primary   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│         │               │               │                   │
│         │               │               │                   │
│    [Daily Backup]  [Continuous]   [Daily Backup]           │
│         │          [WAL Archive]        │                   │
└─────────┼───────────────┼───────────────┼───────────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloud Storage (Multi-Region)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  K8s Config │  │ DB Backups  │  │ Volume Snaps│        │
│  │   Backups   │  │   + WAL     │  │  (Postgres, │        │
│  │             │  │   Archives  │  │    Redis)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│              DR Region (us-east1) - Optional                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Kubernetes │  │ PostgreSQL │  │   Redis    │           │
│  │  Standby   │  │  Replica   │  │  Standby   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## RTO and RPO

### Recovery Time Objective (RTO)

Target time to restore service after disaster:

| Scenario | Target RTO | Maximum RTO |
|----------|-----------|-------------|
| **Pod failure** | < 1 minute | 5 minutes |
| **Node failure** | < 5 minutes | 15 minutes |
| **Database corruption** | < 30 minutes | 1 hour |
| **Full cluster failure** | < 1 hour | 2 hours |
| **Region failure** | < 2 hours | 4 hours |
| **Complete disaster** | < 4 hours | 8 hours |

### Recovery Point Objective (RPO)

Maximum acceptable data loss:

| Data Type | Target RPO | Maximum RPO |
|-----------|-----------|-------------|
| **Database transactions** | 5 minutes | 15 minutes |
| **User uploads** | 1 hour | 4 hours |
| **Application state** | 1 hour | 4 hours |
| **Configuration** | 1 day | 1 week |

---

## Backup Strategies

### Backup Schedule

| Backup Type | Frequency | Retention | Location |
|------------|-----------|-----------|----------|
| **Database Full** | Daily at 2 AM UTC | 30 days | Cloud Storage (multi-region) |
| **Database WAL** | Continuous | 7 days | Cloud Storage |
| **Volume Snapshots** | Daily at 3 AM UTC | 14 days | Cloud Provider |
| **Cluster Manifests** | Daily at 4 AM UTC | 90 days | Git + Cloud Storage |
| **User Uploads** | Continuous (S3 versioning) | 30 days | S3/GCS |

### Automated Backup Tools

```bash
# CronJob for automated database backups
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: clipper-production
spec:
  schedule: "0 2 * * *"  # 2 AM UTC daily
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-sa
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              BACKUP_FILE="clipper-backup-$(date +%Y%m%d-%H%M%S).sql.gz"
              pg_dump -h postgres -U clipper clipper_db | gzip > /tmp/$BACKUP_FILE
              # Upload to cloud storage (GCS/S3)
              gsutil cp /tmp/$BACKUP_FILE gs://clipper-backups/database/
              # Cleanup old backups (keep 30 days)
              gsutil ls gs://clipper-backups/database/ | \
                tail -n +31 | \
                xargs -I {} gsutil rm {}
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
          restartPolicy: OnFailure
```

---

## Database Backup & Restore

### PostgreSQL Backup

#### Manual Full Backup

```bash
# Create backup
kubectl exec -it statefulset/postgres -n clipper-production -- \
  pg_dump -U clipper -d clipper_db -F c -f /tmp/backup.dump

# Copy backup from pod
kubectl cp clipper-production/postgres-0:/tmp/backup.dump ./backup-$(date +%Y%m%d).dump

# Upload to cloud storage
# GCS
gsutil cp ./backup-$(date +%Y%m%d).dump gs://clipper-backups/database/

# AWS S3
aws s3 cp ./backup-$(date +%Y%m%d).dump s3://clipper-backups/database/
```

#### Automated Continuous Archiving (WAL)

**Setup WAL Archiving**:

```yaml
# PostgreSQL ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: clipper-production
data:
  postgresql.conf: |
    wal_level = replica
    archive_mode = on
    archive_command = 'gsutil cp %p gs://clipper-backups/wal-archive/%f'
    archive_timeout = 300  # 5 minutes
    max_wal_senders = 5
    wal_keep_size = 1GB
```

**Monitor WAL Archiving**:

```bash
# Check archive status
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U clipper -d clipper_db -c \
  "SELECT * FROM pg_stat_archiver;"

# List archived WAL files
gsutil ls gs://clipper-backups/wal-archive/ | tail -20
```

### PostgreSQL Restore

#### Restore from Full Backup

```bash
# Download backup
gsutil cp gs://clipper-backups/database/backup-20260101.dump ./backup.dump

# Copy to pod
kubectl cp ./backup.dump clipper-production/postgres-0:/tmp/backup.dump

# Stop applications
kubectl scale deployment clipper-backend --replicas=0 -n clipper-production

# Restore database
kubectl exec -it statefulset/postgres -n clipper-production -- \
  pg_restore -U clipper -d clipper_db -c -F c /tmp/backup.dump

# Restart applications
kubectl scale deployment clipper-backend --replicas=3 -n clipper-production
```

#### Restore with Point-in-Time Recovery (PITR)

See [Point-in-Time Recovery](#point-in-time-recovery-pitr) section below.

---

## Application State Backup

### Volume Snapshots

#### Create Snapshot (GKE)

```bash
# Create VolumeSnapshot for PostgreSQL
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot-$(date +%Y%m%d)
  namespace: clipper-production
spec:
  volumeSnapshotClassName: csi-gce-pd
  source:
    persistentVolumeClaimName: postgres-data-postgres-0
EOF

# Verify snapshot
kubectl get volumesnapshot -n clipper-production
kubectl describe volumesnapshot postgres-snapshot-20260101 -n clipper-production
```

#### Create Snapshot (AWS EBS)

```bash
# Create VolumeSnapshot for PostgreSQL
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot-$(date +%Y%m%d)
  namespace: clipper-production
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: postgres-data-postgres-0
EOF
```

#### Automated Snapshot CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: volume-snapshot
  namespace: clipper-production
spec:
  schedule: "0 3 * * *"  # 3 AM UTC daily
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          containers:
          - name: snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl create -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: postgres-snapshot-$(date +%Y%m%d-%H%M%S)
                namespace: clipper-production
              spec:
                volumeSnapshotClassName: csi-gce-pd
                source:
                  persistentVolumeClaimName: postgres-data-postgres-0
              EOF
          restartPolicy: OnFailure
```

### Restore from Snapshot

```bash
# Create new PVC from snapshot
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
  namespace: clipper-production
spec:
  dataSource:
    name: postgres-snapshot-20260101
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 50Gi
EOF

# Update StatefulSet to use new PVC
kubectl patch statefulset postgres -n clipper-production -p \
  '{"spec":{"volumeClaimTemplates":[{"metadata":{"name":"postgres-data"},"spec":{"dataSource":{"name":"postgres-snapshot-20260101","kind":"VolumeSnapshot","apiGroup":"snapshot.storage.k8s.io"}}}]}}'
```

---

## Cluster-Level Backup

### Backup Cluster Configuration

#### Automated Cluster Backup Script

```bash
#!/bin/bash
# backup-cluster.sh

BACKUP_DIR="./cluster-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup all resources by namespace
for ns in clipper-production clipper-staging clipper-monitoring; do
  echo "Backing up namespace: $ns"
  kubectl get all,configmap,secret,pvc,ingress,networkpolicy,hpa,pdb \
    -n $ns -o yaml > $BACKUP_DIR/${ns}-resources.yaml
done

# Backup cluster-level resources
kubectl get clusterrole,clusterrolebinding,storageclass,persistentvolume \
  -o yaml > $BACKUP_DIR/cluster-resources.yaml

# Backup CRDs
kubectl get crd -o yaml > $BACKUP_DIR/crds.yaml

# Backup Helm releases
helm list --all-namespaces -o yaml > $BACKUP_DIR/helm-releases.yaml

# Compress and upload
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
gsutil cp $BACKUP_DIR.tar.gz gs://clipper-backups/cluster/

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

#### CronJob for Automated Cluster Backup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cluster-backup
  namespace: clipper-production
spec:
  schedule: "0 4 * * *"  # 4 AM UTC daily
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cluster-backup-sa
          containers:
          - name: backup
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - /scripts/backup-cluster.sh
            volumeMounts:
            - name: backup-script
              mountPath: /scripts
          volumes:
          - name: backup-script
            configMap:
              name: backup-scripts
              defaultMode: 0755
          restartPolicy: OnFailure
```

### Restore Cluster Configuration

```bash
# Download backup
gsutil cp gs://clipper-backups/cluster/cluster-backup-20260101.tar.gz ./

# Extract
tar -xzf cluster-backup-20260101.tar.gz
cd cluster-backup-20260101

# Restore cluster resources (order matters)
kubectl apply -f crds.yaml
kubectl apply -f cluster-resources.yaml
kubectl apply -f clipper-production-resources.yaml
kubectl apply -f clipper-staging-resources.yaml
kubectl apply -f clipper-monitoring-resources.yaml

# Verify restoration
kubectl get all -n clipper-production
```

---

## Restore Procedures

### Full Cluster Restore (From Scratch)

**Scenario**: Complete cluster failure, need to rebuild from backups

**Steps**:

1. **Provision New Cluster**:
   ```bash
   cd infrastructure/k8s/bootstrap
   ./provision-cluster.sh
   ```

2. **Configure Cluster**:
   ```bash
   ./setup-cluster.sh
   ```

3. **Restore Secrets**:
   ```bash
   # Apply SecretStore configuration
   kubectl apply -f infrastructure/k8s/external-secrets/
   
   # Verify secrets synced
   kubectl get externalsecret -n clipper-production
   ```

4. **Restore Cluster Configuration**:
   ```bash
   # Download and extract backup
   gsutil cp gs://clipper-backups/cluster/cluster-backup-latest.tar.gz ./
   tar -xzf cluster-backup-latest.tar.gz
   
   # Apply configurations (skip secrets and PVCs)
   kubectl apply -f cluster-backup/cluster-resources.yaml
   kubectl apply -f cluster-backup/clipper-production-resources.yaml
   ```

5. **Restore Database**:
   ```bash
   # Create PVC from snapshot
   kubectl apply -f - <<EOF
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
     name: postgres-data-postgres-0
     namespace: clipper-production
   spec:
     dataSource:
       name: postgres-snapshot-20260101
       kind: VolumeSnapshot
       apiGroup: snapshot.storage.k8s.io
     accessModes:
       - ReadWriteOnce
     resources:
       requests:
         storage: 50Gi
   EOF
   
   # Or restore from SQL backup (see Database Backup & Restore)
   ```

6. **Deploy Applications**:
   ```bash
   helm install clipper ./helm/charts/clipper \
     -n clipper-production \
     -f ./helm/charts/clipper/examples/values-production.yaml
   ```

7. **Verify Services**:
   ```bash
   kubectl get pods -n clipper-production
   kubectl get ingress -n clipper-production
   
   # Test endpoints
   curl https://clpr.tv/api/health/ready
   ```

8. **Update DNS** (if LoadBalancer IP changed):
   ```bash
   kubectl get svc ingress-nginx-controller -n ingress-nginx \
     -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
   ```

**Estimated Time**: 1-2 hours

---

## Failover Procedures

### Regional Failover

**Scenario**: Primary region unavailable, failover to DR region

**Prerequisites**:
- DR region cluster provisioned
- Database replica in DR region
- Recent backups available

**Steps**:

1. **Assess Situation**:
   ```bash
   # Check primary cluster status
   kubectl cluster-info
   
   # Check database replication lag
   kubectl exec -it statefulset/postgres-replica -n clipper-production -- \
     psql -U clipper -d clipper_db -c \
     "SELECT pg_last_wal_replay_lsn();"
   ```

2. **Promote DR Database**:
   ```bash
   # Promote replica to primary
   kubectl exec -it statefulset/postgres-replica -n clipper-production -- \
     psql -U postgres -c "SELECT pg_promote();"
   ```

3. **Update DNS**:
   ```bash
   # Point DNS to DR region LoadBalancer
   # Update A records:
   # - api.clpr.tv → DR LoadBalancer IP
   # - clpr.tv → DR LoadBalancer IP
   ```

4. **Deploy Applications to DR Region**:
   ```bash
   helm upgrade clipper ./helm/charts/clipper \
     -n clipper-production \
     --set global.region=us-east1 \
     --set postgres.host=postgres-replica \
     --reuse-values
   ```

5. **Verify Failover**:
   ```bash
   # Test endpoints
   curl https://clpr.tv/api/health/ready
   
   # Monitor traffic
   kubectl top pods -n clipper-production
   ```

6. **Monitor Replication** (once primary recovers):
   ```bash
   # Reconfigure primary as replica
   # Resync data from new primary
   ```

**Estimated Time**: 30 minutes - 1 hour

---

## Point-in-Time Recovery (PITR)

Point-in-Time Recovery allows restoring database to any point within the WAL retention period (default: 7 days).

### PITR Prerequisites

1. **WAL Archiving Enabled** (see [Database Backup & Restore](#database-backup--restore))
2. **Base Backup Available**
3. **WAL Archives Available**

### PITR Restore Procedure

**Scenario**: Restore database to 2026-01-01 14:30:00 UTC

**Steps**:

1. **Stop Applications**:
   ```bash
   kubectl scale deployment clipper-backend --replicas=0 -n clipper-production
   ```

2. **Prepare Recovery Configuration**:
   ```bash
   # Create recovery.conf
   cat > recovery.conf <<EOF
   restore_command = 'gsutil cp gs://clipper-backups/wal-archive/%f %p'
   recovery_target_time = '2026-01-01 14:30:00 UTC'
   recovery_target_action = 'promote'
   EOF
   ```

3. **Stop Database**:
   ```bash
   kubectl delete pod postgres-0 -n clipper-production
   ```

4. **Restore Base Backup**:
   ```bash
   # Download latest base backup before target time
   gsutil cp gs://clipper-backups/database/backup-20260101.dump ./
   
   # Copy to pod (once recreated)
   kubectl cp ./backup-20260101.dump clipper-production/postgres-0:/tmp/
   
   # Restore base backup
   kubectl exec -it statefulset/postgres -n clipper-production -- \
     pg_restore -U clipper -d clipper_db -c -F c /tmp/backup-20260101.dump
   ```

5. **Copy Recovery Configuration**:
   ```bash
   kubectl cp recovery.conf clipper-production/postgres-0:/var/lib/postgresql/data/
   ```

6. **Start Database** (will apply WAL to target time):
   ```bash
   kubectl rollout restart statefulset/postgres -n clipper-production
   
   # Monitor recovery
   kubectl logs -f statefulset/postgres -n clipper-production
   ```

7. **Verify Recovery**:
   ```bash
   # Check database time
   kubectl exec -it statefulset/postgres -n clipper-production -- \
     psql -U clipper -d clipper_db -c "SELECT now();"
   
   # Verify data
   kubectl exec -it statefulset/postgres -n clipper-production -- \
     psql -U clipper -d clipper_db -c "SELECT count(*) FROM clips;"
   ```

8. **Restart Applications**:
   ```bash
   kubectl scale deployment clipper-backend --replicas=3 -n clipper-production
   ```

**Estimated Time**: 30-60 minutes (depends on WAL size)

### PITR Best Practices

1. **Test PITR regularly** (monthly) to verify backups are valid
2. **Monitor WAL archive lag** - should be < 5 minutes
3. **Keep WAL archives for 7+ days**
4. **Document recovery procedures** and keep updated
5. **Automate base backup** testing with restore validation

---

## Disaster Recovery Testing

### DR Test Schedule

| Test Type | Frequency | Duration | Scope |
|-----------|-----------|----------|-------|
| **Backup Validation** | Weekly | 15 min | Verify backup created and accessible |
| **Database Restore** | Monthly | 1 hour | Restore database from backup to test cluster |
| **PITR Test** | Quarterly | 2 hours | Test point-in-time recovery |
| **Full DR Drill** | Semi-annually | 4 hours | Complete cluster restore in DR region |

### DR Test Procedure

**Monthly Database Restore Test**:

```bash
# 1. Create test namespace
kubectl create namespace dr-test

# 2. Download latest backup
gsutil cp gs://clipper-backups/database/backup-latest.dump ./

# 3. Deploy test database
helm install postgres-test ./helm/charts/postgres \
  -n dr-test \
  --set persistence.size=10Gi

# 4. Restore backup
kubectl cp ./backup-latest.dump dr-test/postgres-test-0:/tmp/
kubectl exec -it statefulset/postgres-test -n dr-test -- \
  pg_restore -U clipper -d clipper_db -c -F c /tmp/backup-latest.dump

# 5. Verify data integrity
kubectl exec -it statefulset/postgres-test -n dr-test -- \
  psql -U clipper -d clipper_db -c "SELECT count(*) FROM clips;"

# 6. Cleanup
helm uninstall postgres-test -n dr-test
kubectl delete namespace dr-test
```

**Document Results**:

```bash
# Create test report
cat > dr-test-$(date +%Y%m%d).md <<EOF
# DR Test Report - $(date +%Y-%m-%d)

## Test Type
Database Restore Test

## Results
- ✅ Backup downloaded successfully
- ✅ Database restored without errors
- ✅ Data integrity verified (X clips, Y users)
- ⏱️  Restore time: 25 minutes

## Issues
None

## Next Test
2026-02-01
EOF
```

---

## Incident Response Plan

### DR Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|--------------|------------|
| **SEV1** | Complete outage, data loss | Immediate | CTO + CEO |
| **SEV2** | Partial outage, degraded | < 15 min | Engineering Lead |
| **SEV3** | Performance degradation | < 1 hour | On-call engineer |

### SEV1 Incident Response

**Complete Outage / Data Loss**:

1. **Acknowledge** (< 5 min):
   - Alert on-call engineer
   - Create incident channel (#incident-YYYYMMDD)
   - Notify leadership

2. **Assess** (< 10 min):
   - Determine scope and cause
   - Check cluster status
   - Review recent changes
   - Identify affected services

3. **Communicate** (< 15 min):
   - Post status page update
   - Notify customers via email/social
   - Internal stakeholder update

4. **Mitigate** (< 30 min):
   - Implement immediate fix or rollback
   - Failover to DR region if needed
   - Scale resources if capacity issue

5. **Restore** (< 2 hours):
   - Follow restore procedures
   - Verify data integrity
   - Monitor system stability

6. **Post-Incident** (< 24 hours):
   - Write incident report
   - Conduct blameless postmortem
   - Create action items
   - Update runbooks

### Incident Communication Template

```markdown
# Incident Update - [STATUS]

**Time**: YYYY-MM-DD HH:MM UTC
**Status**: Investigating / Identified / Monitoring / Resolved
**Impact**: [Brief description]

## Current Status
[Description of current state]

## Root Cause
[If identified]

## Next Steps
[What we're doing]

## Next Update
In [X] minutes
```

---

## Related Documentation

- [[kubernetes-runbook|Kubernetes Operations Runbook]] - Day-to-day operations
- [[kubernetes-scaling|Kubernetes Scaling Guide]] - Scaling strategies
- [[kubernetes-troubleshooting|Kubernetes Troubleshooting]] - Common issues
- [[monitoring|Monitoring & Observability]] - Alerting and metrics
- [[../backend/architecture|Backend Architecture]] - System design

## Related Issues

- [#852 - Kubernetes Cluster Setup](https://github.com/subculture-collective/clipper/issues/852)
- [#853 - Application Helm Charts](https://github.com/subculture-collective/clipper/issues/853)
- [#854 - Kubernetes Documentation](https://github.com/subculture-collective/clipper/issues/854)
- [#805 - Roadmap 5.0 Master Tracker](https://github.com/subculture-collective/clipper/issues/805)

---

[[index|← Back to Operations]]
