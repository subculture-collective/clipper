// Game represents a game from Twitch
export interface Game {
  id: string;
  twitch_game_id: string;
  name: string;
  box_art_url?: string;
  igdb_id?: string;
  created_at: string;
  updated_at: string;
}

// GameWithStats represents a game with additional statistics
export interface GameWithStats extends Game {
  clip_count: number;
  follower_count: number;
  is_following: boolean;
}

// TrendingGame represents a game with trending statistics
export interface TrendingGame {
  id: string;
  twitch_game_id: string;
  name: string;
  box_art_url?: string;
  recent_clip_count: number;
  total_vote_score: number;
  follower_count: number;
}

// GameDetailResponse represents the response for a single game
export interface GameDetailResponse {
  game: GameWithStats;
}

// GameListResponse represents the response for listing games
export interface GameListResponse {
  games: GameWithStats[];
  page: number;
  limit: number;
  has_more: boolean;
}

// TrendingGamesResponse represents the response for trending games
export interface TrendingGamesResponse {
  games: TrendingGame[];
  page: number;
  limit: number;
  has_more: boolean;
}

// GameFollowResponse represents the response for follow/unfollow actions
export interface GameFollowResponse {
  message: string;
}
