import { apiClient } from './api';
import type {
    PlaylistScript,
    CreatePlaylistScriptRequest,
    UpdatePlaylistScriptRequest,
} from '@/types/playlistScript';
import type { Playlist } from '@/types/playlist';

export const playlistScriptApi = {
    listScripts: async () => {
        const response = await apiClient.get<{ data: PlaylistScript[] }>(
            '/admin/playlist-scripts',
        );
        return response.data.data;
    },

    createScript: async (data: CreatePlaylistScriptRequest) => {
        const response = await apiClient.post<{ data: PlaylistScript }>(
            '/admin/playlist-scripts',
            data,
        );
        return response.data.data;
    },

    updateScript: async (id: string, data: UpdatePlaylistScriptRequest) => {
        const response = await apiClient.put<{ data: PlaylistScript }>(
            `/admin/playlist-scripts/${id}`,
            data,
        );
        return response.data.data;
    },

    deleteScript: async (id: string) => {
        const response = await apiClient.delete<{ data: { message: string } }>(
            `/admin/playlist-scripts/${id}`,
        );
        return response.data.data;
    },

    generatePlaylist: async (id: string) => {
        const response = await apiClient.post<{ data: Playlist }>(
            `/admin/playlist-scripts/${id}/generate`,
        );
        return response.data.data;
    },
};
