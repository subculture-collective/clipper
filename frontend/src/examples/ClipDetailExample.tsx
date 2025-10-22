/**
 * Example component demonstrating correct usage of useClipById
 * This shows how the hook should be used in a real component
 */

import { useClipById } from '@/hooks';
import { Spinner } from '@/components/ui';

interface ClipDetailExampleProps {
  clipId: string;
}

/**
 * Example component showing useClipById usage
 * 
 * This demonstrates that:
 * 1. The hook returns a single Clip object, not paginated data
 * 2. Standard useQuery properties are available (isLoading, error, refetch)
 * 3. No pagination-related properties (fetchNextPage, hasNextPage) exist
 */
export function ClipDetailExample({ clipId }: ClipDetailExampleProps) {
  // Using the hook - notice the simple destructuring of data as a single clip
  const { data: clip, isLoading, error, refetch } = useClipById(clipId);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-error-600 mb-4">
          Error Loading Clip
        </h2>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Handle not found state
  if (!clip) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Clip Not Found</h2>
        <p className="text-muted-foreground">
          The clip you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  // Render clip details
  // Notice: clip is a single object, not clip.pages[0] or similar
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{clip.title}</h1>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>By {clip.creator_name}</span>
          <span>•</span>
          <span>{clip.view_count.toLocaleString()} views</span>
          <span>•</span>
          <span>{clip.vote_score} votes</span>
        </div>
      </div>

      <div className="aspect-video bg-black rounded-lg mb-6">
        <iframe
          src={clip.embed_url}
          title={clip.title}
          className="w-full h-full rounded-lg"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      <div className="flex gap-4 mb-6">
        <button className="px-4 py-2 bg-primary-500 text-white rounded-md">
          Upvote ({clip.vote_score})
        </button>
        <button className="px-4 py-2 border border-border rounded-md">
          Comment ({clip.comment_count})
        </button>
        <button className="px-4 py-2 border border-border rounded-md">
          Favorite ({clip.favorite_count})
        </button>
      </div>

      {clip.game_name && (
        <div className="mb-4">
          <span className="text-sm text-muted-foreground">Game: </span>
          <span className="font-semibold">{clip.game_name}</span>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>Broadcaster: {clip.broadcaster_name}</p>
        <p>
          Created:{' '}
          {new Date(clip.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}

/**
 * Comparison: How this would look with useInfiniteQuery (incorrect)
 * 
 * const { data, isLoading, error } = useClipById(clipId);
 * const clip = data?.pages[0]; // ❌ Awkward - why would a single clip be in "pages"?
 * 
 * vs. with useQuery (correct)
 * 
 * const { data: clip, isLoading, error } = useClipById(clipId);
 * // ✅ Direct access to the clip, no pages structure
 */
