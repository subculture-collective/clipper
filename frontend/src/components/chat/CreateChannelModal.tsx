import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createChannel, type CreateChannelRequest } from '@/lib/chat-api';
import { Alert } from '@/components/ui/Alert';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: (channelId: string) => void;
}

/**
 * CreateChannelModal - Modal for creating a new channel
 */
export function CreateChannelModal({
  isOpen,
  onClose,
  onChannelCreated,
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Channel name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request: CreateChannelRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        channel_type: channelType,
      };

      const channel = await createChannel(request);
      onChannelCreated(channel.id);
      
      // Reset form
      setName('');
      setDescription('');
      setChannelType('public');
      onClose();
    } catch (err) {
      console.error('Error creating channel:', err);
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setDescription('');
      setChannelType('public');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Channel">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        <div>
          <label htmlFor="channel-name" className="block text-sm font-medium mb-2">
            Channel Name *
          </label>
          <Input
            id="channel-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., general, announcements"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label htmlFor="channel-description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <Input
            id="channel-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this channel about?"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="channel-type" className="block text-sm font-medium mb-2">
            Channel Type
          </label>
          <select
            id="channel-type"
            value={channelType}
            onChange={(e) => setChannelType(e.target.value as 'public' | 'private')}
            disabled={loading}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {channelType === 'public'
              ? 'Anyone can join this channel'
              : 'Only invited members can join this channel'}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Channel'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
