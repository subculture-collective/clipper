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

// Clip submission types
export type SubmitClipRequest = {
    clip_url: string;
    custom_title?: string;
    broadcaster_name_override?: string;
    tags?: string[];
    is_nsfw?: boolean;
    submission_reason?: string;
};

export type ClipSubmission = {
    id: string;
    user_id: string;
    twitch_clip_id: string;
    twitch_clip_url: string;
    title?: string;
    custom_title?: string;
    broadcaster_name?: string;
    broadcaster_name_override?: string;
    game_name?: string;
    creator_name?: string;
    tags?: string[];
    is_nsfw: boolean;
    submission_reason?: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    created_at: string;
    updated_at: string;
};

export type SubmitClipResponse = {
    success: boolean;
    message: string;
    submission: ClipSubmission;
};

export type ClipMetadata = {
    id: string;
    url: string;
    title: string;
    broadcaster_id: string;
    broadcaster_name: string;
    creator_id: string;
    creator_name: string;
    game_id: string;
    game_name: string;
    thumbnail_url: string;
    duration: number;
    view_count: number;
    created_at: string;
};

// Submit a clip
export async function submitClip(request: SubmitClipRequest) {
    const res = await api.post<SubmitClipResponse>('/clips/submit', request);
    return res.data;
}

// Get user's submissions
export async function getUserSubmissions(page = 1, limit = 20) {
    const res = await api.get<PaginatedResponse<ClipSubmission>>(
        '/submissions',
        {
            params: { page, limit },
        }
    );
    return res.data;
}

// Get submission stats
export async function getSubmissionStats() {
    const res = await api.get<
        ApiResponse<{
            total: number;
            pending: number;
            approved: number;
            rejected: number;
        }>
    >('/submissions/stats');
    return res.data.data;
}
