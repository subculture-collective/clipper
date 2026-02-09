import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import type {
    Playlist,
    CreatePlaylistRequest,
    UpdatePlaylistRequest,
    CopyPlaylistRequest,
    AddClipsToPlaylistRequest,
    ReorderPlaylistClipsRequest,
    PlaylistListResponse,
    PlaylistWithClipsResponse,
} from '@/types/playlist';

// API functions
const fetchPlaylists = async (
    page = 1,
    limit = 20,
): Promise<PlaylistListResponse> => {
    const response = await apiClient.get<PlaylistListResponse>('/playlists', {
        params: { page, limit },
    });
    return response.data;
};

const fetchPublicPlaylists = async (
    page = 1,
    limit = 20,
): Promise<PlaylistListResponse> => {
    const response = await apiClient.get<PlaylistListResponse>(
        '/playlists/public',
        {
            params: { page, limit },
        },
    );
    return response.data;
};

const fetchPlaylist = async (
    id: string,
    page = 1,
    limit = 20,
): Promise<PlaylistWithClipsResponse> => {
    const response = await apiClient.get<PlaylistWithClipsResponse>(
        `/playlists/${id}`,
        {
            params: { page, limit },
        },
    );
    return response.data;
};

const fetchPlaylistByShareToken = async (
    token: string,
    page = 1,
    limit = 20,
): Promise<PlaylistWithClipsResponse> => {
    const response = await apiClient.get<PlaylistWithClipsResponse>(
        `/playlists/share/${token}`,
        {
            params: { page, limit },
        },
    );
    return response.data;
};

const createPlaylist = async (
    data: CreatePlaylistRequest,
): Promise<Playlist> => {
    const response = await apiClient.post<{ data: Playlist }>(
        '/playlists',
        data,
    );
    return response.data.data;
};

const updatePlaylist = async (
    id: string,
    data: UpdatePlaylistRequest,
): Promise<Playlist> => {
    const response = await apiClient.patch<{ data: Playlist }>(
        `/playlists/${id}`,
        data,
    );
    return response.data.data;
};

const copyPlaylist = async (
    id: string,
    data: CopyPlaylistRequest,
): Promise<Playlist> => {
    const response = await apiClient.post<{ data: Playlist }>(
        `/playlists/${id}/copy`,
        data,
    );
    return response.data.data;
};

const deletePlaylist = async (id: string): Promise<void> => {
    await apiClient.delete(`/playlists/${id}`);
};

const addClipsToPlaylist = async (
    id: string,
    data: AddClipsToPlaylistRequest,
): Promise<void> => {
    await apiClient.post(`/playlists/${id}/clips`, data);
};

const removeClipFromPlaylist = async (
    playlistId: string,
    clipId: string,
): Promise<void> => {
    await apiClient.delete(`/playlists/${playlistId}/clips/${clipId}`);
};

const reorderPlaylistClips = async (
    id: string,
    data: ReorderPlaylistClipsRequest,
): Promise<void> => {
    await apiClient.put(`/playlists/${id}/clips/order`, data);
};

const likePlaylist = async (id: string): Promise<void> => {
    await apiClient.post(`/playlists/${id}/like`);
};

const unlikePlaylist = async (id: string): Promise<void> => {
    await apiClient.delete(`/playlists/${id}/like`);
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
    const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
        );
    return useQuery({
        queryKey: ['playlist', id, page, limit],
        queryFn: () =>
            isUuid ?
                fetchPlaylist(id, page, limit)
            :   fetchPlaylistByShareToken(id, page, limit),
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
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: UpdatePlaylistRequest;
        }) => updatePlaylist(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['playlist', id] });
            queryClient.invalidateQueries({ queryKey: ['playlists'] });
        },
    });
};

export const useCopyPlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: CopyPlaylistRequest }) =>
            copyPlaylist(id, data),
        onSuccess: () => {
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
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: AddClipsToPlaylistRequest;
        }) => addClipsToPlaylist(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['playlist', id] });
        },
    });
};

export const useRemoveClipFromPlaylist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            playlistId,
            clipId,
        }: {
            playlistId: string;
            clipId: string;
        }) => removeClipFromPlaylist(playlistId, clipId),
        onSuccess: (_, { playlistId }) => {
            queryClient.invalidateQueries({
                queryKey: ['playlist', playlistId],
            });
        },
    });
};

export const useReorderPlaylistClips = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: ReorderPlaylistClipsRequest;
        }) => reorderPlaylistClips(id, data),
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
