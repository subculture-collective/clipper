import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Container, SEO } from '@/components';
import { forumApi } from '@/lib/forum-api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

export function CreateThread() {
  const { user } = useAuth();
  const { addToast } = useToast();
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
      addToast('Thread created successfully', 'success');
      navigate(`/forum/threads/${thread.id}`);
    },
    onError: () => {
      addToast('Failed to create thread', 'error');
    },
  });

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    if (title.length < 3 || title.length > 200) {
      addToast('Title must be between 3 and 200 characters', 'error');
      return;
    }

    if (content.length < 10 || content.length > 5000) {
      addToast('Content must be between 10 and 5000 characters', 'error');
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
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Tags (optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Add a tag (max 5)"
                  maxLength={50}
                  disabled={tags.length >= 5}
                  className={cn(
                    'flex-1 px-4 py-2 bg-gray-800 border border-gray-700',
                    'text-white placeholder-gray-400 rounded-lg',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 5}
                  className={cn(
                    'px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg',
                    'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
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
