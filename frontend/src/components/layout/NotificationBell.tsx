import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    getNotifications,
    getUnreadCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '../../lib/notification-api';
import type { Notification } from '../../types/notification';
import { NotificationItem } from './NotificationItem';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Get unread count
    const { data: unreadCount = 0, refetch: refetchCount } = useQuery({
        queryKey: ['notifications', 'count'],
        queryFn: getUnreadCount,
        refetchInterval: 30000, // Poll every 30 seconds
    });

    // Get recent notifications (for dropdown)
    const { data: notificationsData, refetch: refetchNotifications } = useQuery(
        {
            queryKey: ['notifications', 'recent'],
            queryFn: () => getNotifications('all', 1, 5),
            enabled: isOpen, // Only fetch when dropdown is open
        }
    );

    // Mark notification as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            refetchCount();
        },
    });

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: markAllNotificationsAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            refetchCount();
        },
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Refresh notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            refetchNotifications();
        }
    }, [isOpen, refetchNotifications]);

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsReadMutation.mutate(notification.id);
        }
        setIsOpen(false);
    };

    const handleMarkAllAsRead = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        markAllAsReadMutation.mutate();
    };

    return (
        <div
            className='relative'
            ref={dropdownRef}
        >
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className='hover:bg-gray-100 dark:hover:bg-gray-800 relative p-2 transition-colors rounded-lg'
                aria-label='Notifications'
            >
                {/* Bell Icon */}
                <svg
                    className='dark:text-gray-400 w-6 h-6 text-gray-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                >
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
                    />
                </svg>

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className='min-w-5 absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full'>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className='w-80 dark:bg-gray-800 dark:border-gray-700 absolute right-0 z-50 mt-2 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg'>
                    {/* Header */}
                    <div className='dark:border-gray-700 flex items-center justify-between p-4 border-b border-gray-200'>
                        <h3 className='dark:text-white text-lg font-semibold text-gray-900'>
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className='text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm'
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className='max-h-96 overflow-y-auto'>
                        {notificationsData &&
                        notificationsData?.notifications?.length > 0 ? (
                            notificationsData.notifications.map(
                                (notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={() =>
                                            handleNotificationClick(
                                                notification
                                            )
                                        }
                                    />
                                )
                            )
                        ) : (
                            <div className='dark:text-gray-400 p-8 text-center text-gray-500'>
                                <svg
                                    className='w-12 h-12 mx-auto mb-2 opacity-50'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
                                    />
                                </svg>
                                <p className='text-sm'>No notifications yet</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notificationsData &&
                        notificationsData?.notifications?.length > 0 && (
                            <div className='dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 border-t border-gray-200'>
                                <Link
                                    to='/notifications'
                                    className='text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 block text-sm font-medium text-center'
                                    onClick={() => setIsOpen(false)}
                                >
                                    See all notifications
                                </Link>
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}
