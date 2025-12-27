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
    let finishCallback: (() => void) | null = null;

    Sentry.startSpan(
        {
            name: `API: ${endpoint}`,
            op: 'http.client',
        },
        (span) => {
            finishCallback = () => {
                if (span) {
                    span.end();
                }
            };
        }
    );

    return {
        finish: (statusCode?: number) => {
            if (finishCallback) {
                finishCallback();
            }
        },
    };
}

/**
 * Track custom operation performance
 */
export function trackOperation(name: string, op: string): { finish: () => void } {
    let finishCallback: (() => void) | null = null;

    Sentry.startSpan({ name, op }, (span) => {
        finishCallback = () => {
            if (span) {
                span.end();
            }
        };
    });

    return {
        finish: () => {
            if (finishCallback) {
                finishCallback();
            }
        },
    };
}
