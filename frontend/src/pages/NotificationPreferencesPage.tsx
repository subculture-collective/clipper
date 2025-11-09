import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router-dom';
import { getNotificationPreferences, updateNotificationPreferences } from '../lib/notification-api';
import type { NotificationPreferences } from '../types/notification';
import { Button } from '../components/ui';
import { Container } from '../components/layout';

export function NotificationPreferencesPage() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<NotificationPreferences>>({});

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: getNotificationPreferences,
  });

  // Update form data when preferences load
  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const updateMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsSaving(false);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    updateMutation.mutate(formData);
  };

  const handleToggle = (field: keyof NotificationPreferences) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !(prev[field] as boolean),
    }));
  };

  const handleEmailDigestChange = (value: 'immediate' | 'daily' | 'weekly') => {
    setFormData((prev) => ({
      ...prev,
      email_digest: value,
    }));
  };

  if (isLoading) {
    return (
      <Container>
        <div className="max-w-2xl mx-auto py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading preferences...</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Notification Preferences - Clipper</title>
      </Helmet>

      <Container>
        <div className="max-w-2xl mx-auto py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/notifications"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-2 inline-block"
            >
              ← Back to Notifications
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Notification Preferences
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Customize how and when you receive notifications
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                General Settings
              </h2>

              <div className="space-y-4">
                <ToggleSwitch
                  label="In-App Notifications"
                  description="Show notifications in the app"
                  checked={formData.in_app_enabled ?? true}
                  onChange={() => handleToggle('in_app_enabled')}
                />

                <ToggleSwitch
                  label="Email Notifications"
                  description="Receive notifications via email"
                  checked={formData.email_enabled ?? false}
                  onChange={() => handleToggle('email_enabled')}
                />

                {formData.email_enabled && (
                  <div className="ml-6 pt-2 space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Frequency
                    </label>
                    <select
                      value={formData.email_digest ?? 'daily'}
                      onChange={(e) =>
                        handleEmailDigestChange(e.target.value as 'immediate' | 'daily' | 'weekly')
                      }
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily Digest</option>
                      <option value="weekly">Weekly Digest</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Notification Types */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notification Types
              </h2>

              <div className="space-y-4">
                <ToggleSwitch
                  label="Replies"
                  description="When someone replies to your comment"
                  checked={formData.notify_replies ?? true}
                  onChange={() => handleToggle('notify_replies')}
                />

                <ToggleSwitch
                  label="Mentions"
                  description="When someone mentions you in a comment"
                  checked={formData.notify_mentions ?? true}
                  onChange={() => handleToggle('notify_mentions')}
                />

                <ToggleSwitch
                  label="Vote Milestones"
                  description="When your comment reaches vote milestones (10, 25, 50, etc.)"
                  checked={formData.notify_votes ?? false}
                  onChange={() => handleToggle('notify_votes')}
                />

                <ToggleSwitch
                  label="Badges & Achievements"
                  description="When you earn a badge or rank up"
                  checked={formData.notify_badges ?? true}
                  onChange={() => handleToggle('notify_badges')}
                />

                <ToggleSwitch
                  label="Rank Up"
                  description="When you advance to a new rank"
                  checked={formData.notify_rank_up ?? true}
                  onChange={() => handleToggle('notify_rank_up')}
                />

                <ToggleSwitch
                  label="Favorited Clip Comments"
                  description="When someone comments on a clip you favorited"
                  checked={formData.notify_favorited_clip_comment ?? true}
                  onChange={() => handleToggle('notify_favorited_clip_comment')}
                />

                <ToggleSwitch
                  label="Moderation Actions"
                  description="When your content is removed, warnings, or account actions"
                  checked={formData.notify_moderation ?? true}
                  onChange={() => handleToggle('notify_moderation')}
                  disabled
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Link to="/notifications">
                <Button variant="ghost">Cancel</Button>
              </Link>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>

            {updateMutation.isSuccess && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-green-800 dark:text-green-200">
                Preferences saved successfully!
              </div>
            )}

            {updateMutation.isError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-200">
                Failed to save preferences. Please try again.
              </div>
            )}
          </form>
        </div>
      </Container>
    </>
  );
}

// Toggle Switch Component
interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function ToggleSwitch({ label, description, checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900 dark:text-white">{label}</label>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
