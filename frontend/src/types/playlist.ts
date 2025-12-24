import type { Clip } from './clip';

export interface Playlist {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    cover_url?: string;
    visibility: 'private' | 'public' | 'unlisted';
    share_token?: string;
    view_count: number;
    share_count: number;
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

// Playlist collaborator types
export interface PlaylistCollaborator {
    id: string;
    playlist_id: string;
    user_id: string;
    user?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
    };
    permission: 'view' | 'edit' | 'admin';
    invited_by?: string;
    invited_at: string;
    created_at: string;
    updated_at: string;
}

export interface AddCollaboratorRequest {
    user_id: string;
    permission: 'view' | 'edit' | 'admin';
}

export interface UpdateCollaboratorRequest {
    permission: 'view' | 'edit' | 'admin';
}

// Share link types
export interface GetShareLinkResponse {
    share_url: string;
    embed_code: string;
}

export interface TrackShareRequest {
    platform: 'twitter' | 'facebook' | 'discord' | 'embed' | 'link';
    referrer?: string;
}
