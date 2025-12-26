# Playlist Sharing & Theatre Queue E2E Tests

Comprehensive end-to-end tests for playlist sharing and theatre queue (watch party) functionality.

## Overview

This test suite validates:
- **Playlist Sharing**: Link generation, access controls, and permission management
- **Theatre Queue (Watch Party)**: Creation, joining, participant management, and synchronization
- **Invite-based Access**: Flows for both playlists and watch parties
- **Error Handling**: Invalid requests, unauthorized access, and graceful degradation
- **Access Revocation**: Permission changes and their effects

## Test Organization

### 1. Playlist Sharing - Link Generation and Access Controls

Tests for generating and managing playlist share links with different visibility levels:

- ✅ Generate share link for public playlist
- ✅ Generate share link for unlisted playlist  
- ✅ Prevent unauthorized access to private playlist
- ✅ Enforce access control on private playlist
- ✅ Allow access to public playlist without authentication

**Key Behaviors:**
- Public playlists have accessible share links
- Unlisted playlists have share links but aren't discoverable
- Private playlists require authentication and ownership

### 2. Playlist Sharing - Visibility Changes and Permission Updates

Tests for changing playlist visibility and managing permissions:

- ✅ Change playlist from private to public
- ✅ Change playlist from public to unlisted
- ✅ Revoke access by changing from public to private

**Key Behaviors:**
- Visibility changes take effect immediately
- Changing to private revokes public access
- Only owners can modify visibility

### 3. Playlist Sharing - Error Cases

Tests for error handling in playlist sharing:

- ✅ Handle invalid playlist ID gracefully
- ✅ Handle non-existent playlist share link request
- ✅ Prevent unauthorized users from updating playlist visibility

**Key Behaviors:**
- Invalid IDs return null/error gracefully
- Non-existent playlists don't crash the system
- Authorization is enforced

### 4. Theatre Queue (Watch Party) - Creation and Joining

Tests for basic watch party operations:

- ✅ Create watch party with playlist
- ✅ Create private watch party with invite code
- ✅ Join watch party using invite code
- ✅ Get watch party details

**Key Behaviors:**
- Watch parties can be created with or without playlists
- Invite codes are generated automatically
- Public watch parties are joinable
- Private watch parties require invite code

### 5. Theatre Queue (Watch Party) - Participant Management

Tests for managing watch party participants:

- ✅ List watch party participants
- ✅ Allow participant to leave watch party
- ✅ Allow host to update watch party settings
- ✅ Allow host to end/delete watch party

**Key Behaviors:**
- Host is automatically added as first participant
- Participants can leave voluntarily
- Only host can update settings
- Deleting watch party removes all participants

### 6. Theatre Queue (Watch Party) - Permission and Access Control

Tests for watch party permissions:

- ✅ Enforce max participants limit
- ✅ Require authentication to join private watch party
- ✅ Allow access to public watch party

**Key Behaviors:**
- Max participants limit is enforced
- Private watch parties require authentication
- Public watch parties are openly accessible

### 7. Theatre Queue (Watch Party) - Error Cases

Tests for error handling in watch parties:

- ✅ Handle invalid watch party ID gracefully
- ✅ Handle invalid invite code gracefully
- ✅ Prevent joining non-existent watch party
- ✅ Handle creating watch party with non-existent playlist

**Key Behaviors:**
- Invalid IDs/codes fail gracefully
- Non-existent resources return appropriate errors
- System remains stable on bad input

### 8. Integration - Playlist Sharing with Theatre Queue

Tests for integrated workflows:

- ✅ Create watch party from shared playlist
- ✅ Share watch party invite link
- ✅ Handle playlist visibility change affecting watch party

**Key Behaviors:**
- Watch parties can use shared playlists
- Invite links work independently
- Playlist changes may affect watch party access

## Running the Tests

### Run all playlist sharing and theatre queue tests:
```bash
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts
```

### Run specific test groups:
```bash
# Playlist sharing only
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts --grep "Playlist Sharing"

# Theatre queue only
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts --grep "Theatre Queue"

# Error cases only
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts --grep "Error Cases"

# Integration tests only
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts --grep "Integration"
```

### Run in headed mode (see browser):
```bash
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts --headed
```

### Run in debug mode:
```bash
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts --debug
```

## Test Utilities

The following utilities are available in `utils/social-features.ts`:

### Playlist Functions
- `createPlaylist(page, data)` - Create a new playlist
- `updatePlaylist(page, id, updates)` - Update playlist details
- `deletePlaylist(page, id)` - Delete a playlist
- `getPlaylist(page, id)` - Get playlist details
- `getPlaylistShareLink(page, id)` - Get playlist share link
- `updatePlaylistVisibility(page, id, visibility)` - Change visibility
- `validatePlaylistAccess(page, id, expectedStatus)` - Validate access
- `addClipsToPlaylist(page, id, clipIds)` - Add clips to playlist

### Watch Party Functions
- `createWatchParty(page, data)` - Create a watch party
- `joinWatchParty(page, idOrCode, password?)` - Join using invite
- `leaveWatchParty(page, id)` - Leave watch party
- `getWatchParty(page, id)` - Get watch party details
- `getWatchPartyParticipants(page, id)` - List participants
- `updateWatchPartySettings(page, id, settings)` - Update settings
- `kickWatchPartyParticipant(page, partyId, participantId)` - Kick user
- `deleteWatchParty(page, id)` - End/delete watch party

## Multi-User Testing

For testing scenarios involving multiple users:

1. Create multiple browser contexts
2. Authenticate each context with different users
3. Perform actions from different contexts
4. Validate synchronization and permissions

Example:
```typescript
test('multi-user watch party', async ({ browser }) => {
  // Create two contexts for two users
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // User 1 creates watch party
  const watchParty = await createWatchParty(page1, {...});
  
  // User 2 joins watch party
  await joinWatchParty(page2, watchParty.invite_code);
  
  // Verify both see each other
  const participants = await getWatchPartyParticipants(page1, watchParty.id);
  expect(participants.length).toBe(2);
  
  // Cleanup
  await context1.close();
  await context2.close();
});
```

## CI/CD Integration

### Artifacts Collection

On test failure, the following artifacts are automatically collected:
- Screenshots of the failed state
- Video recordings of the test execution
- Playwright trace files for debugging
- Console logs and network requests

Artifacts are retained for 7 days in CI and can be downloaded from the GitHub Actions run.

### Viewing Results

1. Go to GitHub Actions tab
2. Select the workflow run
3. Download artifacts:
   - `playwright-report` - HTML report with test results
   - `test-results` - Screenshots, videos, and traces

### Troubleshooting Failed Tests

1. **Check the HTML report**: Open `playwright-report/index.html` locally
2. **View traces**: `npx playwright show-trace test-results/.../trace.zip`
3. **Check screenshots**: Look in `test-results/` for failure screenshots
4. **Review console logs**: Available in the trace viewer

## Success Metrics

- ✅ **Pass Rate**: ≥ 95% across all scenarios
- ✅ **Permissions**: All access control tests passing
- ✅ **Invites**: Invite flows work correctly
- ✅ **Revocation**: Access removal verified
- ✅ **Error Handling**: Graceful degradation confirmed
- ✅ **CI Artifacts**: Collected on all failures

## Known Limitations

1. **Mock Data Fallback**: Tests fall back to mock data when API is unavailable
2. **WebSocket Testing**: Watch party real-time sync requires WebSocket support
3. **Multi-User Tests**: Some tests need separate browser contexts for true multi-user scenarios
4. **Network Timing**: Tests may need adjustments for slow network conditions

## Future Enhancements

- [ ] Add WebSocket-based real-time sync tests
- [ ] Add comprehensive multi-user concurrent access tests
- [ ] Add performance benchmarks for share link generation
- [ ] Add load testing for watch party participant limits
- [ ] Add accessibility (a11y) tests for sharing UI
- [ ] Add mobile-specific sharing tests

## Related Documentation

- [E2E Testing Framework README](../README.md)
- [Social Features Tests](./SOCIAL_FEATURES_TESTS.md)
- [Playlist API Documentation](../../../docs/api/playlists.md)
- [Watch Party API Documentation](../../../docs/api/watch-parties.md)

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Use the provided utility functions in `social-features.ts`
3. Include proper cleanup in afterEach/finally blocks
4. Add mock data fallbacks for offline testing
5. Document any new test scenarios in this file
6. Ensure tests are independent and can run in any order

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting-failed-tests) section
- Review [E2E Framework README](../README.md)
- Open an issue with test failure details and artifacts
