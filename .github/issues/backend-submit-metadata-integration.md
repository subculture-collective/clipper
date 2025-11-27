# [Feature] Implement Backend Metadata Fetch Endpoint for Clip Submissions

## Summary

Implement the `/api/v1/submissions/metadata` endpoint to fetch Twitch clip metadata in real-time during the submission flow. This completes the backend integration for the mobile and frontend submit flows which currently use mock data.

## Scope

### Backend

- **New endpoint**: `GET /api/v1/submissions/metadata?url={twitchClipUrl}`
- **Handler**: Create `SubmissionHandler.FetchMetadata()`
- **Service**: Extend `TwitchService` with metadata extraction
- **Integration**: Connect to existing Twitch API client
- **Validation**: URL validation and Twitch API error handling
- **Caching**: Cache metadata for 1 hour to reduce Twitch API calls

### API Response Format

```json
{
    "success": true,
    "data": {
        "clip_id": "AwkwardHelplessSalamanderSwiftRage",
        "title": "Amazing play!",
        "streamer_name": "shroud",
        "game_name": "Valorant",
        "view_count": 12543,
        "created_at": "2024-11-20T15:30:00Z",
        "thumbnail_url": "https://clips-media-assets2.twitch.tv/...",
        "duration": 30,
        "url": "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage"
    }
}
```

### Error Handling

- Invalid URL format → 400 Bad Request
- Clip not found on Twitch → 404 Not Found
- Twitch API rate limit → 429 Too Many Requests
- Twitch API error → 502 Bad Gateway

### Testing

- Unit tests for URL parsing and validation
- Integration tests with Twitch API (using test fixtures)
- Error handling tests for all error scenarios
- Cache behavior tests

## Acceptance Criteria

- [ ] `GET /api/v1/submissions/metadata?url={url}` endpoint implemented
- [ ] URL validation supports both clip URL formats:
    - `https://clips.twitch.tv/{clipId}`
    - `https://twitch.tv/{streamer}/clip/{clipId}`
- [ ] Successful metadata fetch from Twitch API
- [ ] Response includes all required fields (clip_id, title, streamer, game, etc.)
- [ ] Redis caching implemented (1-hour TTL)
- [ ] Rate limiting applied (100 requests/hour per user)
- [ ] Error responses follow API conventions
- [ ] Unit tests cover URL parsing logic
- [ ] Integration tests verify Twitch API calls
- [ ] Error handling tests for all scenarios
- [ ] Documentation updated in `docs/API.md`
- [ ] Mobile app tested with real endpoint (remove mock)
- [ ] Frontend app tested with real endpoint (remove mock)

## Priority

**P0 (Critical - MVP blocker)**

This is blocking the completion of the user submission system which is core to the site's transition from scraped to user-submitted content.

## Milestone

**MVP** (foundations, must-fixes, go-to-market blockers)

## Tech Notes

### Twitch API Integration

- Use existing `TwitchService` from `backend/internal/services/twitch_service.go`
- Twitch Helix API endpoint: `GET https://api.twitch.tv/helix/clips?id={clip_id}`
- Requires Client-ID and OAuth token (already configured)
- Reference: https://dev.twitch.tv/docs/api/reference#get-clips

### URL Parsing

Extract clip ID from these formats:

- `https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage` → `AwkwardHelplessSalamanderSwiftRage`
- `https://www.twitch.tv/shroud/clip/AwkwardHelplessSalamanderSwiftRage` → `AwkwardHelplessSalamanderSwiftRage`
- `https://m.twitch.tv/shroud/clip/AwkwardHelplessSalamanderSwiftRage` → `AwkwardHelplessSalamanderSwiftRage`

### Caching Strategy

```go
cacheKey := fmt.Sprintf("clip:metadata:%s", clipID)
// Cache for 1 hour - metadata rarely changes
ttl := 1 * time.Hour
```

### Dependencies

- Existing: Twitch API client configuration
- Existing: Redis connection for caching
- Existing: Rate limiting middleware

### Security Considerations

- Validate and sanitize URL input
- Don't expose Twitch API errors directly to client
- Rate limit to prevent API quota exhaustion
- Log suspicious patterns (rapid requests, invalid URLs)

### Performance Targets

- Response time: <500ms (p95)
- Cache hit rate: >80% after initial fetch
- Twitch API calls: <10/minute average

## Related Issues

- Depends on: Twitch API client (already implemented)
- Enables: Mobile submit flow completion
- Enables: Frontend submit flow completion
- Related: User submission moderation workflow
- Blocks: #[TBD - E2E Testing for Submit Flow]
