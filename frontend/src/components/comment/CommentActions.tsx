import React from 'react';
import { cn } from '@/lib/utils';
import { useDeleteComment, useReportComment, useIsAuthenticated, useToast } from '@/hooks';
import { Modal } from '@/components/ui';

interface CommentActionsProps {
  commentId: string;
  clipId: string;
  isAuthor: boolean;
  isAdmin: boolean;
  createdAt: string;
  onReply?: () => void;
  onEdit?: () => void;
  className?: string;
}

const EDIT_WINDOW_MINUTES = 15;

export const CommentActions: React.FC<CommentActionsProps> = ({
  commentId,
  clipId,
  isAuthor,
  isAdmin,
  createdAt,
  onReply,
  onEdit,
  className,
}) => {
  const isAuthenticated = useIsAuthenticated();
  const { mutate: deleteComment } = useDeleteComment();
  const { mutate: reportComment } = useReportComment();
  const toast = useToast();

  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showReportDialog, setShowReportDialog] = React.useState(false);
  const [reportReason, setReportReason] = React.useState<string>('spam');
  const [reportDescription, setReportDescription] = React.useState('');

  // Check if comment is within edit window
  const isWithinEditWindow = React.useMemo(() => {
    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const minutesSinceCreated = (now - createdTime) / (1000 * 60);
    return minutesSinceCreated <= EDIT_WINDOW_MINUTES;
  }, [createdAt]);

  const canEdit = isAuthor && isWithinEditWindow;
  const canDelete = isAuthor || isAdmin;

  const handleDelete = () => {
    deleteComment(commentId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
      },
    });
  };

  const handleReport = () => {
    reportComment(
      {
        comment_id: commentId,
        reason: reportReason as 'spam' | 'harassment' | 'off-topic' | 'misinformation' | 'other',
        description: reportDescription || undefined,
      },
      {
        onSuccess: () => {
          setShowReportDialog(false);
          setReportDescription('');
          toast.success('Comment reported. Thank you for helping keep our community safe.');
        },
      }
    );
  };

  const handleShare = () => {
    const url = `${window.location.origin}/clips/${clipId}#comment-${commentId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!');
    });
  };

  return (
    <>
      <div className={cn('flex items-center gap-3 text-sm', className)}>
        {isAuthenticated && (
          <button
            onClick={onReply}
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Reply
          </button>
        )}

        {canEdit && (
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Edit
          </button>
        )}

        {canDelete && (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="text-muted-foreground hover:text-error-500 transition-colors font-medium"
          >
            Delete
          </button>
        )}

        <button
          onClick={handleShare}
          className="text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          Share
        </button>

        {isAuthenticated && !isAuthor && (
          <button
            onClick={() => setShowReportDialog(true)}
            className="text-muted-foreground hover:text-error-500 transition-colors font-medium"
          >
            Report
          </button>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <Modal
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          title="Delete Comment"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-md bg-error-500 text-white hover:bg-error-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Report dialog */}
      {showReportDialog && (
        <Modal
          open={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          title="Report Comment"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background"
              >
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="off-topic">Off-topic</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background min-h-[100px] resize-y"
                placeholder="Provide additional context..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReportDialog(false)}
                className="px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                className="px-4 py-2 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              >
                Submit Report
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
