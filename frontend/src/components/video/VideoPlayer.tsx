import { useEffect, useRef, useState } from 'react';
import { useVolumePreference } from '@/hooks';
import { MutedIcon } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface VideoPlayerProps {
  clipId: string;
  title: string;
  embedUrl: string;
  twitchClipUrl: string;
}

export function VideoPlayer({
  title,
  embedUrl,
  twitchClipUrl,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const [showMutedIndicator, setShowMutedIndicator] = useState(true);
  const { embedMuted, hasSetPreference, setUnmutedPreference } = useVolumePreference();

  // Auto-hide muted indicator after 3 seconds
  useEffect(() => {
    if (!embedMuted || hasSetPreference) {
      return;
    }

    const timer = setTimeout(() => {
      setShowMutedIndicator(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [embedMuted, hasSetPreference]);

  // Get parent domain for Twitch embed
  const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  // Enable autoplay on detail pages with user's volume preference
  const twitchEmbedUrl = `${embedUrl}&parent=${parentDomain}&autoplay=true&muted=${embedMuted}`;

  return (
    <div
      ref={videoRef}
      className="relative w-full pt-[56.25%] bg-black rounded-lg overflow-hidden"
    >
      {/* COMPLIANCE: Official Twitch Embed Only
          Per Twitch TOS, we must not overlay custom controls on the embed.
          Twitch provides its own controls - we should not modify or cover them.
          See: docs/compliance/twitch-embeds.md

          This implements the minimal approach: just the embed + optional muted indicator.
      */}
      <iframe
        src={twitchEmbedUrl}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        title={title}
        allow="autoplay; fullscreen"
      />

      {/* Muted indicator - shown when video is muted and user hasn't set a preference yet
          This is the only overlay allowed per Twitch TOS - minimal and fades quickly
      */}
      {embedMuted && !hasSetPreference && showMutedIndicator && (
        <div
          className={cn(
            'absolute top-3 left-3 bg-black/70 hover:bg-black/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-opacity duration-500 pointer-events-auto z-10',
            showMutedIndicator ? 'opacity-100' : 'opacity-0'
          )}
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
          title="Video starts muted for autoplay compatibility. Click to enable sound on future videos."
        >
          <MutedIcon size="sm" />
          <span>Muted</span>
        </div>
      )}
    </div>
  );
}
