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

  // First check if it has http/https protocol
  if (/^https?:\/\//i.test(url)) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // For URLs without http/https protocol, check common patterns
  // localhost with optional port and path
  const localhostPattern = /^localhost(?::\d{1,5})?(?:\/[^\s]*)?$/i;
  if (localhostPattern.test(url)) {
    return true;
  }

  // IP address with optional port and path - validate octets are 0-255
  const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::\d{1,5})?(?:\/[^\s]*)?$/;
  if (ipPattern.test(url)) {
    const match = url.match(ipPattern);
    if (match) {
      const octets = [match[1], match[2], match[3], match[4]].map(Number);
      if (octets.every(octet => octet >= 0 && octet <= 255)) {
        return true;
      }
    }
  }

  // Domain with optional www, port, and path
  const domainPattern = /^(?:www\.)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?$/i;
  return domainPattern.test(url);
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
