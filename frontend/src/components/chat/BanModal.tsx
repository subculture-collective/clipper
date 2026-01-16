import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { getBanReasonTemplates, type BanReasonTemplate } from '@/lib/moderation-api';

interface BanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBan: (durationMinutes: number | null, reason: string) => Promise<void>;
  username: string;
  title?: string;
  broadcasterID?: string; // Optional broadcaster ID for loading channel-specific templates
}

const DURATION_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '24 hours', value: 1440 },
  { label: '7 days', value: 10080 },
  { label: 'Permanent', value: null },
];

export const BanModal: React.FC<BanModalProps> = ({
  isOpen,
  onClose,
  onBan,
  username,
  title = 'Ban User',
  broadcasterID,
}) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<BanReasonTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      setTemplatesLoading(true);
      getBanReasonTemplates(broadcasterID, true)
        .then(response => {
          setTemplates(response.templates);
        })
        .catch(err => {
          console.error('Failed to load templates:', err);
        })
        .finally(() => {
          setTemplatesLoading(false);
        });
    }
  }, [isOpen, broadcasterID, templates.length]);
  
  // Apply template when selected
  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setReason(template.reason);
        // Convert seconds to minutes
        if (template.duration_seconds === null || template.duration_seconds === undefined) {
          setDuration(null); // Permanent
        } else {
          setDuration(Math.round(template.duration_seconds / 60));
        }
      }
    }
  }, [selectedTemplate, templates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onBan(duration, reason);
      setReason('');
      setDuration(null);
      setSelectedTemplate('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ban user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You are about to ban <strong>{username}</strong>
          </p>

          <div className="space-y-4">
            {/* Template Selection */}
            <div>
              <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ban Reason Template (Optional)
              </label>
              <select
                id="template-select"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                disabled={isSubmitting || templatesLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">-- Select a template --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              {templatesLoading && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Loading templates...
                </p>
              )}
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ban Duration
              </label>
              <select
                id="duration"
                value={duration === null ? 'permanent' : duration}
                onChange={(e) =>
                  setDuration(e.target.value === 'permanent' ? null : Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value === null ? 'permanent' : option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (optional)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Enter reason for ban..."
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
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Banning...' : 'Ban User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
