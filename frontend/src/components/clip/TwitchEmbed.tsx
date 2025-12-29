// TWITCH COMPLIANCE:
// This component embeds Twitch clips using ONLY official Twitch embed URLs.
// See: https://dev.twitch.tv/docs/embed/video-and-clips/
// See: https://legal.twitch.com/legal/developer-agreement/
// See: docs/compliance/twitch-embeds.md for full compliance documentation
//
// COMPLIANCE REQUIREMENTS:
// - Uses official clips.twitch.tv/embed URL only (no custom players)
// - Includes 'parent' parameter with actual domain (required by Twitch)
// - HTTPS only (required by Twitch)
// - No re-hosting, proxying, or downloading of video files
// - No stripping of Twitch branding or attribution
// - Respects creator's right to delete clips (graceful error handling)

import { useState } from 'react';
import { useVolumePreference } from '@/hooks';
import { MutedIcon } from '@/components/ui';

interface TwitchEmbedProps {
  clipId: string;
  autoplay?: boolean;
  muted?: boolean;
  thumbnailUrl?: string;
  title?: string;
}

export function TwitchEmbed({ 
  clipId, 
  autoplay = false, 
  muted = true,
  thumbnailUrl,
  title = 'Twitch Clip'
}: TwitchEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(autoplay);
  const [hasError, setHasError] = useState(false);
  const { embedMuted: volumePreferredMuted, hasSetPreference, setUnmutedPreference } = useVolumePreference();

  // COMPLIANCE: Get the actual parent domain for Twitch embed
  // Twitch requires the 'parent' parameter to match the actual domain hosting the embed
  // This is a security measure to prevent unauthorized embedding
  // See: https://dev.twitch.tv/docs/embed/video-and-clips/#embedded-experiences
  const parentDomain = typeof window !== 'undefined' 
    ? window.location.hostname 
    : 'localhost';

  // Determine mute state for embed:
  // - Before loaded (thumbnail shown): use the prop default (typically muted=true)
  // - After loaded (iframe shown): use user's volume preference from localStorage
  // This ensures the iframe URL is generated with the correct mute parameter
  const embedMuted = isLoaded ? volumePreferredMuted : muted;

  // COMPLIANCE: Official Twitch embed URL only
  // MUST use https://clips.twitch.tv/embed (no custom players, no video re-hosting)
  // Per Twitch Developer Agreement, we MUST NOT:
  // - Re-host or proxy video files
  // - Use unofficial embed methods
  // - Strip Twitch branding or attribution
  // - Download or cache video content
  const embedUrl = `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parentDomain}&autoplay=${isLoaded ? 'true' : 'false'}&muted=${embedMuted}`;

  const handleLoadClick = () => {
    setIsLoaded(true);
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
          onClick={setUnmutedPreference}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setUnmutedPreference();
            }
          }}
          aria-label="Video is muted, click to enable sound on future videos"
          title="Video starts muted for autoplay compatibility. Click to enable sound on future videos. (Reload this clip to hear it)"
        >
          <MutedIcon size="sm" />
          <span>Muted</span>
        </div>
      )}
    </div>
  );
}
