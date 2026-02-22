import { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import type { Ad, AdSelectionRequest } from '../../lib/ads-api';
import {
  selectAd,
  trackImpression,
  getOrCreateSessionId,
  VIEWABILITY_THRESHOLD_MS,
  VIEWABILITY_PERCENT_THRESHOLD,
} from '../../lib/ads-api';
import { useConsent } from '../../context/ConsentContext';

/**
 * Validates that a URL uses a safe protocol (http or https)
 */
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

interface AdDisplayProps {
  /** Platform for targeting */
  platform?: 'web' | 'ios' | 'android';
  /** Type of ad to display */
  adType?: 'banner' | 'video' | 'native';
  /** Optional width filter */
  width?: number;
  /** Optional height filter */
  height?: number;
  /** Optional game ID for targeting */
  gameId?: string;
  /** Optional language for targeting */
  language?: string;
  /** CSS class for the container */
  className?: string;
  /** Callback when ad is clicked */
  onAdClick?: (ad: Ad) => void;
  /** Callback when ad becomes viewable */
  onViewable?: (ad: Ad) => void;
  /** Fallback content when no ad is available */
  fallback?: React.ReactNode;
  /** Slot ID for ad placement */
  slotId?: string;
}

/**
 * AdDisplay component handles ad selection, display, and viewability tracking
 * Implements IAB viewability standards (50% visible for 1 second)
 * Respects user consent preferences and Do Not Track settings
 */
export function AdDisplay({
  platform = 'web',
  adType,
  width,
  height,
  gameId,
  language,
  className = '',
  onAdClick,
  onViewable,
  fallback,
  slotId,
}: AdDisplayProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [impressionId, setImpressionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTrackedViewability, setHasTrackedViewability] = useState(false);
  const viewabilityStartTime = useRef<number | null>(null);
  const totalViewableTime = useRef(0);

  // Get consent preferences
  const { canShowPersonalizedAds } = useConsent();

  // Use Intersection Observer to track visibility
  const { ref: adRef, inView } = useInView({
    threshold: VIEWABILITY_PERCENT_THRESHOLD, // 50% visible
    triggerOnce: false,
  });

  // Fetch ad on mount
  useEffect(() => {
    const fetchAd = async () => {
      try {
        setIsLoading(true);
        const sessionId = getOrCreateSessionId();

        const request: AdSelectionRequest = {
          platform,
          page_url: window.location.href,
          session_id: sessionId,
          // Pass consent status to backend for personalization decisions
          // Contextual ads are allowed even without explicit consent
          personalized: canShowPersonalizedAds,
        };

        if (adType) request.ad_type = adType;
        if (width) request.width = width;
        if (height) request.height = height;
        if (gameId) request.game_id = gameId;
        if (language) request.language = language;
        if (slotId) request.slot_id = slotId;

        const response = await selectAd(request);

        if (response?.ad) {
          setAd(response.ad);
          setImpressionId(response.impression_id || null);
        }
      } catch (error) {
        console.error('Failed to fetch ad:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Always fetch ads - contextual ads don't require consent
    // The personalized flag tells backend whether to use user-specific targeting
    fetchAd();
  }, [platform, adType, width, height, gameId, language, slotId, canShowPersonalizedAds]);

  // Track viewability time
  useEffect(() => {
    if (!ad || !impressionId || hasTrackedViewability) return;

    if (inView) {
      // Start tracking viewability
      if (viewabilityStartTime.current === null) {
        viewabilityStartTime.current = Date.now();
      }
    } else {
      // Stop tracking and accumulate time
      if (viewabilityStartTime.current !== null) {
        totalViewableTime.current += Date.now() - viewabilityStartTime.current;
        viewabilityStartTime.current = null;
      }
    }

    // Check if viewability threshold is met
    const checkViewability = () => {
      const currentViewableTime =
        totalViewableTime.current +
        (viewabilityStartTime.current !== null
          ? Date.now() - viewabilityStartTime.current
          : 0);

      if (currentViewableTime >= VIEWABILITY_THRESHOLD_MS && !hasTrackedViewability) {
        setHasTrackedViewability(true);

        // Track the viewable impression
        trackImpression(impressionId, {
          viewability_time_ms: currentViewableTime,
          is_viewable: true,
          is_clicked: false,
        }).catch(console.error);

        onViewable?.(ad);
      }
    };

    // Check viewability periodically while in view
    const interval = inView ? setInterval(checkViewability, 100) : undefined;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [ad, impressionId, inView, hasTrackedViewability, onViewable]);

  // Handle ad click
  const handleClick = useCallback(() => {
    if (!ad || !impressionId) return;

    // Track the click
    const currentViewableTime =
      totalViewableTime.current +
      (viewabilityStartTime.current !== null
        ? Date.now() - viewabilityStartTime.current
        : 0);

    trackImpression(impressionId, {
      viewability_time_ms: currentViewableTime,
      is_viewable: currentViewableTime >= VIEWABILITY_THRESHOLD_MS,
      is_clicked: true,
    }).catch(console.error);

    onAdClick?.(ad);

    // Navigate to click URL if available and valid
    if (ad.click_url && isValidUrl(ad.click_url)) {
      window.open(ad.click_url, '_blank', 'noopener,noreferrer');
    }
  }, [ad, impressionId, onAdClick]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`ad-display ad-display--loading ${className}`}>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded" style={{ width, height }} />
      </div>
    );
  }

  // No ad available
  if (!ad) {
    return fallback ? <>{fallback}</> : null;
  }

  // Render ad based on type
  return (
    <div
      ref={adRef}
      className={`ad-display ad-display--${ad.ad_type} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={ad.alt_text || `Advertisement by ${ad.advertiser_name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        position: 'relative',
        cursor: ad.click_url ? 'pointer' : 'default',
        width: ad.width || width,
        height: ad.height || height,
      }}
    >
      {ad.ad_type === 'banner' && isValidUrl(ad.content_url) && (
        <img
          src={ad.content_url}
          alt={ad.alt_text || `Ad by ${ad.advertiser_name}`}
          className="ad-display__image w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {ad.ad_type === 'video' && isValidUrl(ad.content_url) && (
        <video
          src={ad.content_url}
          className="ad-display__video w-full h-full object-cover"
          muted
          loop
          playsInline
          controls
          aria-label={ad.alt_text || `Video ad by ${ad.advertiser_name}`}
        />
      )}

      {ad.ad_type === 'native' && (
        <div className="ad-display__native p-2">
          <span className="text-xs text-gray-500 uppercase">Sponsored</span>
          <div className="font-medium">{ad.name}</div>
          <div className="text-sm text-gray-600">{ad.advertiser_name}</div>
        </div>
      )}

      {/* Ad indicator */}
      <div className="ad-display__indicator absolute top-1 right-1 text-xs bg-black/50 text-white px-1 rounded">
        Ad
      </div>
    </div>
  );
}

export default AdDisplay;
