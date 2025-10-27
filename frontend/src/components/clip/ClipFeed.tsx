import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spinner, Button } from '@/components/ui';
import { ClipCard } from './ClipCard';
import { ClipCardSkeleton } from './ClipCardSkeleton';
import { EmptyState } from './EmptyState';
import { FeedFilters } from './FeedFilters';
import { FeedHeader } from './FeedHeader';
import { useClipFeed } from '@/hooks/useClips';
import type { SortOption, TimeFrame, ClipFeedFilters } from '@/types/clip';

interface ClipFeedProps {
  title?: string;
  description?: string;
  defaultSort?: SortOption;
  defaultTimeframe?: TimeFrame;
  filters?: Partial<ClipFeedFilters>;
}

export function ClipFeed({ 
  title = 'Clip Feed',
  description,
  defaultSort = 'hot',
  defaultTimeframe = 'day',
  filters: additionalFilters = {}
}: ClipFeedProps) {
  const { i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Get filters from URL or use defaults
  const sort = (searchParams.get('sort') as SortOption) || defaultSort;
  const timeframe = (searchParams.get('timeframe') as TimeFrame) || defaultTimeframe;

  // Combine URL filters with additional filters and current language
  const filters: ClipFeedFilters = {
    sort,
    timeframe: sort === 'top' ? timeframe : undefined,
    language: i18n.language, // Use current language for filtering
    ...additionalFilters,
  };

  // Fetch clips with infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useClipFeed(filters);

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

  // Show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSortChange = (newSort: SortOption) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    if (newSort !== 'top') {
      params.delete('timeframe');
    }
    setSearchParams(params);
  };

  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    const params = new URLSearchParams(searchParams);
    params.set('timeframe', newTimeframe);
    setSearchParams(params);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get all clips from all pages
  const clips = data?.pages.flatMap(page => page.clips) ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      <FeedHeader title={title} description={description} />
      
      <FeedFilters
        sort={sort}
        timeframe={timeframe}
        onSortChange={handleSortChange}
        onTimeframeChange={handleTimeframeChange}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ClipCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <EmptyState
          title="Error loading clips"
          message="Something went wrong. Please try again later."
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      )}

      {/* Empty state */}
      {!isLoading && !isError && clips.length === 0 && (
        <EmptyState
          title="No clips found"
          message="Try adjusting your filters or check back later."
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        />
      )}

      {/* Clips list */}
      {!isLoading && !isError && clips.length > 0 && (
        <div className="space-y-4">
          {clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}

          {/* Load more trigger */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {isFetchingNextPage ? (
                <Spinner size="lg" />
              ) : (
                <Button onClick={() => fetchNextPage()}>Load More</Button>
              )}
            </div>
          )}

          {/* End of results */}
          {!hasNextPage && clips.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>You've reached the end!</p>
            </div>
          )}
        </div>
      )}

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-all flex items-center justify-center z-50"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}
