/**
 * Clip-related type definitions
 * These types match the backend Clip model
 */

export interface Clip {
  id: string;
  twitch_clip_id: string;
  twitch_clip_url: string;
  embed_url: string;
  title: string;
  creator_name: string;
  creator_id?: string | null;
  broadcaster_name: string;
  broadcaster_id?: string | null;
  game_id?: string | null;
  game_name?: string | null;
  language?: string | null;
  thumbnail_url?: string | null;
  duration?: number | null;
  view_count: number;
  created_at: string;
  imported_at: string;
  vote_score: number;
  comment_count: number;
  favorite_count: number;
  is_featured: boolean;
  is_nsfw: boolean;
  is_removed: boolean;
  removed_reason?: string | null;
}

export interface ClipFeedFilters {
  sort?: 'hot' | 'new' | 'top' | 'rising';
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  game?: string;
  creator?: string;
}

export interface ClipFeedResponse {
  clips: Clip[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

export interface VotePayload {
  clip_id: string;
  vote_type: 1 | -1; // 1 for upvote, -1 for downvote
}

export interface FavoritePayload {
  clip_id: string;
}
