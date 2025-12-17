import React, { useState } from 'react';
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
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this message? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await chatApi.deleteMessage(message.id, {
        reason: 'Deleted by moderator',
      });
      onMessageDeleted?.();
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
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
          onClick={handleDelete}
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
