/**
 * URL validation utilities for rich text editor
 */

/**
 * Validate if a string is a valid URL
 * Supports http, https, and common URL patterns
 */
export function isValidUrl(url: string): boolean {
  if (!url || url.trim().length === 0) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    // If URL constructor fails, try a relaxed pattern
    // Allow URLs without protocol if they look like domains
    const relaxedPattern = /^(?:(?:https?:\/\/)?(?:www\.)?)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}(?:\/[^\s]*)?$/i;
    return relaxedPattern.test(url);
  }
}

/**
 * Normalize URL by adding protocol if missing
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  
  if (!trimmed) {
    return '';
  }

  // Already has protocol
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Add https:// by default
  return `https://${trimmed}`;
}

/**
 * Validate and normalize a URL
 * Returns normalized URL if valid, null otherwise
 */
export function validateAndNormalizeUrl(url: string): string | null {
  if (!isValidUrl(url)) {
    return null;
  }

  return normalizeUrl(url);
}
