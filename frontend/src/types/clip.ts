export interface Clip {
  id: string;
  twitch_clip_id: string;
  twitch_clip_url: string;
  embed_url: string;
  title: string;
  creator_name: string;
  creator_id?: string;
  broadcaster_name: string;
  broadcaster_id?: string;
  game_id?: string;
  game_name?: string;
  language?: string;
  thumbnail_url?: string;
  duration?: number;
  view_count: number;
  created_at: string;
  imported_at: string;
  vote_score: number;
  comment_count: number;
  favorite_count: number;
  is_featured: boolean;
  is_nsfw: boolean;
  is_removed: boolean;
  removed_reason?: string;
  // User interaction state (from API or local)
  user_vote?: 1 | -1 | null;
  user_favorited?: boolean;
}

export interface ClipFeedResponse {
  clips: Clip[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export type SortOption = "hot" | "new" | "top" | "rising";
export type TimeFrame = "hour" | "day" | "week" | "month" | "year" | "all";

export interface ClipFeedFilters {
  sort?: SortOption;
  timeframe?: TimeFrame;
  game_id?: string;
  creator_id?: string;
  tags?: string[];
  language?: string;
  nsfw?: boolean;
}

export interface VotePayload {
  clip_id: string;
  vote_type: 1 | -1;
}

export interface FavoritePayload {
  clip_id: string;
}
