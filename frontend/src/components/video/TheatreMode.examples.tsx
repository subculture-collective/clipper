/**
 * Theatre Mode Example Usage
 * 
 * This file demonstrates how to integrate the Theatre Mode player
 * with HLS video streaming.
 */

import { TheatreMode } from '@/components/video';

/**
 * Example 1: Basic usage with HLS URL
 */
export function BasicTheatreModeExample() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Basic Theatre Mode</h1>
      <TheatreMode
        
        title="Example Gaming Clip - Epic Moment"
        hlsUrl="/api/video/example-clip-1/master.m3u8"
      />
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        Try keyboard shortcuts: T (theatre), F (fullscreen), Space (play/pause), M (mute), P (picture-in-picture)
      </p>
    </div>
  );
}

/**
 * Example 2: Fallback when HLS is not available
 */
export function TheatreModeFallbackExample() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Theatre Mode (No HLS)</h1>
      <TheatreMode
        
        title="Example Clip Without HLS"
        // No hlsUrl provided - shows fallback message
      />
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        When HLS is not available, theatre mode shows a friendly message
      </p>
    </div>
  );
}

/**
 * Example 3: Using theatre mode in a clip detail page
 */
export function ClipDetailWithTheatreModeExample() {
  // This would typically come from API/props
  const clip = {
    id: 'example-clip-3',
    title: 'Incredible Speedrun World Record',
    hlsUrl: '/api/video/example-clip-3/master.m3u8',
    creatorName: 'ProGamer123',
    viewCount: 1234567,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Theatre Mode Player */}
      <div className="bg-black">
        <TheatreMode
          
          title={clip.title}
          hlsUrl={clip.hlsUrl}
        />
      </div>

      {/* Clip Details */}
      <div className="container mx-auto py-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              {clip.title}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              <span>By {clip.creatorName}</span>
              <span>•</span>
              <span>{clip.viewCount.toLocaleString()} views</span>
              <span>•</span>
              <span>{new Date(clip.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <h2>About This Clip</h2>
            <p>
              This is an example of how to integrate the Theatre Mode player into a clip detail page.
              The player provides an immersive viewing experience with adaptive quality selection.
            </p>
            <h3>Features</h3>
            <ul>
              <li>Adaptive bitrate streaming - automatically adjusts quality based on your connection</li>
              <li>Manual quality selection - choose from 480p to 4K</li>
              <li>Theatre mode - fills your screen for distraction-free viewing</li>
              <li>Keyboard shortcuts - quick access to common controls</li>
              <li>Picture-in-picture - keep watching while browsing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 4: Conditional rendering based on HLS availability
 */
export function ConditionalTheatreModeExample() {
  // In a real app, this would come from your API
  const clips = [
    {
      id: 'clip-with-hls',
      title: 'Clip with HLS Support',
      hasHls: true,
      hlsUrl: '/api/video/clip-with-hls/master.m3u8',
    },
    {
      id: 'clip-without-hls',
      title: 'Clip without HLS Support',
      hasHls: false,
    },
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold">Conditional Theatre Mode Rendering</h1>
      
      {clips.map((clip) => (
        <div key={clip.id} className="space-y-2">
          <h2 className="text-xl font-semibold">{clip.title}</h2>
          {clip.hasHls ? (
            <TheatreMode
              
              title={clip.title}
              hlsUrl={clip.hlsUrl}
            />
          ) : (
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-8 text-center">
              <p className="text-neutral-600 dark:text-neutral-400">
                Theatre mode not available for this clip
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Example 5: Custom styling and integration
 */
export function CustomStyledTheatreModeExample() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
          <TheatreMode
            
            title="Custom Styled Theatre Mode Example"
            hlsUrl="/api/video/custom-styled-clip/master.m3u8"
            className="rounded-2xl"
          />
        </div>
        <div className="mt-6 text-center">
          <p className="text-white text-lg">
            Theatre Mode can be styled to match your application's design
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 6: Integration with existing VideoPlayer (migration pattern)
 */
export function MigrationPatternExample() {
  // Simulated clip data
  const clip = {
    id: 'migration-example',
    title: 'Gradual Migration Example',
    // This would be populated by your backend when HLS is ready
    hlsUrl: null as string | null,
    // Existing Twitch embed data
    embedUrl: 'https://clips.twitch.tv/embed?clip=example',
    twitchClipUrl: 'https://clips.twitch.tv/example',
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Migration Pattern</h1>
      
      {/* Use Theatre Mode if HLS is available, otherwise fall back to Twitch embed */}
      {clip.hlsUrl ? (
        <TheatreMode
          
          title={clip.title}
          hlsUrl={clip.hlsUrl}
        />
      ) : (
        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
          <p className="text-center text-neutral-600 dark:text-neutral-400 mb-4">
            Using Twitch embed (HLS processing pending)
          </p>
          {/* Your existing VideoPlayer component would go here */}
          <div className="aspect-video bg-black rounded flex items-center justify-center text-white">
            Twitch Embed Player
          </div>
        </div>
      )}
      
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded">
        <h3 className="font-semibold mb-2">Migration Strategy:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Check if clip has HLS URL available</li>
          <li>If yes, use Theatre Mode for enhanced experience</li>
          <li>If no, fall back to existing Twitch embed</li>
          <li>Gradually encode clips to HLS in the background</li>
          <li>Users automatically get upgraded experience when ready</li>
        </ol>
      </div>
    </div>
  );
}
