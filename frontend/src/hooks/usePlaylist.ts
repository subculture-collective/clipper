import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    Playlist,
    PlaylistWithClips,
    CreatePlaylistRequest,
    UpdatePlaylistRequest,
    AddClipsToPlaylistRequest,
    ReorderPlaylistClipsRequest,
    PlaylistListResponse,
    PlaylistWithClipsResponse,
} from '@/types/playlist';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// API functions
const fetchPlaylists = async (page = 1, limit = 20): Promise<PlaylistListResponse> => {
    const response = await fetch(
        `${API_BASE_URL}/playlists?page=${page}&limit=${limit}`,
        {
            credentials: 'include',
        }
    );
    if (!response.ok) {
        throw new Error('Failed to fetch playlists');
    }
    return response.json();
};

const fetchPublicPlaylists = async (page = 1, limit = 20): Promise<PlaylistListResponse> => {
    const response = await fetch(
        `${API_BASE_URL}/playlists/public?page=${page}&limit=${limit}`,
        {
            credentials: 'include',
        }
    );
    if (!response.ok) {
        throw new Error('Failed to fetch public playlists');
    }
    return response.json();
};

const fetchPlaylist = async (id: string, page = 1, limit = 20): Promise<PlaylistWithClipsResponse> => {
    const response = await fetch(
        `${API_BASE_URL}/playlists/${id}?page=${page}&limit=${limit}`,
        {
            credentials: 'include',
        }
    );
    if (!response.ok) {
        throw new Error('Failed to fetch playlist');
    }
    return response.json();
};

const createPlaylist = async (data: CreatePlaylistRequest): Promise<Playlist> => {
    const response = await fetch(`${API_BASE_URL}/playlists`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to create playlist');
    }
    const result = await response.json();
    return result.data;
};

const updatePlaylist = async (id: string, data: UpdatePlaylistRequest): Promise<Playlist> => {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to update playlist');
    }
    const result = await response.json();
    return result.data;
};

const deletePlaylist = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to delete playlist');
    }
};

const addClipsToPlaylist = async (id: string, data: AddClipsToPlaylistRequest): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}/clips`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to add clips to playlist');
    }
};

const removeClipFromPlaylist = async (playlistId: string, clipId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/clips/${clipId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to remove clip from playlist');
    }
};

const reorderPlaylistClips = async (id: string, data: ReorderPlaylistClipsRequest): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}/clips/order`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to reorder clips');
    }
};

const likePlaylist = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}/like`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to like playlist');
    }
};

const unlikePlaylist = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}/like`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to unlike playlist');
    }
};

// React Query hooks
export const usePlaylists = (page = 1, limit = 20) => {
    return useQuery({
        queryKey: ['playlists', page, limit],
        queryFn: () => fetchPlaylists(page, limit),
    });
};

export const usePublicPlaylists = (page = 1, limit = 20) => {
    return useQuery({
        queryKey: ['playlists', 'public', page, limit],
        queryFn: () => fetchPublicPlaylists(page, limit),
    });
};

export const usePlaylist = (id: string, page = 1, limit = 20) => {
    return useQuery({
        queryKey: ['playlist', id, page, limit],
        queryFn: () => fetchPlaylist(id, page, limit),
        enabled: !!id,
    });
};

export const useCreatePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createPlaylist,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['playlists'] });
        },
    });
};

export const useUpdatePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePlaylistRequest }) =>
            updatePlaylist(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['playlist', id] });
            queryClient.invalidateQueries({ queryKey: ['playlists'] });
        },
    });
};

export const useDeletePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deletePlaylist,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['playlists'] });
        },
    });
};

export const useAddClipsToPlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: AddClipsToPlaylistRequest }) =>
            addClipsToPlaylist(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['playlist', id] });
        },
    });
};

export const useRemoveClipFromPlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ playlistId, clipId }: { playlistId: string; clipId: string }) =>
            removeClipFromPlaylist(playlistId, clipId),
        onSuccess: (_, { playlistId }) => {
            queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
        },
    });
};

export const useReorderPlaylistClips = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: ReorderPlaylistClipsRequest }) =>
            reorderPlaylistClips(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['playlist', id] });
        },
    });
};

export const useLikePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: likePlaylist,
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['playlist', id] });
            queryClient.invalidateQueries({ queryKey: ['playlists'] });
        },
    });
};

export const useUnlikePlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: unlikePlaylist,
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['playlist', id] });
            queryClient.invalidateQueries({ queryKey: ['playlists'] });
        },
    });
};
