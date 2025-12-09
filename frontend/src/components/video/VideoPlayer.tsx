import { useEffect, useRef, useState, useCallback } from 'react';
import { useShare } from '@/hooks';

export interface VideoPlayerProps {
  clipId: string;
  title: string;
  embedUrl: string;
  twitchClipUrl: string;
}

// Volume preference key for localStorage
const VOLUME_PREF_KEY = 'clipper_video_muted';

export function VideoPlayer({
  title,
  embedUrl,
  twitchClipUrl,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const { share } = useShare();
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userPrefersUnmuted, setUserPrefersUnmuted] = useState(() => {
    // Check localStorage for user's volume preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VOLUME_PREF_KEY);
      return stored === 'false'; // stored 'false' means user wants unmuted
    }
    return false;
  });

  const handleShare = useCallback(async () => {
    await share({
      title,
      text: `Check out this clip: ${title}`,
      url: window.location.href,
    });
  }, [title, share]);

  const handleFullscreen = useCallback(() => {
    const container = videoRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Touch handling for showing/hiding controls on mobile
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const showControlsTemporarily = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const container = videoRef.current;
    if (container) {
      container.addEventListener('touchstart', showControlsTemporarily);
      container.addEventListener('mousemove', showControlsTemporarily);
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', showControlsTemporarily);
        container.removeEventListener('mousemove', showControlsTemporarily);
      }
      clearTimeout(timeout);
    };
  }, []);

  // Store volume preference when user changes it
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VOLUME_PREF_KEY, (!userPrefersUnmuted).toString());
    }
  }, [userPrefersUnmuted]);

  const handleUnmutePreference = useCallback(() => {
    setUserPrefersUnmuted(true);
  }, []);

  // Get parent domain for Twitch embed
  const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  // Enable autoplay on detail pages with user's volume preference
  // Start muted if user hasn't set preference, unmuted if they have
  const embedMuted = !userPrefersUnmuted;
  const twitchEmbedUrl = `${embedUrl}&parent=${parentDomain}&autoplay=true&muted=${embedMuted}`;

  return (
    <div
      ref={videoRef}
      className="relative w-full pt-[56.25%] bg-black rounded-lg overflow-hidden group"
    >
      {/* Video Container */}
      <div className="absolute inset-0">
        <iframe
          src={twitchEmbedUrl}
          className="w-full h-full"
          allowFullScreen
          title={title}
          allow="autoplay; fullscreen"
        />
      </div>

      {/* Custom Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {/* Top Bar - Title and Actions */}
        <div className="absolute top-0 left-0 right-0 p-3 md:p-4 flex items-start justify-between pointer-events-auto">
          <h2 className="text-white text-xs xs:text-sm md:text-base font-semibold line-clamp-2 flex-1 mr-2 md:mr-4">
            {title}
          </h2>
          <div className="flex gap-1 md:gap-2">
            <button
              onClick={handleShare}
              className="p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Share clip"
              title="Share clip"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              onClick={handleFullscreen}
              className="p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isFullscreen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 space-y-2 pointer-events-auto">
          {/* Control Buttons */}
          <div className="flex items-center justify-end">
            <a
              href={twitchClipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-white/20 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Watch on Twitch"
              title="Watch on Twitch"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Muted indicator - shown when video is muted and user hasn't set unmute preference */}
      {embedMuted && !userPrefersUnmuted && (
        <div 
          className="absolute top-16 md:top-20 left-4 bg-black/70 hover:bg-black/90 text-white px-3 py-2 rounded text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors z-10 pointer-events-auto"
          onClick={handleUnmutePreference}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleUnmutePreference();
            }
          }}
          aria-label="Video is muted, click to enable sound on future videos"
          title="Video starts muted for autoplay compatibility. Click to enable sound on future videos. (Reload this clip to hear it)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
          <span>Video is muted - Click to enable sound</span>
        </div>
      )}

      {/* Info Note */}
      <div className="absolute bottom-16 md:bottom-20 left-4 right-4 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white/70 text-xs bg-black/50 rounded px-3 py-1 inline-block">
          Playback controls managed by Twitch
        </p>
      </div>
    </div>
  );
}
