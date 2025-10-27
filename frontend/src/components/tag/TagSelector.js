import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { tagApi } from "../../lib/tag-api";
import { TagChip } from "./TagChip";
export const TagSelector = ({ selectedTags, onTagsChange, maxTags = 15, }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    // Fetch suggestions when search query changes
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchQuery.length < 2) {
                setSuggestions([]);
                return;
            }
            setIsLoading(true);
            try {
                const response = await tagApi.searchTags(searchQuery, 10);
                // Filter out already selected tags
                const filtered = response.tags.filter((tag) => !selectedTags.some((selected) => selected.id === tag.id));
                setSuggestions(filtered);
            }
            catch (error) {
                console.error("Failed to fetch tag suggestions:", error);
                setSuggestions([]);
            }
            finally {
                setIsLoading(false);
            }
        };
        const debounceTimer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, selectedTags]);
    const handleAddTag = (tag) => {
        if (selectedTags.length >= maxTags) {
            return;
        }
        onTagsChange([...selectedTags, tag]);
        setSearchQuery("");
        setSuggestions([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };
    const handleRemoveTag = (slug) => {
        onTagsChange(selectedTags.filter((tag) => tag.slug !== slug));
    };
    const handleInputChange = (e) => {
        setSearchQuery(e.target.value);
        setIsOpen(true);
    };
    const handleInputFocus = () => {
        setIsOpen(true);
    };
    return (_jsxs("div", { className: "space-y-3", ref: dropdownRef, children: [selectedTags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2", children: selectedTags.map((tag) => (_jsx(TagChip, { tag: tag, size: "medium", removable: true, onRemove: handleRemoveTag }, tag.id))) })), _jsxs("div", { className: "relative", children: [_jsx("input", { ref: inputRef, type: "text", value: searchQuery, onChange: handleInputChange, onFocus: handleInputFocus, placeholder: selectedTags.length >= maxTags
                            ? `Maximum ${maxTags} tags reached`
                            : "Search for tags...", disabled: selectedTags.length >= maxTags, className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" }), _jsxs("div", { className: "absolute right-3 top-2.5 text-sm text-gray-500 dark:text-gray-400", children: [selectedTags.length, " / ", maxTags] }), isOpen && searchQuery.length >= 2 && (_jsx("div", { className: "absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto", children: isLoading ? (_jsx("div", { className: "px-4 py-3 text-gray-500 dark:text-gray-400 text-sm", children: "Searching..." })) : suggestions.length > 0 ? (_jsx("ul", { children: suggestions.map((tag) => (_jsx("li", { children: _jsxs("button", { onClick: () => handleAddTag(tag), className: "w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full", style: { backgroundColor: tag.color || "#4169E1" } }), _jsx("span", { className: "text-gray-900 dark:text-gray-100", children: tag.name })] }), _jsxs("span", { className: "text-xs text-gray-500 dark:text-gray-400", children: [tag.usage_count, " clips"] })] }) }, tag.id))) })) : (_jsx("div", { className: "px-4 py-3 text-gray-500 dark:text-gray-400 text-sm", children: "No tags found. Tags will be created when you save." })) }))] }), selectedTags.length >= maxTags && (_jsx("p", { className: "text-sm text-yellow-600 dark:text-yellow-400", children: "Maximum number of tags reached. Remove a tag to add a new one." }))] }));
};
