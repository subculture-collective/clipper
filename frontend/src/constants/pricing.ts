/**
 * Pricing constants for Clipper Pro subscription
 */

export const PRICING = {
  monthly: 9.99,
  yearly: 99.99,
} as const;

/**
 * Calculate effective monthly price for yearly plan
 */
export const calculateYearlyMonthlyPrice = (yearlyPrice: number): string => 
  (yearlyPrice / 12).toFixed(2);

/**
 * Calculate savings percentage for yearly plan
 */
export const calculateSavingsPercent = (monthlyPrice: number, yearlyPrice: number): number =>
  Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);

/**
 * Pro feature list with icons
 */
export const PRO_FEATURES = [
  { icon: '🚫', text: 'Ad-free browsing' },
  { icon: '⭐', text: 'Unlimited favorites' },
  { icon: '📁', text: 'Custom collections' },
  { icon: '🔍', text: 'Advanced search & filters' },
  { icon: '🔄', text: 'Cross-device sync' },
  { icon: '📊', text: 'Export your data' },
  { icon: '🎯', text: '5x higher rate limits' },
  { icon: '✉️', text: 'Priority support' },
] as const;

/**
 * Pro feature list for pricing pages (longer descriptions)
 */
export const PRO_FEATURES_DETAILED = [
  'Ad-free browsing experience',
  'Advanced search and filtering',
  'Favorite clips sync across devices',
  'Priority support',
  'Early access to new features',
  'Custom collections and playlists',
  'Export your data',
  '5x higher rate limits',
] as const;
