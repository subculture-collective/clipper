import { apiClient } from './api';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  status: 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  tier: 'free' | 'pro';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckoutSessionRequest {
  price_id: string;
}

export interface CreateCheckoutSessionResponse {
  session_id: string;
  session_url: string;
}

export interface CreatePortalSessionResponse {
  portal_url: string;
}

/**
 * Get the current user's subscription
 */
export async function getSubscription(): Promise<Subscription | null> {
  try {
    const response = await apiClient.get('/subscriptions/me');
    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        return null; // No subscription found
      }
    }
    throw error;
  }
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  priceId: string
): Promise<CreateCheckoutSessionResponse> {
  const response = await apiClient.post(
    '/subscriptions/checkout',
    { price_id: priceId } as CreateCheckoutSessionRequest
  );
  return response.data;
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(): Promise<CreatePortalSessionResponse> {
  const response = await apiClient.post('/subscriptions/portal', {});
  return response.data;
}

/**
 * Check if user has an active subscription
 */
export function hasActiveSubscription(subscription: Subscription | null): boolean {
  return (
    subscription !== null &&
    (subscription.status === 'active' || subscription.status === 'trialing')
  );
}

/**
 * Check if user is a Pro subscriber
 */
export function isProUser(subscription: Subscription | null): boolean {
  return (
    hasActiveSubscription(subscription) &&
    subscription?.tier === 'pro'
  );
}
