# Deep Linking Configuration Files

This directory contains configuration files for iOS Universal Links and Android App Links.

## Files

### apple-app-site-association

iOS Universal Links configuration. Required for opening the app from web links on iOS devices.

**Before deployment:**

- Replace `TEAM_ID` with your Apple Developer Team ID
- Update domain in your app's Associated Domains capability

### assetlinks.json

Android App Links configuration. Required for opening the app from web links on Android devices.

**Before deployment:**

- Replace `REPLACE_WITH_YOUR_APP_SHA256_FINGERPRINT` with your app's certificate fingerprint
- Update `package_name` if different
- Update domain in your AndroidManifest.xml intent filters

## Deployment Requirements

Both files MUST be:

1. Served over HTTPS
2. Accessible at `/.well-known/` path
3. Served with `Content-Type: application/json`
4. Served without redirects
5. Accessible without authentication

## Testing

### iOS

```bash
curl -v https://yourdomain.com/.well-known/apple-app-site-association
```

### Android

```bash
curl -v https://yourdomain.com/.well-known/assetlinks.json
```

## Documentation

See the following for complete setup instructions and troubleshooting:

- `/docs/MOBILE_IMPLEMENTATION_GUIDE.md` - Mobile app deep linking setup
- `/docs/DEEP_LINKING.md` - General deep linking documentation
- `/docs/DEEP_LINKING_TEST_CASES.md` - Comprehensive test cases
