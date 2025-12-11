# Deep Linking and Universal Links Setup

This document describes the deep linking and universal links implementation for the Clipper PWA.

## Overview

Clipper supports deep linking on iOS and Android through:

- **iOS Universal Links**: Using Apple App Site Association
- **Android App Links**: Using Digital Asset Links
- **Web Share Target API**: For sharing content to the app

## Supported Routes

The following routes can be opened via deep links:

- **Clip Detail**: `/clip/:id` - Open a specific clip
- **Profile**: `/profile` - Open user profile
- **Profile Stats**: `/profile/stats` - Open user statistics
- **Search**: `/search` - Open search page
- **Submit**: `/submit` - Open clip submission form
- **Game**: `/game/:gameId` - Open game page
- **Creator**: `/creator/:creatorId` - Open creator page
- **Creator Analytics**: `/creator/:creatorId/analytics` - Open creator analytics
- **Tag**: `/tag/:tagSlug` - Open tag page
- **Discover**: `/discover` - Open discovery feed
- **New**: `/new` - Open new clips feed
- **Top**: `/top` - Open top clips feed
- **Rising**: `/rising` - Open rising clips feed

## iOS Universal Links Setup

### Prerequisites

- iOS 9.0 or later
- Apple Developer account with Team ID
- HTTPS-enabled domain

### Configuration

1. **Apple App Site Association File**

   Located at `public/.well-known/apple-app-site-association`

   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         {
           "appID": "TEAM_ID.com.subculture.clipper",
           "paths": ["/clip/*", "/profile", "/search", ...]
         }
       ]
     }
   }
   ```

2. **Update Team ID**

   Replace `TEAM_ID` in the file with your Apple Developer Team ID.

3. **Associated Domains in Xcode**

   Add to your app's entitlements:

   ```
   applinks:clpr.tv
   ```

### Hosting Requirements

- File must be served over HTTPS
- File must be at `https://yourdomain.com/.well-known/apple-app-site-association`
- Content-Type should be `application/json`
- No redirect should occur
- File should be accessible without authentication

### Testing iOS Universal Links

1. **Verify File Accessibility**

   ```bash
   curl -v https://yourdomain.com/.well-known/apple-app-site-association
   ```

2. **Test on Device**
   - Send a link via iMessage or Notes
   - Long press the link
   - Should show "Open in Clipper" option

3. **Debugging**
   - Check Console app on Mac while device is connected
   - Filter for "swcd" (Shared Web Credentials Daemon)
   - Look for download and validation messages

## Android App Links Setup

### Prerequisites

- Android 6.0 (API level 23) or later
- HTTPS-enabled domain
- App signing certificate

### Configuration

1. **Digital Asset Links File**

   Located at `public/.well-known/assetlinks.json`

   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.subculture.clipper",
       "sha256_cert_fingerprints": ["..."]
     }
   }]
   ```

2. **Get Your App's SHA-256 Fingerprint**

   ```bash
   keytool -list -v -keystore my-release-key.keystore
   ```

   Copy the SHA-256 certificate fingerprint.

3. **Update Configuration**

   Replace `REPLACE_WITH_YOUR_APP_SHA256_FINGERPRINT` with your fingerprint.

4. **AndroidManifest.xml**

   Add intent filters for deep link routes:

   ```xml
   <intent-filter android:autoVerify="true">
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="https"
           android:host="clpr.tv"
           android:pathPrefix="/clip" />
   </intent-filter>
   ```

### Hosting Requirements

- File must be served over HTTPS
- File must be at `https://yourdomain.com/.well-known/assetlinks.json`
- Content-Type should be `application/json`
- No redirect should occur

### Testing Android App Links

1. **Verify File Accessibility**

   ```bash
   curl -v https://yourdomain.com/.well-known/assetlinks.json
   ```

2. **Test Intent Filter**

   ```bash
   adb shell am start -W -a android.intent.action.VIEW \
     -d "https://yourdomain.com/clip/abc123" \
     com.subculture.clipper
   ```

3. **Verify Domain**

   ```bash
   adb shell dumpsys package domain-preferred-apps
   ```

## Web Share Target API

The app can receive shared content through the Web Share Target API.

### Configuration

In `manifest.json`:

```json
{
  "share_target": {
    "action": "/submit",
    "method": "GET",
    "enctype": "application/x-www-form-urlencoded",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

### Usage

When users share content to Clipper:

1. App opens to `/submit` route
2. URL parameters contain shared data: `?url=...&title=...&text=...`
3. Submit page can extract and pre-fill form with shared data

### Accessing Share Data

```typescript
import { getShareTargetData } from '@/lib/deep-linking';

const sharedData = getShareTargetData();
if (sharedData) {
  console.log('Shared URL:', sharedData.url);
  console.log('Shared Title:', sharedData.title);
  console.log('Shared Text:', sharedData.text);
}
```

## Programmatic Usage

### Check if URL is a valid deep link

```typescript
import { isValidDeepLink } from '@/lib/deep-linking';

if (isValidDeepLink('https://clpr.tv/clip/abc123')) {
  // Valid deep link
}
```

### Parse deep link to internal route

```typescript
import { parseDeepLink } from '@/lib/deep-linking';

const internalRoute = parseDeepLink('https://clpr.tv/clip/abc123');
// Returns: '/clip/abc123'
```

### Handle deep link navigation

```typescript
import { handleDeepLink } from '@/lib/deep-linking';
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
const route = handleDeepLink('https://clpr.tv/clip/abc123');

if (route) {
  navigate(route);
}
```

### Generate deep link URL

```typescript
import { generateDeepLink } from '@/lib/deep-linking';

const deepLink = generateDeepLink('/clip/abc123');
// Returns: 'https://clpr.tv/clip/abc123'
```

### Check if opened via deep link

```typescript
import { isOpenedViaDeepLink } from '@/lib/deep-linking';

if (isOpenedViaDeepLink()) {
  // App was opened via deep link or share target
  // Maybe show a welcome message or track analytics
}
```

## Deployment Checklist

- [ ] Update `TEAM_ID` in `apple-app-site-association`
- [ ] Update `sha256_cert_fingerprints` in `assetlinks.json`
- [ ] Update domain URLs in both files
- [ ] Ensure files are served over HTTPS
- [ ] Verify `Content-Type: application/json` for both files
- [ ] Test on iOS device with app installed
- [ ] Test on Android device with app installed
- [ ] Verify no redirects occur when accessing files
- [ ] Test share target functionality

## Troubleshooting

### iOS Universal Links Not Working

1. **Check File Accessibility**
   - Ensure file is at exact path `/.well-known/apple-app-site-association`
   - Verify HTTPS and valid SSL certificate
   - Check no authentication required

2. **Clear iOS Cache**
   - Delete app and reinstall
   - Or wait up to 24 hours for Apple's CDN to update

3. **Check Team ID**
   - Ensure Team ID matches your Apple Developer account
   - Format: `TEAM_ID.bundle.identifier`

4. **View Console Logs**
   - Connect device to Mac
   - Open Console app
   - Filter for "swcd"

### Android App Links Not Working

1. **Verify Digital Asset Links**
   - Check file accessibility
   - Validate JSON syntax
   - Ensure SHA-256 fingerprint is correct

2. **Check Intent Filters**
   - Ensure `android:autoVerify="true"` is set
   - Verify host and pathPrefix match routes

3. **Test with ADB**

   ```bash
   adb shell am start -W -a android.intent.action.VIEW \
     -d "https://yourdomain.com/clip/test"
   ```

4. **Check Domain Verification**

   ```bash
   adb shell dumpsys package domain-preferred-apps
   ```

### Share Target Not Working

1. **Check Manifest**
   - Ensure `share_target` is defined in `manifest.json`
   - Verify `action` points to valid route

2. **Browser Support**
   - Share Target API requires HTTPS
   - Only works in production builds
   - Not all browsers support Web Share Target

3. **Test in Production**
   - Build and deploy production version
   - Test on mobile device
   - Try sharing from another app

## Testing

Run the test suite:

```bash
npm test src/lib/deep-linking.test.ts
```

The test suite covers:

- Deep link validation
- URL parsing
- Route handling
- Share target data extraction
- Deep link generation

## Browser and Platform Support

| Platform | Version | Support |
|----------|---------|---------|
| iOS Safari | 9.0+ | ✅ Universal Links |
| Android Chrome | 6.0+ | ✅ App Links |
| Android Chrome | 7.0+ | ✅ Share Target |
| Desktop Chrome | Latest | ✅ Share Target |
| Desktop Safari | Latest | ⚠️ Limited |
| Firefox | Latest | ⚠️ Limited |

## Security Considerations

1. **HTTPS Only**: Both iOS and Android require HTTPS for security
2. **Domain Ownership**: You must control the domain to host the association files
3. **Certificate Validation**: Ensure valid SSL certificates
4. **No Redirects**: Files must be served directly without redirects
5. **File Integrity**: Keep association files in sync with app configuration

## Future Enhancements

- [ ] Support for custom URL schemes (e.g., `clipper://`)
- [ ] Deep link analytics tracking
- [ ] Deferred deep linking (install attribution)
- [ ] Branch.io or similar service integration
- [ ] Dynamic deep links with Firebase Dynamic Links
- [ ] QR code generation for deep links

## Resources

- [Apple Universal Links Documentation](https://developer.apple.com/ios/universal-links/)
- [Android App Links Documentation](https://developer.android.com/training/app-links)
- [Web Share Target API](https://web.dev/web-share-target/)
- [PWA Deep Linking Best Practices](https://web.dev/promote-install/#deep-linking)
