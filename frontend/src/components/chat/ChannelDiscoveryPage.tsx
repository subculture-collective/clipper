import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CreateChannelModal } from './CreateChannelModal';
import { Channel } from '@/types/chat';

/**
 * Page for discovering and browsing available chat channels
 */
export function ChannelDiscoveryPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [channelType, setChannelType] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    fetchChannels();
  }, [channelType]);

  const fetchChannels = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (channelType !== 'all') {
        params.append('type', channelType);
      }

      const response = await fetch(`/api/chat/channels?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }

      const data = await response.json();
      setChannels(data.channels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinChannel = (channelId: string) => {
    navigate(`/chat/${channelId}`);
  };

  const handleCreateSuccess = (channelId: string) => {
    // Refresh channels list
    fetchChannels();
    // Navigate to new channel
    navigate(`/chat/${channelId}`);
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (channel.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Discover Channels
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Find and join chat channels that interest you
            </p>
          </div>
          
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Channel
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels..."
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1"
          />
          
          <div className="flex gap-2">
            <Button
              variant={channelType === 'all' ? 'default' : 'outline'}
              onClick={() => setChannelType('all')}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={channelType === 'public' ? 'default' : 'outline'}
              onClick={() => setChannelType('public')}
              size="sm"
            >
              Public
            </Button>
            <Button
              variant={channelType === 'private' ? 'default' : 'outline'}
              onClick={() => setChannelType('private')}
              size="sm"
            >
              Private
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                className="bg-white dark:bg-neutral-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
                onClick={() => handleJoinChannel(channel.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Hash className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100 truncate">
                      {channel.name}
                    </h3>
                  </div>
                  <Badge variant={channel.channel_type === 'public' ? 'success' : 'secondary'}>
                    {channel.channel_type}
                  </Badge>
                </div>

                {channel.description && (
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4 line-clamp-2">
                    {channel.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>Members</span>
                  </div>
                  <span className="text-xs">
                    {new Date(channel.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-4">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinChannel(channel.id);
                    }}
                  >
                    Join Channel
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredChannels.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Hash className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                No channels found
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Be the first to create a channel!'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create Channel
                </Button>
              )}
            </div>
          )}

          {filteredChannels.length > 0 && (
            <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Showing {filteredChannels.length} of {channels.length} channels
            </div>
          )}
        </>
      )}

      {/* Create Channel Modal */}
      <CreateChannelModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
