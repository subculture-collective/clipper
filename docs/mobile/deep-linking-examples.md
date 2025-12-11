<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Deep Linking Examples](#deep-linking-examples)
  - [Common Use Cases](#common-use-cases)
    - [1. Sharing a Clip](#1-sharing-a-clip)
    - [2. Sharing to Submit Form](#2-sharing-to-submit-form)
    - [3. Opening from Search Results](#3-opening-from-search-results)
    - [4. Email or SMS Links](#4-email-or-sms-links)
    - [5. QR Code Scanning](#5-qr-code-scanning)
  - [Testing Scenarios](#testing-scenarios)
    - [Test 1: Clip Detail Deep Link](#test-1-clip-detail-deep-link)
    - [Test 2: Share Target](#test-2-share-target)
    - [Test 3: Profile Link](#test-3-profile-link)
  - [Code Integration Examples](#code-integration-examples)
    - [Example 1: Deep Link Handler Component](#example-1-deep-link-handler-component)
    - [Example 2: Analytics Tracking](#example-2-analytics-tracking)
    - [Example 3: Dynamic Share Links](#example-3-dynamic-share-links)
    - [Example 4: Validate Before Navigation](#example-4-validate-before-navigation)
  - [URL Format Examples](#url-format-examples)
    - [Valid Deep Links](#valid-deep-links)
    - [Invalid Deep Links (Fall back to web)](#invalid-deep-links-fall-back-to-web)
  - [Troubleshooting Examples](#troubleshooting-examples)
    - [Issue: Link Opens in Browser Instead of App](#issue-link-opens-in-browser-instead-of-app)
    - [Issue: Android App Links Not Verified](#issue-android-app-links-not-verified)
    - [Issue: Share Target Not Appearing](#issue-share-target-not-appearing)
  - [Best Practices](#best-practices)
    - [1. Always Generate Deep Links Programmatically](#1-always-generate-deep-links-programmatically)
    - [2. Validate Before Opening](#2-validate-before-opening)
    - [3. Handle Share Target Data](#3-handle-share-target-data)
    - [4. Track Deep Link Opens](#4-track-deep-link-opens)
  - [Performance Tips](#performance-tips)
  - [Security Considerations](#security-considerations)
  - [Additional Resources](#additional-resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Deep Linking Examples"
summary: "This document provides practical examples of how deep linking works in the Clipper PWA."
tags: ['mobile']
area: "mobile"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Deep Linking Examples

This document provides practical examples of how deep linking works in the Clipper PWA.

## Common Use Cases

### 1. Sharing a Clip

**Scenario**: User wants to share a specific clip with friends

**Flow**:

1. User views a clip at `https://clpr.tv/clip/abc123`
2. User shares the link via messaging app
3. Friend taps the link on their mobile device
4. If Clipper PWA is installed: App opens directly to the clip
5. If Clipper PWA is not installed: Web browser opens to the clip page

**Code Example**:

```typescript
import { generateDeepLink } from '@/lib/deep-linking';

// Generate shareable link
const clipLink = generateDeepLink('/clip/abc123');
// Result: 'https://clpr.tv/clip/abc123'

// Share via Web Share API
if (navigator.share) {
  await navigator.share({
    title: 'Amazing Clip!',
    url: clipLink,
  });
}
```

### 2. Sharing to Submit Form

**Scenario**: User finds a Twitch clip and wants to submit it to Clipper

**Flow**:

1. User is browsing Twitch or another app
2. User selects "Share" and chooses Clipper
3. Clipper app opens to `/submit` route
4. Form is pre-filled with shared URL and title

**Code Example**:

```typescript
// In SubmitClipPage.tsx
import { useEffect, useState } from 'react';
import { getShareTargetData } from '@/lib/deep-linking';

function SubmitClipPage() {
  const [formData, setFormData] = useState({
    url: '',
    title: '',
  });

  useEffect(() => {
    // Check if opened via share target
    const sharedData = getShareTargetData();
    if (sharedData) {
      setFormData({
        url: sharedData.url || '',
        title: sharedData.title || '',
      });
    }
  }, []);

  // Rest of component...
}
```

### 3. Opening from Search Results

**Scenario**: User searches for Clipper on Google and taps a result

**Flow**:

1. User searches "Clipper valorant clips"
2. Google shows result: `https://clpr.tv/tag/valorant`
3. User taps the link
4. If Clipper PWA is installed: App opens to the tag page
5. If not installed: Browser opens to the tag page

### 4. Email or SMS Links

**Scenario**: User receives a notification email about a new top clip

**Flow**:

1. Backend sends email with link: `https://clpr.tv/clip/xyz789`
2. User taps link on their phone
3. Universal link is detected
4. Clipper app opens directly to the clip (if installed)

### 5. QR Code Scanning

**Scenario**: Marketing materials with QR codes

**Flow**:

1. Physical poster has QR code linking to `https://clpr.tv/discover`
2. User scans QR code with phone camera
3. Universal link opens Clipper app to discovery page
4. Or opens browser if app not installed

## Testing Scenarios

### Test 1: Clip Detail Deep Link

```bash
# iOS Test (via iMessage)
1. Send this link in iMessage: https://clpr.tv/clip/test123
2. Long press the link
3. Should show "Open in Clipper" option
4. Tap to open - should go directly to clip detail page

# Android Test (via ADB)
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://clpr.tv/clip/test123" \
  com.subculture.clipper
```

### Test 2: Share Target

```bash
# Test Share Target Data Extraction
1. Share a URL from another app to Clipper
2. Open browser console in Clipper
3. Run:
   const data = getShareTargetData();
   console.log(data);
4. Should show: { url: '...', title: '...', text: '...' }
```

### Test 3: Profile Link

```bash
# Test Profile Deep Link
1. Open link: https://clpr.tv/profile
2. If logged in, should open user profile
3. If not logged in, should redirect to login then profile
```

## Code Integration Examples

### Example 1: Deep Link Handler Component

```typescript
// DeepLinkHandler.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleDeepLink, isOpenedViaDeepLink } from '@/lib/deep-linking';

export function DeepLinkHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if app was opened via deep link
    if (isOpenedViaDeepLink()) {
      const fullUrl = window.location.href;
      const route = handleDeepLink(fullUrl);

      if (route && route !== location.pathname) {
        navigate(route);
      }
    }
  }, [navigate, location]);

  return null;
}

// Add to App.tsx
function App() {
  return (
    <BrowserRouter>
      <DeepLinkHandler />
      {/* Rest of app */}
    </BrowserRouter>
  );
}
```

### Example 2: Analytics Tracking

```typescript
// Track deep link opens for analytics
import { isOpenedViaDeepLink, parseDeepLink } from '@/lib/deep-linking';

function trackDeepLinkOpen() {
  if (isOpenedViaDeepLink()) {
    const route = parseDeepLink(window.location.href);

    // Track with your analytics service
    analytics.track('deep_link_open', {
      route,
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
    });
  }
}

// Call on app mount
useEffect(() => {
  trackDeepLinkOpen();
}, []);
```

### Example 3: Dynamic Share Links

```typescript
// Generate share links for different content types
import { generateDeepLink } from '@/lib/deep-linking';

export function ShareButton({ contentType, contentId }) {
  const handleShare = async () => {
    let path: string;

    switch (contentType) {
      case 'clip':
        path = `/clip/${contentId}`;
        break;
      case 'creator':
        path = `/creator/${contentId}`;
        break;
      case 'game':
        path = `/game/${contentId}`;
        break;
      default:
        path = '/';
    }

    const shareUrl = generateDeepLink(path);

    if (navigator.share) {
      await navigator.share({
        title: 'Check this out on Clipper!',
        url: shareUrl,
      });
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  return <button onClick={handleShare}>Share</button>;
}
```

### Example 4: Validate Before Navigation

```typescript
// Validate deep links before navigation
import { isValidDeepLink, parseDeepLink } from '@/lib/deep-linking';

function handleExternalLink(url: string) {
  if (isValidDeepLink(url)) {
    const route = parseDeepLink(url);
    if (route) {
      // Valid deep link - navigate in app
      navigate(route);
      return;
    }
  }

  // Not a valid deep link - open in new tab
  window.open(url, '_blank');
}
```

## URL Format Examples

### Valid Deep Links

```
# Clip detail
https://clpr.tv/clip/abc123
https://clpr.tv/clip/xyz-789

# Profile
https://clpr.tv/profile
https://clpr.tv/profile/stats

# Search
https://clpr.tv/search
https://clpr.tv/search?q=valorant

# Submit
https://clpr.tv/submit
https://clpr.tv/submit?url=https://twitch.tv/...

# Game
https://clpr.tv/game/valorant
https://clpr.tv/game/league-of-legends

# Creator
https://clpr.tv/creator/shroud
https://clpr.tv/creator/shroud/analytics

# Tag
https://clpr.tv/tag/funny
https://clpr.tv/tag/esports

# Feeds
https://clpr.tv/discover
https://clpr.tv/new
https://clpr.tv/top
https://clpr.tv/rising
```

### Invalid Deep Links (Fall back to web)

```
# Admin routes (not supported for security)
https://clpr.tv/admin/dashboard

# Auth routes (handled separately)
https://clpr.tv/login
https://clpr.tv/auth/success

# Settings routes (require authentication, handled separately)
https://clpr.tv/settings
https://clpr.tv/notifications
```

## Troubleshooting Examples

### Issue: Link Opens in Browser Instead of App

**Solution 1: iOS Cache Clear**

```bash
# Delete and reinstall the app
# Or wait 24 hours for Apple's CDN to update
```

**Solution 2: Verify Association File**

```bash
curl -v https://clpr.tv/.well-known/apple-app-site-association

# Should return:
# - Status: 200 OK
# - Content-Type: application/json
# - Valid JSON content
```

### Issue: Android App Links Not Verified

**Solution: Check Domain Verification**

```bash
# Connect device via ADB
adb shell dumpsys package domain-preferred-apps

# Should show:
# Package: com.subculture.clipper
#   Domains: clpr.tv
#   Status: verified
```

### Issue: Share Target Not Appearing

**Solution 1: Verify Manifest**

```javascript
// Check manifest.json includes share_target
{
  "share_target": {
    "action": "/submit",
    "method": "GET",
    "params": {
      "url": "url",
      "title": "title",
      "text": "text"
    }
  }
}
```

**Solution 2: Test in Production**

```bash
# Share Target only works over HTTPS
# Build and deploy to production
npm run build
# Deploy to hosting
# Test on mobile device
```

## Best Practices

### 1. Always Generate Deep Links Programmatically

```typescript
// ✅ Good
const link = generateDeepLink('/clip/abc123');

// ❌ Bad
const link = 'https://clpr.tv/clip/abc123';
```

### 2. Validate Before Opening

```typescript
// ✅ Good
if (isValidDeepLink(url)) {
  const route = handleDeepLink(url);
  if (route) navigate(route);
}

// ❌ Bad
navigate(parseDeepLink(url)); // Might be null
```

### 3. Handle Share Target Data

```typescript
// ✅ Good
useEffect(() => {
  const shared = getShareTargetData();
  if (shared?.url) {
    setFormUrl(shared.url);
  }
}, []);

// ❌ Bad
// Assuming data is always present
const shared = getShareTargetData()!;
setFormUrl(shared.url); // Might crash
```

### 4. Track Deep Link Opens

```typescript
// ✅ Good
if (isOpenedViaDeepLink()) {
  analytics.track('deep_link_open', { route });
}

// ❌ Bad
// Not tracking deep link opens
// Missing valuable analytics data
```

## Performance Tips

1. **Lazy Load Deep Link Handler**
   - Only load deep link handling code when needed
   - Use code splitting for better initial load time

2. **Cache Validation Results**
   - Cache deep link validation for frequently accessed URLs
   - Avoid repeated regex matching

3. **Optimize Route Matching**
   - Most specific routes first
   - Use early returns for invalid URLs

4. **Minimize Bundle Size**
   - Deep link utilities are lightweight (~4KB)
   - No external dependencies
   - Tree-shakeable exports

## Security Considerations

1. **Never Trust User Input**

   ```typescript
   // Always validate deep links
   if (isValidDeepLink(userUrl)) {
     // Safe to use
   }
   ```

2. **Sanitize Share Target Data**

   ```typescript
   const data = getShareTargetData();
   if (data?.url) {
     // Validate URL format
     try {
       new URL(data.url);
       // URL is valid
     } catch {
       // Invalid URL - reject
     }
   }
   ```

3. **Protect Sensitive Routes**

   ```typescript
   // Don't support deep links to admin or auth pages
   // These require special handling
   ```

## Additional Resources

- See `docs/DEEP_LINKING.md` for complete documentation
- See `frontend/src/lib/deep-linking.ts` for implementation
- See `frontend/src/lib/deep-linking.test.ts` for test examples
