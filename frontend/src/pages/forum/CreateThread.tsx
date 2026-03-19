import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Container, SEO } from '@/components';
import { forumApi } from '@/lib/forum-api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

export const FORUM_TOPICS = [
  { value: 'discussion', label: 'Discussion', color: '#3B82F6' },
  { value: 'help', label: 'Help', color: '#22C55E' },
  { value: 'suggestion', label: 'Suggestion', color: '#F59E0B' },
  { value: 'bug-report', label: 'Bug Report', color: '#EF4444' },
  { value: 'feature-request', label: 'Feature Request', color: '#8B5CF6' },
  { value: 'news', label: 'News', color: '#06B6D4' },
  { value: 'clip-highlight', label: 'Clip Highlight', color: '#F97316' },
  { value: 'meta', label: 'Meta', color: '#6366F1' },
] as const;

export function CreateThread() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');

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
      tags: topic ? [topic] : undefined,
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
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Forum</span>
          </Link>

          {/* Header */}
          <h1 className="text-3xl font-bold text-text-primary mb-6">
            Start a New Discussion
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Topic <span className="text-error-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {FORUM_TOPICS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTopic(topic === t.value ? '' : t.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer',
                      topic === t.value
                        ? 'text-white border-transparent'
                        : 'text-text-secondary border-border hover:border-text-tertiary hover:text-text-primary',
                    )}
                    style={topic === t.value ? { backgroundColor: t.color } : undefined}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {!topic && (
                <p className="mt-1.5 text-xs text-text-tertiary">
                  Select a topic to categorize your thread
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Title <span className="text-error-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your discussion about?"
                maxLength={200}
                className={cn(
                  'w-full px-4 py-3 border border-border rounded-lg',
                  'bg-surface-raised text-text-primary placeholder-text-tertiary',
                  'focus:outline-none focus:ring-2 focus:ring-brand'
                )}
                required
              />
              <p className="mt-1 text-xs text-text-tertiary">
                {title.length}/200 characters
              </p>
            </div>

            {/* Content */}
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Content <span className="text-error-500">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts... (Markdown supported)"
                rows={10}
                maxLength={5000}
                className={cn(
                  'w-full px-4 py-3 border border-border rounded-lg resize-none',
                  'bg-surface-raised text-text-primary placeholder-text-tertiary',
                  'focus:outline-none focus:ring-2 focus:ring-brand'
                )}
                required
              />
              <p className="mt-1 text-xs text-text-tertiary">
                {content.length}/5000 characters • Markdown formatting is supported
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/forum')}
                className="px-6 py-3 bg-surface-raised hover:bg-surface-hover text-text-primary font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !title.trim() ||
                  !content.trim() ||
                  !topic ||
                  createThreadMutation.isPending
                }
                className={cn(
                  'px-6 py-3 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg',
                  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
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
