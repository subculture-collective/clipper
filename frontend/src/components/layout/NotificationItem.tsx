import { Link } from 'react-router-dom';
import { formatTimestamp } from '@/lib/utils';
import type { Notification } from '../../types/notification';

interface NotificationItemProps {
    notification: Notification;
    onClick?: () => void;
}

export function NotificationItem({
    notification,
    onClick,
}: NotificationItemProps) {
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
            className={`p-4 border-b border-border hover:bg-muted transition-colors cursor-pointer ${
                !notification.is_read ?
                    'bg-primary-50 dark:bg-primary-900/10'
                :   ''
            }`}
            onClick={onClick}
        >
            <div className='flex gap-3'>
                {/* Icon */}
                <div className='flex-shrink-0 text-2xl' aria-hidden='true'>
                    {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-2'>
                        <div className='flex-1'>
                            <p className='text-sm font-medium'>
                                {notification.title}
                            </p>
                            {notification.message && (
                                <p className='text-sm text-muted-foreground mt-1'>
                                    {notification.message}
                                </p>
                            )}
                        </div>

                        {/* Unread indicator */}
                        {!notification.is_read && (
                            <div
                                className='flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-1'
                                aria-label='Unread'
                            />
                        )}
                    </div>

                    {/* Source user */}
                    {notification.source_display_name && (
                        <div className='flex items-center gap-2 mt-2'>
                            {notification.source_avatar_url && (
                                <img
                                    src={notification.source_avatar_url}
                                    alt={notification.source_display_name}
                                    className='w-5 h-5 rounded-full'
                                />
                            )}
                            <span className='text-xs text-muted-foreground'>
                                {notification.source_display_name}
                            </span>
                        </div>
                    )}

                    {/* Timestamp */}
                    <p
                        className='text-xs text-muted-foreground mt-2'
                        title={formatTimestamp(notification.created_at).title}
                    >
                        {formatTimestamp(notification.created_at).display}
                    </p>
                </div>
            </div>
        </div>
    );

    // Wrap with link if notification has a link
    if (notification.link) {
        return (
            <Link to={notification.link} className='block cursor-pointer'>
                {content}
            </Link>
        );
    }

    return content;
}
