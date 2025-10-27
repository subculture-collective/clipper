import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container } from '../components';
import { ClipCard } from '../components/clip';
import { SearchBar } from '../components/search';
import { Spinner } from '../components/ui';
import { searchApi } from '../lib/search-api';
export function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const typeParam = searchParams.get('type') || 'all';
    const sortParam = searchParams.get('sort') || 'relevance';
    const [activeTab, setActiveTab] = useState(typeParam);
    // Fetch search results
    const { data, isLoading, error } = useQuery({
        queryKey: ['search', query, activeTab, sortParam],
        queryFn: () => searchApi.search({
            query,
            type: activeTab,
            sort: sortParam,
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
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('type', newTab);
        setSearchParams(newParams);
    };
    // Handle sort change
    const handleSortChange = (newSort) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('sort', newSort);
        setSearchParams(newParams);
    };
    // Handle search from SearchBar
    const handleSearch = (newQuery) => {
        const newParams = new URLSearchParams();
        newParams.set('q', newQuery);
        newParams.set('type', 'all');
        newParams.set('sort', 'relevance');
        setSearchParams(newParams);
    };
    const tabs = [
        {
            id: 'all',
            label: 'All',
            count: (data?.counts.clips || 0) +
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
    return (_jsxs(Container, { className: 'py-8', children: [_jsx("div", { className: 'mb-8 flex justify-center', children: _jsx(SearchBar, { initialQuery: query, onSearch: handleSearch }) }), !query ? (_jsx("div", { className: 'text-center text-muted-foreground py-12', children: _jsx("p", { className: 'text-lg', children: "Enter a search query to find clips, games, creators, and tags." }) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: 'mb-6', children: [_jsx("h1", { className: 'text-3xl font-bold mb-2', children: "Search Results" }), _jsxs("p", { className: 'text-muted-foreground', children: ["Found ", data?.meta.total_items || 0, " results for:", ' ', _jsxs("span", { className: 'font-semibold', children: ["\"", query, "\""] })] })] }), _jsxs("div", { className: 'flex items-center justify-between mb-6 border-b border-border', children: [_jsx("div", { className: 'flex gap-1', children: tabs.map((tab) => (_jsxs("button", { onClick: () => handleTabChange(tab.id), className: `px-4 py-2 font-medium transition-colors relative ${activeTab === tab.id
                                        ? 'text-primary'
                                        : 'text-muted-foreground hover:text-foreground'}`, children: [tab.label, tab.count > 0 && (_jsx("span", { className: 'ml-2 text-xs bg-accent px-2 py-0.5 rounded-full', children: tab.count })), activeTab === tab.id && (_jsx("div", { className: 'absolute bottom-0 left-0 right-0 h-0.5 bg-primary' }))] }, tab.id))) }), _jsxs("select", { value: sortParam, onChange: (e) => handleSortChange(e.target.value), className: 'px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900', children: [_jsx("option", { value: 'relevance', children: "Relevance" }), _jsx("option", { value: 'recent', children: "Recent" }), _jsx("option", { value: 'popular', children: "Popular" })] })] }), isLoading && (_jsx("div", { className: 'flex justify-center py-12', children: _jsx(Spinner, { size: 'lg' }) })), error && (_jsx("div", { className: 'text-center text-destructive py-12', children: _jsx("p", { children: "Failed to load search results. Please try again." }) })), data && !isLoading && (_jsxs("div", { className: 'space-y-8', children: [(activeTab === 'all' || activeTab === 'clips') &&
                                data.results.clips &&
                                data.results.clips.length > 0 && (_jsxs("section", { children: [_jsxs("h2", { className: 'text-xl font-bold mb-4', children: ["Clips", ' ', activeTab === 'all' &&
                                                `(${data.counts.clips})`] }), _jsx("div", { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', children: data.results.clips.map((clip) => (_jsx(ClipCard, { clip: clip }, clip.id))) })] })), (activeTab === 'all' ||
                                activeTab === 'creators') &&
                                data.results.creators &&
                                data.results.creators.length > 0 && (_jsxs("section", { children: [_jsxs("h2", { className: 'text-xl font-bold mb-4', children: ["Creators", ' ', activeTab === 'all' &&
                                                `(${data.counts.creators})`] }), _jsx("div", { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', children: data.results.creators.map((creator) => (_jsxs("div", { className: 'p-4 rounded-lg border border-border hover:border-primary transition-colors', children: [_jsxs("div", { className: 'flex items-center gap-3', children: [creator.avatar_url && (_jsx("img", { src: creator.avatar_url, alt: creator.display_name, className: 'w-12 h-12 rounded-full' })), _jsxs("div", { children: [_jsx("h3", { className: 'font-semibold', children: creator.display_name }), _jsxs("p", { className: 'text-sm text-muted-foreground', children: ["@", creator.username] })] })] }), creator.bio && (_jsx("p", { className: 'mt-2 text-sm text-muted-foreground line-clamp-2', children: creator.bio })), _jsxs("div", { className: 'mt-2 text-xs text-muted-foreground', children: [creator.karma_points, ' ', "karma"] })] }, creator.id))) })] })), (activeTab === 'all' || activeTab === 'games') &&
                                data.results.games &&
                                data.results.games.length > 0 && (_jsxs("section", { children: [_jsxs("h2", { className: 'text-xl font-bold mb-4', children: ["Games", ' ', activeTab === 'all' &&
                                                `(${data.counts.games})`] }), _jsx("div", { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', children: data.results.games.map((game) => (_jsxs("div", { className: 'p-4 rounded-lg border border-border hover:border-primary transition-colors', children: [_jsx("h3", { className: 'font-semibold text-lg', children: game.name }), _jsxs("p", { className: 'text-sm text-muted-foreground mt-1', children: [game.clip_count, " clips"] })] }, game.id))) })] })), (activeTab === 'all' || activeTab === 'tags') &&
                                data.results.tags &&
                                data.results.tags.length > 0 && (_jsxs("section", { children: [_jsxs("h2", { className: 'text-xl font-bold mb-4', children: ["Tags", ' ', activeTab === 'all' &&
                                                `(${data.counts.tags})`] }), _jsx("div", { className: 'flex flex-wrap gap-2', children: data.results.tags.map((tag) => (_jsxs("div", { className: 'px-3 py-1.5 rounded-full border border-border hover:border-primary transition-colors', style: tag.color
                                                ? {
                                                    borderColor: tag.color,
                                                }
                                                : undefined, children: [_jsxs("span", { className: 'font-medium', children: ["#", tag.name] }), _jsx("span", { className: 'ml-2 text-xs text-muted-foreground', children: tag.usage_count })] }, tag.id))) })] })), data.meta.total_items === 0 && (_jsxs("div", { className: 'text-center text-muted-foreground py-12', children: [_jsxs("p", { className: 'text-lg', children: ["No results found for \"", query, "\""] }), _jsx("p", { className: 'text-sm mt-2', children: "Try different keywords or check your spelling" })] }))] }))] }))] }));
}
