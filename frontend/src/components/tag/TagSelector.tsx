import React, { useState, useEffect, useRef } from 'react';
import { tagApi } from '../../lib/tag-api';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { Tag } from '../../types/tag';
import { TagChip } from './TagChip';

interface TagSelectorProps {
    selectedTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    maxTags?: number;
    allowCreate?: boolean;
    onCreateTag?: (name: string) => Promise<Tag | null> | Tag | null;
    helperText?: string;
    placeholder?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
    selectedTags,
    onTagsChange,
    maxTags = 15,
    allowCreate = false,
    onCreateTag,
    helperText,
    placeholder,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Tag[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useClickOutside(dropdownRef, () => setIsOpen(false));

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
                const filtered = response.tags.filter(
                    tag =>
                        !selectedTags.some(selected => selected.id === tag.id)
                );
                setSuggestions(filtered);
            } catch (error) {
                console.error('Failed to fetch tag suggestions:', error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, selectedTags]);

    const handleAddTag = (tag: Tag) => {
        if (selectedTags.length >= maxTags) {
            return;
        }

        onTagsChange([...selectedTags, tag]);
        setSearchQuery('');
        setSuggestions([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const slugify = (value: string) =>
        value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

    const handleCreateTag = async () => {
        const name = searchQuery.trim();
        if (!name || !allowCreate) return;

        // Avoid creating duplicates
        const alreadySelected = selectedTags.some(
            tag =>
                tag.slug === slugify(name) ||
                tag.name.toLowerCase() === name.toLowerCase()
        );
        if (alreadySelected) {
            setSearchQuery('');
            setIsOpen(false);
            return;
        }

        let created: Tag | null = null;
        if (onCreateTag) {
            try {
                created = await onCreateTag(name);
            } catch (error) {
                console.error('Failed to create tag', error);
            }
        }

        const fallback: Tag = {
            id: `temp-${Date.now()}`,
            name,
            slug: slugify(name),
            usage_count: 0,
            created_at: new Date().toISOString(),
        };

        handleAddTag(created || fallback);
    };

    const handleRemoveTag = (slug: string) => {
        onTagsChange(selectedTags.filter(tag => tag.slug !== slug));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setIsOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && allowCreate && searchQuery.trim()) {
            e.preventDefault();
            if (suggestions.length > 0) {
                handleAddTag(suggestions[0]);
            } else {
                void handleCreateTag();
            }
        }
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    return (
        <div className='space-y-3' ref={dropdownRef}>
            {/* Selected tags */}
            {selectedTags.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                    {selectedTags.map(tag => (
                        <TagChip
                            key={tag.id}
                            tag={tag}
                            size='medium'
                            removable
                            onRemove={handleRemoveTag}
                        />
                    ))}
                </div>
            )}

            {/* Input field */}
            <div className='relative'>
                <input
                    ref={inputRef}
                    type='text'
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        selectedTags.length >= maxTags ?
                            `Maximum ${maxTags} tags reached`
                        :   placeholder || 'Search for tags...'
                    }
                    disabled={selectedTags.length >= maxTags}
                    className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                />

                {/* Tag count indicator */}
                <div className='absolute right-3 top-2.5 text-sm text-gray-500 dark:text-gray-400'>
                    {selectedTags.length} / {maxTags}
                </div>

                {/* Dropdown suggestions */}
                {isOpen && searchQuery.length >= 2 && (
                    <div className='absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto'>
                        {isLoading ?
                            <div className='px-4 py-3 text-gray-500 dark:text-gray-400 text-sm'>
                                Searching...
                            </div>
                        : suggestions.length > 0 ?
                            <ul>
                                {suggestions.map(tag => (
                                    <li key={tag.id}>
                                        <button
                                            onClick={() => handleAddTag(tag)}
                                            className='w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between'
                                        >
                                            <div className='flex items-center gap-2'>
                                                <div
                                                    className='w-3 h-3 rounded-full'
                                                    style={{
                                                        backgroundColor:
                                                            tag.color ||
                                                            '#4169E1',
                                                    }}
                                                />
                                                <span className='text-gray-900 dark:text-gray-100'>
                                                    {tag.name}
                                                </span>
                                            </div>
                                            <span className='text-xs text-gray-500 dark:text-gray-400'>
                                                {tag.usage_count} clips
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        :   <div className='px-4 py-3 text-gray-500 dark:text-gray-400 text-sm'>
                                {allowCreate ?
                                    <button
                                        type='button'
                                        onClick={() => void handleCreateTag()}
                                        className='text-primary hover:underline'
                                        disabled={!searchQuery.trim()}
                                    >
                                        Add "{searchQuery.trim()}" as a new tag
                                    </button>
                                :   'No tags found.'}
                            </div>
                        }
                    </div>
                )}
            </div>

            {/* Help text */}
            {helperText ?
                <p className='text-sm text-muted-foreground'>{helperText}</p>
            : selectedTags.length >= maxTags ?
                <p className='text-sm text-yellow-600 dark:text-yellow-400'>
                    Maximum number of tags reached. Remove a tag to add a new
                    one.
                </p>
            :   null}
        </div>
    );
};
