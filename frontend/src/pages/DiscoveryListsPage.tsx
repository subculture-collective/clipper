import { Container, SEO } from '../components';
import { PlaylistCard } from '../components/playlist/PlaylistCard';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/api';
import { Button } from '../components/ui';
import { useState } from 'react';
import type { PlaylistWithClips } from '../types/playlist';

export function DiscoveryListsPage() {
  const [offset, setOffset] = useState(0);
  const pageSize = 12;

  // Fetch featured/curated playlists (formerly discovery lists)
  const { data: response, isLoading } = useQuery({
    queryKey: ['playlists', 'curated', offset],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: PlaylistWithClips[];
        meta: {
          total: number;
          page: number;
          limit: number;
        };
      }>(`/playlists?curated=true&featured=true&limit=${pageSize}&offset=${offset}`);
      return res.data;
    },
  });

  const lists = response?.data || [];

  return (
    <>
      <SEO
        title="Discovery Lists"
        description="Browse curated collections of amazing Twitch clips. Find new content organized by theme, game, and community favorites."
        canonicalUrl="/discover/lists"
      />
      <Container className="py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Discovery Lists
            </h1>
            <p className="text-muted-foreground">
              Explore curated collections of the best Twitch clips
            </p>
          </div>

          {/* Lists Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-80 bg-accent rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : lists && lists.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {lists.map((list) => (
                  <PlaylistCard key={list.id} playlist={list} />
                ))}
              </div>

              {/* Load More Button */}
              {lists.length === pageSize && (
                <div className="text-center pt-8">
                  <Button
                    onClick={() => setOffset((o) => o + pageSize)}
                    variant="outline"
                    size="lg"
                  >
                    Load More Lists
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <h2 className="text-xl font-semibold mb-2">
                No Discovery Lists Yet
              </h2>
              <p className="text-muted-foreground">
                Check back soon for curated collections of clips
              </p>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
