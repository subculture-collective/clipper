import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { ChannelMemberList } from './ChannelMemberList';
import { InviteMembersModal } from './InviteMembersModal';
import { Channel } from '@/types/chat';

/**
 * Page for managing channel settings and members
 */
export function ChannelSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchChannel();
      fetchCurrentUserRole();
    }
  }, [id]);

  const fetchChannel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/channels/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch channel');
      }

      const data = await response.json();
      setChannel(data);
      setName(data.name);
      setDescription(data.description || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channel');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentUserRole = async () => {
    try {
      const response = await fetch(`/api/chat/channels/${id}/members`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Find current user's role (this would require user ID from auth context)
        // For now, we'll assume based on creator_id check
        // In a real app, you'd get this from the members list
        const members = data.members || [];
        // This is simplified - you'd need to match against actual user ID
        setCurrentUserRole('member');
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/chat/channels/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update channel');
      }

      const updatedChannel = await response.json();
      setChannel(updatedChannel);
      setSuccessMessage('Channel settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/channels/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete channel');
      }

      // Redirect to chat home
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete channel');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded">
          Channel not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(`/chat/${id}`)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-4"
        >
          Back to Channel
        </Button>
        
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Channel Settings
          </h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-700 dark:text-success-300 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            General Settings
          </h2>
          
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label htmlFor="channel-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Channel Name
              </label>
              <Input
                id="channel-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                disabled={isSaving}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="channel-description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description
              </label>
              <TextArea
                id="channel-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                disabled={isSaving}
                rows={3}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Channel Type
              </label>
              <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded text-neutral-900 dark:text-neutral-100">
                {channel.channel_type === 'public' ? 'Public' : 'Private'}
              </div>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Channel type cannot be changed after creation
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSaving || !name.trim()}
                isLoading={isSaving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Members Management */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <ChannelMemberList
            channelId={id!}
            currentUserRole={currentUserRole}
            onInvite={() => setShowInviteModal(true)}
          />
        </div>

        {/* Danger Zone */}
        {currentUserRole === 'owner' && (
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6 border-2 border-error-200 dark:border-error-800">
            <h2 className="text-xl font-semibold text-error-700 dark:text-error-300 mb-4">
              Danger Zone
            </h2>
            
            <div className="space-y-4">
              <p className="text-neutral-700 dark:text-neutral-300">
                Deleting this channel will remove all messages, members, and settings. This action cannot be undone.
              </p>
              
              <Button
                variant="outline"
                onClick={handleDeleteChannel}
                disabled={isDeleting}
                isLoading={isDeleting}
                leftIcon={<Trash2 className="w-4 h-4" />}
                className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20 border-error-300 dark:border-error-700"
              >
                Delete Channel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Members Modal */}
      <InviteMembersModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        channelId={id!}
        onSuccess={fetchCurrentUserRole}
      />
    </div>
  );
}
