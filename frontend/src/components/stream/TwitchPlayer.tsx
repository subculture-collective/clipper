import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStreamStatus } from '../../lib/stream-api';
import { StreamOfflineScreen } from './StreamOfflineScreen';
import { LiveIndicator } from './LiveIndicator';

// Declare Twitch type for the embed SDK
declare global {
  interface Window {
    Twitch?: {
      Embed: new (elementId: string, options: TwitchEmbedOptions) => TwitchEmbed;
    };
  }
}

interface TwitchEmbedOptions {
  width: string | number;
  height: string | number;
  channel: string;
  layout: 'video' | 'video-with-chat';
  autoplay: boolean;
  muted: boolean;
  parent?: string[];
}

interface TwitchEmbed {
  destroy: () => void;
}

interface TwitchPlayerProps {
  channel: string;
  showChat?: boolean;
}

export function TwitchPlayer({ channel, showChat = false }: TwitchPlayerProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);
  const embedInstanceRef = useRef<TwitchEmbed | null>(null);

  // Fetch stream status with auto-refresh every 60 seconds
  const {
    data: streamInfo,
    isLoading,
    error
  } = useQuery({
    queryKey: ['streamStatus', channel],
    queryFn: () => fetchStreamStatus(channel),
    refetchInterval: 60000, // Refresh every 60 seconds
    retry: 2,
  });

  // Load Twitch Embed SDK script
  useEffect(() => {
    if (window.Twitch) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://embed.twitch.tv/embed/v1.js';
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Twitch Embed SDK');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize Twitch Embed when script loads and stream is live
  useEffect(() => {
    if (!isScriptLoaded || !streamInfo?.is_live || !embedRef.current || !window.Twitch) {
      return;
    }

    // Destroy existing embed if it exists
    if (embedInstanceRef.current) {
      embedInstanceRef.current.destroy();
      embedInstanceRef.current = null;
    }

    // Get the parent domain for embed security
    const parentDomain = window.location.hostname;

    // Create new embed
    try {
      const embed = new window.Twitch.Embed(embedRef.current.id, {
        width: '100%',
        height: '100%',
        channel: channel,
        layout: showChat ? 'video-with-chat' : 'video',
        autoplay: true,
        muted: false,
        parent: [parentDomain],
      });
      embedInstanceRef.current = embed;
    } catch (error) {
      console.error('Failed to initialize Twitch Embed:', error);
    }

    return () => {
      if (embedInstanceRef.current) {
        embedInstanceRef.current.destroy();
        embedInstanceRef.current = null;
      }
    };
  }, [channel, showChat, isScriptLoaded, streamInfo?.is_live]);

  if (isLoading) {
    return (
      <div className="w-full aspect-video bg-gray-900 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-400">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full aspect-video bg-gray-900 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-xl mb-2">⚠️</p>
          <p>Failed to load stream information</p>
        </div>
      </div>
    );
  }

  if (!streamInfo?.is_live) {
    return <StreamOfflineScreen channel={channel} streamInfo={streamInfo} />;
  }

  return (
    <div className="relative w-full aspect-video bg-black">
      <div
        id={`twitch-embed-${channel}`}
        ref={embedRef}
        className="w-full h-full"
      />
      <LiveIndicator viewerCount={streamInfo.viewer_count} />
    </div>
  );
}
