/**
 * Consent Context - Manages cookie/tracking consent for mobile app
 * 
 * Handles GDPR/CCPA compliance for mobile app tracking and analytics
 * Integrates with iOS App Tracking Transparency (ATT) framework
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { trackEvent, SettingsEvents } from '../lib/analytics';

/**
 * Consent categories for different types of tracking/personalization
 */
export interface ConsentPreferences {
    /** Essential - always true, required for app function */
    essential: boolean;
    /** Functional - language, theme, preferences */
    functional: boolean;
    /** Analytics tracking consent */
    analytics: boolean;
    /** Personalized advertising consent */
    advertising: boolean;
    /** Timestamp of last consent update */
    updatedAt: string | null;
    /** Expiration timestamp (12 months from consent) */
    expiresAt: string | null;
}

/**
 * Default consent preferences (privacy-preserving defaults)
 * Following GDPR principles: no tracking until explicit consent
 */
const DEFAULT_CONSENT: ConsentPreferences = {
    essential: true, // Always required
    functional: false,
    analytics: false,
    advertising: false,
    updatedAt: null,
    expiresAt: null,
};

/**
 * Context value interface
 */
export interface ConsentContextType {
    /** Current consent preferences */
    consent: ConsentPreferences;
    /** Whether user has made a consent decision */
    hasConsented: boolean;
    /** Whether consent modal should be shown */
    showConsentModal: boolean;
    /** Update consent preferences */
    updateConsent: (preferences: Partial<ConsentPreferences>) => Promise<void>;
    /** Accept all optional consent categories */
    acceptAll: () => Promise<void>;
    /** Reject all optional consent categories */
    rejectAll: () => Promise<void>;
    /** Reset consent (show modal again) */
    resetConsent: () => Promise<void>;
    /** Check if personalized ads are allowed */
    canShowPersonalizedAds: boolean;
    /** Check if analytics tracking is allowed */
    canTrackAnalytics: boolean;
}

const CONSENT_STORAGE_KEY = '@clipper_consent_preferences';
const CONSENT_VERSION = '1.0';
// Consent expiration period - 365 days (approximately 12 months)
const CONSENT_EXPIRATION_MS = 365 * 24 * 60 * 60 * 1000;

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

/**
 * Checks if consent has expired (12 months)
 */
function isConsentExpired(preferences: ConsentPreferences): boolean {
    if (!preferences.expiresAt) return true;
    return new Date() > new Date(preferences.expiresAt);
}

/**
 * Loads consent from AsyncStorage
 */
async function loadStoredConsent(): Promise<ConsentPreferences | null> {
    try {
        const stored = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);
        // Check version compatibility
        if (parsed.version !== CONSENT_VERSION) {
            return null;
        }

        // Check if consent has expired
        if (isConsentExpired(parsed.preferences)) {
            return null;
        }

        return parsed.preferences;
    } catch {
        return null;
    }
}

/**
 * Saves consent to AsyncStorage
 */
async function saveConsent(preferences: ConsentPreferences): Promise<void> {
    try {
        await AsyncStorage.setItem(
            CONSENT_STORAGE_KEY,
            JSON.stringify({
                version: CONSENT_VERSION,
                preferences,
            })
        );
    } catch (error) {
        console.error('Failed to save consent preferences:', error);
    }
}

/**
 * Syncs consent to backend (for logged-in users)
 */
async function syncConsentToBackend(
    preferences: ConsentPreferences
): Promise<void> {
    try {
        await axios.post('/api/v1/users/me/consent', {
            essential: preferences.essential,
            functional: preferences.functional,
            analytics: preferences.analytics,
            advertising: preferences.advertising,
        });
    } catch (error) {
        // Silent fail - consent is still saved locally
        console.error('Failed to sync consent to backend:', error);
    }
}

/**
 * Loads consent from backend (for logged-in users)
 */
async function loadConsentFromBackend(): Promise<ConsentPreferences | null> {
    try {
        const response = await axios.get('/api/v1/users/me/consent');
        if (response.data?.success && response.data?.data) {
            const data = response.data.data;
            return {
                essential: data.essential ?? true,
                functional: data.functional ?? false,
                analytics: data.analytics ?? false,
                advertising: data.advertising ?? false,
                updatedAt: data.consent_date || data.updated_at || null,
                expiresAt: data.expires_at || null,
            };
        }
        return null;
    } catch {
        // Silent fail - use local consent
        return null;
    }
}

/**
 * Consent Provider component
 * Manages user consent for tracking, analytics, and personalized ads
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [consent, setConsent] =
        useState<ConsentPreferences>(DEFAULT_CONSENT);
    const [hasConsented, setHasConsented] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [isLoadingConsent, setIsLoadingConsent] = useState(true);

    // Initialize consent state on mount
    useEffect(() => {
        loadStoredConsent().then((storedConsent) => {
            if (storedConsent) {
                setConsent(storedConsent);
                setHasConsented(true);
                setShowConsentModal(false);
            } else {
                // No stored consent - show modal
                setShowConsentModal(true);
            }
            setIsLoadingConsent(false);
        });
    }, []);

    // Load consent from backend for logged-in users
    useEffect(() => {
        if (!user || isLoadingConsent) return;

        loadConsentFromBackend().then((backendConsent) => {
            if (backendConsent && !isConsentExpired(backendConsent)) {
                // Backend consent exists and is valid - use it
                setConsent(backendConsent);
                setHasConsented(true);
                setShowConsentModal(false);
                saveConsent(backendConsent); // Sync to local storage
            }
        });
    }, [user, isLoadingConsent]);

    /**
     * Update consent preferences
     */
    const updateConsent = useCallback(
        async (preferences: Partial<ConsentPreferences>) => {
            const now = new Date();
            const expiresAt = new Date(
                now.getTime() + CONSENT_EXPIRATION_MS
            );

            const updatedPreferences: ConsentPreferences = {
                ...consent,
                ...preferences,
                essential: true, // Always keep essential enabled
                updatedAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
            };

            setConsent(updatedPreferences);
            setHasConsented(true);
            setShowConsentModal(false);

            await saveConsent(updatedPreferences);

            // Track consent update
            trackEvent(SettingsEvents.CONSENT_UPDATED, {
                functional: updatedPreferences.functional,
                analytics: updatedPreferences.analytics,
                advertising: updatedPreferences.advertising,
                source: 'settings',
            });

            // Sync to backend if user is logged in
            if (user) {
                await syncConsentToBackend(updatedPreferences);
            }
        },
        [consent, user]
    );

    /**
     * Accept all optional consent categories
     */
    const acceptAll = useCallback(async () => {
        await updateConsent({
            functional: true,
            analytics: true,
            advertising: true,
        });
    }, [updateConsent]);

    /**
     * Reject all optional consent categories
     */
    const rejectAll = useCallback(async () => {
        await updateConsent({
            functional: false,
            analytics: false,
            advertising: false,
        });
    }, [updateConsent]);

    /**
     * Reset consent to trigger modal again
     */
    const resetConsent = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(CONSENT_STORAGE_KEY);
        } catch {
            // Ignore storage errors
        }

        setConsent(DEFAULT_CONSENT);
        setHasConsented(false);
        setShowConsentModal(true);
    }, []);

    // Compute derived values
    const canShowPersonalizedAds = hasConsented && consent.advertising;
    const canTrackAnalytics = hasConsented && consent.analytics;

    return (
        <ConsentContext.Provider
            value={{
                consent,
                hasConsented,
                showConsentModal,
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
