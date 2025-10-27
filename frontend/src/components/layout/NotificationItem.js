import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
export function NotificationItem({ notification, onClick }) {
    const getNotificationIcon = (type) => {
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
    const content = (_jsx("div", { className: `p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer ${!notification.is_read ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`, onClick: onClick, children: _jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: "flex-shrink-0 text-2xl", "aria-hidden": "true", children: getNotificationIcon(notification.type) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: notification.title }), notification.message && (_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: notification.message }))] }), !notification.is_read && (_jsx("div", { className: "flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-1", "aria-label": "Unread" }))] }), notification.source_display_name && (_jsxs("div", { className: "flex items-center gap-2 mt-2", children: [notification.source_avatar_url && (_jsx("img", { src: notification.source_avatar_url, alt: notification.source_display_name, className: "w-5 h-5 rounded-full" })), _jsx("span", { className: "text-xs text-gray-500 dark:text-gray-500", children: notification.source_display_name })] })), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-500 mt-2", children: formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }) })] })] }) }));
    // Wrap with link if notification has a link
    if (notification.link) {
        return (_jsx(Link, { to: notification.link, className: "block", children: content }));
    }
    return content;
}
