import React, { useState, useEffect } from 'react';
import { ChannelSidebar, ChatView, EmptyState } from '@/components/chat';
import type { Channel } from '@/types/chat';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

/**
 * ChatPage - Main page for the live chat system
 * Features:
 * - Channel list sidebar with search
 * - Active channel indicator
 * - Message display with real-time updates
 * - Message composer with emoji picker
 * - User mentions with autocomplete
 * - Mobile-responsive layout
 * - Dark mode support
 */
export function ChatPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Fetch channels on mount
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch channels from API
      const response = await fetch('/api/chat/channels');

      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }

      const data = await response.json();
      setChannels(data.channels || data || []);

      // Auto-select first channel if available
      if ((data.channels || data).length > 0 && !selectedChannel) {
        setSelectedChannel((data.channels || data)[0].id);
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load channels: ${errorMessage}. Please check your connection and try again.`);

      // For development: Create mock channels if API fails
      if (import.meta.env.DEV) {
        const mockChannels: Channel[] = [
          {
            id: 'general',
            name: 'general',
            description: 'General discussion',
            creator_id: 'system',
            channel_type: 'public',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            unread_count: 3,
          },
          {
            id: 'random',
            name: 'random',
            description: 'Random chat',
            creator_id: 'system',
            channel_type: 'public',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            unread_count: 0,
          },
          {
            id: 'clips',
            name: 'clips',
            description: 'Discuss clips',
            creator_id: 'system',
            channel_type: 'public',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            unread_count: 12,
          },
        ];
        setChannels(mockChannels);
        setSelectedChannel(mockChannels[0].id);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannel(channelId);
    // Close mobile sidebar after selection
    setIsMobileSidebarOpen(false);
  };

  const selectedChannelData = channels.find((ch) => ch.id === selectedChannel);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar toggle button */}
      <button
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        className="md:hidden fixed bottom-4 right-4 z-50 bg-primary-600 text-white p-3 rounded-full shadow-lg"
        aria-label="Toggle channel list"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Channel Sidebar - Hidden on mobile unless toggled */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <ChannelSidebar
          channels={channels}
          selectedChannel={selectedChannel}
          onSelectChannel={handleSelectChannel}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {error && !channels.length && (
          <div className="p-4">
            <Alert variant="error" title="Error">
              {error}
            </Alert>
          </div>
        )}

        {selectedChannel ? (
          <ChatView
            channelId={selectedChannel}
            channelName={selectedChannelData?.name}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
