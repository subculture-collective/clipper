# Deep Linking Test Cases

This document outlines the test cases for validating deep linking and universal links functionality in the Clipper mobile app.

## Prerequisites

- App installed on iOS/Android device or simulator/emulator
- Access to the testing domain (clipper.onnwee.me)
- ADB installed (for Android testing)
- Xcode command line tools installed (for iOS testing)

## Test Cases

### TC-1: Custom Scheme - Clip Detail

**Objective**: Verify that custom scheme links open the clip detail screen

**Steps**:

1. Launch the link: `clipper://clip/123`
2. Observe app behavior

**Expected Result**:

- App opens (or comes to foreground if already open)
- Clip detail screen displays for clip ID 123
- Video player loads the clip content
- Clip metadata (title, creator, votes) is displayed

**Test Commands**:

```bash
# iOS
xcrun simctl openurl booted "clipper://clip/123"

# Android
adb shell am start -W -a android.intent.action.VIEW -d "clipper://clip/123"
```

### TC-2: Universal Link - Clip Detail (iOS)

**Objective**: Verify that iOS universal links open the clip detail screen

**Steps**:

1. Send a link via iMessage or Notes: `https://clipper.onnwee.me/clip/456`
2. Tap the link
3. Observe app behavior

**Expected Result**:

- App opens (not Safari)
- Clip detail screen displays for clip ID 456
- Video player loads the clip content

**Alternative Test**:

```bash
xcrun simctl openurl booted "https://clipper.onnwee.me/clip/456"
```

### TC-3: App Link - Clip Detail (Android)

**Objective**: Verify that Android app links open the clip detail screen

**Steps**:

1. Open a browser and navigate to: `https://clipper.onnwee.me/clip/789`
2. Observe app behavior

**Expected Result**:

- App opens (not browser)
- Clip detail screen displays for clip ID 789
- Video player loads the clip content

**Test Command**:

```bash
adb shell am start -W -a android.intent.action.VIEW -d "https://clipper.onnwee.me/clip/789"
```

### TC-4: Search Screen

**Objective**: Verify that deep links open the search screen

**Steps**:

1. Launch the link: `clipper://search`
2. Observe app behavior

**Expected Result**:

- App opens to the search tab
- Search input field is visible
- User can immediately start searching

**Test Commands**:

```bash
# iOS - Custom scheme
xcrun simctl openurl booted "clipper://search"

# iOS - Universal link
xcrun simctl openurl booted "https://clipper.onnwee.me/search"

# Android - Custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "clipper://search"

# Android - App link
adb shell am start -W -a android.intent.action.VIEW -d "https://clipper.onnwee.me/search"
```

### TC-5: Submit Clip Screen

**Objective**: Verify that deep links open the submit clip screen

**Steps**:

1. Launch the link: `clipper://submit`
2. Observe app behavior

**Expected Result**:

- App opens with submit screen as a modal
- URL input field is visible
- Submission guidelines are displayed
- User can enter a clip URL

**Test Commands**:

```bash
# iOS - Custom scheme
xcrun simctl openurl booted "clipper://submit"

# iOS - Universal link
xcrun simctl openurl booted "https://clipper.onnwee.me/submit"

# Android - Custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "clipper://submit"

# Android - App link
adb shell am start -W -a android.intent.action.VIEW -d "https://clipper.onnwee.me/submit"
```

### TC-6: Profile Screen

**Objective**: Verify that deep links open the profile screen

**Steps**:

1. Launch the link: `clipper://profile`
2. Observe app behavior

**Expected Result**:

- App opens to the profile tab
- If logged in, user profile is displayed
- If not logged in, login prompt or guest view is shown

**Test Commands**:

```bash
# iOS - Custom scheme
xcrun simctl openurl booted "clipper://profile"

# iOS - Universal link
xcrun simctl openurl booted "https://clipper.onnwee.me/profile"

# Android - Custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "clipper://profile"

# Android - App link
adb shell am start -W -a android.intent.action.VIEW -d "https://clipper.onnwee.me/profile"
```

### TC-7: Invalid Clip ID

**Objective**: Verify handling of invalid clip IDs

**Steps**:

1. Launch the link: `clipper://clip/invalid-id-999999`
2. Observe app behavior

**Expected Result**:

- App opens
- Error message displayed: "Clip not found"
- User can navigate back or go to home screen

**Test Commands**:

```bash
# iOS
xcrun simctl openurl booted "clipper://clip/invalid-id-999999"

# Android
adb shell am start -W -a android.intent.action.VIEW -d "clipper://clip/invalid-id-999999"
```

### TC-8: Deep Link While App is Running

**Objective**: Verify deep link behavior when app is already open

**Steps**:

1. Open the app and navigate to any screen
2. Launch a deep link: `clipper://clip/123`
3. Observe navigation behavior

**Expected Result**:

- App navigates to the clip detail screen
- Navigation stack is preserved (user can go back)
- No app restart or flash

### TC-9: Deep Link from Background

**Objective**: Verify deep link behavior when app is in background

**Steps**:

1. Open the app
2. Press home button (send app to background)
3. Launch a deep link: `clipper://search`
4. Observe app behavior

**Expected Result**:

- App returns to foreground
- Navigates to search screen
- Previous app state is preserved

### TC-10: Fallback to Web (App Not Installed)

**Objective**: Verify fallback behavior when app is not installed

**Steps**:

1. Uninstall the Clipper app
2. Open a link in a browser or messaging app: `https://clipper.onnwee.me/clip/123`
3. Observe behavior

**Expected Result**:

- Link opens in web browser
- Web version of Clipper displays
- User can view the clip on the web
- (Optional) Smart banner suggests installing the app

### TC-11: .well-known File Accessibility

**Objective**: Verify that universal link association files are properly served

**Steps**:

1. Test iOS association file:

   ```bash
   curl -I https://clipper.onnwee.me/.well-known/apple-app-site-association
   ```

2. Test Android asset links file:

   ```bash
   curl -I https://clipper.onnwee.me/.well-known/assetlinks.json
   ```

**Expected Result**:

- Both files return HTTP 200
- Content-Type is `application/json`
- No redirects occur (301/302)
- Files are accessible without authentication
- CORS headers allow cross-origin access

### TC-12: Multiple Deep Links in Sequence

**Objective**: Verify handling of multiple deep links opened quickly

**Steps**:

1. Launch link: `clipper://clip/123`
2. Immediately launch another link: `clipper://clip/456`
3. Observe navigation behavior

**Expected Result**:

- App handles both links gracefully
- Final destination is clip 456
- No crashes or navigation errors

### TC-13: Deep Link with Query Parameters

**Objective**: Verify handling of URLs with query parameters (for future use)

**Steps**:

1. Launch link: `clipper://search?q=fortnite`
2. Observe app behavior

**Expected Result**:

- App opens to search screen
- Query parameters are preserved (if implemented)
- No errors or crashes

### TC-14: npx uri-scheme Testing

**Objective**: Verify deep linking using Expo's uri-scheme tool

**Steps**:

1. Run: `npx uri-scheme list`
2. Verify "clipper" scheme is registered
3. Run: `npx uri-scheme open clipper://clip/123 --ios`
4. Run: `npx uri-scheme open clipper://clip/123 --android`

**Expected Result**:

- Scheme is listed correctly
- Links open the app on respective platforms
- Correct screens are displayed

## Test Matrix

| Test Case | iOS Custom | iOS Universal | Android Custom | Android App Link |
|-----------|------------|---------------|----------------|------------------|
| TC-1      | ✓          | -             | ✓              | -                |
| TC-2      | -          | ✓             | -              | -                |
| TC-3      | -          | -             | -              | ✓                |
| TC-4      | ✓          | ✓             | ✓              | ✓                |
| TC-5      | ✓          | ✓             | ✓              | ✓                |
| TC-6      | ✓          | ✓             | ✓              | ✓                |
| TC-7      | ✓          | ✓             | ✓              | ✓                |
| TC-8      | ✓          | ✓             | ✓              | ✓                |
| TC-9      | ✓          | ✓             | ✓              | ✓                |
| TC-10     | -          | ✓             | -              | ✓                |
| TC-11     | ✓          | ✓             | ✓              | ✓                |
| TC-12     | ✓          | ✓             | ✓              | ✓                |
| TC-13     | ✓          | ✓             | ✓              | ✓                |
| TC-14     | ✓          | ✓             | ✓              | ✓                |

## Pass/Fail Criteria

**Pass**: All test cases pass on both iOS and Android platforms

**Fail**: Any of the following:

- Deep links don't open the app
- Wrong screen is displayed
- App crashes when opening deep links
- .well-known files return errors or redirects
- Navigation state is lost or corrupted

## Known Limitations

1. **iOS Universal Links**: Won't work when tapped from Safari address bar (this is expected iOS behavior)
2. **Android App Links**: Require app signing certificate fingerprint to be configured in assetlinks.json
3. **Local Testing**: Universal/app links require HTTPS and won't work with localhost

## Automation Opportunities

Future automated tests could:

- Use Detox or Appium for E2E testing
- Verify navigation state after deep link opens
- Test deep link handling in various app states
- Validate .well-known file content and headers

---

**Last Updated**: 2025-11-05
**Test Coordinator**: Clipper QA Team
