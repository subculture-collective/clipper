import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, SEO } from '../components';
import { ClipCard } from '../components/clip';
import { SearchBar, SearchFilters } from '../components/search';
import { Spinner } from '../components/ui';
import { searchApi } from '../lib/search-api';
import type { SearchRequest, SearchResponse, SearchFilters as SearchFiltersType } from '../types/search';

export function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const typeParam = searchParams.get('type') || 'all';
    const sortParam = searchParams.get('sort') || 'relevance';
    const languageParam = searchParams.get('language') || undefined;
    const gameIdParam = searchParams.get('game_id') || undefined;
    const dateFromParam = searchParams.get('date_from') || undefined;
    
    type SearchType = NonNullable<SearchRequest['type']>;
    type SortType = NonNullable<SearchRequest['sort']>;
    const [activeTab, setActiveTab] = useState<SearchType>(
        typeParam as SearchType
    );
    
    const [filters, setFilters] = useState<SearchFiltersType>({
        language: languageParam,
        gameId: gameIdParam,
        dateFrom: dateFromParam,
    });

    // Fetch search results
    const { data, isLoading, error } = useQuery<SearchResponse>({
        queryKey: ['search', query, activeTab, sortParam, filters],
        queryFn: () =>
            searchApi.search({
                query,
                type: activeTab,
                sort: sortParam as SortType,
                page: 1,
                limit: 20,
                language: filters.language,
                gameId: filters.gameId,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                minVotes: filters.minVotes,
                tags: filters.tags,
            }),
        enabled: query.length > 0,
    });

    // Update tab when type param changes
    useEffect(() => {
        setActiveTab(typeParam as SearchType);
    }, [typeParam]);
    
    // Update filters from URL params
    useEffect(() => {
        setFilters({
            language: languageParam,
            gameId: gameIdParam,
            dateFrom: dateFromParam,
        });
    }, [languageParam, gameIdParam, dateFromParam]);

    // Handle tab change
    const handleTabChange = (newTab: SearchType) => {
        setActiveTab(newTab);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('type', newTab);
        setSearchParams(newParams);
    };

    // Handle sort change
    const handleSortChange = (newSort: SortType) => {
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
    
    // Handle filters change
    const handleFiltersChange = (newFilters: SearchFiltersType) => {
        setFilters(newFilters);
        const newParams = new URLSearchParams(searchParams);
        
        // Update URL params
        if (newFilters.language) {
            newParams.set('language', newFilters.language);
        } else {
            newParams.delete('language');
        }
        
        if (newFilters.gameId) {
            newParams.set('game_id', newFilters.gameId);
        } else {
            newParams.delete('game_id');
        }
        
        if (newFilters.dateFrom) {
            newParams.set('date_from', newFilters.dateFrom);
        } else {
            newParams.delete('date_from');
        }

        // Add dateTo
        if (newFilters.dateTo) {
            newParams.set('date_to', newFilters.dateTo);
        } else {
            newParams.delete('date_to');
        }

        // Add minVotes
        if (typeof newFilters.minVotes === 'number' && !isNaN(newFilters.minVotes) && newFilters.minVotes > 0) {
            newParams.set('min_votes', String(newFilters.minVotes));
        } else {
            newParams.delete('min_votes');
        }

        // Add tags (as comma-separated)
        if (Array.isArray(newFilters.tags) && newFilters.tags.length > 0) {
            newParams.set('tags', newFilters.tags.join(','));
        } else {
            newParams.delete('tags');
        }
        
        setSearchParams(newParams);
    };

    const tabs = [
        {
            id: 'all',
            label: 'All',
            count:
                (data?.counts.clips || 0) +
                (data?.counts.creators || 0) +
                (data?.counts.games || 0) +
                (data?.counts.tags || 0),
        },
        { id: 'clips', label: 'Clips', count: data?.counts.clips || 0 },
        {
            id: 'creators',
            label: 'Creators',
            count: data?.counts.creators || 0,
        },
        { id: 'games', label: 'Games', count: data?.counts.games || 0 },
        { id: 'tags', label: 'Tags', count: data?.counts.tags || 0 },
    ];

    const seoTitle = query ? `Search: ${query}` : 'Search Clips';
    const seoDescription = query 
        ? `Search results for "${query}" on Clipper. Find Twitch clips, games, creators, and tags matching your query.`
        : 'Search for Twitch clips, games, creators, and tags on Clipper. Discover amazing gaming moments from your favorite streamers.';

    return (
        <>
            <SEO
                title={seoTitle}
                description={seoDescription}
                canonicalUrl="/search"
                noindex={!query} // Don't index empty search page
            />
            <Container className='py-4 xs:py-6 md:py-8'>
            {/* Search Bar */}
            <div className='mb-6 xs:mb-8 flex justify-center'>
                <SearchBar
                    initialQuery={query}
                    onSearch={handleSearch}
                />
            </div>

            {!query ? (
                <div className='text-center text-muted-foreground py-8 xs:py-12'>
                    <p className='text-base xs:text-lg px-4'>
                        Enter a search query to find clips, games, creators, and
                        tags.
                    </p>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className='mb-4 xs:mb-6'>
                        <h1 className='text-2xl xs:text-3xl font-bold mb-2'>
                            Search Results
                        </h1>
                        <p className='text-sm xs:text-base text-muted-foreground'>
                            Found {data?.meta.total_items || 0} results for:{' '}
                            <span className='font-semibold'>"{query}"</span>
                        </p>
                    </div>

                    {/* Tabs and Sort */}
                    <div className='flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-0 mb-4 xs:mb-6 border-b border-border'>
                        <div className='flex gap-0.5 xs:gap-1 overflow-x-auto scrollbar-hide'>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() =>
                                        handleTabChange(tab.id as SearchType)
                                    }
                                    className={`px-3 xs:px-4 py-2 font-medium transition-colors relative whitespace-nowrap touch-target text-sm xs:text-base ${
                                        activeTab === tab.id
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className='ml-1.5 xs:ml-2 text-xs bg-accent px-1.5 xs:px-2 py-0.5 rounded-full'>
                                            {tab.count}
                                        </span>
                                    )}
                                    {activeTab === tab.id && (
                                        <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary' />
                                    )}
                                </button>
                            ))}
                        </div>

                        <select
                            value={sortParam}
                            onChange={(e) =>
                                handleSortChange(e.target.value as SortType)
                            }
                            className='px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 touch-target'
                        >
                            <option value='relevance'>Relevance</option>
                            <option value='recent'>Recent</option>
                            <option value='popular'>Popular</option>
                        </select>
                    </div>

                    {/* Filters */}
                    {(activeTab === 'all' || activeTab === 'clips') && data?.facets && (
                        <SearchFilters
                            facets={data.facets}
                            filters={filters}
                            onFiltersChange={handleFiltersChange}
                        />
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className='flex justify-center py-12'>
                            <Spinner size='lg' />
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className='text-center text-destructive py-12'>
                            <p>
                                Failed to load search results. Please try again.
                            </p>
                        </div>
                    )}

                    {/* Results */}
                    {data && !isLoading && (
                        <div className='space-y-8'>
                            {/* Clips */}
                            {(activeTab === 'all' || activeTab === 'clips') &&
                                data.results.clips &&
                                data.results.clips.length > 0 && (
                                    <section>
                                        <h2 className='text-xl font-bold mb-4'>
                                            Clips{' '}
                                            {activeTab === 'all' &&
                                                `(${data.counts.clips})`}
                                        </h2>
                                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                                            {data.results.clips.map((clip) => (
                                                <ClipCard
                                                    key={clip.id}
                                                    clip={clip}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                            {/* Creators */}
                            {(activeTab === 'all' ||
                                activeTab === 'creators') &&
                                data.results.creators &&
                                data.results.creators.length > 0 && (
                                    <section>
                                        <h2 className='text-xl font-bold mb-4'>
                                            Creators{' '}
                                            {activeTab === 'all' &&
                                                `(${data.counts.creators})`}
                                        </h2>
                                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                                            {data.results.creators.map(
                                                (creator) => (
                                                    <div
                                                        key={creator.id}
                                                        className='p-4 rounded-lg border border-border hover:border-primary transition-colors'
                                                    >
                                                        <div className='flex items-center gap-3'>
                                                            {creator.avatar_url && (
                                                                <img
                                                                    src={
                                                                        creator.avatar_url
                                                                    }
                                                                    alt={
                                                                        creator.display_name
                                                                    }
                                                                    className='w-12 h-12 rounded-full'
                                                                />
                                                            )}
                                                            <div>
                                                                <h3 className='font-semibold'>
                                                                    {
                                                                        creator.display_name
                                                                    }
                                                                </h3>
                                                                <p className='text-sm text-muted-foreground'>
                                                                    @
                                                                    {
                                                                        creator.username
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {creator.bio && (
                                                            <p className='mt-2 text-sm text-muted-foreground line-clamp-2'>
                                                                {creator.bio}
                                                            </p>
                                                        )}
                                                        <div className='mt-2 text-xs text-muted-foreground'>
                                                            {
                                                                creator.karma_points
                                                            }{' '}
                                                            karma
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </section>
                                )}

                            {/* Games */}
                            {(activeTab === 'all' || activeTab === 'games') &&
                                data.results.games &&
                                data.results.games.length > 0 && (
                                    <section>
                                        <h2 className='text-xl font-bold mb-4'>
                                            Games{' '}
                                            {activeTab === 'all' &&
                                                `(${data.counts.games})`}
                                        </h2>
                                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                                            {data.results.games.map((game) => (
                                                <div
                                                    key={game.id}
                                                    className='p-4 rounded-lg border border-border hover:border-primary transition-colors'
                                                >
                                                    <h3 className='font-semibold text-lg'>
                                                        {game.name}
                                                    </h3>
                                                    <p className='text-sm text-muted-foreground mt-1'>
                                                        {game.clip_count} clips
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                            {/* Tags */}
                            {(activeTab === 'all' || activeTab === 'tags') &&
                                data.results.tags &&
                                data.results.tags.length > 0 && (
                                    <section>
                                        <h2 className='text-xl font-bold mb-4'>
                                            Tags{' '}
                                            {activeTab === 'all' &&
                                                `(${data.counts.tags})`}
                                        </h2>
                                        <div className='flex flex-wrap gap-2'>
                                            {data.results.tags.map((tag) => (
                                                <div
                                                    key={tag.id}
                                                    className='px-3 py-1.5 rounded-full border border-border hover:border-primary transition-colors'
                                                    style={
                                                        tag.color
                                                            ? {
                                                                  borderColor:
                                                                      tag.color,
                                                              }
                                                            : undefined
                                                    }
                                                >
                                                    <span className='font-medium'>
                                                        #{tag.name}
                                                    </span>
                                                    <span className='ml-2 text-xs text-muted-foreground'>
                                                        {tag.usage_count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                            {/* Empty State */}
                            {data.meta.total_items === 0 && (
                                <div className='text-center text-muted-foreground py-12'>
                                    <p className='text-lg'>
                                        No results found for "{query}"
                                    </p>
                                    <p className='text-sm mt-2'>
                                        Try different keywords or check your
                                        spelling
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </Container>
        </>
    );
}
