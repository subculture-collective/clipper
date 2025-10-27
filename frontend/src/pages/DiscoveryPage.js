import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container } from '../components';
import { ClipFeed } from '../components/clip';
export function DiscoveryPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [top10kEnabled, setTop10kEnabled] = useState(searchParams.get('top10k_streamers') === 'true');
    // Sync state with URL params when searchParams changes
    useEffect(() => {
        setTop10kEnabled(searchParams.get('top10k_streamers') === 'true');
    }, [searchParams]);
    // Get active tab from URL or default to 'top'
    const activeTab = searchParams.get('tab') || 'top';
    const handleTabChange = (tab) => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', tab);
        setSearchParams(params);
    };
    const handleTop10kToggle = () => {
        const newValue = !top10kEnabled;
        setTop10kEnabled(newValue);
        const params = new URLSearchParams(searchParams);
        if (newValue) {
            params.set('top10k_streamers', 'true');
        }
        else {
            params.delete('top10k_streamers');
        }
        setSearchParams(params);
    };
    const tabs = [
        {
            value: 'top',
            label: 'Top',
            description: 'Highest rated clips',
        },
        {
            value: 'new',
            label: 'New',
            description: 'Latest clips from the community',
        },
        {
            value: 'discussed',
            label: 'Discussed',
            description: 'Most talked about clips',
        },
    ];
    return (_jsx(Container, { className: "py-8", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-3xl font-bold text-foreground mb-2", children: "Discover Clips" }), _jsx("p", { className: "text-muted-foreground", children: "Explore the best clips from Twitch streamers" })] }), _jsx("div", { className: "bg-card border border-border rounded-xl p-2 mb-6", children: _jsx("div", { className: "flex flex-wrap gap-2", children: tabs.map((tab) => (_jsxs("button", { onClick: () => handleTabChange(tab.value), className: `
                  flex-1 min-w-[120px] px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${activeTab === tab.value
                                ? 'bg-primary-500 text-white'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
                `, children: [_jsx("div", { className: "font-semibold", children: tab.label }), _jsx("div", { className: "text-xs mt-0.5 opacity-90", children: tab.description })] }, tab.value))) }) }), _jsx("div", { className: "bg-card border border-border rounded-xl p-4 mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-foreground", children: "Top 10k Streamers Only" }), _jsx("div", { className: "text-sm text-muted-foreground mt-1", children: "Filter clips to only show content from the top 10,000 streamers" })] }), _jsx("button", { onClick: handleTop10kToggle, className: `
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${top10kEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}
              `, role: "switch", "aria-checked": top10kEnabled, children: _jsx("span", { className: `
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${top10kEnabled ? 'translate-x-6' : 'translate-x-1'}
                ` }) })] }) }), _jsx(ClipFeed, { title: tabs.find((t) => t.value === activeTab)?.label || 'Discover', description: tabs.find((t) => t.value === activeTab)?.description || '', defaultSort: activeTab, defaultTimeframe: activeTab === 'top' ? 'day' : undefined, filters: {
                        top10k_streamers: top10kEnabled,
                    } })] }) }));
}
