import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { Container, SEO } from '@/components';
import { forumApi } from '@/lib/forum-api';
import { tagApi } from '@/lib/tag-api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types/tag';

export function CreateThread() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const createThreadMutation = useMutation({
    mutationFn: forumApi.createThread,
    onSuccess: (thread) => {
      showToast('Thread created successfully', 'success');
      navigate(`/forum/threads/${thread.id}`);
    },
    onError: () => {
      showToast('Failed to create thread', 'error');
    },
  });

  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagSearching, setTagSearching] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Fetch popular tags on mount
  useEffect(() => {
    tagApi.listTags({ sort: 'popularity', limit: 8 }).then(res => {
      setPopularTags(res.tags || []);
    }).catch(() => {});
  }, []);

  // Search tags as user types
  useEffect(() => {
    if (tagInput.length < 1) {
      setTagSuggestions([]);
      return;
    }
    setTagSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await tagApi.searchTags(tagInput, 8);
        setTagSuggestions((res.tags || []).filter(t => !tags.includes(t.name.toLowerCase())));
      } catch {
        setTagSuggestions([]);
      } finally {
        setTagSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [tagInput, tags]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddTag = useCallback((tagName?: string) => {
    const name = (tagName || tagInput).trim().toLowerCase();
    if (name && !tags.includes(name) && tags.length < 5) {
      setTags(prev => [...prev, name]);
      setTagInput('');
      setShowTagDropdown(false);
      tagInputRef.current?.focus();
    }
  }, [tagInput, tags]);

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagSuggestions.length > 0) {
        handleAddTag(tagSuggestions[0].name);
      } else if (tagInput.trim()) {
        handleAddTag();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (title.length < 3 || title.length > 200) {
      showToast('Title must be between 3 and 200 characters', 'error');
      return;
    }

    if (content.length < 10 || content.length > 5000) {
      showToast('Content must be between 10 and 5000 characters', 'error');
      return;
    }

    await createThreadMutation.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return (
    <>
      <SEO
        title="Create New Thread"
        description="Start a new discussion in the community forum"
      />
      <Container className="py-6">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <Link
            to="/forum"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Forum</span>
          </Link>

          {/* Header */}
          <h1 className="text-3xl font-bold text-white mb-6">
            Start a New Discussion
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your discussion about?"
                maxLength={200}
                className={cn(
                  'w-full px-4 py-3 bg-gray-800 border border-gray-700',
                  'text-white placeholder-gray-400 rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {title.length}/200 characters
              </p>
            </div>

            {/* Content */}
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts... (Markdown supported)"
                rows={10}
                maxLength={5000}
                className={cn(
                  'w-full px-4 py-3 bg-gray-800 border border-gray-700',
                  'text-white placeholder-gray-400 rounded-lg resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                )}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {content.length}/5000 characters • Markdown formatting is supported
              </p>
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Tags (optional)
              </label>

              {/* Selected tags */}
              {tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand border border-brand/30 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-error-500 transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tag input with auto-suggest */}
              <div className="relative" ref={tagDropdownRef}>
                <input
                  ref={tagInputRef}
                  id="tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setShowTagDropdown(true); }}
                  onFocus={() => setShowTagDropdown(true)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={
                    tags.length >= 5
                      ? 'Maximum 5 tags reached'
                      : 'e.g. help, discussion, suggestion, bug-report, feature-request...'
                  }
                  maxLength={50}
                  disabled={tags.length >= 5}
                  className={cn(
                    'w-full px-4 py-2 border border-border rounded-lg',
                    'bg-surface-raised text-text-primary placeholder-text-tertiary',
                    'focus:outline-none focus:ring-2 focus:ring-brand',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                />
                <div className="absolute right-3 top-2.5 text-xs text-text-tertiary">
                  {tags.length}/5
                </div>

                {/* Dropdown */}
                {showTagDropdown && tags.length < 5 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {tagSearching ? (
                      <div className="px-4 py-3 text-text-secondary text-sm">Searching...</div>
                    ) : tagInput.length >= 1 && tagSuggestions.length > 0 ? (
                      <ul>
                        {tagSuggestions.map(tag => (
                          <li key={tag.id}>
                            <button
                              type="button"
                              onClick={() => handleAddTag(tag.name)}
                              className="w-full px-4 py-2 text-left hover:bg-surface-hover flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color || '#7C3AED' }} />
                                <span className="text-text-primary text-sm">{tag.name}</span>
                              </div>
                              <span className="text-[11px] text-text-tertiary">{tag.usage_count} clips</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : tagInput.length >= 1 ? (
                      <div className="px-4 py-3 text-text-secondary text-sm">
                        Press Enter to add &ldquo;{tagInput.trim()}&rdquo;
                      </div>
                    ) : popularTags.length > 0 ? (
                      <>
                        <div className="px-4 py-2 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
                          Popular tags
                        </div>
                        <ul>
                          {popularTags
                            .filter(t => !tags.includes(t.name.toLowerCase()))
                            .map(tag => (
                              <li key={tag.id}>
                                <button
                                  type="button"
                                  onClick={() => handleAddTag(tag.name)}
                                  className="w-full px-4 py-2 text-left hover:bg-surface-hover flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color || '#7C3AED' }} />
                                    <span className="text-text-primary text-sm">{tag.name}</span>
                                  </div>
                                  <span className="text-[11px] text-text-tertiary">{tag.usage_count} clips</span>
                                </button>
                              </li>
                            ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              <p className="mt-1 text-xs text-text-tertiary">
                Tags help others find your discussion
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/forum')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !title.trim() ||
                  !content.trim() ||
                  createThreadMutation.isPending
                }
                className={cn(
                  'px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg',
                  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {createThreadMutation.isPending
                  ? 'Creating...'
                  : 'Create Thread'}
              </button>
            </div>
          </form>
        </div>
      </Container>
    </>
  );
}
