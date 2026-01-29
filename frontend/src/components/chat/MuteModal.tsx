import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

interface MuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMute: (durationMinutes: number | null, reason: string) => Promise<void>;
  username: string;
}

const MUTE_DURATION_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '24 hours', value: 1440 },
  { label: 'Permanent', value: null },
];

export const MuteModal: React.FC<MuteModalProps> = ({
  isOpen,
  onClose,
  onMute,
  username,
}) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<number | null>(60); // Default 1 hour
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onMute(duration, reason);
      setReason('');
      setDuration(60);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mute user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Mute User" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You are about to mute <strong>{username}</strong>
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="mute-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mute Duration
              </label>
              <select
                id="mute-duration"
                value={duration === null ? 'permanent' : duration}
                onChange={(e) =>
                  setDuration(e.target.value === 'permanent' ? null : Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              >
                {MUTE_DURATION_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value === null ? 'permanent' : option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mute-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (optional)
              </label>
              <textarea
                id="mute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Enter reason for muting..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {reason.length}/1000 characters
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Muting...' : 'Mute User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
