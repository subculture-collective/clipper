# EAS Build Configuration Notes

## Sentry DSN Configuration

The `EXPO_PUBLIC_SENTRY_DSN` is intentionally not included in `eas.json` for security reasons. 

### Setup Instructions

Configure the Sentry DSN as a secret in your EAS project:

```bash
# Set the DSN as a secret (recommended)
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://your-key@sentry.io/your-project-id"
```

Alternatively, you can:
1. Add it to your local `.env` file (already configured in `.env.example`)
2. Set it as an environment variable in your EAS build profile
3. Configure it in the EAS project settings web interface

### Why This Approach?

- **Security**: Keeps sensitive DSN out of version control
- **Flexibility**: Different DSNs for different environments without code changes
- **EAS Secrets**: Automatically available to all builds in the project

### Verification

After setting the secret, verify it's available:

```bash
eas secret:list
```

The Sentry plugin will automatically use this DSN during builds for source map uploads.
