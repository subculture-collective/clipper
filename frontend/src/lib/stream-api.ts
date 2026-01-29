import apiClient from './api';

export interface StreamInfo {
  streamer_username: string;
  is_live: boolean;
  title?: string | null;
  game_name?: string | null;
  viewer_count: number;
  thumbnail_url?: string | null;
  started_at?: string | null;
  last_went_offline?: string | null;
}

export interface CreateClipFromStreamRequest {
  streamer_username: string;
  start_time: number;
  end_time: number;
  quality: 'source' | '1080p' | '720p';
  title: string;
}

export interface CreateClipFromStreamResponse {
  clip_id: string;
  status: 'processing' | 'ready' | 'failed';
}

export interface StreamFollowStatus {
  following: boolean;
  notifications_enabled: boolean;
}

export interface StreamFollowRequest {
  notifications_enabled?: boolean;
}

export interface StreamFollow {
  id: string;
  user_id: string;
  streamer_username: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FollowedStreamersResponse {
  follows: StreamFollow[];
  count: number;
}

/**
 * Fetch stream status for a specific streamer
 */
export async function fetchStreamStatus(streamer: string): Promise<StreamInfo> {
  const response = await apiClient.get<StreamInfo>(`/streams/${streamer}`);
  return response.data;
}

/**
 * Create a clip from a live stream
 */
export async function createClipFromStream(
  streamer: string,
  request: CreateClipFromStreamRequest
): Promise<CreateClipFromStreamResponse> {
  const response = await apiClient.post<CreateClipFromStreamResponse>(
    `/streams/${streamer}/clips`,
    request
  );
  return response.data;
}

/**
 * Follow a streamer for live notifications
 */
export async function followStreamer(
  streamer: string,
  options?: StreamFollowRequest
): Promise<{ following: boolean; notifications_enabled: boolean; message: string }> {
  const response = await apiClient.post(
    `/streams/${streamer}/follow`,
    options || {}
  );
  return response.data;
}

/**
 * Unfollow a streamer
 */
export async function unfollowStreamer(
  streamer: string
): Promise<{ following: boolean; message: string }> {
  const response = await apiClient.delete(`/streams/${streamer}/follow`);
  return response.data;
}

/**
 * Get follow status for a streamer
 */
export async function getStreamFollowStatus(
  streamer: string
): Promise<StreamFollowStatus> {
  const response = await apiClient.get<StreamFollowStatus>(
    `/streams/${streamer}/follow-status`
  );
  return response.data;
}

/**
 * Get list of followed streamers
 */
export async function getFollowedStreamers(): Promise<FollowedStreamersResponse> {
  const response = await apiClient.get<FollowedStreamersResponse>(
    '/streams/following'
  );
  return response.data;
}

