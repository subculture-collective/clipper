import { Clip } from './clip';

export interface Playlist {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    cover_url?: string;
    visibility: 'private' | 'public' | 'unlisted';
    like_count: number;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface PlaylistItem {
    id: number;
    playlist_id: string;
    clip_id: string;
    order_index: number;
    added_at: string;
}

export interface PlaylistClipRef extends Clip {
    order: number;
}

export interface PlaylistCreator {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
}

export interface PlaylistWithClips extends Playlist {
    clip_count: number;
    clips?: PlaylistClipRef[];
    is_liked: boolean;
    creator?: PlaylistCreator;
}

export interface CreatePlaylistRequest {
    title: string;
    description?: string;
    cover_url?: string;
    visibility?: 'private' | 'public' | 'unlisted';
}

export interface UpdatePlaylistRequest {
    title?: string;
    description?: string;
    cover_url?: string;
    visibility?: 'private' | 'public' | 'unlisted';
}

export interface AddClipsToPlaylistRequest {
    clip_ids: string[];
}

export interface ReorderPlaylistClipsRequest {
    clip_ids: string[];
}

export interface PlaylistListResponse {
    success: boolean;
    data: Playlist[];
    meta: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

export interface PlaylistWithClipsResponse {
    success: boolean;
    data: PlaylistWithClips;
    meta: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}
