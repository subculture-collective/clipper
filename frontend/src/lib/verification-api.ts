import { apiClient } from './api';

export interface VerificationApplication {
    id: string;
    user_id: string;
    twitch_channel_url: string;
    follower_count?: number;
    subscriber_count?: number;
    avg_viewers?: number;
    content_description?: string;
    social_media_links?: Record<string, string>;
    status: 'pending' | 'approved' | 'rejected';
    priority: number;
    reviewed_by?: string;
    reviewed_at?: string;
    reviewer_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface VerificationApplicationWithUser extends VerificationApplication {
    user?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
        email?: string;
        karma_points: number;
        trust_score: number;
        is_verified: boolean;
        created_at: string;
    };
    reviewed_by_user?: {
        id: string;
        username: string;
        display_name: string;
    };
}

export interface VerificationApplicationStats {
    total_pending: number;
    total_approved: number;
    total_rejected: number;
    total_verified: number;
}

export interface VerificationApplicationsResponse {
    success: boolean;
    data: VerificationApplication[];
    meta: {
        count: number;
        limit: number;
        page: number;
        status: string;
    };
}

export interface VerificationApplicationResponse {
    success: boolean;
    data: VerificationApplicationWithUser;
}

export interface VerificationStatsResponse {
    success: boolean;
    data: VerificationApplicationStats;
}

export interface CreateVerificationApplicationRequest {
    twitch_channel_url: string;
    follower_count?: number;
    subscriber_count?: number;
    avg_viewers?: number;
    content_description?: string;
    social_media_links?: Record<string, string>;
}

export interface ReviewVerificationApplicationRequest {
    decision: 'approved' | 'rejected';
    notes?: string;
}

/**
 * Create a new verification application (user endpoint)
 */
export async function createVerificationApplication(
    data: CreateVerificationApplicationRequest
): Promise<{ success: boolean; data: VerificationApplication; message: string }> {
    const response = await apiClient.post('/verification/applications', data);
    return response.data;
}

/**
 * Get current user's verification application (user endpoint)
 */
export async function getMyVerificationApplication(): Promise<{
    success: boolean;
    data: VerificationApplication;
}> {
    const response = await apiClient.get('/verification/applications/me');
    return response.data;
}

/**
 * Get verification applications with optional filters (admin endpoint)
 */
export async function getVerificationApplications(
    status: string = 'pending',
    limit: number = 50,
    page: number = 1
): Promise<VerificationApplicationsResponse> {
    const params = new URLSearchParams({
        status,
        limit: limit.toString(),
        page: page.toString(),
    });

    const response = await apiClient.get<VerificationApplicationsResponse>(
        `/admin/verification/applications?${params.toString()}`
    );
    return response.data;
}

/**
 * Get a specific verification application by ID (admin endpoint)
 */
export async function getVerificationApplication(
    id: string
): Promise<VerificationApplicationResponse> {
    const response = await apiClient.get<VerificationApplicationResponse>(
        `/admin/verification/applications/${id}`
    );
    return response.data;
}

/**
 * Review a verification application (admin endpoint)
 */
export async function reviewVerificationApplication(
    id: string,
    data: ReviewVerificationApplicationRequest
): Promise<{ success: boolean; message: string; data: { id: string; decision: string } }> {
    const response = await apiClient.post(
        `/admin/verification/applications/${id}/review`,
        data
    );
    return response.data;
}

/**
 * Get verification application statistics (admin endpoint)
 */
export async function getVerificationStats(): Promise<VerificationStatsResponse> {
    const response = await apiClient.get<VerificationStatsResponse>(
        '/admin/verification/stats'
    );
    return response.data;
}
