import { apiClient } from './api';

export interface ModerationQueueItem {
    id: string;
    content_type: string;
    content_id: string;
    reason: string;
    priority: number;
    status: string;
    assigned_to?: string;
    reported_by: string[];
    report_count: number;
    auto_flagged: boolean;
    confidence_score?: number;
    created_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
    content?: unknown;
}

export interface ModerationQueueStats {
    total_pending: number;
    total_approved: number;
    total_rejected: number;
    total_escalated: number;
    by_content_type: Record<string, number>;
    by_reason: Record<string, number>;
    auto_flagged_count: number;
    user_reported_count: number;
    high_priority_count: number;
    oldest_pending_age_hours?: number;
}

export interface ModerationQueueResponse {
    success: boolean;
    data: ModerationQueueItem[];
    meta: {
        count: number;
        limit: number;
        status: string;
    };
}

export interface ModerationStatsResponse {
    success: boolean;
    data: ModerationQueueStats;
}

export interface BulkModerationRequest {
    item_ids: string[];
    action: 'approve' | 'reject' | 'escalate';
    reason?: string;
}

export interface BulkModerationResponse {
    success: boolean;
    processed: number;
    total: number;
}

/**
 * Get moderation queue items with optional filters
 */
export async function getModerationQueue(
    status: string = 'pending',
    contentType?: string,
    limit: number = 50
): Promise<ModerationQueueResponse> {
    const params = new URLSearchParams({
        status,
        limit: limit.toString(),
    });
    
    if (contentType) {
        params.append('type', contentType);
    }

    const response = await apiClient.get<ModerationQueueResponse>(
        `/admin/moderation/queue?${params.toString()}`
    );
    return response.data;
}

/**
 * Approve a moderation queue item
 */
export async function approveQueueItem(itemId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/admin/moderation/${itemId}/approve`);
    return response.data;
}

/**
 * Reject a moderation queue item
 */
export async function rejectQueueItem(
    itemId: string,
    reason?: string
): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/admin/moderation/${itemId}/reject`, {
        reason,
    });
    return response.data;
}

/**
 * Perform bulk moderation action
 */
export async function bulkModerate(
    request: BulkModerationRequest
): Promise<BulkModerationResponse> {
    const response = await apiClient.post<BulkModerationResponse>(
        '/admin/moderation/bulk',
        request
    );
    return response.data;
}

/**
 * Get moderation queue statistics
 */
export async function getModerationStats(): Promise<ModerationStatsResponse> {
    const response = await apiClient.get<ModerationStatsResponse>(
        '/admin/moderation/queue/stats'
    );
    return response.data;
}

// ==================== APPEALS ====================

export interface ModerationAppeal {
    id: string;
    user_id: string;
    moderation_action_id: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    resolved_by?: string;
    resolution?: string;
    created_at: string;
    resolved_at?: string;
    // Additional fields for detailed views
    username?: string;
    display_name?: string;
    decision_action?: string;
    decision_reason?: string;
    content_type?: string;
    content_id?: string;
}

export interface AppealResponse {
    success: boolean;
    data: ModerationAppeal[];
    meta?: {
        count: number;
        limit: number;
        status: string;
    };
}

export interface CreateAppealRequest {
    moderation_action_id: string;
    reason: string;
}

export interface ResolveAppealRequest {
    decision: 'approve' | 'reject';
    resolution?: string;
}

/**
 * Create a new appeal for a moderation decision (user-facing)
 */
export async function createAppeal(
    request: CreateAppealRequest
): Promise<{ success: boolean; appeal_id: string; message: string }> {
    const response = await apiClient.post('/moderation/appeals', request);
    return response.data;
}

/**
 * Get appeals for the authenticated user
 */
export async function getUserAppeals(): Promise<AppealResponse> {
    const response = await apiClient.get<AppealResponse>('/moderation/appeals');
    return response.data;
}

/**
 * Get appeals for admin review
 */
export async function getAdminAppeals(
    status: 'pending' | 'approved' | 'rejected' = 'pending',
    limit: number = 50
): Promise<AppealResponse> {
    const params = new URLSearchParams({
        status,
        limit: limit.toString(),
    });

    const response = await apiClient.get<AppealResponse>(
        `/admin/moderation/appeals?${params.toString()}`
    );
    return response.data;
}

/**
 * Resolve an appeal (admin only)
 */
export async function resolveAppeal(
    appealId: string,
    request: ResolveAppealRequest
): Promise<{ success: boolean; message: string; status: string }> {
    const response = await apiClient.post(
        `/admin/moderation/appeals/${appealId}/resolve`,
        request
    );
    return response.data;
}
