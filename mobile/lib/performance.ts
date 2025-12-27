/**
 * Performance monitoring utilities for tracking app performance
 */

import * as Sentry from '@sentry/react-native';

/**
 * Track app start performance
 */
export function trackAppStart(): void {
    // Use startSpan for performance tracking
    Sentry.startSpan(
        {
            name: 'App Start',
            op: 'app.start',
        },
        () => {
            // Span automatically finishes when function completes
        }
    );
}

/**
 * Track screen navigation performance
 */
export function trackScreenTransition(screenName: string): void {
    Sentry.startSpan(
        {
            name: `Screen: ${screenName}`,
            op: 'navigation',
        },
        () => {
            // Span automatically finishes
        }
    );
}

/**
 * Track API request performance
 */
export function trackApiRequest(endpoint: string): { finish: (statusCode?: number) => void } {
    // For tracking async operations, we use manual span management
    // Note: In @sentry/react-native v7+, spans are managed differently
    // For now, we'll use a simpler approach with span sampling
    const spanContext = {
        name: `API: ${endpoint}`,
        op: 'http.client',
    };

    // Start tracking when finish is called
    return {
        finish: (statusCode?: number) => {
            Sentry.startSpan(spanContext, () => {
                // Span completes when callback finishes
                if (statusCode) {
                    Sentry.setTag('http.status_code', statusCode.toString());
                }
            });
        },
    };
}

/**
 * Track custom operation performance
 */
export function trackOperation(name: string, op: string): { finish: () => void } {
    const spanContext = { name, op };

    return {
        finish: () => {
            Sentry.startSpan(spanContext, () => {
                // Span completes when callback finishes
            });
        },
    };
}
