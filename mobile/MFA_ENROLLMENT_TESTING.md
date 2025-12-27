# MFA Enrollment Testing Guide

## Overview

This document provides comprehensive testing instructions for the MFA enrollment feature in the mobile application.

## Prerequisites

- Backend MFA endpoints must be available and functional
- Test user account without MFA enabled
- Physical device or simulator with camera access (for QR scanning)
- Authenticator app installed (Google Authenticator, Authy, 1Password, etc.)

## Test Scenarios

### 1. Happy Path - QR Code Enrollment

**Steps:**
1. Open the mobile app and log in
2. Navigate to Settings → Security
3. Tap "Two-Factor Authentication"
4. Tap "Get Started" on the intro screen
5. Grant camera permission when prompted
6. Tap "Start Scanner" to begin scanning
7. Open your authenticator app
8. In the authenticator app, tap "Add Account" or "+"
9. Scan the QR code displayed in the Clipper app
10. Note the 6-digit code in your authenticator app
11. Enter the code in the Clipper app
12. Optionally enable "Trust This Device"
13. Tap "Verify & Enable 2FA"
14. Review and save the backup codes
15. Tap "I've Saved My Codes"

**Expected Results:**
- ✅ Camera permission granted smoothly
- ✅ QR code scans successfully
- ✅ Authenticator app shows "Clipper" account
- ✅ Verification code accepted
- ✅ 10 backup codes displayed
- ✅ Return to Settings with MFA shown as "Enabled"

### 2. Manual Entry Enrollment

**Steps:**
1. Navigate to Settings → Security → Two-Factor Authentication
2. Tap "Get Started"
3. Tap "Enter Code Manually"
4. Copy the displayed secret key
5. Open your authenticator app and add account manually
6. Paste the secret key
7. Enter the secret key again in Clipper to confirm
8. Tap "Continue"
9. Enter the 6-digit code from authenticator
10. Complete enrollment

**Expected Results:**
- ✅ Secret key is Base32 format (uppercase letters and digits 2-7)
- ✅ Copy to clipboard works
- ✅ Manual entry validation prevents invalid input
- ✅ Verification succeeds with correct code

### 3. Email Verification Fallback

**Steps:**
1. Navigate to enrollment screen
2. Deny camera permission or tap "Verify via Email"
3. Tap "Send Verification Email"
4. Confirm email sent message
5. Continue to manual setup
6. Complete enrollment via manual entry

**Expected Results:**
- ✅ Email verification option available
- ✅ Clear messaging about the process
- ✅ Seamless transition to manual setup

### 4. Camera Permission Denied

**Steps:**
1. Navigate to enrollment
2. Deny camera permission
3. Observe available options
4. Select "Enter Code Manually"
5. Complete enrollment

**Expected Results:**
- ✅ Clear explanation of why camera is needed
- ✅ Alternative methods clearly presented
- ✅ No blocking errors

### 5. Invalid QR Code

**Steps:**
1. Start QR scanner
2. Scan an invalid QR code (not otpauth://)
3. Observe error handling
4. Retry with valid QR code

**Expected Results:**
- ✅ Alert shows "Invalid QR Code" message
- ✅ Option to retry immediately
- ✅ Scanner resumes automatically

### 6. Invalid Verification Code

**Steps:**
1. Complete QR/manual setup
2. Enter incorrect 6-digit code
3. Observe error
4. Enter correct code

**Expected Results:**
- ✅ Error message: "Invalid code. Please check your authenticator app and try again."
- ✅ Input remains active for immediate retry
- ✅ Error clears when typing new code

### 7. Device Trust Toggle

**Steps:**
1. Reach verification step
2. Toggle "Trust This Device" on
3. Complete enrollment
4. Log out and log back in
5. Verify MFA behavior

**Expected Results:**
- ✅ Toggle works smoothly
- ✅ Setting persists through enrollment
- ✅ Device trust reflected in subsequent logins

### 8. Backup Codes

**Steps:**
1. Complete enrollment to backup codes step
2. Tap "Copy Codes"
3. Verify clipboard contains codes
4. Tap "Share Codes"
5. Verify share sheet appears
6. Attempt to complete without confirming save
7. Confirm save and complete

**Expected Results:**
- ✅ 10 unique 8-character codes displayed
- ✅ Copy to clipboard works
- ✅ Share functionality works
- ✅ Warning shown if not confirmed saved
- ✅ Cannot proceed without confirmation

### 9. Back Navigation

**Steps:**
1. Navigate through enrollment steps
2. Use back button at each step
3. Verify state preservation
4. Complete enrollment

**Expected Results:**
- ✅ Back button available at each step
- ✅ State preserved when going back
- ✅ Can restart from any point
- ✅ Cancel returns to Settings

### 10. Network Error Handling

**Steps:**
1. Start enrollment
2. Disable network connection
3. Attempt to start enrollment or verify code
4. Observe error handling
5. Re-enable network and retry

**Expected Results:**
- ✅ Clear error message about network
- ✅ Retry option available
- ✅ State preserved during error

## Accessibility Testing

### VoiceOver (iOS)

**Steps:**
1. Enable VoiceOver (Settings → Accessibility → VoiceOver)
2. Navigate through enrollment using swipe gestures
3. Test all interactive elements
4. Complete enrollment using VoiceOver

**Verify:**
- [ ] All buttons have clear labels
- [ ] Form inputs have descriptive labels and hints
- [ ] State changes are announced (loading, error)
- [ ] Backup codes read character-by-character
- [ ] Toggle state is announced

### TalkBack (Android)

**Steps:**
1. Enable TalkBack (Settings → Accessibility → TalkBack)
2. Navigate through enrollment using swipe gestures
3. Test all interactive elements
4. Complete enrollment using TalkBack

**Verify:**
- [ ] All buttons have clear labels
- [ ] Form inputs have descriptive labels and hints
- [ ] State changes are announced
- [ ] Backup codes are accessible
- [ ] Toggle state is announced

### Visual Accessibility

**Verify:**
- [ ] All text meets contrast requirements
- [ ] Tap targets are minimum 44x44 points
- [ ] Focus indicators are visible
- [ ] Error messages are clearly visible
- [ ] Dynamic type scaling works (iOS)
- [ ] Font scaling works (Android)

## Platform-Specific Testing

### iOS Specific

**Camera Features:**
- Test on Face ID device
- Test on Touch ID device
- Test on device without biometrics
- Verify camera permission prompt
- Test camera switching (if applicable)

**Integration:**
- Test iOS share sheet
- Test clipboard integration
- Test keyboard behavior
- Test safe area handling

### Android Specific

**Camera Features:**
- Test on device with fingerprint
- Test on device with face unlock
- Test on device without biometrics
- Verify camera permission prompt

**Integration:**
- Test Android share functionality
- Test clipboard integration
- Test keyboard behavior
- Test back button behavior

## Edge Cases

### Test the following edge cases:

1. **Multiple Enrollment Attempts**
   - Start enrollment, cancel, restart
   - Complete enrollment, attempt to enroll again
   - Expected: Clear error when already enrolled

2. **App Backgrounding**
   - Start enrollment
   - Background app during QR scan
   - Resume and verify state
   - Expected: State preserved or graceful recovery

3. **Low Battery**
   - Test camera operation on low battery
   - Expected: Works normally or clear low battery warning

4. **Low Light**
   - Test QR scanning in low light conditions
   - Expected: Camera adapts or suggests better lighting

5. **Orientation Changes**
   - Rotate device during enrollment
   - Expected: Layout adapts correctly

6. **Slow Network**
   - Test with slow/throttled connection
   - Expected: Loading states shown, timeouts handled

7. **Expired Session**
   - Start enrollment
   - Let session expire
   - Complete enrollment
   - Expected: Prompts to re-login

## Regression Testing

After any code changes, verify:

- [ ] All happy path scenarios work
- [ ] Error handling still works
- [ ] Accessibility features intact
- [ ] No visual regressions
- [ ] Performance acceptable

## Bug Reporting Template

When reporting bugs, include:

```
**Environment:**
- Platform: iOS/Android
- OS Version: 
- Device: 
- App Version: 

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Screenshots/Videos:**


**Additional Context:**

```

## Test Coverage Summary

Run this checklist before marking enrollment as complete:

### Functional
- [ ] QR code scanning works
- [ ] Manual entry works
- [ ] Email fallback works
- [ ] Verification succeeds with valid code
- [ ] Backup codes generate and save
- [ ] Device trust toggle works
- [ ] Navigation flows correctly
- [ ] Settings integration works

### Error Handling
- [ ] Camera permission denied handled
- [ ] Invalid QR code handled
- [ ] Invalid verification code handled
- [ ] Network errors handled
- [ ] Already enrolled handled

### Accessibility
- [ ] VoiceOver tested (iOS)
- [ ] TalkBack tested (Android)
- [ ] Visual contrast verified
- [ ] Tap targets adequate
- [ ] Dynamic type works

### Cross-Platform
- [ ] iOS tested
- [ ] Android tested
- [ ] Consistent UX
- [ ] Platform-specific features work

### Security
- [ ] Secrets never logged
- [ ] HTTPS enforced
- [ ] Backup codes secure
- [ ] Device trust server-validated
