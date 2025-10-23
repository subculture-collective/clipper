import React, { useState, useEffect, useRef } from "react";
import { tagApi } from "../../lib/tag-api";
import type { Tag } from "../../types/tag";
import { TagChip } from "./TagChip";

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  maxTags?: number;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  maxTags = 15,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
        const filtered = response.tags.filter(
          (tag) => !selectedTags.some((selected) => selected.id === tag.id)
        );
        setSuggestions(filtered);
      } catch (error) {
        console.error("Failed to fetch tag suggestions:", error);
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
    setSearchQuery("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (slug: string) => {
    onTagsChange(selectedTags.filter((tag) => tag.slug !== slug));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="space-y-3" ref={dropdownRef}>
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              size="medium"
              removable
              onRemove={handleRemoveTag}
            />
          ))}
        </div>
      )}

      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={
            selectedTags.length >= maxTags
              ? `Maximum ${maxTags} tags reached`
              : "Search for tags..."
          }
          disabled={selectedTags.length >= maxTags}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Tag count indicator */}
        <div className="absolute right-3 top-2.5 text-sm text-gray-500 dark:text-gray-400">
          {selectedTags.length} / {maxTags}
        </div>

        {/* Dropdown suggestions */}
        {isOpen && searchQuery.length >= 2 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                Searching...
              </div>
            ) : suggestions.length > 0 ? (
              <ul>
                {suggestions.map((tag) => (
                  <li key={tag.id}>
                    <button
                      onClick={() => handleAddTag(tag)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color || "#4169E1" }}
                        />
                        <span className="text-gray-900 dark:text-gray-100">
                          {tag.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {tag.usage_count} clips
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                No tags found. Tags will be created when you save.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help text */}
      {selectedTags.length >= maxTags && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          Maximum number of tags reached. Remove a tag to add a new one.
        </p>
      )}
    </div>
  );
};
