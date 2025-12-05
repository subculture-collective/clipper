import apiClient from './api';

// Campaign API types

export interface Campaign {
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
  daily_budget_cents?: number;
  total_budget_cents?: number;
  spent_today_cents: number;
  spent_total_cents: number;
  cpm_cents: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  targeting_criteria?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  advertiser_name: string;
  ad_type: 'banner' | 'video' | 'native';
  content_url: string;
  click_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  priority?: number;
  weight?: number;
  daily_budget_cents?: number;
  total_budget_cents?: number;
  cpm_cents?: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  targeting_criteria?: Record<string, unknown>;
}

export interface UpdateCampaignRequest {
  name?: string;
  advertiser_name?: string;
  ad_type?: 'banner' | 'video' | 'native';
  content_url?: string;
  click_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  priority?: number;
  weight?: number;
  daily_budget_cents?: number;
  total_budget_cents?: number;
  cpm_cents?: number;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  targeting_criteria?: Record<string, unknown>;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface CampaignAnalytics {
  id: string;
  ad_id: string;
  date: string;
  slot_id?: string;
  impressions: number;
  viewable_impressions: number;
  clicks: number;
  spend_cents: number;
  unique_users: number;
  created_at: string;
  updated_at: string;
}

export interface SlotReport {
  slot_id: string;
  impressions: number;
  viewable_impressions: number;
  clicks: number;
  ctr: number;
  viewability_rate: number;
  spend_cents: number;
  unique_ads: number;
}

export interface CTRReport {
  ad_id: string;
  ad_name: string;
  slot_id?: string;
  impressions: number;
  viewable_impressions: number;
  clicks: number;
  ctr: number;
  viewability_rate: number;
  spend_cents: number;
}

export interface ValidateCreativeRequest {
  content_url: string;
  ad_type: 'banner' | 'video' | 'native';
  width?: number;
  height?: number;
}

// API functions

export const listCampaigns = async (
  page = 1,
  limit = 20,
  status?: string
): Promise<CampaignListResponse> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) {
    params.append('status', status);
  }
  const response = await apiClient.get(`/admin/ads/campaigns?${params.toString()}`);
  return {
    campaigns: response.data.data?.campaigns || [],
    ...response.data.meta,
  };
};

export const getCampaign = async (id: string): Promise<Campaign> => {
  const response = await apiClient.get(`/admin/ads/campaigns/${id}`);
  return response.data.data;
};

export const createCampaign = async (data: CreateCampaignRequest): Promise<Campaign> => {
  const response = await apiClient.post('/admin/ads/campaigns', data);
  return response.data.data;
};

export const updateCampaign = async (
  id: string,
  data: UpdateCampaignRequest
): Promise<Campaign> => {
  const response = await apiClient.put(`/admin/ads/campaigns/${id}`, data);
  return response.data.data;
};

export const deleteCampaign = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/ads/campaigns/${id}`);
};

export const validateCreative = async (data: ValidateCreativeRequest): Promise<boolean> => {
  const response = await apiClient.post('/admin/ads/validate-creative', data);
  return response.data.data?.valid || false;
};

export const getCampaignReportByDate = async (
  adId?: string,
  startDate?: string,
  endDate?: string
): Promise<{ reports: CampaignAnalytics[]; start_date: string; end_date: string }> => {
  const params = new URLSearchParams();
  if (adId) params.append('ad_id', adId);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const response = await apiClient.get(`/admin/ads/reports/by-date?${params.toString()}`);
  return response.data.data;
};

export const getCampaignReportByPlacement = async (
  adId?: string,
  days = 30
): Promise<{ reports: SlotReport[]; days: number }> => {
  const params = new URLSearchParams({ days: String(days) });
  if (adId) params.append('ad_id', adId);
  const response = await apiClient.get(`/admin/ads/reports/by-placement?${params.toString()}`);
  return response.data.data;
};

export const getCTRReportByCampaign = async (
  days = 30
): Promise<{ reports: CTRReport[]; days: number }> => {
  const params = new URLSearchParams({ days: String(days) });
  const response = await apiClient.get(`/admin/ads/reports/by-campaign?${params.toString()}`);
  return response.data.data;
};

export const getCTRReportBySlot = async (
  days = 30
): Promise<{ reports: SlotReport[]; days: number }> => {
  const params = new URLSearchParams({ days: String(days) });
  const response = await apiClient.get(`/admin/ads/reports/by-slot?${params.toString()}`);
  return response.data.data;
};

// Helper functions

export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const getCampaignStatus = (campaign: Campaign): string => {
  const now = new Date();
  if (!campaign.is_active) {
    return 'inactive';
  }
  if (campaign.start_date && new Date(campaign.start_date) > now) {
    return 'scheduled';
  }
  if (campaign.end_date && new Date(campaign.end_date) <= now) {
    return 'ended';
  }
  return 'active';
};

export const getCampaignStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'inactive':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'ended':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

// Standard banner sizes (IAB)
export const STANDARD_BANNER_SIZES = [
  { width: 728, height: 90, name: 'Leaderboard' },
  { width: 300, height: 250, name: 'Medium Rectangle' },
  { width: 336, height: 280, name: 'Large Rectangle' },
  { width: 300, height: 600, name: 'Half Page' },
  { width: 970, height: 250, name: 'Billboard' },
  { width: 320, height: 50, name: 'Mobile Leaderboard' },
  { width: 160, height: 600, name: 'Wide Skyscraper' },
  { width: 300, height: 50, name: 'Mobile Banner' },
  { width: 970, height: 90, name: 'Large Leaderboard' },
  { width: 250, height: 250, name: 'Square' },
  { width: 200, height: 200, name: 'Small Square' },
];
