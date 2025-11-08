/**
 * Mobile pricing constants (re-export from shared package)
 */

// For mobile, we import from the shared package
// This ensures consistency across web and mobile platforms
export {
  PRICING,
  PRO_FEATURES,
  PRO_FEATURES_DETAILED,
  calculateYearlyMonthlyPrice,
  calculateSavingsPercent,
} from '@clipper/shared';

// Mobile-specific icon mappings for React Native
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export const PRO_FEATURES_MOBILE: Array<{ icon: IoniconsName; text: string }> = [
  { icon: 'ban', text: 'Ad-free browsing' },
  { icon: 'star', text: 'Unlimited favorites' },
  { icon: 'folder', text: 'Custom collections' },
  { icon: 'search', text: 'Advanced search & filters' },
  { icon: 'sync', text: 'Cross-device sync' },
  { icon: 'download', text: 'Export your data' },
  { icon: 'flash', text: '5x higher rate limits' },
  { icon: 'mail', text: 'Priority support' },
] as const;
