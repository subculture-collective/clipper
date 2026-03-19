export interface User {
  id: string;
  twitch_id?: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  social_links?: SocialLinks;
  karma_points: number;
  trust_score: number;
  role: 'user' | 'moderator' | 'admin';
  account_type: 'member' | 'broadcaster' | 'moderator' | 'community_moderator' | 'admin';
  account_status: 'active' | 'unclaimed' | 'pending';
  is_banned: boolean;
  follower_count: number;
  following_count: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialLinks {
  twitter?: string;
  youtube?: string;
  discord?: string;
  website?: string;
}

export interface UserStats {
  clips_submitted: number;
  comments_count: number;
  total_karma: number;
  total_views: number;
  favorites_count: number;
}
