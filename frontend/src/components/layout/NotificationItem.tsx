import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '../../types/notification';

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reply':
        return '💬';
      case 'mention':
        return '@';
      case 'vote_milestone':
        return '🎉';
      case 'badge_earned':
        return '🏅';
      case 'rank_up':
        return '⬆️';
      case 'favorited_clip_comment':
        return '⭐';
      case 'content_removed':
        return '🚫';
      case 'warning':
        return '⚠️';
      case 'ban':
        return '🔨';
      case 'submission_approved':
        return '✅';
      case 'submission_rejected':
        return '❌';
      default:
        return '🔔';
    }
  };

  const content = (
    <div
      className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer ${
        !notification.is_read ? 'bg-primary-50 dark:bg-primary-900/10' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-2xl" aria-hidden="true">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {notification.title}
              </p>
              {notification.message && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {notification.message}
                </p>
              )}
            </div>

            {/* Unread indicator */}
            {!notification.is_read && (
              <div
                className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-1"
                aria-label="Unread"
              />
            )}
          </div>

          {/* Source user */}
          {notification.source_display_name && (
            <div className="flex items-center gap-2 mt-2">
              {notification.source_avatar_url && (
                <img
                  src={notification.source_avatar_url}
                  alt={notification.source_display_name}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {notification.source_display_name}
              </span>
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );

  // Wrap with link if notification has a link
  if (notification.link) {
    return (
      <Link to={notification.link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
