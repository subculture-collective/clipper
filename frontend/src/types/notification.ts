export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
  source_user_id?: string;
  source_content_id?: string;
  source_content_type?: string;
  // Included with source user info
  source_username?: string;
  source_display_name?: string;
  source_avatar_url?: string;
}

export type NotificationType =
  | 'reply'
  | 'mention'
  | 'vote_milestone'
  | 'badge_earned'
  | 'rank_up'
  | 'favorited_clip_comment'
  | 'content_removed'
  | 'warning'
  | 'ban'
  | 'appeal_decision'
  | 'submission_approved'
  | 'submission_rejected'
  | 'new_report'
  | 'pending_submissions'
  | 'system_alert';

export interface NotificationPreferences {
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  email_digest: 'immediate' | 'daily' | 'weekly';
  notify_replies: boolean;
  notify_mentions: boolean;
  notify_votes: boolean;
  notify_badges: boolean;
  notify_moderation: boolean;
  notify_rank_up: boolean;
  notify_favorited_clip_comment: boolean;
  updated_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface NotificationCountResponse {
  unread_count: number;
}

export type NotificationFilter = 'all' | 'unread' | 'read';
