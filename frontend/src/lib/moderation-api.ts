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

// ==================== AUDIT LOGS & ANALYTICS ====================

export interface ModerationDecisionWithDetails {
    id: string;
    queue_item_id: string;
    moderator_id: string;
    moderator_name: string;
    action: string;
    content_type: string;
    content_id: string;
    reason?: string;
    metadata?: string;
    created_at: string;
}

export interface AuditLogsResponse {
    success: boolean;
    data: ModerationDecisionWithDetails[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
}

export interface TimeSeriesPoint {
    date: string;
    count: number;
}

export interface ModerationAnalytics {
    total_actions: number;
    actions_by_type: Record<string, number>;
    actions_by_moderator: Record<string, number>;
    actions_over_time: TimeSeriesPoint[];
    content_type_breakdown: Record<string, number>;
    average_response_time_minutes?: number;
}

export interface AnalyticsResponse {
    success: boolean;
    data: ModerationAnalytics;
}

/**
 * Get moderation audit logs with filters
 */
export async function getModerationAuditLogs(params: {
    moderator_id?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}): Promise<AuditLogsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.moderator_id) queryParams.append('moderator_id', params.moderator_id);
    if (params.action) queryParams.append('action', params.action);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const response = await apiClient.get<AuditLogsResponse>(
        `/admin/moderation/audit?${queryParams.toString()}`
    );
    return response.data;
}

/**
 * Get moderation analytics
 */
export async function getModerationAnalytics(params: {
    start_date?: string;
    end_date?: string;
}): Promise<AnalyticsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    const response = await apiClient.get<AnalyticsResponse>(
        `/admin/moderation/analytics?${queryParams.toString()}`
    );
    return response.data;
}

// ==================== BAN STATUS ====================

export interface BanStatus {
    isBanned: boolean;
    banReason?: string;
    bannedAt?: string;
    expiresAt?: string | null;
}

export interface BanStatusResponse {
    success: boolean;
    data: BanStatus;
}

/**
 * Check if the authenticated user is banned from a specific channel
 */
export async function checkBanStatus(channelId: string): Promise<BanStatus> {
    const queryParams = new URLSearchParams();
    queryParams.append('channelId', channelId);

    const response = await apiClient.get<BanStatusResponse>(
        `/moderation/ban-status?${queryParams.toString()}`
    );
    return response.data.data;
}

// ==================== CHANNEL MODERATOR MANAGEMENT ====================

export interface ChannelModerator {
    id: string;
    user_id: string;
    channel_id: string;
    role: 'moderator' | 'admin' | 'owner';
    assigned_by?: string;
    assigned_at: string;
    // User details
    username?: string;
    display_name?: string;
    avatar_url?: string;
}

export interface ListModeratorsResponse {
    success: boolean;
    data: ChannelModerator[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
}

export interface AddModeratorRequest {
    userId: string;
    channelId: string;
    reason?: string;
}

export interface RemoveModeratorResponse {
    success: boolean;
    message: string;
}

export interface UpdateModeratorPermissionsRequest {
    role: 'moderator' | 'admin';
}

/**
 * List moderators for a specific channel
 */
export async function listChannelModerators(
    channelId: string,
    limit: number = 50,
    offset: number = 0
): Promise<ListModeratorsResponse> {
    const params = new URLSearchParams({
        channelId,
        limit: limit.toString(),
        offset: offset.toString(),
    });

    const response = await apiClient.get<ListModeratorsResponse>(
        `/moderation/moderators?${params.toString()}`
    );
    return response.data;
}

/**
 * Add a moderator to a channel
 */
export async function addChannelModerator(
    request: AddModeratorRequest
): Promise<{ success: boolean; message: string; moderator: ChannelModerator }> {
    const response = await apiClient.post<{
        success: boolean;
        message: string;
        moderator: ChannelModerator;
    }>('/moderation/moderators', request);
    return response.data;
}

/**
 * Remove a moderator from a channel
 */
export async function removeChannelModerator(
    moderatorId: string
): Promise<RemoveModeratorResponse> {
    const response = await apiClient.delete<RemoveModeratorResponse>(
        `/moderation/moderators/${moderatorId}`
    );
    return response.data;
}

/**
 * Update a moderator's permissions (role)
 */
export async function updateModeratorPermissions(
    moderatorId: string,
    request: UpdateModeratorPermissionsRequest
): Promise<{ success: boolean; message: string; moderator: ChannelModerator }> {
    const response = await apiClient.patch<{
        success: boolean;
        message: string;
        moderator: ChannelModerator;
    }>(`/moderation/moderators/${moderatorId}`, request);
    return response.data;
}
