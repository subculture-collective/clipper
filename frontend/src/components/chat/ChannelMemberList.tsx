import React, { useEffect, useState } from 'react';
import { Crown, Shield, User, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

interface ChannelMember {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

interface ChannelMemberListProps {
  channelId: string;
  currentUserRole?: 'owner' | 'admin' | 'member';
  onInvite?: () => void;
}

/**
 * Component to display and manage channel members
 */
export function ChannelMemberList({ channelId, currentUserRole, onInvite }: ChannelMemberListProps) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [channelId]);

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/channels/${channelId}/members`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    setRemovingMemberId(userId);

    try {
      const response = await fetch(`/api/chat/channels/${channelId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      // Refresh members list
      await fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'success' => {
    switch (role) {
      case 'owner':
        return 'success';
      case 'admin':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const canRemoveMember = (member: ChannelMember) => {
    // Owners can't be removed
    if (member.role === 'owner') return false;
    
    // Owners and admins can remove members
    if (currentUserRole === 'owner' || currentUserRole === 'admin') return true;
    
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Members ({members.length})
        </h3>
        {(currentUserRole === 'owner' || currentUserRole === 'admin') && onInvite && (
          <Button
            size="sm"
            onClick={onInvite}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Invite
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-750 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar
                src={member.avatar_url}
                alt={member.username}
                fallback={member.username[0]?.toUpperCase()}
                size="md"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {member.display_name || member.username}
                  </p>
                  {getRoleIcon(member.role)}
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                  @{member.username}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={getRoleBadgeVariant(member.role)}>
                {member.role}
              </Badge>
              
              {canRemoveMember(member) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveMember(member.user_id)}
                  disabled={removingMemberId === member.user_id}
                  isLoading={removingMemberId === member.user_id}
                  leftIcon={<UserMinus className="w-4 h-4" />}
                  className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                  aria-label={`Remove ${member.username}`}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            No members yet
          </div>
        )}
      </div>
    </div>
  );
}
