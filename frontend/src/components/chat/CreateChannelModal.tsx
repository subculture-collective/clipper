import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (channelId: string) => void;
}

/**
 * Modal for creating a new chat channel
 */
export function CreateChannelModal({ open, onClose, onSuccess }: CreateChannelModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState<'public' | 'private'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description: description || undefined,
          channel_type: channelType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create channel');
      }

      const channel = await response.json();
      
      // Reset form
      setName('');
      setDescription('');
      setChannelType('public');
      
      // Call success callback or navigate
      if (onSuccess) {
        onSuccess(channel.id);
      } else {
        navigate(`/chat/${channel.id}`);
      }
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setName('');
      setDescription('');
      setChannelType('public');
      onClose();
    }
  };

  return (
    <Modal 
      open={open} 
      onClose={handleClose} 
      title="Create Channel"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="channel-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Channel Name *
          </label>
          <Input
            id="channel-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., general, gaming, off-topic"
            required
            maxLength={100}
            disabled={isSubmitting}
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="channel-description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description (Optional)
          </label>
          <TextArea
            id="channel-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this channel about?"
            maxLength={500}
            disabled={isSubmitting}
            rows={3}
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="channel-type" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Channel Type *
          </label>
          <select
            id="channel-type"
            value={channelType}
            onChange={(e) => setChannelType(e.target.value as 'public' | 'private')}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="public">Public - Anyone can join</option>
            <option value="private">Private - Invite only</option>
          </select>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {channelType === 'public' 
              ? 'Anyone can discover and join this channel'
              : 'Only invited members can join this channel'}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            isLoading={isSubmitting}
          >
            Create Channel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
