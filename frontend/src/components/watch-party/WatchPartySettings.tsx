'use client';

import { useState } from 'react';
import { updateWatchPartySettings } from '@/lib/watch-party-api';
import type { UpdateWatchPartySettingsRequest } from '@/types/watchParty';

interface WatchPartySettingsProps {
  partyId: string;
  currentPrivacy: 'public' | 'friends' | 'invite';
  isHost: boolean;
  onSettingsUpdated?: () => void;
}

export function WatchPartySettings({
  partyId,
  currentPrivacy,
  isHost,
  onSettingsUpdated,
}: WatchPartySettingsProps) {
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'invite'>(currentPrivacy);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isHost) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Only the host can modify watch party settings.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const request: UpdateWatchPartySettingsRequest = {
        privacy,
      };

      // Include password based on privacy setting
      if (privacy === 'invite') {
        // If password field has content, update it
        if (password.trim()) {
          request.password = password;
        }
        // If password field is empty for invite-only, keep existing password (don't send password field)
      } else {
        // Clear password when not using invite-only mode
        request.password = '';
      }

      await updateWatchPartySettings(partyId, request);
      setSuccess(true);
      setPassword(''); // Clear password field after successful update
      
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Watch Party Settings
      </h3>

      <div className="space-y-4">
        {/* Privacy Settings */}
        <div>
          <label
            htmlFor="privacy-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Privacy
          </label>
          <select
            id="privacy-select"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends' | 'invite')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="public">Public - Anyone can join</option>
            <option value="friends">Friends Only - Only friends can join</option>
            <option value="invite">Invite Only - Requires password</option>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {privacy === 'public' && 'Anyone with the invite link can join'}
            {privacy === 'friends' && 'Only users on your friends list can join'}
            {privacy === 'invite' && 'Requires a password to join'}
          </p>
        </div>

        {/* Password Protection (only for invite-only) */}
        {privacy === 'invite' && (
          <div>
            <label
              htmlFor="password-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Password Protection
            </label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (optional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to keep current password, or enter a new password to update
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-600 dark:text-green-400">
              Settings updated successfully!
            </p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
