import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import {
  followStreamer,
  unfollowStreamer,
  getStreamFollowStatus,
  type StreamFollowStatus,
} from '../lib/stream-api';
import { toast } from 'react-hot-toast';

interface StreamFollowButtonProps {
  streamerUsername: string;
  className?: string;
}

export function StreamFollowButton({ streamerUsername, className }: StreamFollowButtonProps) {
  const { user } = useAuth();
  const [followStatus, setFollowStatus] = useState<StreamFollowStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check follow status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const status = await getStreamFollowStatus(streamerUsername);
        setFollowStatus(status);
      } catch (error) {
        // Not following or error - treat as not following
        setFollowStatus({ following: false, notifications_enabled: false });
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [user, streamerUsername]);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please log in to follow streamers');
      return;
    }

    setIsLoading(true);
    try {
      const result = await followStreamer(streamerUsername, { notifications_enabled: true });
      setFollowStatus({
        following: result.following,
        notifications_enabled: result.notifications_enabled,
      });
      toast.success(result.message || `Following ${streamerUsername}`);
    } catch (error) {
      console.error('Failed to follow streamer:', error);
      toast.error('Failed to follow streamer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await unfollowStreamer(streamerUsername);
      setFollowStatus({ following: false, notifications_enabled: false });
      toast.success(result.message || `Unfollowed ${streamerUsername}`);
    } catch (error) {
      console.error('Failed to unfollow streamer:', error);
      toast.error('Failed to unfollow streamer');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || isChecking) {
    return null; // Don't show button if not logged in or still checking
  }

  const isFollowing = followStatus?.following || false;
  const hasNotifications = followStatus?.notifications_enabled || false;

  return (
    <Button
      onClick={isFollowing ? handleUnfollow : handleFollow}
      disabled={isLoading}
      variant={isFollowing ? 'secondary' : 'default'}
      className={className}
    >
      {isLoading ? (
        <span className="animate-pulse">...</span>
      ) : isFollowing ? (
        <>
          {hasNotifications ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
          Following
        </>
      ) : (
        <>
          <Bell className="mr-2 h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
}
