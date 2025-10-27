import { apiClient } from "./api";
export const tagApi = {
    // List all tags
    listTags: async (params) => {
        const response = await apiClient.get("/tags", {
            params,
        });
        return response.data;
    },
    // Search tags
    searchTags: async (query, limit = 10) => {
        const response = await apiClient.get("/tags/search", {
            params: { q: query, limit },
        });
        return response.data;
    },
    // Get tag details
    getTag: async (slug) => {
        const response = await apiClient.get(`/tags/${slug}`);
        return response.data;
    },
    // Get clips by tag
    getClipsByTag: async (slug, params) => {
        const response = await apiClient.get(`/tags/${slug}/clips`, { params });
        return response.data;
    },
    // Get tags for a clip
    getClipTags: async (clipId) => {
        const response = await apiClient.get(`/clips/${clipId}/tags`);
        return response.data;
    },
    // Add tags to clip
    addTagsToClip: async (clipId, tagSlugs) => {
        const response = await apiClient.post(`/clips/${clipId}/tags`, { tag_slugs: tagSlugs });
        return response.data;
    },
    // Remove tag from clip
    removeTagFromClip: async (clipId, tagSlug) => {
        const response = await apiClient.delete(`/clips/${clipId}/tags/${tagSlug}`);
        return response.data;
    },
    // Admin: Create tag
    createTag: async (data) => {
        const response = await apiClient.post("/admin/tags", data);
        return response.data;
    },
    // Admin: Update tag
    updateTag: async (id, data) => {
        const response = await apiClient.put(`/admin/tags/${id}`, data);
        return response.data;
    },
    // Admin: Delete tag
    deleteTag: async (id) => {
        const response = await apiClient.delete(`/admin/tags/${id}`);
        return response.data;
    },
};
