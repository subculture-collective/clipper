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
