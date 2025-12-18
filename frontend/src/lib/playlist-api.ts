import type { Playlist } from '@/types/playlist';

interface AddToPlaylistResponse {
    success: boolean;
    message?: string;
}

/**
 * Fetch user's playlists
 */
export async function fetchUserPlaylists(): Promise<Playlist[]> {
    const response = await fetch('/api/v1/playlists', {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch playlists');
    }

    const data = await response.json();
    return data.playlists || [];
}

/**
 * Add a clip to a playlist
 */
export async function addClipToPlaylist(
    playlistId: string,
    clipId: string
): Promise<AddToPlaylistResponse> {
    const response = await fetch(`/api/v1/playlists/${playlistId}/clips`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ clip_id: clipId }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add clip to playlist');
    }

    return await response.json();
}

/**
 * Remove a clip from a playlist
 */
export async function removeClipFromPlaylist(
    playlistId: string,
    clipId: string
): Promise<void> {
    const response = await fetch(
        `/api/v1/playlists/${playlistId}/clips/${clipId}`,
        {
            method: 'DELETE',
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error('Failed to remove clip from playlist');
    }
}
