# Manual Testing Checklist - Pointer Events

This checklist is for manual verification that touch interactions work correctly in the Clipper mobile app after any pointer events changes.

## Prerequisites

- iOS Simulator or physical iOS device
- Android Emulator or physical Android device
- Latest build of the app installed

## Test Scenarios

### 1. Submit Flow - Button States

**Test**: Disabled button behavior during submission

1. Navigate to the Submit screen
2. Try to tap the "Next" button without entering a URL
3. **Expected**: Button should be unresponsive
4. Enter a valid Twitch clip URL
5. **Expected**: Button should now be tappable
6. Tap "Next" and verify it works

**Status**: ⬜ iOS | ⬜ Android

---

### 2. Comments - Nested Interactive Elements

**Test**: Multiple touch targets within a comment

1. Navigate to a clip with comments
2. Tap on the comment text area
3. **Expected**: Comment should expand/collapse
4. Tap the upvote button
5. **Expected**: Only the vote should register, not the comment action
6. Tap the reply button
7. **Expected**: Reply composer should open

**Status**: ⬜ iOS | ⬜ Android

---

### 3. Modal Overlays - Backdrop Interaction

**Test**: Filter modal blocks background interaction

1. Open the search/feed screen
2. Tap the filter icon to open filter modal
3. Try tapping the background content behind the modal
4. **Expected**: Modal should not close; background should not respond
5. Tap outside the modal on the backdrop
6. **Expected**: Modal should close (if designed that way)

**Status**: ⬜ iOS | ⬜ Android

---

### 4. Consent Modal - Choice Buttons

**Test**: Privacy consent modal interactions

1. Clear app data/reinstall to trigger consent modal
2. Launch the app
3. Tap "Accept All"
4. **Expected**: Modal should close, consent should be saved
5. (Re-test) Tap "Reject All"
6. **Expected**: Modal should close with rejection saved
7. (Re-test) Tap "Customize"
8. **Expected**: Detailed options should appear

**Status**: ⬜ iOS | ⬜ Android

---

### 5. Loading States - Form Submission

**Test**: Form disabled during loading

1. Navigate to submit screen
2. Fill in all required fields
3. Tap "Submit"
4. **While loading**: Try tapping submit again
5. **Expected**: Second tap should be ignored
6. **While loading**: Try tapping back button
7. **Expected**: Back should be disabled during submission
8. Wait for submission to complete
9. **Expected**: Success or error screen should appear

**Status**: ⬜ iOS | ⬜ Android

---

### 6. Video Playback - Card Touch Areas

**Test**: Video card interactions

1. Navigate to the feed
2. Tap on a video card thumbnail
3. **Expected**: Video should play/pause or open detail view
4. Tap on the creator name
5. **Expected**: Should navigate to creator profile (if implemented)
6. Tap the vote buttons
7. **Expected**: Vote should register without triggering video play

**Status**: ⬜ iOS | ⬜ Android

---

### 7. Scroll Performance - Feed Interaction

**Test**: Smooth scrolling with no touch conflicts

1. Open the main feed
2. Scroll up and down rapidly
3. **Expected**: Smooth scrolling, no stutters
4. While scrolling, quickly stop and tap a card
5. **Expected**: Tap should register correctly, no scroll momentum issues
6. Long press on a card (if gestures implemented)
7. **Expected**: Long press action should work

**Status**: ⬜ iOS | ⬜ Android

---

### 8. Navigation - Tab Bar

**Test**: Tab bar remains responsive

1. Tap each tab in the bottom navigation
2. **Expected**: Each tab should respond immediately
3. While on a tab, tap it again
4. **Expected**: Should scroll to top or refresh (standard behavior)
5. During page transitions, try rapid tab switching
6. **Expected**: No hanging or unresponsive tabs

**Status**: ⬜ iOS | ⬜ Android

---

## Platform-Specific Tests

### iOS Only

**Test**: Native gestures work correctly

1. Swipe from left edge to go back
2. **Expected**: Back navigation works
3. Pull down to dismiss modal
4. **Expected**: Modal dismisses
5. Long press on text to select
6. **Expected**: Selection works

**Status**: ⬜ Complete

---

### Android Only

**Test**: Android back button behavior

1. Open a modal or nested screen
2. Press Android back button
3. **Expected**: Should navigate back correctly
4. In the submit flow, press back at each step
5. **Expected**: Should return to previous step

**Status**: ⬜ Complete

---

## Regression Checks

### Previously Working Features

Verify these existing features still work:

- [ ] Login/Logout
- [ ] Profile editing
- [ ] Clip submission (full flow)
- [ ] Search functionality
- [ ] Filter application
- [ ] Comment posting
- [ ] Vote buttons (upvote/downvote)
- [ ] Video playback controls
- [ ] Share functionality
- [ ] Settings changes

---

## Edge Cases

### Rapid Tapping

1. Rapidly tap submit button 5-10 times
2. **Expected**: Only one submission should occur
3. Rapidly tap vote buttons
4. **Expected**: Should handle gracefully (debounced or queued)

**Status**: ⬜ iOS | ⬜ Android

---

### Interrupted Gestures

1. Start a swipe gesture but don't complete it
2. **Expected**: No partial actions
3. Start tapping a button but drag finger off before release
4. **Expected**: Button should not activate

**Status**: ⬜ iOS | ⬜ Android

---

### Low Battery/Performance

1. Test on older device or with throttled performance
2. Verify interactions remain responsive
3. Check that loading states properly disable interaction

**Status**: ⬜ iOS | ⬜ Android

---

## Sign-Off

- [ ] All tests passed on iOS
- [ ] All tests passed on Android
- [ ] No regressions found
- [ ] Edge cases handled appropriately

**Tester Name**: _______________  
**Date**: _______________  
**iOS Version Tested**: _______________  
**Android Version Tested**: _______________  
**App Version**: _______________

---

## Issues Found

If any issues are discovered during testing, document them below:

| Test # | Issue Description | Severity | Platform | Screenshot |
|--------|------------------|----------|----------|------------|
|        |                  |          |          |            |

---

## Notes

- Focus on areas with modals, overlays, and disabled states
- Pay attention to nested interactive elements
- Test both happy paths and error scenarios
- Verify loading states properly block interaction
- Check that gestures don't conflict with taps

**Remember**: The goal is to ensure touch interactions are intuitive, responsive, and free from conflicts or unintended behavior.
