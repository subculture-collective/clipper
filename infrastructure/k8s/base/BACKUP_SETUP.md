# Automated Backup & Recovery Setup

This guide explains how to configure automated database backups with Point-in-Time Recovery (PITR) for Clipper.

## Overview

The automated backup system provides:

- **Daily PostgreSQL Backups**: Full database dumps at 2 AM UTC with 30-day retention
- **Continuous WAL Archiving**: Point-in-Time Recovery with 7-day window and < 15 minute RPO
- **Daily Volume Snapshots**: PersistentVolume snapshots at 3 AM UTC with 14-day retention
- **Monthly Restore Tests**: Automated validation on the 1st of each month, validating RTO < 1 hour
- **Cross-Region Storage**: All backups encrypted and stored in multi-region cloud storage
- **Prometheus Monitoring**: Metrics and alerts for backup health and RTO/RPO compliance

## Prerequisites

### 1. Cloud Storage Bucket

Create a multi-region bucket for storing backups:

#### Google Cloud (GCS)

```bash
# Create multi-region bucket with encryption
gsutil mb -c STANDARD -l us -b on gs://clipper-backups-prod

# Enable versioning
gsutil versioning set on gs://clipper-backups-prod

# Set lifecycle policy (optional - CronJob handles retention)
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF
gsutil lifecycle set lifecycle.json gs://clipper-backups-prod

# Grant service account write access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:backup-operator@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

#### AWS (S3)

```bash
# Create bucket with replication
aws s3api create-bucket \
  --bucket clipper-backups-prod \
  --region us-east-1 \
  --create-bucket-configuration LocationConstraint=us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket clipper-backups-prod \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket clipper-backups-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Set lifecycle policy (optional)
aws s3api put-bucket-lifecycle-configuration \
  --bucket clipper-backups-prod \
  --lifecycle-configuration file://lifecycle.json

# Grant least-privilege IAM role access (if using IRSA)
# Create a custom policy that only allows access to the backup bucket
cat > backup-operator-s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListAndGetBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::clipper-backups-prod"
    },
    {
      "Sid": "ManageBackupObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucketMultipartUploads",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": "arn:aws:s3:::clipper-backups-prod/*"
    }
  ]
}
EOF

# Create the IAM policy (replace YOUR_ACCOUNT_ID as appropriate)
aws iam create-policy \
  --policy-name backup-operator-s3-policy \
  --policy-document file://backup-operator-s3-policy.json

# Attach the custom policy to the backup-operator-role (update ARN with your account ID)
aws iam attach-role-policy \
  --role-name backup-operator-role \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/backup-operator-s3-policy
```

#### Azure (Blob Storage)

```bash
# Create storage account
az storage account create \
  --name clipperbackupsprod \
  --resource-group clipper-rg \
  --location eastus \
  --sku Standard_GRS \
  --encryption-services blob

# Create container
az storage container create \
  --name clipper-backups-prod \
  --account-name clipperbackupsprod \
  --public-access off

# Enable versioning
az storage account blob-service-properties update \
  --account-name clipperbackupsprod \
  --enable-versioning true

# Grant managed identity access
PRINCIPAL_ID=$(az identity show \
  --name backup-operator \
  --resource-group clipper-rg \
  --query principalId -o tsv)

az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/clipper-rg/providers/Microsoft.Storage/storageAccounts/clipperbackupsprod"
```

### 2. Volume Snapshot Class

Verify CSI snapshot support is available:

```bash
# Check for VolumeSnapshotClass
kubectl get volumesnapshotclass

# If not found, install CSI snapshot controller
# GCP: Pre-installed on GKE
# AWS:
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

### 3. Prometheus Pushgateway (for metrics)

Install Prometheus Pushgateway in monitoring namespace:

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus-pushgateway
  namespace: clipper-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus-pushgateway
  template:
    metadata:
      labels:
        app: prometheus-pushgateway
    spec:
      containers:
      - name: pushgateway
        image: prom/pushgateway:v1.6.2
        ports:
        - containerPort: 9091
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus-pushgateway
  namespace: clipper-monitoring
spec:
  selector:
    app: prometheus-pushgateway
  ports:
  - port: 9091
    targetPort: 9091
EOF
```

## Installation

### Step 1: Apply RBAC Configuration

```bash
# Apply backup operator ServiceAccount and permissions
kubectl apply -f infrastructure/k8s/base/rbac.yaml
```

### Step 2: Configure Backup Settings

Create backup configuration:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-config
  namespace: clipper-production
data:
  CLOUD_PROVIDER: "gcp"  # Options: gcp, aws, azure
  BACKUP_BUCKET: "clipper-backups-prod"
  RETENTION_DAYS: "30"
  VOLUME_SNAPSHOT_CLASS: "csi-gce-pd"  # GCP: csi-gce-pd, AWS: csi-aws-vsc, Azure: csi-azuredisk-vsc
  # Azure only:
  # AZURE_STORAGE_ACCOUNT: "clipperbackupsprod"
EOF
```

### Step 3: Enable PITR (Optional but Recommended)

Apply PostgreSQL PITR configuration:

```bash
# Apply PITR config
kubectl apply -f infrastructure/k8s/base/postgres-pitr-config.yaml

# Update PostgreSQL StatefulSet with PITR
# Note: This requires restarting the database
kubectl apply -f infrastructure/k8s/base/postgres-pitr-config.yaml
```

**Important**: PITR requires database restart. Plan accordingly.

### Step 4: Deploy Backup CronJobs

```bash
# Deploy backup CronJobs
kubectl apply -f infrastructure/k8s/base/backup-cronjobs.yaml

# Verify CronJobs are created
kubectl get cronjobs -n clipper-production
```

Expected output:
```
NAME               SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
postgres-backup    0 2 * * *     False     0        <none>          1m
volume-snapshot    0 3 * * *     False     0        <none>          1m
restore-test       0 4 1 * *     False     0        <none>          1m
```

### Step 5: Configure Alerts

The backup alerts are already included in `monitoring/alerts.yml`. Ensure Prometheus is configured to load this file:

```bash
# Verify alerts are loaded
kubectl port-forward -n clipper-monitoring svc/prometheus 9090:9090
# Open http://localhost:9090/alerts and search for "backup"
```

## Testing

### Trigger Manual Backup

```bash
# Create a manual backup job
kubectl create job --from=cronjob/postgres-backup postgres-backup-manual -n clipper-production

# Watch job progress
kubectl logs -f job/postgres-backup-manual -n clipper-production
```

### Verify Backup in Cloud Storage

```bash
# GCP
gsutil ls -lh gs://clipper-backups-prod/database/

# AWS
aws s3 ls s3://clipper-backups-prod/database/ --human-readable

# Azure
az storage blob list \
  --account-name clipperbackupsprod \
  --container-name clipper-backups-prod \
  --prefix database/
```

### Trigger Manual Restore Test

```bash
# Create a manual restore test job
kubectl create job --from=cronjob/restore-test restore-test-manual -n clipper-production

# Watch job progress
kubectl logs -f job/restore-test-manual -n clipper-production
```

Expected output should include:
- Download latest backup
- Create test database
- Restore backup
- Validate data (clip count, user count)
- Report RTO metrics
- Cleanup

### Check Metrics

```bash
# Port forward to Prometheus
kubectl port-forward -n clipper-monitoring svc/prometheus 9090:9090

# Open http://localhost:9090 and query:
# - postgres_backup_timestamp
# - postgres_backup_success
# - postgres_restore_test_duration_seconds
```

## Monitoring

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `postgres_backup_success` | Last backup status (1=success, 0=failure) | 1 |
| `postgres_backup_timestamp` | Unix timestamp of last backup | < 24h ago |
| `postgres_restore_test_success` | Last restore test status | 1 |
| `postgres_restore_test_duration_seconds` | Restore test duration | < 3600s (1h) |
| `pg_stat_archiver_last_archived_time` | Last WAL archive time | < 900s (15m) |

### Alerts

Active alerts (see `monitoring/alerts.yml`):

- **BackupJobFailed** (Critical): No backup in 24 hours
- **WALArchivingLag** (Warning): WAL archive > 15 minutes old
- **WALArchivingFailed** (Critical): WAL archiving failures
- **RestoreTestFailed** (Critical): Restore test failed
- **RestoreRTOExceeded** (Warning): Restore took > 1 hour
- **BackupStorageLow** (Warning): Storage > 85% full

### Grafana Dashboard

Add a backup monitoring panel to your Grafana dashboard:

```json
{
  "title": "Backup & Recovery Status",
  "type": "stat",
  "targets": [
    {
      "expr": "time() - postgres_backup_timestamp",
      "legendFormat": "Time Since Last Backup"
    },
    {
      "expr": "postgres_restore_test_duration_seconds",
      "legendFormat": "Last Restore Duration"
    }
  ]
}
```

## Recovery Procedures

See the complete [Backup & Recovery Runbook](../../docs/operations/backup-recovery-runbook.md) for:

- Full database restore
- Point-in-Time Recovery (PITR)
- Volume snapshot restore
- Troubleshooting common issues
- RTO/RPO validation

## Maintenance

### Adjusting Backup Schedule

Edit the CronJob schedule:

```bash
kubectl edit cronjob postgres-backup -n clipper-production

# Change schedule (example: 3 AM instead of 2 AM)
# spec:
#   schedule: "0 3 * * *"
```

### Changing Retention Period

Update backup configuration:

```bash
kubectl edit configmap backup-config -n clipper-production

# Change RETENTION_DAYS
# data:
#   RETENTION_DAYS: "21"  # 21 days instead of 30
```

### Suspending Backups

Temporarily disable backups (e.g., during maintenance):

```bash
# Suspend all backup CronJobs
kubectl patch cronjob postgres-backup -n clipper-production -p '{"spec": {"suspend": true}}'
kubectl patch cronjob volume-snapshot -n clipper-production -p '{"spec": {"suspend": true}}'

# Resume backups
kubectl patch cronjob postgres-backup -n clipper-production -p '{"spec": {"suspend": false}}'
kubectl patch cronjob volume-snapshot -n clipper-production -p '{"spec": {"suspend": false}}'
```

## Troubleshooting

See [Backup & Recovery Runbook - Troubleshooting](../../docs/operations/backup-recovery-runbook.md#troubleshooting) for detailed troubleshooting procedures.

Common issues:

- **Backup job fails**: Check cloud storage permissions and PostgreSQL connectivity
- **WAL archiving lag**: Check archive command and cloud storage bandwidth
- **Restore test fails**: Verify backup integrity and restore resources
- **Storage full**: Adjust retention or increase storage capacity

## Security Considerations

### Backup Encryption

Backups are encrypted at rest using:

- **GCP**: Customer-managed encryption keys (CMEK) or Google-managed keys
- **AWS**: Server-side encryption with AES-256
- **Azure**: Storage Service Encryption (SSE)

### Access Control

- Backup operator uses least-privilege ServiceAccount
- Cloud storage access via Workload Identity (GCP), IRSA (AWS), or Managed Identity (Azure)
- No credentials stored in manifests or ConfigMaps

### Network Security

- Backups uploaded over encrypted connections (TLS)
- WAL files transmitted securely to cloud storage
- No public access to backup buckets

## Related Documentation

- [Backup & Recovery Runbook](../../docs/operations/backup-recovery-runbook.md) - Complete operational procedures
- [Kubernetes Disaster Recovery](../../docs/operations/kubernetes-disaster-recovery.md) - DR strategies and failover
- [Monitoring](../../docs/operations/monitoring.md) - Observability and alerting

## Support

For issues or questions:

1. Review the [Troubleshooting section](../../docs/operations/backup-recovery-runbook.md#troubleshooting)
2. Check [backup monitoring](#monitoring) for alerts
3. Open an issue on GitHub: [subculture-collective/clipper#863](https://github.com/subculture-collective/clipper/issues/863)

---

**Roadmap**: [Issue #863 - Automated Backup & Recovery (Roadmap 5.0)](https://github.com/subculture-collective/clipper/issues/863)  
**Master Tracker**: [Issue #805 - Roadmap 5.0](https://github.com/subculture-collective/clipper/issues/805)
