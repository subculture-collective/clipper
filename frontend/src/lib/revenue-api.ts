import apiClient from './api';

// Revenue API types
export interface PlanDistributionMetric {
  plan_id: string;
  plan_name: string;
  subscribers: number;
  percentage: number;
  monthly_value: number;
}

export interface CohortRetentionMetric {
  cohort_month: string;
  initial_size: number;
  retention_rates: number[];
}

export interface RevenueByMonthMetric {
  month: string;
  revenue: number;
  mrr: number;
}

export interface SubscriberGrowthMetric {
  month: string;
  total: number;
  new: number;
  churned: number;
  net_change: number;
}

export interface RevenueMetrics {
  mrr: number;
  churn: number;
  arpu: number;
  active_subscribers: number;
  total_revenue: number;
  plan_distribution: PlanDistributionMetric[];
  cohort_retention: CohortRetentionMetric[];
  churned_subscribers: number;
  new_subscribers: number;
  trial_conversion_rate: number;
  grace_period_recovery: number;
  average_lifetime_value: number;
  revenue_by_month: RevenueByMonthMetric[];
  subscriber_growth: SubscriberGrowthMetric[];
  updated_at: string;
}

// Admin Revenue API
export const getRevenueMetrics = async (): Promise<RevenueMetrics> => {
  const response = await apiClient.get('/admin/revenue');
  return response.data;
};

// Helper to format currency from cents
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

// Helper to format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
