import { Container, SEO } from '../components';
import { ClipFeed } from '../components/clip';
import { DiscoveryListCard } from '../components/discovery';
import { useDiscoveryLists } from '../hooks/useDiscoveryLists';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';

export function HomePage() {
    const carouselRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const scrollCarousel = useCallback((direction: 'left' | 'right') => {
        const container = carouselRef.current;
        if (!container) return;
        const scrollAmount = Math.max(240, container.clientWidth * 0.9);
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    }, []);

    const updateCarouselControls = useCallback(() => {
        const container = carouselRef.current;
        if (!container) return;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        const hasOverflow = maxScrollLeft > 4;
        setCanScrollLeft(hasOverflow && container.scrollLeft > 4);
        setCanScrollRight(
            hasOverflow && container.scrollLeft < maxScrollLeft - 4,
        );
    }, []);

    // Fetch featured discovery lists
    const { data: featuredLists, isLoading } = useDiscoveryLists({
        featured: true,
        limit: 8,
    });

    useEffect(() => {
        updateCarouselControls();
        const container = carouselRef.current;
        if (!container) return;

        const handle = () => updateCarouselControls();
        container.addEventListener('scroll', handle, { passive: true });
        const resizeObserver = new ResizeObserver(handle);
        resizeObserver.observe(container);

        return () => {
            container.removeEventListener('scroll', handle);
            resizeObserver.disconnect();
        };
    }, [featuredLists?.length, updateCarouselControls]);

    return (
        <>
            <SEO
                title='Home'
                description='Discover and share the best Twitch clips curated by the community. Vote on your favorite moments, explore trending clips, and join the conversation.'
                canonicalUrl='/'
            />
            <Container className='py-4 xs:py-6 md:py-8'>
                {/* Featured Discovery Lists Section */}
                {!isLoading && featuredLists && featuredLists.length > 0 && (
                    <div className='mb-8'>
                        <div className='flex items-center justify-between mb-4'>
                            <div>
                                <h2 className='text-2xl font-bold text-foreground'>
                                    Curated Collections
                                </h2>
                                <p className='text-muted-foreground text-sm mt-1'>
                                    Handpicked lists of amazing clips
                                </p>
                            </div>
                            <Link
                                to='/discover/lists'
                                className='flex items-center gap-1 text-primary-500 hover:text-primary-600 text-sm font-medium transition-colors'
                            >
                                View All
                                <ChevronRight className='w-4 h-4' />
                            </Link>
                        </div>
                        <div className='relative'>
                            <div className='absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent pointer-events-none' />
                            <div className='absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent pointer-events-none' />

                            <div
                                ref={carouselRef}
                                className='flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scrollbar-hide scrolling-touch touch-pan-x overscroll-x-contain'
                                aria-label='Curated collections carousel'
                            >
                                {featuredLists.map(list => (
                                    <div
                                        key={list.id}
                                        className='snap-start shrink-0 w-[320px] xs:w-[340px] sm:w-[360px] lg:w-[400px]'
                                    >
                                        <DiscoveryListCard
                                            list={list}
                                            size='compact'
                                        />
                                    </div>
                                ))}
                            </div>

                            {canScrollLeft && (
                                <div className='absolute top-1/2 -translate-y-1/2 left-2 hidden sm:flex'>
                                    <button
                                        type='button'
                                        onClick={() => scrollCarousel('left')}
                                        className='h-9 w-9 rounded-full border border-border bg-background/90 shadow-md hover:bg-background transition-colors flex items-center justify-center'
                                        aria-label='Scroll curated collections left'
                                    >
                                        <ChevronLeft className='h-4 w-4' />
                                    </button>
                                </div>
                            )}
                            {canScrollRight && (
                                <div className='absolute top-1/2 -translate-y-1/2 right-2 hidden sm:flex'>
                                    <button
                                        type='button'
                                        onClick={() => scrollCarousel('right')}
                                        className='h-9 w-9 rounded-full border border-border bg-background/90 shadow-md hover:bg-background transition-colors flex items-center justify-center'
                                        aria-label='Scroll curated collections right'
                                    >
                                        <ChevronRight className='h-4 w-4' />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Clip Feed */}
                <ClipFeed
                    title='Home Feed'
                    description='Discover the best Twitch clips'
                    defaultSort='trending'
                    showSearch
                />
            </Container>
        </>
    );
}
