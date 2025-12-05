import { apiClient } from './api';

/**
 * Ad represents an advertisement
 */
export interface Ad {
  id: string;
  name: string;
  advertiser_name: string;
  ad_type: 'banner' | 'video' | 'native';
  content_url: string;
  click_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  priority: number;
  weight: number;
}

/**
 * Ad selection request parameters
 */
export interface AdSelectionRequest {
  platform: 'web' | 'ios' | 'android';
  page_url?: string;
  ad_type?: string;
  width?: number;
  height?: number;
  session_id?: string;
  game_id?: string;
  language?: string;
  /** Slot ID for ad placement */
  slot_id?: string;
  /** Whether personalized ads are allowed (consent given) */
  personalized?: boolean;
}

/**
 * Ad selection response
 */
export interface AdSelectionResponse {
  ad?: Ad;
  impression_id?: string;
  tracking_url?: string;
}

/**
 * Ad tracking request
 */
export interface AdTrackingRequest {
  viewability_time_ms: number;
  is_viewable: boolean;
  is_clicked: boolean;
}

/**
 * Select an ad for display based on request parameters
 */
export async function selectAd(
  params: AdSelectionRequest
): Promise<AdSelectionResponse | null> {
  const response = await apiClient.get<{
    success: boolean;
    data: AdSelectionResponse | null;
    error?: { code: string; message: string };
  }>('/ads/select', { params });

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to select ad');
  }

  return response.data.data;
}

/**
 * Track an ad impression (viewability and clicks)
 */
export async function trackImpression(
  impressionId: string,
  tracking: AdTrackingRequest
): Promise<void> {
  const response = await apiClient.post<{
    success: boolean;
    error?: { code: string; message: string };
  }>(`/ads/track/${impressionId}`, tracking);

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to track impression');
  }
}

/**
 * Get an ad by ID
 */
export async function getAd(adId: string): Promise<Ad | null> {
  const response = await apiClient.get<{
    success: boolean;
    data: Ad | null;
    error?: { code: string; message: string };
  }>(`/ads/${adId}`);

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to get ad');
  }

  return response.data.data;
}

/**
 * Helper to get or create a session ID for anonymous users
 */
export function getOrCreateSessionId(): string {
  const key = 'ad_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * Viewability threshold in milliseconds (IAB standard: 1 second)
 */
export const VIEWABILITY_THRESHOLD_MS = 1000;

/**
 * Minimum percentage of ad visible to count as viewable (IAB standard: 50%)
 */
export const VIEWABILITY_PERCENT_THRESHOLD = 0.5;
