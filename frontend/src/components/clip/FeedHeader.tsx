import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface FeedHeaderProps {
    title: string;
    description?: string;
    showSearch?: boolean;
}

export function FeedHeader({
    title,
    description,
    showSearch = false,
}: FeedHeaderProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useKeyboardShortcuts(
        showSearch ?
            [
                {
                    key: '/',
                    callback: () => searchInputRef.current?.focus(),
                    description: 'Focus search',
                },
            ]
        :   []
    );

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (!trimmed) return;

        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
        setSearchQuery('');
        searchInputRef.current?.blur();
    };

    return (
        <div className='mb-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                    <h1 className='text-3xl font-bold mb-1'>{title}</h1>
                    {description && (
                        <p className='text-muted-foreground'>{description}</p>
                    )}
                </div>

                {showSearch && (
                    <form
                        onSubmit={handleSearch}
                        className='w-full sm:w-auto sm:min-w-[320px]'
                        role='search'
                        aria-label={t('nav.search')}
                    >
                        <Input
                            ref={searchInputRef}
                            type='search'
                            placeholder={`${t('nav.search')} (Press / to focus)`}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            aria-label={t('nav.search')}
                        />
                    </form>
                )}
            </div>
        </div>
    );
}
