import apiClient from './api';
import type {
  WatchParty,
  WatchPartyMessage,
  WatchPartyReaction,
  SendMessageRequest,
  SendReactionRequest,
  UpdateWatchPartySettingsRequest,
  WatchPartyHistoryEntry,
  JoinWatchPartyRequest,
} from '@/types/watchParty';

interface CreateWatchPartyRequest {
  title: string;
  playlist_id?: string;
  visibility?: 'public' | 'friends' | 'invite';
  password?: string;
  max_participants?: number;
}

interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Create a new watch party
 */
export async function createWatchParty(
  request: CreateWatchPartyRequest
): Promise<WatchParty> {
  const response = await apiClient.post<StandardResponse<{
    id: string;
    invite_code: string;
    invite_url: string;
    party: WatchParty;
  }>>('/watch-parties', request);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to create watch party');
  }

  return response.data.data.party;
}

/**
 * Join a watch party by invite code
 */
export async function joinWatchParty(inviteCode: string, request?: JoinWatchPartyRequest): Promise<WatchParty> {
  const response = await apiClient.post<StandardResponse<{
    party: WatchParty;
    invite_url: string;
  }>>(`/watch-parties/${inviteCode}/join`, request);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to join watch party');
  }

  return response.data.data.party;
}

/**
 * Get watch party details
 */
export async function getWatchParty(partyId: string): Promise<WatchParty> {
  const response = await apiClient.get<StandardResponse<WatchParty>>(
    `/watch-parties/${partyId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to get watch party');
  }

  return response.data.data;
}

/**
 * Update watch party settings
 */
export async function updateWatchPartySettings(
  partyId: string,
  request: UpdateWatchPartySettingsRequest
): Promise<void> {
  const response = await apiClient.patch<StandardResponse<{
    message: string;
  }>>(`/watch-parties/${partyId}/settings`, request);

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to update settings');
  }
}

/**
 * Get watch party history for current user
 */
export async function getWatchPartyHistory(page = 1, limit = 20): Promise<{
  history: WatchPartyHistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
  };
}> {
  const response = await apiClient.get<StandardResponse<{
    history: WatchPartyHistoryEntry[];
    pagination: {
      page: number;
      limit: number;
      total_count: number;
      total_pages: number;
    };
  }>>(`/watch-parties/history?page=${page}&limit=${limit}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to get watch party history');
  }

  return response.data.data;
}

/**
 * Get watch party participants
 */
export async function getWatchPartyParticipants(partyId: string) {
  const response = await apiClient.get<StandardResponse<{
    participants: any[];
    count: number;
  }>>(`/watch-parties/${partyId}/participants`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to get participants');
  }

  return response.data.data;
}

/**
 * Send a chat message to a watch party
 */
export async function sendWatchPartyMessage(
  partyId: string,
  request: SendMessageRequest
): Promise<WatchPartyMessage> {
  const response = await apiClient.post<StandardResponse<WatchPartyMessage>>(
    `/watch-parties/${partyId}/messages`,
    request
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to send message');
  }

  return response.data.data;
}

/**
 * Get chat message history for a watch party
 */
export async function getWatchPartyMessages(
  partyId: string
): Promise<WatchPartyMessage[]> {
  const response = await apiClient.get<StandardResponse<{
    messages: WatchPartyMessage[];
    count: number;
  }>>(`/watch-parties/${partyId}/messages`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to get messages');
  }

  return response.data.data.messages;
}

/**
 * Send an emoji reaction to a watch party
 */
export async function sendWatchPartyReaction(
  partyId: string,
  request: SendReactionRequest
): Promise<WatchPartyReaction> {
  const response = await apiClient.post<StandardResponse<WatchPartyReaction>>(
    `/watch-parties/${partyId}/react`,
    request
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to send reaction');
  }

  return response.data.data;
}

/**
 * Leave a watch party
 */
export async function leaveWatchParty(partyId: string): Promise<void> {
  const response = await apiClient.delete<StandardResponse<{
    message: string;
  }>>(`/watch-parties/${partyId}/leave`);

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to leave watch party');
  }
}

/**
 * End a watch party (host only)
 */
export async function endWatchParty(partyId: string): Promise<void> {
  const response = await apiClient.post<StandardResponse<{
    message: string;
  }>>(`/watch-parties/${partyId}/end`);

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to end watch party');
  }
}
