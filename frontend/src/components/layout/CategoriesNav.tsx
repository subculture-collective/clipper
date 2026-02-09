import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryApi } from '../../lib/category-api';
import type { Category } from '../../types/category';

export function CategoriesNav() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const featured = await categoryApi.listCategories({
                    featured: true,
                });
                const featuredCategories = featured.categories || [];

                if (featuredCategories.length === 0) {
                    const all = await categoryApi.listCategories();
                    setCategories(all.categories || []);
                } else {
                    setCategories(featuredCategories);
                }
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const updateScrollState = () => {
            const { scrollLeft, scrollWidth, clientWidth } = el;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
        };

        updateScrollState();
        el.addEventListener('scroll', updateScrollState);
        window.addEventListener('resize', updateScrollState);
        return () => {
            el.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [categories.length]);

    const scrollByAmount = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const delta = direction === 'left' ? -200 : 200;
        el.scrollBy({ left: delta, behavior: 'smooth' });
    };

    if (loading || categories.length === 0) {
        return null;
    }

    return (
        <div className='border-b border-border bg-background'>
            <div className='container mx-auto px-4'>
                <div className='relative'>
                    {canScrollLeft && (
                        <button
                            type='button'
                            onClick={() => scrollByAmount('left')}
                            className='absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/90 shadow hover:bg-background'
                            aria-label='Scroll categories left'
                        >
                            <svg
                                className='w-4 h-4'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                viewBox='0 0 24 24'
                                aria-hidden='true'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    d='M15 19l-7-7 7-7'
                                />
                            </svg>
                        </button>
                    )}

                    {canScrollRight && (
                        <button
                            type='button'
                            onClick={() => scrollByAmount('right')}
                            className='absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/90 shadow hover:bg-background'
                            aria-label='Scroll categories right'
                        >
                            <svg
                                className='w-4 h-4'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                viewBox='0 0 24 24'
                                aria-hidden='true'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    d='M9 5l7 7-7 7'
                                />
                            </svg>
                        </button>
                    )}

                    <div
                        ref={scrollRef}
                        className='flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide px-6'
                        role='list'
                        aria-label='Browse categories'
                    >
                        {categories.map(category => (
                            <Link
                                key={category.id}
                                to={`/category/${category.slug}`}
                                className='flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap text-sm transition-colors'
                                role='listitem'
                            >
                                {category.icon && <span>{category.icon}</span>}
                                <span>{category.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
