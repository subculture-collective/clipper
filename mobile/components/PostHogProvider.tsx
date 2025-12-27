/**
 * PostHog Provider Component
 * 
 * Handles PostHog initialization and screen tracking for React Navigation.
 * Integrates with ConsentContext for privacy-aware analytics.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useSegments } from 'expo-router';
import { useConsent } from '../contexts/ConsentContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  initAnalytics, 
  enableAnalytics, 
  disableAnalytics,
  identifyUser,
  resetUser,
  trackScreenView,
  reloadFeatureFlags,
} from '../lib/analytics';

interface PostHogProviderProps {
  children: ReactNode;
}

/**
 * PostHog Provider
 * 
 * Wraps the app to provide PostHog analytics integration.
 * - Initializes PostHog when consent is granted
 * - Tracks screen views automatically
 * - Identifies users when logged in
 * - Respects privacy preferences
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  const { canTrackAnalytics, hasConsented } = useConsent();
  const { user } = useAuth();
  const pathname = usePathname();
  const segments = useSegments();
  const previousPathnameRef = useRef<string | undefined>(undefined);
  const initializedRef = useRef(false);

  // Initialize PostHog and handle consent/enablement changes
  useEffect(() => {
    const syncAnalyticsState = async () => {
      // Initialization / teardown based on tracking capability
      if (canTrackAnalytics && !initializedRef.current) {
        await initAnalytics();
        initializedRef.current = true;
        
        // Reload feature flags after initialization
        await reloadFeatureFlags();
      } else if (!canTrackAnalytics && initializedRef.current) {
        await disableAnalytics();
        initializedRef.current = false;
      }
      
      // Handle consent changes (enable/disable analytics)
      if (hasConsented) {
        if (canTrackAnalytics) {
          await enableAnalytics();
        } else {
          await disableAnalytics();
        }
      }
    };

    syncAnalyticsState();
  }, [canTrackAnalytics, hasConsented]);

  // Identify user when logged in
  useEffect(() => {
    if (!canTrackAnalytics) {
      return;
    }

    const updateUser = async () => {
      if (user) {
        // Identify user with properties
        identifyUser(user.id, {
          username: user.username,
          display_name: user.display_name,
          role: user.role,
          reputation_score: user.reputation_score,
          is_banned: user.is_banned,
          created_at: user.created_at,
        });
        
        // Reload feature flags for this user
        await reloadFeatureFlags();
      } else {
        // Reset user when logged out
        resetUser();
      }
    };

    updateUser();
  }, [user, canTrackAnalytics]);

  // Track screen views based on pathname changes
  useEffect(() => {
    if (!canTrackAnalytics) {
      return;
    }

    const currentPathname = pathname;
    const previousPathname = previousPathnameRef.current;

    if (currentPathname && currentPathname !== previousPathname) {
      // Build a more readable screen name from segments
      const screenName = segments.length > 0 ? segments.join('/') : currentPathname;
      
      // Track screen view
      trackScreenView(screenName, {
        pathname: currentPathname,
        previous_pathname: previousPathname || null,
      });

      // Update the ref
      previousPathnameRef.current = currentPathname;
    }
  }, [pathname, segments, canTrackAnalytics]);

  return <>{children}</>;
}
