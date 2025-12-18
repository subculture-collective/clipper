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
