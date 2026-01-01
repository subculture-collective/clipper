# External Secrets Operator Configuration

This directory contains configuration for the External Secrets Operator (ESO), which synchronizes secrets from external secret managers (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault) into Kubernetes Secrets.

## Overview

The External Secrets Operator provides a secure way to manage secrets without storing them in Git or directly in Kubernetes. Instead, secrets are stored in your cloud provider's secret manager and automatically synced to the cluster.

## Components

- **operator.yaml**: Instructions for installing the External Secrets Operator
- **secret-stores.yaml**: SecretStore configurations for different cloud providers
- **external-secrets.yaml**: ExternalSecret resources that define which secrets to sync

## Installation

### Install External Secrets Operator

```bash
# Using Helm (recommended)
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

### Configure Cloud Provider Authentication

Choose the appropriate method for your cloud provider:

#### AWS Secrets Manager (IAM Roles for Service Accounts)

```bash
# Create IAM role with IRSA
eksctl create iamserviceaccount \
  --name clipper-backend \
  --namespace clipper-production \
  --cluster clipper-prod \
  --region us-east-1 \
  --attach-policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  --approve
```

#### GCP Secret Manager (Workload Identity)

```bash
# Create service account
gcloud iam service-accounts create clipper-backend-prod \
  --project=your-project-id

# Grant Secret Manager access
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:clipper-backend-prod@your-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Configure Workload Identity binding
gcloud iam service-accounts add-iam-policy-binding \
  clipper-backend-prod@your-project-id.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:your-project-id.svc.id.goog[clipper-production/clipper-backend]"

# Annotate Kubernetes service account
kubectl annotate serviceaccount clipper-backend \
  -n clipper-production \
  iam.gke.io/gcp-service-account=clipper-backend-prod@your-project-id.iam.gserviceaccount.com
```

#### Azure Key Vault (Workload Identity)

```bash
# Create managed identity
az identity create \
  --name clipper-backend-prod \
  --resource-group clipper-rg

# Grant Key Vault access
az keyvault set-policy \
  --name clipper-prod-kv \
  --object-id $(az identity show --name clipper-backend-prod --resource-group clipper-rg --query principalId -o tsv) \
  --secret-permissions get list

# Configure federated identity
az identity federated-credential create \
  --name clipper-backend-prod-federated \
  --identity-name clipper-backend-prod \
  --resource-group clipper-rg \
  --issuer $(az aks show --name clipper-prod --resource-group clipper-rg --query "oidcIssuerProfile.issuerUrl" -o tsv) \
  --subject system:serviceaccount:clipper-production:clipper-backend
```

## Usage

### Create Secrets in Your Secret Manager

#### AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name clipper/production/database \
  --secret-string '{"password":"your-secure-password"}'

aws secretsmanager create-secret \
  --name clipper/production/jwt \
  --secret-string '{"private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----","public_key":"-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"}'
```

#### GCP Secret Manager

```bash
echo -n "your-secure-password" | gcloud secrets create clipper-production-db-password \
  --data-file=- \
  --replication-policy="automatic"

gcloud secrets create clipper-production-jwt-private-key \
  --data-file=jwt_private.key \
  --replication-policy="automatic"
```

#### Azure Key Vault

```bash
az keyvault secret set \
  --vault-name clipper-prod-kv \
  --name db-password \
  --value "your-secure-password"

az keyvault secret set \
  --vault-name clipper-prod-kv \
  --name jwt-private-key \
  --file jwt_private.key
```

### Apply SecretStore and ExternalSecret

```bash
# Edit secret-stores.yaml to match your cloud provider and project/account details
# Then apply:
kubectl apply -f secret-stores.yaml

# Apply ExternalSecret definitions
kubectl apply -f external-secrets.yaml
```

### Verify Secret Synchronization

```bash
# Check ExternalSecret status
kubectl get externalsecret -n clipper-production
kubectl describe externalsecret backend-secrets -n clipper-production

# Check if Secret was created
kubectl get secret backend-secrets -n clipper-production

# View secret keys (not values)
kubectl describe secret backend-secrets -n clipper-production
```

## Secret Structure

The `backend-secrets` ExternalSecret creates a Kubernetes Secret with the following keys:

- `DB_PASSWORD` - Database password
- `REDIS_PASSWORD` - Redis password (optional)
- `JWT_PRIVATE_KEY` - JWT signing private key
- `JWT_PUBLIC_KEY` - JWT verification public key
- `TWITCH_CLIENT_ID` - Twitch OAuth client ID
- `TWITCH_CLIENT_SECRET` - Twitch OAuth client secret
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_PRO_MONTHLY_PRICE_ID` - Stripe monthly subscription price ID
- `STRIPE_PRO_YEARLY_PRICE_ID` - Stripe yearly subscription price ID
- `SENTRY_DSN` - Sentry error tracking DSN
- `SENDGRID_API_KEY` - SendGrid email API key
- `OPENAI_API_KEY` - OpenAI API key
- `OPENSEARCH_USERNAME` - OpenSearch username (if auth enabled)
- `OPENSEARCH_PASSWORD` - OpenSearch password (if auth enabled)

## Refresh Behavior

- ExternalSecrets are refreshed every hour by default
- Can be changed via `spec.refreshInterval` (e.g., `15m`, `2h`)
- Can force refresh by adding/updating an annotation:

```bash
kubectl annotate externalsecret backend-secrets \
  -n clipper-production \
  force-sync="$(date +%s)" --overwrite
```

## Secret Rotation

To rotate a secret:

1. Update the secret in your cloud provider's secret manager
2. Wait for the next refresh interval (or force sync)
3. Restart pods to pick up the new secret:

```bash
kubectl rollout restart deployment/clipper-backend -n clipper-production
```

## Troubleshooting

### ExternalSecret Not Syncing

```bash
# Check ExternalSecret status
kubectl describe externalsecret backend-secrets -n clipper-production

# Check SecretStore status
kubectl describe secretstore aws-secrets-manager -n clipper-production

# Check External Secrets Operator logs
kubectl logs -n external-secrets-system deployment/external-secrets --tail=100

# Common issues:
# - Authentication: Check cloud provider IAM/identity configuration
# - Secret not found: Verify secret path and key in cloud provider
# - Invalid format: Check secret structure matches remoteRef.property
```

### Permission Denied

```bash
# AWS: Check IAM role policy
aws iam get-role --role-name eksctl-clipper-prod-addon-iamserviceaccount-Role
aws iam list-attached-role-policies --role-name eksctl-clipper-prod-addon-iamserviceaccount-Role

# GCP: Check service account permissions
gcloud projects get-iam-policy your-project-id \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:clipper-backend-prod@your-project-id.iam.gserviceaccount.com"

# Azure: Check Key Vault access policies
az keyvault show --name clipper-prod-kv --query properties.accessPolicies
```

## Security Best Practices

1. **Use least privilege**: Grant only necessary permissions to service accounts
2. **Rotate secrets regularly**: Implement automated rotation schedules
3. **Monitor access**: Enable audit logging in your secret manager
4. **Separate environments**: Use different secret managers or paths for prod/staging
5. **Never commit secrets**: Keep secrets out of Git and manifests

## Related Documentation

- [External Secrets Operator Documentation](https://external-secrets.io/)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [GCP Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Azure Key Vault](https://docs.microsoft.com/en-us/azure/key-vault/)
- [HashiCorp Vault](https://www.vaultproject.io/docs)
