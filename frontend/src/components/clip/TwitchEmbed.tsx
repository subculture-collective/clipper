import { useState, useEffect } from 'react';

interface TwitchEmbedProps {
  clipId: string;
  autoplay?: boolean;
  muted?: boolean;
  thumbnailUrl?: string;
  title?: string;
}

// Volume preference key for localStorage
const VOLUME_PREF_KEY = 'clipper_video_muted';

export function TwitchEmbed({ 
  clipId, 
  autoplay = false, 
  muted = true,
  thumbnailUrl,
  title = 'Twitch Clip'
}: TwitchEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(autoplay);
  const [hasError, setHasError] = useState(false);
  const [hasSetPreference, setHasSetPreference] = useState(() => {
    // Check if user has ever set a preference
    if (typeof window !== 'undefined') {
      return localStorage.getItem(VOLUME_PREF_KEY) !== null;
    }
    return false;
  });
  const [userPrefersUnmuted, setUserPrefersUnmuted] = useState(() => {
    // Check localStorage for user's volume preference
    // Default to false (start muted first time for compatibility)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VOLUME_PREF_KEY);
      return stored === 'false'; // stored 'false' means user wants unmuted
    }
    return false;
  });

  // Get the parent domain for Twitch embed
  const parentDomain = typeof window !== 'undefined' 
    ? window.location.hostname 
    : 'localhost';

  // Determine mute state for embed:
  // - If not loaded yet, use the prop default
  // - If loaded and user hasn't set preference, start muted for autoplay
  // - If loaded and user prefers unmuted, try unmuted (browser may still block)
  const embedMuted = isLoaded ? !userPrefersUnmuted : muted;
  const embedUrl = `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parentDomain}&autoplay=${isLoaded ? 'true' : 'false'}&muted=${embedMuted}`;

  // Store volume preference when user changes it
  useEffect(() => {
    if (typeof window !== 'undefined' && hasSetPreference) {
      // Store as 'true' if muted, 'false' if unmuted
      localStorage.setItem(VOLUME_PREF_KEY, (!userPrefersUnmuted).toString());
    }
  }, [userPrefersUnmuted, hasSetPreference]);

  const handleLoadClick = () => {
    setIsLoaded(true);
  };

  const handleUnmutePreference = () => {
    setUserPrefersUnmuted(true);
    setHasSetPreference(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="relative w-full pt-[56.25%] bg-neutral-900 rounded-lg flex items-center justify-center">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-center">This clip is no longer available</p>
          <a 
            href={`https://clips.twitch.tv/${clipId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-primary-400 hover:text-primary-300 text-sm underline"
          >
            Try viewing on Twitch
          </a>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div 
        className="relative w-full pt-[56.25%] bg-black rounded-lg cursor-pointer group overflow-hidden"
        onClick={handleLoadClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLoadClick();
          }
        }}
        aria-label="Load and play video"
      >
        {/* Thumbnail */}
        {thumbnailUrl && (
          <img 
            src={thumbnailUrl} 
            alt={title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
            width="1920"
            height="1080"
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
          {/* Play button */}
          <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Watch label */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Click to play
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full pt-[56.25%] bg-black rounded-lg overflow-hidden">
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        title={title}
        onError={handleError}
        allow="autoplay; fullscreen"
      />
      
      {/* Muted indicator - shown when video is muted and user hasn't set a preference yet */}
      {embedMuted && !hasSetPreference && (
        <div 
          className="absolute top-3 left-3 bg-black/70 hover:bg-black/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors z-10"
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
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
          <span>Muted</span>
        </div>
      )}
    </div>
  );
}
