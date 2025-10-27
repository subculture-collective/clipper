import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, } from '../lib/notification-api';
import { Button } from '../components/ui';
import { NotificationItem } from '../components/layout/NotificationItem';
import { Container } from '../components/layout';
export function NotificationsPage() {
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['notifications', 'list', filter, page],
        queryFn: () => getNotifications(filter, page, 20),
    });
    const markAsReadMutation = useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
    const markAllAsReadMutation = useMutation({
        mutationFn: markAllNotificationsAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
    const deleteMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
    const handleNotificationClick = (notificationId, isRead) => {
        if (!isRead) {
            markAsReadMutation.mutate(notificationId);
        }
    };
    const handleMarkAllAsRead = () => {
        markAllAsReadMutation.mutate();
    };
    return (_jsxs(_Fragment, { children: [_jsx(Helmet, { children: _jsx("title", { children: "Notifications - Clipper" }) }), _jsx(Container, { children: _jsxs("div", { className: "max-w-4xl mx-auto py-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white mb-2", children: "Notifications" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Stay updated with your activity" })] }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6", children: _jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsx(Button, { variant: filter === 'all' ? 'primary' : 'ghost', size: "sm", onClick: () => {
                                                    setFilter('all');
                                                    setPage(1);
                                                }, children: "All" }), _jsxs(Button, { variant: filter === 'unread' ? 'primary' : 'ghost', size: "sm", onClick: () => {
                                                    setFilter('unread');
                                                    setPage(1);
                                                }, children: ["Unread", data && data.unread_count > 0 && (_jsx("span", { className: "ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full", children: data.unread_count }))] }), _jsx(Button, { variant: filter === 'read' ? 'primary' : 'ghost', size: "sm", onClick: () => {
                                                    setFilter('read');
                                                    setPage(1);
                                                }, children: "Read" })] }), _jsxs("div", { className: "flex gap-2", children: [data && data.unread_count > 0 && (_jsx(Button, { variant: "ghost", size: "sm", onClick: handleMarkAllAsRead, disabled: markAllAsReadMutation.isPending, children: "Mark all as read" })), _jsx(Link, { to: "/notifications/preferences", children: _jsx(Button, { variant: "ghost", size: "sm", children: "\u2699\uFE0F Preferences" }) })] })] }) }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden", children: isLoading ? (_jsxs("div", { className: "p-12 text-center", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary-600" }), _jsx("p", { className: "mt-4 text-gray-600 dark:text-gray-400", children: "Loading notifications..." })] })) : isError ? (_jsx("div", { className: "p-12 text-center text-red-600", children: _jsx("p", { children: "Failed to load notifications. Please try again later." }) })) : data && data.notifications.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "divide-y divide-gray-200 dark:divide-gray-700", children: data.notifications.map((notification) => (_jsxs("div", { className: "relative group", children: [_jsx(NotificationItem, { notification: notification, onClick: () => handleNotificationClick(notification.id, notification.is_read) }), _jsx("button", { onClick: (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (window.confirm('Delete this notification?')) {
                                                            deleteMutation.mutate(notification.id);
                                                        }
                                                    }, className: "absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700", "aria-label": "Delete notification", children: _jsx("svg", { className: "w-4 h-4 text-gray-500 dark:text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }, notification.id))) }), (data.has_more || page > 1) && (_jsxs("div", { className: "p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: "px-4 py-2 text-sm text-gray-600 dark:text-gray-400", children: ["Page ", page] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setPage((p) => p + 1), disabled: !data.has_more, children: "Next" })] }))] })) : (_jsxs("div", { className: "p-12 text-center text-gray-500 dark:text-gray-400", children: [_jsx("svg", { className: "w-16 h-16 mx-auto mb-4 opacity-50", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" }) }), _jsx("p", { className: "text-lg font-medium mb-1", children: "No notifications" }), _jsx("p", { className: "text-sm", children: filter === 'unread'
                                            ? "You're all caught up!"
                                            : filter === 'read'
                                                ? "You haven't read any notifications yet"
                                                : "You'll see notifications here when you get them" })] })) })] }) })] }));
}
