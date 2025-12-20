import { apiClient } from './api';
import type {
    WebhookSubscription,
    WebhookDelivery,
    CreateWebhookSubscriptionRequest,
    UpdateWebhookSubscriptionRequest,
} from '../types/webhook';

// Get supported webhook events
export async function getSupportedWebhookEvents(): Promise<string[]> {
    try {
        const response = await apiClient.get('/webhooks/events');
        return response.data.data || [];
    } catch (error) {
        console.error('Failed to fetch supported webhook events:', error);
        throw new Error('Failed to load webhook events. Please try again.');
    }
}

// Create a new webhook subscription
export async function createWebhookSubscription(
    data: CreateWebhookSubscriptionRequest
): Promise<{ subscription: WebhookSubscription; secret: string }> {
    const response = await apiClient.post('/webhooks', data);
    return {
        subscription: response.data.data,
        secret: response.data.secret,
    };
}

// List all webhook subscriptions
export async function listWebhookSubscriptions(): Promise<
    WebhookSubscription[]
> {
    const response = await apiClient.get('/webhooks');
    return response.data.data;
}

// Get a specific webhook subscription
export async function getWebhookSubscription(
    id: string
): Promise<WebhookSubscription> {
    const response = await apiClient.get(`/webhooks/${id}`);
    return response.data.data;
}

// Update a webhook subscription
export async function updateWebhookSubscription(
    id: string,
    data: UpdateWebhookSubscriptionRequest
): Promise<WebhookSubscription> {
    const response = await apiClient.patch(`/webhooks/${id}`, data);
    // Return the subscription data if available, otherwise fetch it
    if (response.data.data) {
        return response.data.data;
    }
    // Fallback: fetch the updated subscription
    return getWebhookSubscription(id);
}

// Delete a webhook subscription
export async function deleteWebhookSubscription(id: string): Promise<void> {
    await apiClient.delete(`/webhooks/${id}`);
}

// Regenerate webhook secret
export async function regenerateWebhookSecret(
    id: string
): Promise<string> {
    const response = await apiClient.post(`/webhooks/${id}/regenerate-secret`);
    return response.data.secret;
}

// Get delivery history for a webhook subscription
export async function getWebhookDeliveries(
    id: string,
    page: number = 1,
    limit: number = 20
): Promise<{
    deliveries: WebhookDelivery[];
    meta: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}> {
    const response = await apiClient.get(`/webhooks/${id}/deliveries`, {
        params: { page, limit },
    });
    return {
        deliveries: response.data.data,
        meta: response.data.meta,
    };
}
