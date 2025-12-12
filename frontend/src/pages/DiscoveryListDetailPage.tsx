import { useParams, Link } from 'react-router-dom';
import { Container, SEO } from '../components';
import { ClipCard } from '../components/clip';
import { Button } from '../components/ui';
import {
  useDiscoveryList,
  useDiscoveryListClips,
  useFollowDiscoveryList,
  useUnfollowDiscoveryList,
  useBookmarkDiscoveryList,
  useUnbookmarkDiscoveryList,
} from '../hooks/useDiscoveryLists';
import { useIsAuthenticated, useToast } from '../hooks';
import { Users, ChevronLeft, Bookmark, Bell, BellOff } from 'lucide-react';
import { useState } from 'react';

export function DiscoveryListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isAuthenticated = useIsAuthenticated();
  const toast = useToast();
  const [offset, setOffset] = useState(0);
  const pageSize = 20;

  const { data: list, isLoading: listLoading } = useDiscoveryList(id || '');
  const { data: clipsData, isLoading: clipsLoading } = useDiscoveryListClips(
    id || '',
    { limit: pageSize, offset }
  );

  const followMutation = useFollowDiscoveryList();
  const unfollowMutation = useUnfollowDiscoveryList();
  const bookmarkMutation = useBookmarkDiscoveryList();
  const unbookmarkMutation = useUnbookmarkDiscoveryList();

  const handleFollow = () => {
    if (!isAuthenticated) {
      toast.info('Please log in to follow lists');
      return;
    }
    if (!list) return;

    if (list.is_following) {
      unfollowMutation.mutate(list.id, {
        onSuccess: () => toast.success('Unfollowed list'),
        onError: () => toast.error('Failed to unfollow list'),
      });
    } else {
      followMutation.mutate(list.id, {
        onSuccess: () => toast.success('Following list'),
        onError: () => toast.error('Failed to follow list'),
      });
    }
  };

  const handleBookmark = () => {
    if (!isAuthenticated) {
      toast.info('Please log in to bookmark lists');
      return;
    }
    if (!list) return;

    if (list.is_bookmarked) {
      unbookmarkMutation.mutate(list.id, {
        onSuccess: () => toast.success('Removed bookmark'),
        onError: () => toast.error('Failed to remove bookmark'),
      });
    } else {
      bookmarkMutation.mutate(list.id, {
        onSuccess: () => toast.success('Bookmarked list'),
        onError: () => toast.error('Failed to bookmark list'),
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (listLoading) {
    return (
      <Container className="py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-accent rounded w-1/3 mb-4" />
            <div className="h-4 bg-accent rounded w-2/3 mb-8" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-accent rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </Container>
    );
  }

  if (!list) {
    return (
      <Container className="py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">List Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The discovery list you're looking for doesn't exist.
          </p>
          <Link to="/discover/lists">
            <Button>Browse All Lists</Button>
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <>
      <SEO
        title={list.name}
        description={list.description || `Discover amazing clips in ${list.name}`}
        canonicalUrl={`/discover/lists/${list.slug}`}
      />
      <Container className="py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            to="/discover/lists"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Lists</span>
          </Link>

          {/* List Header */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {list.name}
                </h1>
                {list.description && (
                  <p className="text-muted-foreground">{list.description}</p>
                )}
              </div>
              {list.is_featured && (
                <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-primary-500/10 text-primary-500 border border-primary-500/20 shrink-0">
                  Featured
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
                <span className="font-medium text-foreground">
                  {formatNumber(list.clip_count)}
                </span>
                <span>clips</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium text-foreground">
                  {formatNumber(list.follower_count)}
                </span>
                <span>followers</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleFollow}
                variant={list.is_following ? 'outline' : 'primary'}
                size="sm"
                disabled={
                  followMutation.isPending || unfollowMutation.isPending
                }
              >
                {list.is_following ? (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
              <Button
                onClick={handleBookmark}
                variant="outline"
                size="sm"
                disabled={
                  bookmarkMutation.isPending || unbookmarkMutation.isPending
                }
              >
                <Bookmark
                  className={`w-4 h-4 mr-2 ${
                    list.is_bookmarked ? 'fill-current text-primary-500' : ''
                  }`}
                />
                {list.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
              </Button>
            </div>
          </div>

          {/* Clips Grid */}
          {clipsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-accent rounded-xl animate-pulse" />
              ))}
            </div>
          ) : clipsData && clipsData.clips && clipsData.clips.length > 0 ? (
            <div className="space-y-4">
              {clipsData.clips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}

              {/* Load More Button */}
              {clipsData.has_more && (
                <div className="text-center pt-4">
                  <Button
                    onClick={() => setOffset((o) => o + pageSize)}
                    variant="outline"
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <p className="text-muted-foreground">No clips in this list yet.</p>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
