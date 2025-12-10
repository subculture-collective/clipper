import apiClient from './api';
import type {
    Community,
    CommunityListResponse,
    CommunityMembersResponse,
    CommunityBansResponse,
    CommunityDiscussionsResponse,
    CommunityFeedResponse,
    CommunityDiscussion,
    CreateCommunityRequest,
    UpdateCommunityRequest,
    UpdateMemberRoleRequest,
    BanMemberRequest,
    AddClipToCommunityRequest,
    CreateDiscussionRequest,
    UpdateDiscussionRequest,
} from '@/types/community';

/**
 * Fetch all communities with pagination and filters
 */
export async function fetchCommunities({
    page = 1,
    limit = 20,
    sort = 'recent',
}: {
    page?: number;
    limit?: number;
    sort?: string;
}): Promise<CommunityListResponse> {
    const response = await apiClient.get<CommunityListResponse>('/communities', {
        params: { page, limit, sort },
    });
    return response.data;
}

/**
 * Search communities by name
 */
export async function searchCommunities({
    query,
    page = 1,
    limit = 20,
}: {
    query: string;
    page?: number;
    limit?: number;
}): Promise<CommunityListResponse> {
    const response = await apiClient.get<CommunityListResponse>('/communities/search', {
        params: { q: query, page, limit },
    });
    return response.data;
}

/**
 * Get a single community by ID or slug
 */
export async function getCommunity(idOrSlug: string): Promise<Community> {
    const response = await apiClient.get<Community>(`/communities/${idOrSlug}`);
    return response.data;
}

/**
 * Create a new community
 */
export async function createCommunity(data: CreateCommunityRequest): Promise<Community> {
    const response = await apiClient.post<Community>('/communities', data);
    return response.data;
}

/**
 * Update a community
 */
export async function updateCommunity(id: string, data: UpdateCommunityRequest): Promise<Community> {
    const response = await apiClient.put<Community>(`/communities/${id}`, data);
    return response.data;
}

/**
 * Delete a community
 */
export async function deleteCommunity(id: string): Promise<void> {
    await apiClient.delete(`/communities/${id}`);
}

/**
 * Join a community
 */
export async function joinCommunity(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/communities/${id}/join`);
    return response.data;
}

/**
 * Leave a community
 */
export async function leaveCommunity(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/communities/${id}/leave`);
    return response.data;
}

/**
 * Get community members
 */
export async function getCommunityMembers({
    id,
    role,
    page = 1,
    limit = 50,
}: {
    id: string;
    role?: string;
    page?: number;
    limit?: number;
}): Promise<CommunityMembersResponse> {
    const response = await apiClient.get<CommunityMembersResponse>(`/communities/${id}/members`, {
        params: { role, page, limit },
    });
    return response.data;
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
    communityId: string,
    userId: string,
    data: UpdateMemberRoleRequest
): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
        `/communities/${communityId}/members/${userId}/role`,
        data
    );
    return response.data;
}

/**
 * Ban a member from a community
 */
export async function banMember(communityId: string, data: BanMemberRequest): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/communities/${communityId}/ban`, data);
    return response.data;
}

/**
 * Unban a member from a community
 */
export async function unbanMember(communityId: string, userId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/communities/${communityId}/ban/${userId}`);
    return response.data;
}

/**
 * Get banned members of a community
 */
export async function getBannedMembers({
    id,
    page = 1,
    limit = 50,
}: {
    id: string;
    page?: number;
    limit?: number;
}): Promise<CommunityBansResponse> {
    const response = await apiClient.get<CommunityBansResponse>(`/communities/${id}/bans`, {
        params: { page, limit },
    });
    return response.data;
}

/**
 * Get community feed (clips)
 */
export async function getCommunityFeed({
    id,
    sort = 'recent',
    page = 1,
    limit = 20,
}: {
    id: string;
    sort?: string;
    page?: number;
    limit?: number;
}): Promise<CommunityFeedResponse> {
    const response = await apiClient.get<CommunityFeedResponse>(`/communities/${id}/feed`, {
        params: { sort, page, limit },
    });
    return response.data;
}

/**
 * Add a clip to a community
 */
export async function addClipToCommunity(
    communityId: string,
    data: AddClipToCommunityRequest
): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/communities/${communityId}/clips`, data);
    return response.data;
}

/**
 * Remove a clip from a community
 */
export async function removeClipFromCommunity(communityId: string, clipId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/communities/${communityId}/clips/${clipId}`);
    return response.data;
}

/**
 * Get discussions in a community
 */
export async function getCommunityDiscussions({
    id,
    sort = 'recent',
    page = 1,
    limit = 20,
}: {
    id: string;
    sort?: string;
    page?: number;
    limit?: number;
}): Promise<CommunityDiscussionsResponse> {
    const response = await apiClient.get<CommunityDiscussionsResponse>(`/communities/${id}/discussions`, {
        params: { sort, page, limit },
    });
    return response.data;
}

/**
 * Get a single discussion
 */
export async function getDiscussion(communityId: string, discussionId: string): Promise<CommunityDiscussion> {
    const response = await apiClient.get<CommunityDiscussion>(`/communities/${communityId}/discussions/${discussionId}`);
    return response.data;
}

/**
 * Create a discussion
 */
export async function createDiscussion(
    communityId: string,
    data: CreateDiscussionRequest
): Promise<CommunityDiscussion> {
    const response = await apiClient.post<CommunityDiscussion>(`/communities/${communityId}/discussions`, data);
    return response.data;
}

/**
 * Update a discussion
 */
export async function updateDiscussion(
    communityId: string,
    discussionId: string,
    data: UpdateDiscussionRequest
): Promise<CommunityDiscussion> {
    const response = await apiClient.put<CommunityDiscussion>(
        `/communities/${communityId}/discussions/${discussionId}`,
        data
    );
    return response.data;
}

/**
 * Delete a discussion
 */
export async function deleteDiscussion(communityId: string, discussionId: string): Promise<void> {
    await apiClient.delete(`/communities/${communityId}/discussions/${discussionId}`);
}
