/**
 * Sentry Configuration and Initialization
 * 
 * Configures Sentry for crash reporting, error tracking, and performance monitoring.
 * Includes PII scrubbing, breadcrumbs, and release tracking.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Initialize Sentry with configuration from environment variables
 * Should be called as early as possible in the app lifecycle
 */
export function initSentry(): void {
    const sentryDsn = Constants.expoConfig?.extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN;
    const sentryEnvironment = Constants.expoConfig?.extra?.sentryEnvironment || process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 'development';
    const sentryEnabled = Constants.expoConfig?.extra?.sentryEnabled !== false && process.env.EXPO_PUBLIC_SENTRY_ENABLED !== 'false';

    // Skip initialization if Sentry is disabled or DSN is missing
    if (!sentryEnabled || !sentryDsn) {
        console.log('[Sentry] Initialization skipped - disabled or DSN not configured');
        return;
    }

    try {
        Sentry.init({
            dsn: sentryDsn,
            environment: sentryEnvironment,
            
            // Release and version tracking
            release: `${Constants.expoConfig?.slug}@${Constants.expoConfig?.version}`,
            dist: Constants.expoConfig?.version,
            
            // Performance monitoring
            tracesSampleRate: sentryEnvironment === 'production' ? 0.2 : 1.0,
            enableAutoSessionTracking: true,
            sessionTrackingIntervalMillis: 30000, // 30 seconds
            
            // Enable performance profiling
            profilesSampleRate: sentryEnvironment === 'production' ? 0.1 : 0.5,
            
            // Native crash reporting
            enableNative: true,
            enableNativeCrashHandling: true,
            enableNativeNagger: false, // Disable native debugging warnings
            
            // Attach stack traces to messages
            attachStacktrace: true,
            
            // Privacy settings - scrub PII
            beforeSend(event, hint) {
                // Remove sensitive data from event context
                if (event.request) {
                    delete event.request.cookies;
                    delete event.request.headers;
                }
                
                // Scrub user data
                if (event.user) {
                    // Only keep non-identifying information
                    const { id, username } = event.user;
                    event.user = { id, username };
                }
                
                // Filter out sensitive breadcrumbs
                if (event.breadcrumbs) {
                    event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
                        // Remove console breadcrumbs that might contain sensitive data
                        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
                            return false;
                        }
                        // Remove fetch breadcrumbs with auth headers
                        if (breadcrumb.category === 'fetch' && breadcrumb.data?.url?.includes('auth')) {
                            delete breadcrumb.data.headers;
                        }
                        return true;
                    });
                }
                
                return event;
            },
            
            // Breadcrumb configuration
            maxBreadcrumbs: 50,
            beforeBreadcrumb(breadcrumb, hint) {
                // Filter sensitive breadcrumbs
                if (breadcrumb.category === 'console' && breadcrumb.message?.includes('password')) {
                    return null;
                }
                
                // Limit fetch data size
                if (breadcrumb.category === 'fetch' && breadcrumb.data) {
                    // Remove request/response bodies
                    delete breadcrumb.data.request_body;
                    delete breadcrumb.data.response_body;
                }
                
                return breadcrumb;
            },
            
            // Integration configuration
            integrations: [
                Sentry.reactNavigationIntegration(),
            ],
            
            // Debug settings
            debug: sentryEnvironment === 'development',
            
            // Error filtering
            ignoreErrors: [
                // React Navigation errors
                'Non-Error promise rejection captured',
                // Network errors that are expected
                'Network request failed',
                'AbortError',
            ],
        });

        console.log(`[Sentry] Initialized successfully - Environment: ${sentryEnvironment}`);
    } catch (error) {
        console.error('[Sentry] Initialization failed:', error);
    }
}

/**
 * Set user context for error reporting
 */
export function setSentryUser(user: { id: string; username?: string } | null): void {
    if (user) {
        Sentry.setUser({
            id: user.id,
            username: user.username,
        });
    } else {
        Sentry.setUser(null);
    }
}

/**
 * Add custom breadcrumb
 */
export function addBreadcrumb(message: string, category: string, level: Sentry.SeverityLevel = 'info', data?: Record<string, any>): void {
    Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000,
    });
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    Sentry.captureMessage(message, level);
}

/**
 * Capture an exception
 */
export function captureException(error: Error | unknown, context?: Record<string, any>): void {
    if (context) {
        Sentry.withScope((scope) => {
            Object.keys(context).forEach((key) => {
                scope.setContext(key, context[key]);
            });
            Sentry.captureException(error);
        });
    } else {
        Sentry.captureException(error);
    }
}

/**
 * Start a performance span
 */
export function startSpan<T>(name: string, op: string, callback: () => T): T {
    return Sentry.startSpan({ name, op }, callback);
}

/**
 * Add a tag to the current scope
 */
export function setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
}

/**
 * Add context to the current scope
 */
export function setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
}

export { Sentry };
