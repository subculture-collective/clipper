export interface Clip {
  id: string;
  twitch_clip_id: string;
  twitch_clip_url: string;
  embed_url: string;
  title: string;
  creator_name: string;
  broadcaster_name: string;
  game_id?: string;
  game_name?: string;
  thumbnail_url?: string;
  duration?: number;
  view_count: number;
  vote_score: number;
  comment_count: number;
  favorite_count: number;
  is_featured: boolean;
  is_nsfw: boolean;
  trending_score: number;
  hot_score: number;
  submitted_by_user_id?: string;
  created_at: string;
  updated_at: string;
  // Enriched fields from API joins
  streamer?: Streamer;
  game?: Game;
  user_vote?: 'up' | 'down' | null;
  is_favorited?: boolean;
  tags?: Tag[];
}

export interface Streamer {
  id: string;
  name: string;
  display_name: string;
  avatar_url?: string;
  is_live: boolean;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  cover_url?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  clip_count: number;
}

export interface ClipEngagement {
  clip_id: string;
  engagement_score: number;
  view_count: number;
  vote_score: number;
  comment_count: number;
  favorite_count: number;
}
