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

/**
 * Fetch stream status for a specific streamer
 */
export async function fetchStreamStatus(streamer: string): Promise<StreamInfo> {
  const response = await apiClient.get<StreamInfo>(`/streams/${streamer}`);
  return response.data;
}
