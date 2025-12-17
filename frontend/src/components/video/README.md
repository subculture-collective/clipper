# Theatre Mode Player - Implementation Guide

## Overview

The Theatre Mode Player provides an immersive viewing experience with adaptive quality selection, keyboard shortcuts, and full-screen support. This implementation includes HLS video streaming with automatic bitrate adaptation based on network conditions.

## Features

### 1. Theatre Mode
- **Full-screen immersive viewing** - Expands to fill the entire viewport
- **Minimal UI** - Controls fade out during playback for distraction-free viewing
- **Keyboard shortcuts** - Quick access to common controls

### 2. Quality Selection
- **Manual quality selection** - 480p, 720p, 1080p, 2K, 4K
- **Auto quality mode** - Adaptive bitrate selection based on network conditions
- **Persistent preferences** - Quality settings saved in localStorage

### 3. Adaptive Bitrate Streaming
- **Network monitoring** - Tracks bandwidth and buffer health
- **Smart quality switching** - Automatically selects optimal quality
- **Smooth transitions** - Gradual quality adjustments to prevent buffering

### 4. Playback Controls
- **Standard video controls** - Play/pause, seek, volume
- **Picture-in-picture** - Continue watching while browsing
- **Fullscreen support** - Native browser fullscreen mode

## Components

### TheatreMode

Main wrapper component that provides the theatre mode experience.

```tsx
import { TheatreMode } from '@/components/video';

<TheatreMode
  title="Amazing Gaming Moment"
  hlsUrl="/api/video/clip-123/master.m3u8"
/>
```

**Props:**
- `title`: Video title displayed in the player
- `hlsUrl`: Optional HLS master playlist URL (shows fallback message if not provided)
- `className`: Optional CSS classes

### HlsPlayer

Core HLS video player with quality selection and adaptive bitrate support.

```tsx
import { HlsPlayer } from '@/components/video';

<HlsPlayer
  src="/api/video/clip-123/master.m3u8"
  quality="auto"
  autoQuality={true}
  onQualityChange={(quality) => console.log('Quality changed:', quality)}
  onBandwidthUpdate={(bandwidth) => console.log('Bandwidth:', bandwidth)}
/>
```

**Props:**
- `src`: HLS master playlist URL
- `quality`: Current quality setting ('480p', '720p', '1080p', '2K', '4K', 'auto')
- `autoQuality`: Enable adaptive bitrate selection
- `onQualityChange`: Callback when quality changes
- `onBandwidthUpdate`: Callback with bandwidth measurements
- `onBufferHealthUpdate`: Callback with buffer health (0-100)

### QualitySelector

Dropdown for manual quality selection.

```tsx
import { QualitySelector } from '@/components/video';

<QualitySelector
  value={quality}
  onChange={setQuality}
  availableQualities={['480p', '720p', '1080p', '2K', '4K', 'auto']}
/>
```

### BitrateIndicator

Shows current network status and video quality.

```tsx
import { BitrateIndicator } from '@/components/video';

<BitrateIndicator
  bandwidth={15.5}
  bufferHealth={85}
  currentQuality="1080p"
/>
```

### PlaybackControls

Standard video playback controls.

```tsx
import { PlaybackControls } from '@/components/video';

<PlaybackControls videoRef={videoRef} />
```

## Hooks

### useTheatreMode

Manages theatre mode state and controls.

```tsx
import { useTheatreMode } from '@/hooks';

const {
  isTheatreMode,
  isFullscreen,
  isPictureInPicture,
  containerRef,
  videoRef,
  toggleTheatreMode,
  toggleFullscreen,
  togglePictureInPicture,
  exitTheatreMode,
} = useTheatreMode();
```

### useQualityPreference

Persists user's quality preference.

```tsx
import { useQualityPreference } from '@/hooks';

const { quality, setQuality } = useQualityPreference();
```

### useKeyboardControls

Adds keyboard shortcuts to video player.

```tsx
import { useKeyboardControls } from '@/hooks';

useKeyboardControls({
  onPlayPause: () => togglePlay(),
  onMute: () => toggleMute(),
  onFullscreen: () => toggleFullscreen(),
  onTheatreMode: () => toggleTheatreMode(),
  onPictureInPicture: () => togglePiP(),
}, enabled);
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Play/Pause |
| **M** | Mute/Unmute |
| **F** | Fullscreen |
| **T** | Theatre Mode |
| **P** | Picture-in-Picture |

## Adaptive Bitrate Algorithm

The `AdaptiveBitrateSelector` class implements a conservative approach to quality selection:

```typescript
import { AdaptiveBitrateSelector } from '@/lib/adaptive-bitrate';

const selector = new AdaptiveBitrateSelector();
const quality = selector.selectQuality(bandwidth, bufferHealth);
```

**Quality Thresholds:**

| Quality | Bandwidth Required | Buffer Health Required |
|---------|-------------------|----------------------|
| **4K** | > 25 Mbps | > 80% |
| **2K** | > 15 Mbps | > 75% |
| **1080p** | > 10 Mbps | > 70% |
| **720p** | > 5 Mbps | > 60% |
| **480p** | > 2 Mbps | Any |

The algorithm:
1. Maintains a history of the last 10 bandwidth measurements
2. Calculates moving average for smooth quality transitions
3. Considers both bandwidth and buffer health
4. Prevents aggressive upscaling that could cause buffering

## Backend Requirements

### HLS Master Playlist

The backend needs to serve HLS master playlists at `/api/video/{clipId}/master.m3u8`:

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=25000000,RESOLUTION=3840x2160,CODECS="hvc1.1.6.L153.B0"
output_4k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=15000000,RESOLUTION=2560x1440,CODECS="avc1.640028"
output_2k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=10000000,RESOLUTION=1920x1080,CODECS="avc1.640028"
output_1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1280x720,CODECS="avc1.4d401f"
output_720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=854x480,CODECS="avc1.42001e"
output_480p.m3u8
```

### Video Encoding

Videos should be encoded at multiple quality levels using FFmpeg:

```bash
# 480p - 2 Mbps
ffmpeg -i input.mp4 -c:v h264 -b:v 2M -s 854x480 -c:a aac -b:a 128k output_480p.m3u8

# 720p - 5 Mbps
ffmpeg -i input.mp4 -c:v h264 -b:v 5M -s 1280x720 -c:a aac -b:a 192k output_720p.m3u8

# 1080p - 10 Mbps
ffmpeg -i input.mp4 -c:v h264 -b:v 10M -s 1920x1080 -c:a aac -b:a 256k output_1080p.m3u8

# 2K - 15 Mbps
ffmpeg -i input.mp4 -c:v h264 -b:v 15M -s 2560x1440 -c:a aac -b:a 256k output_2k.m3u8

# 4K - 25 Mbps
ffmpeg -i input.mp4 -c:v h265 -b:v 25M -s 3840x2160 -c:a aac -b:a 320k output_4k.m3u8
```

## Integration with Existing VideoPlayer

To integrate theatre mode with the existing Twitch embed player:

```tsx
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { TheatreMode } from '@/components/video/TheatreMode';

function ClipDetail({ clip }) {
  // Check if HLS is available for this clip
  const hasHls = clip.hls_url !== null;

  return (
    <div>
      {hasHls ? (
        <TheatreMode
          title={clip.title}
          hlsUrl={clip.hls_url}
        />
      ) : (
        <VideoPlayer
          clipId={clip.id}
          title={clip.title}
          embedUrl={clip.embed_url}
          twitchClipUrl={clip.twitch_clip_url}
        />
      )}
    </div>
  );
}
```

## Browser Support

- **Chrome/Edge**: Full support including HLS.js
- **Firefox**: Full support including HLS.js
- **Safari**: Native HLS support (no HLS.js needed)
- **Mobile**: Full support on iOS and Android

## Performance Considerations

1. **Initial Load Time**: Theatre mode loads in < 2s with proper CDN configuration
2. **Bandwidth Detection**: Network speed detected within 1s of playback start
3. **Quality Switching**: Smooth transitions without playback interruption
4. **Memory Management**: HLS.js properly destroyed on unmount

## Testing

Run the test suite:

```bash
npm test -- src/lib/adaptive-bitrate.test.ts
npm test -- src/hooks/useQualityPreference.test.ts
```

## Future Enhancements

- [ ] Subtitle/caption support
- [ ] Custom themes (light/dark)
- [ ] Stream playback (Twitch VOD integration)
- [ ] Recording and sharing theatre sessions
- [ ] Advanced analytics (watch time, quality distribution)
- [ ] Multi-audio track support
- [ ] Thumbnail preview on seek

## Troubleshooting

### HLS Not Loading

1. Check that the HLS endpoint is accessible
2. Verify CORS headers are properly set
3. Check browser console for network errors
4. Ensure video segments are available

### Quality Not Switching

1. Verify auto quality is enabled
2. Check network bandwidth calculations
3. Ensure buffer health is being updated
4. Review adaptive bitrate logs

### Keyboard Shortcuts Not Working

1. Check that shortcuts are enabled
2. Verify user is not in an input field
3. Ensure event listeners are properly attached
4. Check for conflicting keyboard handlers

## Support

For issues or questions, please refer to:
- Component source code: `frontend/src/components/video/`
- Tests: `frontend/src/lib/adaptive-bitrate.test.ts`
- Hooks: `frontend/src/hooks/`
