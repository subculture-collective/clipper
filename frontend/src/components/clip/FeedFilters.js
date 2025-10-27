import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@/components/ui';
export function FeedFilters({ sort, timeframe, onSortChange, onTimeframeChange }) {
    const sortOptions = [
        { value: 'hot', label: 'Hot' },
        { value: 'new', label: 'New' },
        { value: 'top', label: 'Top' },
        { value: 'rising', label: 'Rising' },
        { value: 'discussed', label: 'Discussed' },
    ];
    const timeframeOptions = [
        { value: 'hour', label: 'Past Hour' },
        { value: 'day', label: 'Past Day' },
        { value: 'week', label: 'Past Week' },
        { value: 'month', label: 'Past Month' },
        { value: 'year', label: 'Past Year' },
        { value: 'all', label: 'All Time' },
    ];
    return (_jsxs("div", { className: "bg-card border border-border rounded-xl p-4 mb-6", children: [_jsx("div", { className: "flex flex-wrap gap-2 mb-4", children: sortOptions.map((option) => (_jsx(Button, { variant: sort === option.value ? 'primary' : 'ghost', size: "sm", onClick: () => onSortChange(option.value), children: option.label }, option.value))) }), sort === 'top' && (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("span", { className: "text-sm text-muted-foreground flex items-center mr-2", children: "Timeframe:" }), timeframeOptions.map((option) => (_jsx(Button, { variant: timeframe === option.value ? 'primary' : 'ghost', size: "sm", onClick: () => onTimeframeChange(option.value), children: option.label }, option.value)))] }))] }));
}
