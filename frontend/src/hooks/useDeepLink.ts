import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  handleDeepLink, 
  isOpenedViaDeepLink, 
  getShareTargetData 
} from '../lib/deep-linking';

/**
 * Hook to handle deep link navigation on app mount
 * 
 * Automatically detects and handles deep links when the app is opened.
 * Should be used at the app root level.
 * 
 * @example
 * ```tsx
 * function App() {
 *   useDeepLink();
 *   return <Routes>...</Routes>;
 * }
 * ```
 */
export function useDeepLink() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only process deep links on initial mount
    if (isOpenedViaDeepLink()) {
      const fullUrl = window.location.href;
      const route = handleDeepLink(fullUrl);
      
      // Navigate only if route is different from current location
      if (route && route !== location.pathname) {
        navigate(route, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount
}

/**
 * Hook to get share target data from URL parameters
 * 
 * Useful for pages that receive shared content (e.g., submit page).
 * Returns null if no share target data is present.
 * 
 * @returns Share target data or null
 * 
 * @example
 * ```tsx
 * function SubmitPage() {
 *   const shareData = useShareTargetData();
 *   
 *   useEffect(() => {
 *     if (shareData) {
 *       // Pre-fill form with shared data
 *       setFormData({
 *         url: shareData.url || '',
 *         title: shareData.title || '',
 *       });
 *     }
 *   }, [shareData]);
 * }
 * ```
 */
export function useShareTargetData() {
  return getShareTargetData();
}

/**
 * Hook that returns whether the app was opened via a deep link
 * 
 * @returns true if app was opened via deep link
 * 
 * @example
 * ```tsx
 * function Analytics() {
 *   const isDeepLink = useIsDeepLink();
 *   
 *   useEffect(() => {
 *     if (isDeepLink) {
 *       trackEvent('deep_link_open');
 *     }
 *   }, [isDeepLink]);
 * }
 * ```
 */
export function useIsDeepLink() {
  return isOpenedViaDeepLink();
}
