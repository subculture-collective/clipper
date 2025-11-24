import apiClient from './api';

// Revenue Analytics API types
export interface RevenueOverview {
  current_mrr: number;
  current_arr: number;
  arpu: number;
  total_subscribers: number;
  active_subscribers: number;
  monthly_churn_rate: number;
  monthly_growth_rate: number;
}

export interface PlanDistribution {
  monthly_count: number;
  yearly_count: number;
  free_count: number;
  monthly_pct: number;
  yearly_pct: number;
  free_pct: number;
}

export interface RevenueTrendDataPoint {
  date: string;
  value: number;
}

export interface RevenueTrendResponse {
  metric: string;
  days: number;
  data: RevenueTrendDataPoint[];
}

export interface CohortRetentionRow {
  cohort_month: string;
  initial_count: number;
  retention_rates: number[];
}

// Revenue Analytics API functions

/**
 * Get revenue overview metrics
 */
export const getRevenueOverview = async (): Promise<RevenueOverview> => {
  const response = await apiClient.get('/admin/revenue/overview');
  return response.data;
};

/**
 * Get plan distribution
 */
export const getPlanDistribution = async (): Promise<PlanDistribution> => {
  const response = await apiClient.get('/admin/revenue/distribution');
  return response.data;
};

/**
 * Get MRR trend data
 */
export const getMRRTrend = async (
  params?: { days?: number }
): Promise<RevenueTrendResponse> => {
  const response = await apiClient.get('/admin/revenue/trends/mrr', { params });
  return response.data;
};

/**
 * Get subscriber trend data
 */
export const getSubscriberTrend = async (
  params?: { days?: number }
): Promise<RevenueTrendResponse> => {
  const response = await apiClient.get('/admin/revenue/trends/subscribers', { params });
  return response.data;
};

/**
 * Get churn trend data
 */
export const getChurnTrend = async (
  params?: { days?: number }
): Promise<RevenueTrendResponse> => {
  const response = await apiClient.get('/admin/revenue/trends/churn', { params });
  return response.data;
};

/**
 * Get cohort retention data
 */
export const getCohortRetention = async (
  params?: { months?: number }
): Promise<CohortRetentionRow[]> => {
  const response = await apiClient.get('/admin/revenue/cohorts', { params });
  return response.data;
};

/**
 * Trigger metrics backfill job
 */
export const triggerBackfill = async (
  params?: { days?: number }
): Promise<{ success: boolean; message: string; days: number }> => {
  const response = await apiClient.post('/admin/revenue/backfill', null, { params });
  return response.data;
};
