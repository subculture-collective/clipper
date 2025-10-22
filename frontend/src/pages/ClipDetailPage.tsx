import { useParams } from 'react-router-dom';
import { Container, Spinner } from '../components';
import { useClipById } from '../hooks';

export function ClipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: clip, isLoading, error } = useClipById(id || '');

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-error-600 mb-4">
            Error Loading Clip
          </h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </Container>
    );
  }

  if (!clip) {
    return (
      <Container className="py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Clip Not Found</h2>
          <p className="text-muted-foreground">
            The clip you're looking for doesn't exist.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="max-w-4xl mx-auto">
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
            sandbox="allow-scripts"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            aria-label={`Upvote, ${clip.vote_score} votes`}
          >
            Upvote ({clip.vote_score})
          </button>
          <button
            className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            aria-label={`Comment, ${clip.comment_count} comments`}
          >
            Comment ({clip.comment_count})
          </button>
          <button
            className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            aria-label={`Favorite, ${clip.favorite_count} favorites`}
          >
            Favorite ({clip.favorite_count})
          </button>
        </div>

        {clip.game_name && (
          <div className="mb-4">
            <span className="text-sm text-muted-foreground">Game: </span>
            <span className="font-semibold">{clip.game_name}</span>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
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

        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-xl font-bold mb-4">Comments</h3>
          <p className="text-muted-foreground">Comments coming soon...</p>
        </div>
      </div>
    </Container>
  );
}
