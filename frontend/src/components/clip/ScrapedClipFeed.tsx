import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useInView } from 'react-intersection-observer';
import { Spinner, Button, ScrollToTop } from '@/components/ui';
import { MiniFooter } from '@/components/layout';
import { DiscoverClipCard } from './DiscoverClipCard';
import { ClipCardSkeleton } from './ClipCardSkeleton';
import { EmptyState } from './EmptyState';
import { useScrapedClipsFeed } from '@/hooks/useClips';
import type { SortOption, TimeFrame, ClipFeedFilters } from '@/types/clip';

interface ScrapedClipFeedProps {
    title?: string;
    description?: string;
    defaultSort?: SortOption;
    defaultTimeframe?: TimeFrame;
    filters?: Partial<ClipFeedFilters>;
}

// Memoized DiscoverClipCard wrapper for performance
const MemoizedDiscoverClipCard = memo(
    DiscoverClipCard,
    (prevProps, nextProps) => {
        return (
            prevProps.clip.id === nextProps.clip.id &&
            prevProps.clip.view_count === nextProps.clip.view_count
        );
    },
);

export function ScrapedClipFeed({
    title = 'Scraped Clips',
    description,
    defaultSort = 'new',
    defaultTimeframe = 'day',
    filters: additionalFilters = {},
}: ScrapedClipFeedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const touchStartRef = useRef<number>(0);
    const scrollTopRef = useRef<number>(0);

    // Get filters from URL or use defaults
    const sort = defaultSort;
    const timeframe = defaultTimeframe;

    // Combine URL filters with additional filters
    // Do not filter by UI language by default; include language only if explicitly provided
    const filters: ClipFeedFilters = {
        sort,
        timeframe: sort === 'top' ? timeframe : undefined,
        ...additionalFilters,
    };

    // Fetch scraped clips with infinite query
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch,
    } = useScrapedClipsFeed(filters);

    // Get all clips from all pages
    const clips = data?.pages.flatMap(page => page.clips) ?? [];
    // Discovery clips from the staging table are always unposted
    const filteredClips = clips.filter(
        clip => !clip.is_removed && !clip.is_hidden,
    );

    // Intersection observer for infinite scroll
    const { ref: loadMoreRef, inView } = useInView({
        threshold: 0.5,
    });

    // Load more when the trigger element comes into view
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Pull-to-refresh handlers for mobile web
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Only enable pull-to-refresh when at the top of the page
        scrollTopRef.current =
            window.scrollY || document.documentElement.scrollTop;
        if (scrollTopRef.current === 0) {
            touchStartRef.current = e.touches[0].clientY;
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchStartRef.current && scrollTopRef.current === 0) {
            const currentY = e.touches[0].clientY;
            const distance = Math.max(0, currentY - touchStartRef.current);

            // Only activate pull-to-refresh if user is pulling down
            if (distance > 0 && distance < 120) {
                setPullDistance(distance);
                // Prevent default scroll behavior when pulling down
                if (distance > 10) {
                    e.preventDefault();
                }
            }
        }
    }, []);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance > 80 && !isRefreshing && !isLoading) {
            setIsRefreshing(true);
            try {
                await refetch();
            } finally {
                setIsRefreshing(false);
            }
        }
        setPullDistance(0);
        touchStartRef.current = 0;
    }, [pullDistance, isRefreshing, isLoading, refetch]);

    return (
        <div className='max-w-4xl mx-auto'>
            {(title || description) && (
                <div className='mb-6'>
                    {title && (
                        <h2 className='text-2xl sm:text-3xl font-bold truncate'>
                            {title}
                        </h2>
                    )}
                    {description && (
                        <p className='text-muted-foreground text-sm mt-1'>
                            {description}
                        </p>
                    )}
                </div>
            )}

            {/* Pull-to-refresh indicator */}
            {pullDistance > 0 && (
                <div
                    className='flex justify-center items-center py-4 text-muted-foreground transition-all'
                    style={{
                        transform: `translateY(${Math.min(pullDistance, 80)}px)`,
                        opacity: Math.min(pullDistance / 80, 1),
                    }}
                >
                    {isRefreshing ?
                        <Spinner size='md' />
                    :   <div className='flex flex-col items-center'>
                            <svg
                                className='w-6 h-6 mb-1'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                                style={{
                                    transform: `rotate(${pullDistance * 4}deg)`,
                                }}
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                />
                            </svg>
                            <span className='text-xs'>
                                {pullDistance > 80 ?
                                    'Release to refresh'
                                :   'Pull to refresh'}
                            </span>
                        </div>
                    }
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className='space-y-4'>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <ClipCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Error state */}
            {isError && (
                <EmptyState
                    title='Error loading clips'
                    message='Something went wrong. Please try again later.'
                    icon={
                        <svg
                            className='w-16 h-16'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                        </svg>
                    }
                />
            )}

            {/* Empty state */}
            {!isLoading && !isError && filteredClips.length === 0 && (
                <EmptyState
                    title='No clips found'
                    message='Try adjusting your filters or check back later.'
                    icon={
                        <svg
                            className='w-16 h-16'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                            />
                        </svg>
                    }
                />
            )}

            {/* Clips list with pull-to-refresh */}
            {!isLoading && !isError && filteredClips.length > 0 && (
                <div
                    ref={containerRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className='space-y-4'>
                        {filteredClips.map(clip => (
                            <MemoizedDiscoverClipCard
                                key={clip.id}
                                clip={clip}
                            />
                        ))}
                    </div>

                    {/* Load more trigger */}
                    {hasNextPage && (
                        <div
                            ref={loadMoreRef}
                            className='py-8 flex justify-center'
                        >
                            {isFetchingNextPage ?
                                <Spinner size='lg' />
                            :   <Button onClick={() => fetchNextPage()}>
                                    Load More
                                </Button>
                            }
                        </div>
                    )}

                    {/* End of results */}
                    {!hasNextPage && filteredClips.length > 0 && (
                        <div className='text-center py-8 text-muted-foreground'>
                            <p>You've reached the end!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Scroll to top button */}
            <ScrollToTop threshold={500} />

            {/* Mini footer for quick access to footer links */}
            <MiniFooter />
        </div>
    );
}
