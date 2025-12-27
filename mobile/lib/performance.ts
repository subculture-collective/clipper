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

/**
 * Track feed initial render time (Time to Interactive)
 * Returns a finish function that should be called when the feed is fully rendered
 */
export function trackFeedInitialRender(): { finish: (clipCount: number) => void } {
    const startTime = Date.now();

    return {
        finish: (clipCount: number) => {
            const durationMs = Date.now() - startTime;
            Sentry.startSpan(
                {
                    name: 'Feed Initial Render',
                    op: 'ui.render',
                    data: {
                        duration_ms: durationMs,
                        clip_count: clipCount,
                        meets_target: durationMs < 1500, // Target < 1.5s
                    },
                },
                () => {
                    // Record metric
                    Sentry.setMeasurement('feed_tti', durationMs, 'millisecond');
                    
                    // Add breadcrumb for debugging
                    Sentry.addBreadcrumb({
                        category: 'performance',
                        message: `Feed rendered with ${clipCount} clips in ${durationMs}ms`,
                        level: durationMs < 1500 ? 'info' : 'warning',
                    });
                }
            );
        },
    };
}

/**
 * Track feed scrolling performance
 * Returns a finish function that should be called to record scroll metrics
 */
export function trackFeedScroll(itemCount: number): { recordFrame: (fps: number) => void; finish: () => void } {
    const startTime = Date.now();
    const fpsSamples: number[] = [];

    return {
        recordFrame: (fps: number) => {
            fpsSamples.push(fps);
        },
        finish: () => {
            const durationMs = Date.now() - startTime;
            const avgFps = fpsSamples.length > 0 
                ? fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length 
                : 0;
            
            Sentry.startSpan(
                {
                    name: 'Feed Scroll Performance',
                    op: 'ui.scroll',
                    data: {
                        duration_ms: durationMs,
                        item_count: itemCount,
                        avg_fps: avgFps,
                        meets_target: avgFps >= 60, // Target 60fps
                    },
                },
                () => {
                    Sentry.setMeasurement('feed_avg_fps', avgFps, 'none');
                }
            );
        },
    };
}

/**
 * Track memory usage for long feed sessions
 */
export function trackFeedMemory(action: 'start' | 'end'): void {
    // Note: React Native doesn't have direct memory API access
    // This is a placeholder for future native module integration
    Sentry.addBreadcrumb({
        category: 'memory',
        message: `Feed session ${action}`,
        level: 'info',
    });
}

