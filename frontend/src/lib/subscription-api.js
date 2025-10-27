import { apiClient } from './api';
/**
 * Get the current user's subscription
 */
export async function getSubscription() {
    try {
        const response = await apiClient.get('/subscriptions/me');
        return response.data;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error;
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
export async function createCheckoutSession(priceId) {
    const response = await apiClient.post('/subscriptions/checkout', { price_id: priceId });
    return response.data;
}
/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession() {
    const response = await apiClient.post('/subscriptions/portal', {});
    return response.data;
}
/**
 * Check if user has an active subscription
 */
export function hasActiveSubscription(subscription) {
    return (subscription !== null &&
        (subscription.status === 'active' || subscription.status === 'trialing'));
}
/**
 * Check if user is a Pro subscriber
 */
export function isProUser(subscription) {
    return (hasActiveSubscription(subscription) &&
        subscription?.tier === 'pro');
}
