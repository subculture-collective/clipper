/**
 * Performance monitoring utilities for tracking app performance
 */

import * as Sentry from '@sentry/react-native';

/**
 * Track app start performance
 * Returns a finish function that should be called when the app is ready
 */
export function trackAppStart(): { finish: () => void } {
    const startTime = Date.now();

    return {
        finish: () => {
            const durationMs = Date.now() - startTime;
            Sentry.startSpan(
                {
                    name: 'App Start',
                    op: 'app.start',
                    data: {
                        duration_ms: durationMs,
                    },
                },
                () => {
                    // Span completes with recorded duration
                }
            );
        },
    };
}

/**
 * Track screen navigation performance
 * Returns a finish function that should be called when the screen is ready
 */
export function trackScreenTransition(screenName: string): { finish: () => void } {
    const startTime = Date.now();

    return {
        finish: () => {
            const durationMs = Date.now() - startTime;
            Sentry.startSpan(
                {
                    name: `Screen: ${screenName}`,
                    op: 'navigation',
                    data: {
                        navigation_duration_ms: durationMs,
                    },
                },
                () => {
                    // Span completes with recorded duration
                }
            );
        },
    };
}

/**
 * Track API request performance
 * Returns a finish function that should be called when the request completes
 */
export function trackApiRequest(endpoint: string): { finish: (statusCode?: number) => void } {
    const startTime = Date.now();

    return {
        finish: (statusCode?: number) => {
            const durationMs = Date.now() - startTime;
            Sentry.startSpan(
                {
                    name: `API: ${endpoint}`,
                    op: 'http.client',
                    data: {
                        duration_ms: durationMs,
                        ...(statusCode && { status_code: statusCode }),
                    },
                },
                () => {
                    // Span completes with recorded duration and status
                    if (statusCode) {
                        Sentry.setTag('http.status_code', statusCode.toString());
                    }
                }
            );
        },
    };
}

/**
 * Track custom operation performance
 * Returns a finish function that should be called when the operation completes
 */
export function trackOperation(name: string, op: string): { finish: () => void } {
    const startTime = Date.now();

    return {
        finish: () => {
            const durationMs = Date.now() - startTime;
            Sentry.startSpan(
                {
                    name,
                    op,
                    data: {
                        duration_ms: durationMs,
                    },
                },
                () => {
                    // Span completes with recorded duration
                }
            );
        },
    };
}

