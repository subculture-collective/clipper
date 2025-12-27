/**
 * Tests for PostHog Analytics Integration
 */

import PostHog from 'posthog-react-native';

// Mock dependencies BEFORE importing them
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));
jest.mock('posthog-react-native');
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { version: '1.0.0' },
  },
}));
jest.mock('expo-device', () => ({
  modelName: 'Test Device',
  brand: 'Test Brand',
  osName: 'Test OS',
  osVersion: '1.0',
  deviceYearClass: 2023,
  isDevice: true,
}));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'UTC' }],
}));

describe('PostHog Analytics Integration', () => {
  let mockPostHogInstance: {
    identify: jest.Mock;
    capture: jest.Mock;
    reset: jest.Mock;
    register: jest.Mock;
    optOut: jest.Mock;
    getFeatureFlag: jest.Mock;
    isFeatureEnabled: jest.Mock;
    getFeatureFlags: jest.Mock;
    reloadFeatureFlagsAsync: jest.Mock;
    group: jest.Mock;
    flush: jest.Mock;
  };
  let AsyncStorage: any;

  beforeAll(() => {
    // Import AsyncStorage once
    AsyncStorage = require('@react-native-async-storage/async-storage').default;

    // Create mock PostHog instance
    mockPostHogInstance = {
      identify: jest.fn(),
      capture: jest.fn(),
      reset: jest.fn(),
      register: jest.fn(),
      optOut: jest.fn(),
      getFeatureFlag: jest.fn(),
      isFeatureEnabled: jest.fn(),
      getFeatureFlags: jest.fn(),
      reloadFeatureFlagsAsync: jest.fn(),
      group: jest.fn(),
      flush: jest.fn(),
    };

    // Mock PostHog constructor
    (PostHog as unknown as jest.Mock).mockImplementation(() => mockPostHogInstance);

    // Setup environment variables
    process.env.EXPO_PUBLIC_ENABLE_ANALYTICS = 'true';
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY = 'test-api-key';
    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
  });

  beforeEach(() => {
    // Clear mocks before each test but don't reset modules
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize PostHog when consent is granted', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: true })
      );

      const { initAnalytics } = require('../lib/analytics');
      await initAnalytics();

      expect(PostHog).toHaveBeenCalledWith('test-api-key', {
        host: 'https://test.posthog.com',
        captureAppLifecycleEvents: true,
        captureDeepLinks: true,
        debug: false,
      });
      expect(mockPostHogInstance.register).toHaveBeenCalled();
    });

    it('should not initialize when consent is not granted', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: false })
      );

      const { initAnalytics } = require('../lib/analytics');
      await initAnalytics();

      expect(PostHog).not.toHaveBeenCalled();
    });

    it('should not initialize when analytics is disabled', async () => {
      process.env.EXPO_PUBLIC_ENABLE_ANALYTICS = 'false';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: true })
      );

      const { initAnalytics } = require('../lib/analytics');
      await initAnalytics();

      expect(PostHog).not.toHaveBeenCalled();
    });

    it('should not initialize when API key is missing', async () => {
      process.env.EXPO_PUBLIC_POSTHOG_API_KEY = '';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: true })
      );

      const { initAnalytics } = require('../lib/analytics');
      await initAnalytics();

      expect(PostHog).not.toHaveBeenCalled();
    });
  });

  describe('User Identification', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: true })
      );
      const { initAnalytics } = require('../lib/analytics');
      await initAnalytics();
    });

    it('should identify user with properties', () => {
      const { identifyUser } = require('../lib/analytics');
      
      identifyUser('user123', {
        username: 'testuser',
        role: 'user',
        reputation_score: 100,
      });

      expect(mockPostHogInstance.identify).toHaveBeenCalledWith('user123', {
        username: 'testuser',
        role: 'user',
        reputation_score: 100,
      });
    });

    it('should filter out undefined properties', () => {
      const { identifyUser } = require('../lib/analytics');
      
      identifyUser('user123', {
        username: 'testuser',
        email: undefined as any,
      });

      expect(mockPostHogInstance.identify).toHaveBeenCalledWith('user123', {
        username: 'testuser',
      });
    });

    it('should reset user identity', () => {
      const { resetUser } = require('../lib/analytics');
      
      resetUser();

      expect(mockPostHogInstance.reset).toHaveBeenCalled();
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: true })
      );
      const { initAnalytics, identifyUser } = require('../lib/analytics');
      await initAnalytics();
      identifyUser('user123');
    });

    it('should track custom event with properties', () => {
      const { trackEvent } = require('../lib/analytics');
      
      trackEvent('button_clicked', {
        button_name: 'submit',
        location: 'form',
      });

      expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
        'button_clicked',
        expect.objectContaining({
          button_name: 'submit',
          location: 'form',
          user_id: 'user123',
        })
      );
    });

    it('should track screen view', () => {
      const { trackScreenView } = require('../lib/analytics');
      
      trackScreenView('HomeScreen', {
        previous_screen: 'LoginScreen',
      });

      expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
        'screen_viewed',
        expect.objectContaining({
          screen_name: 'HomeScreen',
          previous_screen: 'LoginScreen',
        })
      );
    });

    it('should track error', () => {
      const { trackError } = require('../lib/analytics');
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:1:1';
      
      trackError(error, {
        errorType: 'NetworkError',
        errorCode: 'TIMEOUT',
      });

      expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
        'error_occurred',
        expect.objectContaining({
          error_type: 'NetworkError',
          error_message: 'Test error',
          error_stack: 'Error: Test error\n    at test.ts:1:1',
          error_code: 'TIMEOUT',
        })
      );
    });

    it('should not track events when disabled', async () => {
      const { disableAnalytics, trackEvent } = require('../lib/analytics');
      
      await disableAnalytics();
      trackEvent('test_event');

      // Should have been called during disable, but not for the event
      expect(mockPostHogInstance.capture).not.toHaveBeenCalled();
    });
  });

  describe('Feature Flags', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: true })
      );
      const { initAnalytics } = require('../lib/analytics');
      await initAnalytics();
    });

    it('should get feature flag value', () => {
      mockPostHogInstance.getFeatureFlag.mockReturnValue('variant-a');
      const { getFeatureFlag } = require('../lib/analytics');
      
      const value = getFeatureFlag('test-flag');

      expect(mockPostHogInstance.getFeatureFlag).toHaveBeenCalledWith('test-flag');
      expect(value).toBe('variant-a');
    });

    it('should return default value when flag not found', () => {
      mockPostHogInstance.getFeatureFlag.mockReturnValue(undefined);
      const { getFeatureFlag } = require('../lib/analytics');
      
      const value = getFeatureFlag('test-flag', 'default');

      expect(value).toBe('default');
    });

    it('should check if feature flag is enabled', () => {
      mockPostHogInstance.isFeatureEnabled.mockReturnValue(true);
      const { isFeatureFlagEnabled } = require('../lib/analytics');
      
      const enabled = isFeatureFlagEnabled('test-flag');

      expect(mockPostHogInstance.isFeatureEnabled).toHaveBeenCalledWith('test-flag');
      expect(enabled).toBe(true);
    });

    it('should get all feature flags', () => {
      const flags = { 'flag-1': true, 'flag-2': 'variant-b' };
      mockPostHogInstance.getFeatureFlags.mockReturnValue(flags);
      const { getAllFeatureFlags } = require('../lib/analytics');
      
      const result = getAllFeatureFlags();

      expect(mockPostHogInstance.getFeatureFlags).toHaveBeenCalled();
      expect(result).toEqual(flags);
    });

    it('should reload feature flags', async () => {
      mockPostHogInstance.reloadFeatureFlagsAsync.mockResolvedValue(undefined);
      const { reloadFeatureFlags } = require('../lib/analytics');
      
      await reloadFeatureFlags();

      expect(mockPostHogInstance.reloadFeatureFlagsAsync).toHaveBeenCalled();
    });
  });

  describe('Privacy Controls', () => {
    it('should enable analytics and initialize', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: false })
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const { enableAnalytics } = require('../lib/analytics');
      await enableAnalytics();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@clipper:analytics_consent',
        JSON.stringify({ analytics: true })
      );
    });

    it('should disable analytics and opt out', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: true })
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const { initAnalytics, disableAnalytics } = require('../lib/analytics');
      await initAnalytics();
      await disableAnalytics();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@clipper:analytics_consent',
        JSON.stringify({ analytics: false })
      );
      expect(mockPostHogInstance.optOut).toHaveBeenCalled();
      expect(mockPostHogInstance.reset).toHaveBeenCalled();
    });

    it('should check if analytics is enabled', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: true })
      );

      const { initAnalytics, isAnalyticsEnabled } = require('../lib/analytics');
      await initAnalytics();

      expect(isAnalyticsEnabled()).toBe(true);
    });
  });

  describe('Group Analytics', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ analytics: true })
      );
      const { initAnalytics } = require('../lib/analytics');
      await initAnalytics();
    });

    it('should identify group with properties', () => {
      const { groupIdentify } = require('../lib/analytics');
      
      groupIdentify('company', 'acme-corp', {
        name: 'Acme Corp',
        plan: 'enterprise',
      });

      expect(mockPostHogInstance.group).toHaveBeenCalledWith(
        'company',
        'acme-corp',
        {
          name: 'Acme Corp',
          plan: 'enterprise',
        }
      );
    });
  });

  describe('Utility Functions', () => {
    beforeEach(async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ analytics: true })
      );
      const { initAnalytics } = require('../lib/analytics');
      await initAnalytics();
    });

    it('should get PostHog client instance', () => {
      const { getPostHogClient } = require('../lib/analytics');
      
      const client = getPostHogClient();

      expect(client).not.toBeNull();
      expect(client).toHaveProperty('identify');
    });

    it('should flush pending events', async () => {
      mockPostHogInstance.flush.mockResolvedValue(undefined);
      const { flush } = require('../lib/analytics');
      
      await flush();

      expect(mockPostHogInstance.flush).toHaveBeenCalled();
    });
  });

  describe('Event Schema', () => {
    it('should export all event categories', () => {
      const {
        AuthEvents,
        SubmissionEvents,
        EngagementEvents,
        PremiumEvents,
        NavigationEvents,
        SettingsEvents,
        ErrorEvents,
        PerformanceEvents,
      } = require('../lib/analytics');

      expect(AuthEvents.LOGIN_COMPLETED).toBe('login_completed');
      expect(SubmissionEvents.SUBMISSION_VIEWED).toBe('submission_viewed');
      expect(EngagementEvents.UPVOTE_CLICKED).toBe('upvote_clicked');
      expect(PremiumEvents.CHECKOUT_STARTED).toBe('checkout_started');
      expect(NavigationEvents.SCREEN_VIEWED).toBe('screen_viewed');
      expect(SettingsEvents.PROFILE_EDITED).toBe('profile_edited');
      expect(ErrorEvents.ERROR_OCCURRED).toBe('error_occurred');
      expect(PerformanceEvents.PAGE_LOAD_TIME).toBe('page_load_time');
    });
  });
});
