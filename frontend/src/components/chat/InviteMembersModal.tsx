import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface InviteMembersModalProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  onSuccess?: () => void;
}

/**
 * Modal for inviting members to a channel
 */
export function InviteMembersModal({ open, onClose, channelId, onSuccess }: InviteMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Search for users by username
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    setAddingUserId(userId);
    setError(null);

    try {
      const response = await fetch(`/api/chat/channels/${channelId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          role: 'member',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      // Remove from search results
      setSearchResults(searchResults.filter(u => u.id !== userId));
      
      // Clear search if no more results
      if (searchResults.length === 1) {
        setSearchQuery('');
        setSearchResults([]);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={handleClose} 
      title="Invite Members"
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search users by username..."
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            isLoading={isSearching}
          >
            Search
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-750 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar
                    src={user.avatar_url}
                    alt={user.username}
                    fallback={user.username[0]?.toUpperCase()}
                    size="md"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleAddMember(user.id)}
                  disabled={addingUserId === user.id}
                  isLoading={addingUserId === user.id}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Add
                </Button>
              </div>
            ))
          ) : searchQuery && !isSearching ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              No users found
            </div>
          ) : !searchQuery ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              Search for users to invite
            </div>
          ) : null}
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
