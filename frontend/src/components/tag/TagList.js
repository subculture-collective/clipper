import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useClipTags } from '../../hooks/useTags';
import { TagChip } from './TagChip';
export const TagList = ({ clipId, maxVisible = 5 }) => {
    const { data, isLoading } = useClipTags(clipId);
    if (isLoading) {
        return (_jsx("div", { className: 'flex gap-2', children: [...Array(3)].map((_, i) => (_jsx("div", { className: 'h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse' }, i))) }));
    }
    if (!data || !data.tags || data.tags.length === 0) {
        return null;
    }
    const visibleTags = data.tags.slice(0, maxVisible);
    const remainingCount = data.tags.length - maxVisible;
    return (_jsxs("div", { className: 'flex flex-wrap gap-2 items-center', children: [visibleTags.map((tag) => (_jsx(TagChip, { tag: tag, size: 'small' }, tag.id))), remainingCount > 0 && (_jsxs("span", { className: 'text-xs text-gray-500 dark:text-gray-400', children: ["+", remainingCount, " more"] }))] }));
};
