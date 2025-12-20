export interface WebhookSubscription {
    id: string;
    user_id: string;
    url: string;
    events: string[];
    is_active: boolean;
    description?: string;
    created_at: string;
    updated_at: string;
    last_delivery_at?: string;
}

export interface WebhookDelivery {
    id: string;
    subscription_id: string;
    event_type: string;
    event_id: string;
    payload: string;
    status: 'pending' | 'delivered' | 'failed';
    http_status_code?: number;
    response_body?: string;
    error_message?: string;
    attempt_count: number;
    max_attempts: number;
    next_attempt_at?: string;
    delivered_at?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateWebhookSubscriptionRequest {
    url: string;
    events: string[];
    description?: string;
}

export interface UpdateWebhookSubscriptionRequest {
    url?: string;
    events?: string[];
    is_active?: boolean;
    description?: string;
}

export interface WebhookEvent {
    name: string;
    description: string;
}
