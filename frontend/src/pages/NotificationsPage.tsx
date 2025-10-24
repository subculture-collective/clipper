import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../lib/notification-api';
import type { NotificationFilter } from '../types/notification';
import { Button } from '../components/ui';
import { NotificationItem } from '../components/layout/NotificationItem';
import { Container } from '../components/layout';

export function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
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

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsReadMutation.mutate(notificationId);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <>
      <Helmet>
        <title>Notifications - Clipper</title>
      </Helmet>

      <Container>
        <div className="max-w-4xl mx-auto py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Stay updated with your activity
            </p>
          </div>

          {/* Actions Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filter === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setFilter('all');
                    setPage(1);
                  }}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'unread' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setFilter('unread');
                    setPage(1);
                  }}
                >
                  Unread
                  {data && data.unread_count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                      {data.unread_count}
                    </span>
                  )}
                </Button>
                <Button
                  variant={filter === 'read' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setFilter('read');
                    setPage(1);
                  }}
                >
                  Read
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {data && data.unread_count > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    Mark all as read
                  </Button>
                )}
                <Link to="/notifications/preferences">
                  <Button variant="ghost" size="sm">
                    ⚙️ Preferences
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading notifications...</p>
              </div>
            ) : isError ? (
              <div className="p-12 text-center text-red-600">
                <p>Failed to load notifications. Please try again later.</p>
              </div>
            ) : data && data.notifications.length > 0 ? (
              <>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.notifications.map((notification) => (
                    <div key={notification.id} className="relative group">
                      <NotificationItem
                        notification={notification}
                        onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                      />
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (window.confirm('Delete this notification?')) {
                            deleteMutation.mutate(notification.id);
                          }
                        }}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="Delete notification"
                      >
                        <svg
                          className="w-4 h-4 text-gray-500 dark:text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {(data.has_more || page > 1) && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      Page {page}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data.has_more}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-lg font-medium mb-1">No notifications</p>
                <p className="text-sm">
                  {filter === 'unread'
                    ? "You're all caught up!"
                    : filter === 'read'
                      ? "You haven't read any notifications yet"
                      : "You'll see notifications here when you get them"}
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
