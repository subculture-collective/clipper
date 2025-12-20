import { apiClient } from './api';
import type {
    WebhookSubscription,
    WebhookDelivery,
    CreateWebhookSubscriptionRequest,
    UpdateWebhookSubscriptionRequest,
} from '../types/webhook';

// Get supported webhook events
export async function getSupportedWebhookEvents(): Promise<string[]> {
    const response = await apiClient.get('/webhooks/events');
    return response.data.data;
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
): Promise<void> {
    await apiClient.patch(`/webhooks/${id}`, data);
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
