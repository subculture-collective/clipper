import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../components';
import { SearchBar } from '../components/search';
import { ClipCard } from '../components/clip';
import { Spinner } from '../components/ui';
import { searchApi } from '../lib/search-api';
import type { SearchResponse } from '../types/search';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || 'all';
  const sortParam = searchParams.get('sort') || 'relevance';
  const [activeTab, setActiveTab] = useState<string>(typeParam);

  // Fetch search results
  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ['search', query, activeTab, sortParam],
    queryFn: () => searchApi.search({
      query,
      type: activeTab as any,
      sort: sortParam as any,
      page: 1,
      limit: 20,
    }),
    enabled: query.length > 0,
  });

  // Update tab when type param changes
  useEffect(() => {
    setActiveTab(typeParam);
  }, [typeParam]);

  // Handle tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('type', newTab);
    setSearchParams(newParams);
  };

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', newSort);
    setSearchParams(newParams);
  };

  // Handle search from SearchBar
  const handleSearch = (newQuery: string) => {
    const newParams = new URLSearchParams();
    newParams.set('q', newQuery);
    newParams.set('type', 'all');
    newParams.set('sort', 'relevance');
    setSearchParams(newParams);
  };

  const tabs = [
    { id: 'all', label: 'All', count: (data?.counts.clips || 0) + (data?.counts.creators || 0) + (data?.counts.games || 0) + (data?.counts.tags || 0) },
    { id: 'clips', label: 'Clips', count: data?.counts.clips || 0 },
    { id: 'creators', label: 'Creators', count: data?.counts.creators || 0 },
    { id: 'games', label: 'Games', count: data?.counts.games || 0 },
    { id: 'tags', label: 'Tags', count: data?.counts.tags || 0 },
  ];

  return (
    <Container className="py-8">
      {/* Search Bar */}
      <div className="mb-8 flex justify-center">
        <SearchBar initialQuery={query} onSearch={handleSearch} />
      </div>

      {!query ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-lg">Enter a search query to find clips, games, creators, and tags.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Search Results</h1>
            <p className="text-muted-foreground">
              Found {data?.meta.total_items || 0} results for: <span className="font-semibold">"{query}"</span>
            </p>
          </div>

          {/* Tabs and Sort */}
          <div className="flex items-center justify-between mb-6 border-b border-border">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-2 font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 text-xs bg-accent px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>

            <select
              value={sortParam}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
            >
              <option value="relevance">Relevance</option>
              <option value="recent">Recent</option>
              <option value="popular">Popular</option>
            </select>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center text-destructive py-12">
              <p>Failed to load search results. Please try again.</p>
            </div>
          )}

          {/* Results */}
          {data && !isLoading && (
            <div className="space-y-8">
              {/* Clips */}
              {(activeTab === 'all' || activeTab === 'clips') && data.results.clips && data.results.clips.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold mb-4">
                    Clips {activeTab === 'all' && `(${data.counts.clips})`}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.results.clips.map((clip) => (
                      <ClipCard key={clip.id} clip={clip} />
                    ))}
                  </div>
                </section>
              )}

              {/* Creators */}
              {(activeTab === 'all' || activeTab === 'creators') && data.results.creators && data.results.creators.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold mb-4">
                    Creators {activeTab === 'all' && `(${data.counts.creators})`}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.results.creators.map((creator) => (
                      <div key={creator.id} className="p-4 rounded-lg border border-border hover:border-primary transition-colors">
                        <div className="flex items-center gap-3">
                          {creator.avatar_url && (
                            <img
                              src={creator.avatar_url}
                              alt={creator.display_name}
                              className="w-12 h-12 rounded-full"
                            />
                          )}
                          <div>
                            <h3 className="font-semibold">{creator.display_name}</h3>
                            <p className="text-sm text-muted-foreground">@{creator.username}</p>
                          </div>
                        </div>
                        {creator.bio && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{creator.bio}</p>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          {creator.karma_points} karma
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Games */}
              {(activeTab === 'all' || activeTab === 'games') && data.results.games && data.results.games.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold mb-4">
                    Games {activeTab === 'all' && `(${data.counts.games})`}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.results.games.map((game) => (
                      <div key={game.id} className="p-4 rounded-lg border border-border hover:border-primary transition-colors">
                        <h3 className="font-semibold text-lg">{game.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {game.clip_count} clips
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Tags */}
              {(activeTab === 'all' || activeTab === 'tags') && data.results.tags && data.results.tags.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold mb-4">
                    Tags {activeTab === 'all' && `(${data.counts.tags})`}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {data.results.tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="px-3 py-1.5 rounded-full border border-border hover:border-primary transition-colors"
                        style={tag.color ? { borderColor: tag.color } : undefined}
                      >
                        <span className="font-medium">#{tag.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {tag.usage_count}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Empty State */}
              {data.meta.total_items === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-lg">No results found for "{query}"</p>
                  <p className="text-sm mt-2">Try different keywords or check your spelling</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Container>
  );
}
