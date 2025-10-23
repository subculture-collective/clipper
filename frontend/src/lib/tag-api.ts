import { apiClient } from "./api";
import type {
  Tag,
  TagListResponse,
  TagSearchResponse,
  TagDetailResponse,
  ClipTagsResponse,
  AddTagsRequest,
} from "../types/tag";
import type { ClipFeedResponse } from "../types/clip";

export const tagApi = {
  // List all tags
  listTags: async (params?: {
    sort?: "popularity" | "alphabetical" | "recent";
    limit?: number;
    page?: number;
  }) => {
    const response = await apiClient.get<TagListResponse>("/tags", {
      params,
    });
    return response.data;
  },

  // Search tags
  searchTags: async (query: string, limit = 10) => {
    const response = await apiClient.get<TagSearchResponse>("/tags/search", {
      params: { q: query, limit },
    });
    return response.data;
  },

  // Get tag details
  getTag: async (slug: string) => {
    const response = await apiClient.get<TagDetailResponse>(`/tags/${slug}`);
    return response.data;
  },

  // Get clips by tag
  getClipsByTag: async (slug: string, params?: { limit?: number; page?: number }) => {
    const response = await apiClient.get<ClipFeedResponse>(
      `/tags/${slug}/clips`,
      { params }
    );
    return response.data;
  },

  // Get tags for a clip
  getClipTags: async (clipId: string) => {
    const response = await apiClient.get<ClipTagsResponse>(
      `/clips/${clipId}/tags`
    );
    return response.data;
  },

  // Add tags to clip
  addTagsToClip: async (clipId: string, tagSlugs: string[]) => {
    const response = await apiClient.post<{ message: string; tags: Tag[] }>(
      `/clips/${clipId}/tags`,
      { tag_slugs: tagSlugs } as AddTagsRequest
    );
    return response.data;
  },

  // Remove tag from clip
  removeTagFromClip: async (clipId: string, tagSlug: string) => {
    const response = await apiClient.delete<{ message: string }>(
      `/clips/${clipId}/tags/${tagSlug}`
    );
    return response.data;
  },

  // Admin: Create tag
  createTag: async (data: {
    name: string;
    slug: string;
    description?: string;
    color?: string;
  }) => {
    const response = await apiClient.post<{ message: string; tag: Tag }>(
      "/admin/tags",
      data
    );
    return response.data;
  },

  // Admin: Update tag
  updateTag: async (
    id: string,
    data: {
      name: string;
      slug: string;
      description?: string;
      color?: string;
    }
  ) => {
    const response = await apiClient.put<{ message: string; tag: Tag }>(
      `/admin/tags/${id}`,
      data
    );
    return response.data;
  },

  // Admin: Delete tag
  deleteTag: async (id: string) => {
    const response = await apiClient.delete<{ message: string }>(
      `/admin/tags/${id}`
    );
    return response.data;
  },
};
