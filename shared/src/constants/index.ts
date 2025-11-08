/**
 * Shared constants
 */

export const API_VERSION = 'v1';

export const DEFAULT_PAGE_SIZE = 20;

export const VOTE_SCORE_LIMITS = {
  MIN: -10000,
  MAX: 10000,
} as const;

export const CACHE_TIMES = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 30 * 60 * 1000,      // 30 minutes
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const CLIP_DURATION_LIMITS = {
  MIN: 1,
  MAX: 60,
} as const;

export const COMMENT_LENGTH_LIMITS = {
  MIN: 1,
  MAX: 10000,
} as const;

// Export pricing constants
export * from './pricing';
