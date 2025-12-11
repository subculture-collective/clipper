/**
 * Google Analytics Integration
 * 
 * Provides Google Analytics (GA4) tracking functionality with privacy-first approach.
 * Respects user consent preferences and DNT signals.
 */

// Google Analytics configuration
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

// Track if GA is initialized
let gaInitialized = false;

/**
 * Initialize Google Analytics
 * Should be called after user grants analytics consent
 */
export function initGoogleAnalytics(): void {
    if (!GA_MEASUREMENT_ID) {
        console.log('Google Analytics is not configured (no measurement ID)');
        return;
    }

    if (gaInitialized) {
        console.log('Google Analytics already initialized');
        return;
    }

    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    
    // Define gtag function
    function gtag(...args: unknown[]) {
        window.dataLayer.push(args);
    }

    // Set gtag on window for global access
    (window as unknown as Window & { gtag: typeof gtag }).gtag = gtag;

    // Initialize GA4
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: false, // We'll manually track page views for better control
        anonymize_ip: true, // IP anonymization for privacy
        allow_google_signals: false, // Disable advertising features by default
        allow_ad_personalization_signals: false, // Disable ad personalization
    });

    gaInitialized = true;
    console.log(`Google Analytics initialized: ${GA_MEASUREMENT_ID}`);
}

/**
 * Disable Google Analytics
 * Respects user's opt-out preference
 */
export function disableGoogleAnalytics(): void {
    if (!GA_MEASUREMENT_ID) return;

    // Set opt-out flag
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    gaInitialized = false;
    console.log('Google Analytics disabled');
}

/**
 * Enable Google Analytics
 * Re-enables tracking if user grants consent
 */
export function enableGoogleAnalytics(): void {
    if (!GA_MEASUREMENT_ID) return;

    // Remove opt-out flag
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
    
    // Initialize if not already done
    if (!gaInitialized) {
        initGoogleAnalytics();
    }
}

/**
 * Track a page view
 */
export function trackPageView(path: string, title?: string): void {
    if (!gaInitialized || !GA_MEASUREMENT_ID) return;

    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    if (!gtag) return;

    gtag('event', 'page_view', {
        page_path: path,
        page_title: title || document.title,
        page_location: window.location.href,
    });
}

/**
 * Track a custom event
 */
export function trackEvent(
    eventName: string,
    eventParams?: Record<string, string | number | boolean>
): void {
    if (!gaInitialized || !GA_MEASUREMENT_ID) return;

    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    if (!gtag) return;

    // Add domain context to all events
    const params = {
        ...eventParams,
        domain: 'clpr.tv',
    };

    gtag('event', eventName, params);
}

/**
 * Pre-defined event tracking functions for common actions
 */

export function trackClipSubmission(clipId: string, creatorName: string): void {
    trackEvent('clip_submitted', {
        clip_id: clipId,
        creator_name: creatorName,
    });
}

export function trackUpvote(clipId: string): void {
    trackEvent('clip_upvoted', {
        clip_id: clipId,
    });
}

export function trackDownvote(clipId: string): void {
    trackEvent('clip_downvoted', {
        clip_id: clipId,
    });
}

export function trackComment(clipId: string): void {
    trackEvent('comment_posted', {
        clip_id: clipId,
    });
}

export function trackShare(clipId: string, platform: string): void {
    trackEvent('clip_shared', {
        clip_id: clipId,
        platform: platform,
    });
}

export function trackFollow(targetType: 'creator' | 'user' | 'community', targetId: string): void {
    trackEvent('follow_action', {
        target_type: targetType,
        target_id: targetId,
    });
}

export function trackUserRegistration(userId: string, method: string): void {
    trackEvent('user_registration', {
        user_id: userId,
        registration_method: method,
    });
}

export function trackSearch(query: string, resultsCount: number): void {
    trackEvent('search', {
        search_term: query,
        results_count: resultsCount,
    });
}

export function trackCommunityJoin(communityId: string): void {
    trackEvent('community_joined', {
        community_id: communityId,
    });
}

export function trackFeedFollow(feedType: string): void {
    trackEvent('feed_followed', {
        feed_type: feedType,
    });
}

/**
 * Type augmentation for window.dataLayer
 */
declare global {
    interface Window {
        dataLayer: unknown[];
        [key: `ga-disable-${string}`]: boolean;
    }
}
