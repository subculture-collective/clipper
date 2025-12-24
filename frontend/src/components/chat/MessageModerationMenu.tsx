import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { BanModal } from './BanModal';
import { MuteModal } from './MuteModal';
import * as chatApi from '@/lib/chat-api';

interface MessageModerationMenuProps {
  message: {
    id: string;
    user_id: string;
    username: string;
  };
  channelId: string;
  onMessageDeleted?: () => void;
  onUserBanned?: () => void;
  onUserMuted?: () => void;
}

export const MessageModerationMenu: React.FC<MessageModerationMenuProps> = ({
  message,
  channelId,
  onMessageDeleted,
  onUserBanned,
  onUserMuted,
}) => {
  const [showBanModal, setShowBanModal] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await chatApi.deleteMessage(message.id, {
        reason: 'Deleted by moderator',
      });
      setShowDeleteConfirm(false);
      onMessageDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBan = async (durationMinutes: number | null, reason: string) => {
    await chatApi.banUser(channelId, {
      user_id: message.user_id,
      duration_minutes: durationMinutes ?? undefined,
      reason: reason || undefined,
    });
    onUserBanned?.();
  };

  const handleMute = async (durationMinutes: number | null, reason: string) => {
    await chatApi.muteUser(channelId, {
      user_id: message.user_id,
      duration_minutes: durationMinutes ?? undefined,
      reason: reason || undefined,
    });
    onUserMuted?.();
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:underline disabled:opacity-50"
          title="Delete message"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <button
          onClick={() => setShowMuteModal(true)}
          className="text-xs text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 hover:underline"
          title="Mute user"
        >
          Mute
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <button
          onClick={() => setShowBanModal(true)}
          className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:underline"
          title="Ban user"
        >
          Ban
        </button>
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <Modal
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Message"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Delete this message? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <BanModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        onBan={handleBan}
        username={message.username}
      />

      <MuteModal
        isOpen={showMuteModal}
        onClose={() => setShowMuteModal(false)}
        onMute={handleMute}
        username={message.username}
      />
    </>
  );
};
