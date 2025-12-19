import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatTimestamp, cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { ConfirmDialog } from './ConfirmDialog';
import type { ForumReply } from '@/types/forum';

interface ReplyItemProps {
  reply: ForumReply;
  depth: number;
  currentUserId?: string;
  onReply: (replyId: string) => void;
  onEdit: (replyId: string, content: string) => void;
  onDelete: (replyId: string) => void;
  className?: string;
}

export function ReplyItem({
  reply,
  depth,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  className,
}: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const timestamp = formatTimestamp(reply.created_at);
  const isAuthor = currentUserId === reply.user_id;
  const maxDepth = 10;

  // Soft-deleted reply
  if (reply.is_deleted) {
    return (
      <div
        className={cn(
          'p-3 bg-gray-800 rounded border border-gray-700',
          'text-sm text-gray-500 italic',
          className
        )}
      >
        [deleted]
      </div>
    );
  }

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== reply.content) {
      onEdit(reply.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(reply.content);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'bg-gray-900 rounded-lg border border-gray-700 p-4',
        className
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.username}`}
            alt={reply.username}
            size="md"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-white">{reply.username}</p>
              <p className="text-xs text-gray-500" title={timestamp.title}>
                {timestamp.display}
              </p>
            </div>

            {/* Actions */}
            {isAuthor && !isEditing && (
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Content or Editor */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={cn(
                  'w-full bg-gray-800 text-white rounded-lg p-3',
                  'border border-gray-700 focus:border-blue-500 focus:outline-none',
                  'resize-none'
                )}
                rows={4}
                placeholder="Edit your reply..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {reply.content}
                </ReactMarkdown>
              </div>

              {/* Reply button */}
              {depth < maxDepth && (
                <button
                  onClick={() => onReply(reply.id)}
                  className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Reply
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete(reply.id)}
        title="Delete Reply"
        message="Are you sure you want to delete this reply? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
