export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  new_comments: boolean;
  new_followers: boolean;
  clip_milestones: boolean;
  streamer_live: boolean;
}
