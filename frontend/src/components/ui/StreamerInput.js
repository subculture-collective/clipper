import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { searchApi } from '../../lib/search-api';
import { Input } from './Input';
import { Badge } from './Badge';
export function StreamerInput({ value, onChange, autoDetected = false, disabled = false, id, required = false, }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const debounceTimerRef = useRef(undefined);
    const fetchSuggestions = useCallback(async (query) => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }
        setIsLoading(true);
        try {
            const results = await searchApi.getSuggestions(query);
            // Filter to only show creator suggestions
            const creatorSuggestions = results.filter((s) => s.type === 'creator');
            setSuggestions(creatorSuggestions);
            setShowSuggestions(true);
        }
        catch (error) {
            console.error('Failed to fetch streamer suggestions:', error);
            setSuggestions([]);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        setSelectedIndex(-1);
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            fetchSuggestions(newValue);
        }, 300);
    };
    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0)
            return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => prev < suggestions.length - 1 ? prev + 1 : prev);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    onChange(suggestions[selectedIndex].text);
                    setShowSuggestions(false);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    };
    const handleSuggestionClick = (suggestion) => {
        onChange(suggestion.text);
        setShowSuggestions(false);
    };
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);
    return (_jsxs("div", { children: [_jsxs("div", { className: 'flex items-center justify-between mb-2', children: [_jsxs("label", { htmlFor: id || 'streamer_input', className: 'block text-sm font-medium', children: ["Streamer ", required && _jsx("span", { className: 'text-red-500', children: "*" })] }), autoDetected && (_jsx(Badge, { variant: 'info', size: 'sm', children: "Will be auto-detected from clip" }))] }), _jsxs("div", { className: 'relative', children: [_jsx(Input, { ref: inputRef, id: id || 'streamer_input', type: 'text', value: value, onChange: handleInputChange, onKeyDown: handleKeyDown, onFocus: () => suggestions.length > 0 && setShowSuggestions(true), placeholder: 'Enter streamer name...', disabled: disabled, required: required }), showSuggestions && (suggestions.length > 0 || isLoading) && (_jsxs("div", { ref: suggestionsRef, className: 'absolute z-50 mt-2 w-full rounded-lg border border-border bg-background shadow-lg', children: [isLoading && (_jsx("div", { className: 'p-4 text-center text-sm text-muted-foreground', children: "Loading suggestions..." })), !isLoading && suggestions.length > 0 && (_jsx("ul", { className: 'max-h-60 overflow-y-auto py-2', children: suggestions.map((suggestion, index) => (_jsx("li", { children: _jsxs("button", { type: 'button', onClick: () => handleSuggestionClick(suggestion), className: `w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3 ${index === selectedIndex
                                            ? 'bg-accent'
                                            : ''}`, children: [_jsx("span", { className: 'text-lg', children: "\uD83D\uDC64" }), _jsx("div", { className: 'flex-1 min-w-0', children: _jsx("div", { className: 'font-medium truncate', children: suggestion.text }) })] }) }, `${suggestion.type}-${suggestion.text}`))) }))] }))] }), _jsx("p", { className: 'text-xs text-muted-foreground mt-1', children: autoDetected
                    ? 'Streamer will be detected from the clip URL. You can override by typing here.'
                    : 'Type to search for streamers or enter manually' })] }));
}
