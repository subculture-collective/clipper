import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Consent categories for different types of tracking/personalization
 */
export interface ConsentPreferences {
  /** Essential cookies/storage - always true, required for site function */
  essential: boolean;
  /** Analytics tracking consent */
  analytics: boolean;
  /** Personalized advertising consent */
  personalizedAds: boolean;
  /** Performance/functionality cookies */
  performance: boolean;
  /** Timestamp of last consent update */
  updatedAt: string | null;
}

/**
 * Default consent preferences (privacy-preserving defaults)
 * Following GDPR principles: no tracking until explicit consent
 */
const DEFAULT_CONSENT: ConsentPreferences = {
  essential: true, // Always required
  analytics: false,
  personalizedAds: false,
  performance: false,
  updatedAt: null,
};

/**
 * Context value interface
 */
export interface ConsentContextType {
  /** Current consent preferences */
  consent: ConsentPreferences;
  /** Whether user has made a consent decision */
  hasConsented: boolean;
  /** Whether Do Not Track is enabled in browser */
  doNotTrack: boolean;
  /** Whether consent banner should be shown */
  showConsentBanner: boolean;
  /** Update consent preferences */
  updateConsent: (preferences: Partial<ConsentPreferences>) => void;
  /** Accept all optional consent categories */
  acceptAll: () => void;
  /** Reject all optional consent categories */
  rejectAll: () => void;
  /** Reset consent (show banner again) */
  resetConsent: () => void;
  /** Check if personalized ads are allowed (considers DNT and consent) */
  canShowPersonalizedAds: boolean;
  /** Check if analytics tracking is allowed */
  canTrackAnalytics: boolean;
}

const CONSENT_STORAGE_KEY = 'clipper_consent_preferences';
const CONSENT_VERSION = '1.0'; // Increment when consent categories change

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

/**
 * Detects if Do Not Track is enabled in the browser
 */
function detectDoNotTrack(): boolean {
  // Check navigator.doNotTrack (most browsers)
  if (navigator.doNotTrack === '1') {
    return true;
  }
  // Check window.doNotTrack (older browsers)
  if ((window as { doNotTrack?: string }).doNotTrack === '1') {
    return true;
  }
  // Check navigator.globalPrivacyControl (newer privacy standard)
  if ((navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
    return true;
  }
  return false;
}

/**
 * Loads consent from localStorage
 */
function loadStoredConsent(): ConsentPreferences | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    // Check version compatibility
    if (parsed.version !== CONSENT_VERSION) {
      // Version mismatch - treat as if no consent given
      return null;
    }
    return parsed.preferences;
  } catch {
    return null;
  }
}

/**
 * Saves consent to localStorage
 */
function saveConsent(preferences: ConsentPreferences): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      version: CONSENT_VERSION,
      preferences,
    }));
  } catch (error) {
    console.error('Failed to save consent preferences:', error);
  }
}

/**
 * Consent Provider component
 * Manages user consent for tracking, analytics, and personalized ads
 */
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences>(DEFAULT_CONSENT);
  const [hasConsented, setHasConsented] = useState(false);
  const [doNotTrack, setDoNotTrack] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  // Initialize consent state on mount
  useEffect(() => {
    const dnt = detectDoNotTrack();
    setDoNotTrack(dnt);

    const storedConsent = loadStoredConsent();
    if (storedConsent) {
      setConsent(storedConsent);
      setHasConsented(true);
      setShowConsentBanner(false);
    } else {
      // No stored consent - show banner
      // If DNT is enabled, we default to privacy-preserving settings
      setShowConsentBanner(true);
    }
  }, []);

  /**
   * Update consent preferences
   */
  const updateConsent = useCallback((preferences: Partial<ConsentPreferences>) => {
    const updatedPreferences: ConsentPreferences = {
      ...consent,
      ...preferences,
      essential: true, // Always keep essential enabled
      updatedAt: new Date().toISOString(),
    };
    
    setConsent(updatedPreferences);
    setHasConsented(true);
    setShowConsentBanner(false);
    saveConsent(updatedPreferences);
  }, [consent]);

  /**
   * Accept all optional consent categories
   */
  const acceptAll = useCallback(() => {
    updateConsent({
      analytics: true,
      personalizedAds: true,
      performance: true,
    });
  }, [updateConsent]);

  /**
   * Reject all optional consent categories
   */
  const rejectAll = useCallback(() => {
    updateConsent({
      analytics: false,
      personalizedAds: false,
      performance: false,
    });
  }, [updateConsent]);

  /**
   * Reset consent to trigger banner again
   */
  const resetConsent = useCallback(() => {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setConsent(DEFAULT_CONSENT);
    setHasConsented(false);
    setShowConsentBanner(true);
  }, []);

  // Compute derived values
  // Personalized ads require explicit consent AND no DNT signal
  const canShowPersonalizedAds = hasConsented && consent.personalizedAds && !doNotTrack;
  
  // Analytics tracking also respects DNT and consent
  const canTrackAnalytics = hasConsented && consent.analytics && !doNotTrack;

  return (
    <ConsentContext.Provider
      value={{
        consent,
        hasConsented,
        doNotTrack,
        showConsentBanner,
        updateConsent,
        acceptAll,
        rejectAll,
        resetConsent,
        canShowPersonalizedAds,
        canTrackAnalytics,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

/**
 * Hook to access consent context
 */
export function useConsent() {
  const context = useContext(ConsentContext);
  if (context === undefined) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
}
