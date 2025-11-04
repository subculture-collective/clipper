import { api } from '@/lib/api';

export type ClipListItem = {
    id: string;
    twitch_clip_id: string;
    title: string;
    broadcaster_name: string;
    game_name: string;
    view_count: number;
    vote_score: number;
    comment_count: number;
    favorite_count: number;
    created_at: string;
    user_vote?: number;
    is_favorited?: boolean;
    upvote_count?: number;
    downvote_count?: number;
};

export type ClipDetail = ClipListItem & {
    twitch_clip_url?: string;
    embed_url?: string;
    thumbnail_url?: string;
    duration?: number;
    creator_name?: string;
    is_featured?: boolean;
    is_nsfw?: boolean;
};

export type PaginatedResponse<T> = {
    success: boolean;
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
};

export type ApiResponse<T> = { success: boolean; data: T };

export type ListClipsParams = {
    sort?: 'hot' | 'new' | 'top' | 'rising';
    timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    game_id?: string;
    broadcaster_id?: string;
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
};

export async function listClips(params: ListClipsParams = {}) {
    const res = await api.get<PaginatedResponse<ClipListItem>>('/clips', {
        params,
    });
    return res.data;
}

export async function getClip(id: string) {
    const res = await api.get<ApiResponse<ClipDetail>>(`/clips/${id}`);
    return res.data.data;
}
