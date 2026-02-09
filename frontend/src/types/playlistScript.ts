export type PlaylistScriptSort =
    | 'hot'
    | 'new'
    | 'top'
    | 'rising'
    | 'discussed'
    | 'trending'
    | 'popular';

export type PlaylistScriptTimeframe =
    | 'hour'
    | 'day'
    | 'week'
    | 'month'
    | 'year';

export interface PlaylistScript {
    id: string;
    name: string;
    description?: string;
    sort: PlaylistScriptSort;
    timeframe?: PlaylistScriptTimeframe;
    clip_limit: number;
    visibility: 'private' | 'public' | 'unlisted';
    is_active: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
    last_run_at?: string;
    last_generated_playlist_id?: string;
}

export interface CreatePlaylistScriptRequest {
    name: string;
    description?: string;
    sort: PlaylistScriptSort;
    timeframe?: PlaylistScriptTimeframe;
    clip_limit: number;
    visibility?: 'private' | 'public' | 'unlisted';
    is_active?: boolean;
}

export interface UpdatePlaylistScriptRequest {
    name?: string;
    description?: string;
    sort?: PlaylistScriptSort;
    timeframe?: PlaylistScriptTimeframe;
    clip_limit?: number;
    visibility?: 'private' | 'public' | 'unlisted';
    is_active?: boolean;
}
