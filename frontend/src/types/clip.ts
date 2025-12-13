export interface ClipSubmitter {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
}

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
    is_hidden?: boolean;
    // User interaction state (from API or local)
    user_vote?: 1 | -1 | null;
    is_favorited?: boolean; // Backend returns is_favorited, not user_favorited
    upvote_count?: number;
    downvote_count?: number;
    // Submitter attribution
    submitted_by?: ClipSubmitter;
    submitted_at?: string;
}

export interface ClipFeedResponse {
    clips: Clip[];
    total: number;
    page: number;
    limit?: number;
    total_pages?: number;
    has_more: boolean;
    has_next?: boolean;
    has_prev?: boolean;
}

export type SortOption =
    | 'hot'
    | 'new'
    | 'top'
    | 'rising'
    | 'discussed'
    | 'views'
    | 'trending';
export type TimeFrame = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export interface ClipFeedFilters {
    sort?: SortOption;
    timeframe?: TimeFrame;
    game_id?: string;
    creator_id?: string;
    tags?: string[];
    language?: string;
    nsfw?: boolean;
    top10k_streamers?: boolean;
    show_all_clips?: boolean; // If true, show both user-submitted and scraped clips (for discovery)
}

export interface VotePayload {
    clip_id: string;
    vote_type: 1 | -1;
}

export interface FavoritePayload {
    clip_id: string;
}
