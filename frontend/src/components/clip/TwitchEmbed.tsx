import { useState } from 'react';

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

  // Get the parent domain for Twitch embed
  const parentDomain = typeof window !== 'undefined' 
    ? window.location.hostname 
    : 'localhost';

  const embedUrl = `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parentDomain}&autoplay=${autoplay}&muted=${muted}`;

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
          Watch Clip
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
      />
    </div>
  );
}
