# Video Playback Implementation

## Overview

This document describes the enhanced video playback features implemented for the mobile app, including quality selection, Picture-in-Picture (PiP) support, background playback, and Quality of Experience (QoE) telemetry.

## Components

### EnhancedVideoPlayer

A comprehensive video player component built on top of `expo-video` with the following features:

#### Features

1. **Quality Selection UI**
   - Supports multiple quality levels: Auto, 240p, 480p, 720p, 1080p
   - Modal-based quality selector with visual feedback
   - Automatic quality variant selection based on user choice
   - Seamless quality switching with playback position preservation

2. **Picture-in-Picture (PiP)**
   - Enabled by default for both iOS and Android
   - PiP indicator in the player UI
   - Configured via `app.json` with `supportsPictureInPicture: true`

3. **Background Playback**
   - Optional background audio playback support
   - Configurable via `allowsBackgroundPlayback` prop
   - Respects platform audio session policies

4. **Buffering Indication**
   - Visual loading indicator during buffering
   - Transparent overlay with spinner

5. **Control Responsiveness**
   - 60fps responsive controls
   - Auto-hide controls after 3 seconds during playback
   - Touch-to-show controls

#### Usage

```tsx
import EnhancedVideoPlayer from '../components/EnhancedVideoPlayer';

<EnhancedVideoPlayer
  videoUrl="https://example.com/video.m3u8"
  qualityVariants={{
    '240p': 'https://example.com/video-240p.m3u8',
    '480p': 'https://example.com/video-480p.m3u8',
    '720p': 'https://example.com/video-720p.m3u8',
    '1080p': 'https://example.com/video-1080p.m3u8',
  }}
  initialQuality="auto"
  allowsPictureInPicture={true}
  allowsBackgroundPlayback={false}
  contentFit="contain"
  loop={false}
  autoPlay={true}
  videoId="clip-123"
  videoTitle="Amazing Gaming Moment"
  style={{ width: '100%', height: 300 }}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `videoUrl` | `string` | Required | Main video URL (used for 'auto' quality) |
| `qualityVariants` | `object` | `{}` | Optional quality-specific URLs |
| `initialQuality` | `VideoQuality` | `'auto'` | Initial quality selection |
| `allowsPictureInPicture` | `boolean` | `true` | Enable PiP support |
| `contentFit` | `'contain' \| 'cover'` | `'contain'` | Video content fit mode |
| `allowsBackgroundPlayback` | `boolean` | `false` | Enable background audio |
| `loop` | `boolean` | `false` | Loop video playback |
| `autoPlay` | `boolean` | `false` | Auto-play on mount |
| `videoId` | `string` | Optional | Unique ID for analytics |
| `videoTitle` | `string` | Optional | Video title for analytics |
| `style` | `ViewStyle` | Optional | Container style |

## Telemetry

### useVideoTelemetry Hook

A custom hook for tracking comprehensive video playback metrics.

#### Tracked Events

1. **video_load_started**
   - Fired when video component mounts
   - Properties: `video_id`, `video_title`, `video_duration`, `initial_quality`

2. **video_playback_started**
   - Fired when playback begins
   - Properties: `video_id`, `video_title`, `load_time_ms`, `quality`

3. **video_buffering_event**
   - Fired when buffering completes
   - Properties: `video_id`, `buffering_duration_ms`, `total_buffering_ms`, `buffering_count`, `quality`

4. **video_quality_changed**
   - Fired when user changes quality
   - Properties: `video_id`, `previous_quality`, `new_quality`, `timestamp`, `quality_change_count`

5. **video_paused / video_resumed**
   - Fired on pause/resume actions
   - Properties: `video_id`, `timestamp`, `quality`

6. **video_seeked**
   - Fired when user seeks in video
   - Properties: `video_id`, `from_time`, `to_time`, `quality`

7. **video_progress_25/50/75**
   - Fired at 25%, 50%, 75% completion milestones
   - Properties: `video_id`, `quality`, `timestamp`

8. **video_playback_completed**
   - Fired when video completes
   - Properties: `video_id`, `quality`, `video_duration`, `watch_duration_ms`, `total_buffering_ms`

9. **video_playback_error**
   - Fired on playback errors
   - Properties: `video_id`, `error_type`, `error_message`, `error_count`

10. **video_session_ended**
    - Fired when component unmounts
    - Properties: `video_id`, `session_duration_ms`, `total_buffering_ms`, `quality_changes`, `playback_errors`, `completion_rate`

11. **video_pip_entered / video_pip_exited**
    - Fired on PiP state changes
    - Properties: `video_id`, `video_title`

#### Usage

```tsx
import { useVideoTelemetry } from '../hooks/useVideoTelemetry';

function VideoPlayer({ videoId, videoTitle, videoDuration }) {
  const telemetry = useVideoTelemetry({
    videoId,
    videoTitle,
    videoDuration,
    initialQuality: '720p',
  });

  // Track events
  telemetry.trackPlaybackStarted(500, '720p');
  telemetry.trackBufferingStarted();
  telemetry.trackBufferingEnded('720p');
  telemetry.trackQualityChange('720p', '1080p', 30.5);
  telemetry.trackPause(15.0, '1080p');
  telemetry.trackResume(15.0, '1080p');
  telemetry.trackPlaybackCompleted('1080p', 120);

  // Get metrics
  const metrics = telemetry.getMetrics();
  console.log('Total buffering time:', metrics.totalBufferingTime);
}
```

## Platform Configuration

### iOS Configuration (app.json)

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.subculture.clipper"
    },
    "plugins": [
      [
        "expo-video",
        {
          "supportsPictureInPicture": true
        }
      ]
    ]
  }
}
```

#### iOS Background Audio

For background audio playback on iOS, the app is configured with the appropriate audio session category. The `expo-video` player's `allowsExternalPlayback` property is set based on the `allowsBackgroundPlayback` prop.

### Android Configuration (app.json)

```json
{
  "expo": {
    "android": {
      "package": "com.subculture.clipper"
    },
    "plugins": [
      [
        "expo-video",
        {
          "supportsPictureInPicture": true
        }
      ]
    ]
  }
}
```

#### Android PiP Mode

Android PiP is automatically handled by the `expo-video` plugin. The app enters PiP mode when the user navigates away while video is playing.

## Performance

### 60fps Control Responsiveness

- Controls use `TouchableOpacity` with optimized rendering
- State updates are batched where possible
- Auto-hide timer uses `setTimeout` for non-blocking operation
- Video view updates use native modules for smooth performance

### Memory Profiling

To profile memory during long playback sessions:

1. Use React DevTools Profiler in development
2. Monitor native memory with Xcode Instruments (iOS) or Android Studio Profiler (Android)
3. Key metrics to watch:
   - Memory growth over time
   - Peak memory usage
   - Memory leaks after unmounting

### Memory Optimization

- Video player instances are properly cleaned up on unmount
- Telemetry uses refs to avoid unnecessary re-renders
- Controls overlay uses conditional rendering
- Thumbnail images use memory-disk cache policy

## Testing

### Manual Testing Checklist

#### iOS Testing
- [x] Quality selector works with multiple quality options
- [x] PiP entry works (home button or swipe up)
- [x] PiP controls work (play/pause)
- [x] PiP exit works (tap video)
- [x] Background playback respects policy (disabled by default)
- [ ] Controls remain responsive at 60fps
- [ ] Memory stays stable during long playback

#### Android Testing
- [x] Quality selector works with multiple quality options
- [x] PiP entry works (home button)
- [x] PiP controls work (play/pause)
- [x] PiP exit works (tap video)
- [x] Background playback respects policy (disabled by default)
- [ ] Controls remain responsive at 60fps
- [ ] Memory stays stable during long playback

### Automated Tests

Run tests with:
```bash
npm test -- __tests__/video-playback.test.ts
```

Tests cover:
- Telemetry event tracking
- Quality selection
- PiP support configuration
- Background playback configuration
- Control responsiveness metrics

## Analytics Integration

All video playback events are sent to PostHog via the existing analytics infrastructure. Events can be viewed in the PostHog dashboard under:
- Event name filters: `video_*`
- User properties: `video_id`, `video_title`

### QoE Metrics Dashboard

Key metrics to monitor:
1. **Load Time**: `video_playback_started.load_time_ms`
2. **Buffering Rate**: `video_buffering_event` count / total sessions
3. **Buffering Duration**: `video_buffering_event.buffering_duration_ms`
4. **Completion Rate**: `video_playback_completed` / `video_playback_started`
5. **Quality Changes**: `video_quality_changed.quality_change_count`
6. **Error Rate**: `video_playback_error` count / total sessions

## Troubleshooting

### Quality Selection Not Showing

**Problem**: Quality selector button doesn't appear
**Solution**: Ensure `qualityVariants` prop includes at least one quality option. The selector only shows when multiple options are available.

### PiP Not Working

**Problem**: PiP doesn't activate on iOS/Android
**Solutions**:
- iOS: Ensure `supportsPictureInPicture: true` in app.json
- iOS: Check that app has proper entitlements (Background Modes)
- Android: Ensure minimum Android version is 8.0 (API 26)
- Both: Verify `allowsPictureInPicture` prop is not set to `false`

### Background Playback Not Working

**Problem**: Audio stops when app is backgrounded
**Solution**: Set `allowsBackgroundPlayback={true}` on the EnhancedVideoPlayer component. Note that background playback may require additional permissions on some platforms.

### High Memory Usage

**Problem**: Memory grows during long playback sessions
**Solutions**:
- Ensure video component is properly unmounted when navigating away
- Check for quality variant URLs that are too large
- Use appropriate video codecs (H.264 for compatibility, H.265 for efficiency)
- Monitor for memory leaks with profiling tools

### Controls Not Responsive

**Problem**: Controls feel laggy or unresponsive
**Solutions**:
- Verify no heavy operations in render cycle
- Check for excessive re-renders with React DevTools
- Ensure video URLs are properly optimized
- Test on lower-end devices for worst-case performance

## Future Enhancements

Potential improvements for future iterations:

1. **Adaptive Bitrate Streaming (ABR)**
   - Automatic quality switching based on network conditions
   - Bandwidth monitoring and prediction

2. **Offline Playback**
   - Download videos for offline viewing
   - Cache management

3. **Advanced Controls**
   - Seek bar with thumbnail preview
   - Playback speed control (0.5x, 1x, 1.5x, 2x)
   - Volume control

4. **Subtitle Support**
   - Load and display subtitle tracks
   - Subtitle customization (size, color, position)

5. **Chromecast Support**
   - Cast to compatible devices
   - Remote control from mobile device

6. **Enhanced Analytics**
   - Engagement heatmaps (most-watched segments)
   - Drop-off analysis
   - A/B testing for player features

## References

- [Expo Video Documentation](https://docs.expo.dev/versions/latest/sdk/video/)
- [iOS Picture-in-Picture](https://developer.apple.com/documentation/avkit/adopting_picture_in_picture_in_a_custom_player)
- [Android PiP Mode](https://developer.android.com/guide/topics/ui/picture-in-picture)
- [PostHog Analytics](https://posthog.com/docs)
