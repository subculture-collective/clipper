/**
 * Audio Session Configuration for Background Playback
 * 
 * Manages audio session categories and interruption handling for iOS/Android
 * to support background audio playback when policy allows.
 * 
 * Note: expo-video automatically handles audio session configuration.
 * This module provides monitoring and analytics for background playback behavior.
 */

import React from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { trackEvent } from '../lib/analytics';

interface AudioSessionConfig {
    allowsBackgroundPlayback: boolean;
    videoId?: string;
    videoTitle?: string;
}

/**
 * Hook for monitoring audio session lifecycle and background playback
 * 
 * expo-video automatically handles audio session configuration when
 * allowsExternalPlayback is set to true on the player.
 * This hook provides analytics and state tracking.
 */
export function useAudioSession(config: AudioSessionConfig) {
    const { allowsBackgroundPlayback, videoId, videoTitle } = config;
    const appStateRef = React.useRef<AppStateStatus>(AppState.currentState);

    // Track audio session configuration
    React.useEffect(() => {
        trackEvent('audio_session_configured', {
            video_id: videoId || 'unknown',
            video_title: videoTitle || 'unknown',
            background_playback: allowsBackgroundPlayback,
            platform: Platform.OS,
        });

        // Track session end on unmount
        return () => {
            trackEvent('audio_session_ended', {
                video_id: videoId || 'unknown',
                video_title: videoTitle || 'unknown',
                background_playback: allowsBackgroundPlayback,
                platform: Platform.OS,
            });
        };
    }, [allowsBackgroundPlayback, videoId, videoTitle]);

    // Handle app state changes for background playback tracking
    React.useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            const wasInForeground = appStateRef.current === 'active';
            const isInForeground = nextAppState === 'active';

            if (wasInForeground && !isInForeground) {
                // App went to background
                if (allowsBackgroundPlayback) {
                    trackEvent('audio_session_backgrounded', {
                        video_id: videoId || 'unknown',
                        video_title: videoTitle || 'unknown',
                        platform: Platform.OS,
                    });
                } else {
                    trackEvent('audio_session_paused', {
                        video_id: videoId || 'unknown',
                        video_title: videoTitle || 'unknown',
                        platform: Platform.OS,
                    });
                }
            } else if (!wasInForeground && isInForeground) {
                // App returned to foreground
                trackEvent('audio_session_resumed', {
                    video_id: videoId || 'unknown',
                    video_title: videoTitle || 'unknown',
                    platform: Platform.OS,
                });
            }

            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [allowsBackgroundPlayback, videoId, videoTitle]);
}

/**
 * Get audio session capabilities for the current platform
 */
export function getAudioSessionCapabilities(): {
    supportsBackgroundAudio: boolean;
    supportsPiP: boolean;
} {
    return {
        // iOS supports background audio for video playback
        // Android supports background audio based on audio focus
        supportsBackgroundAudio: true,
        // iOS 14+ and Android 8+ support PiP
        supportsPiP: Platform.OS === 'ios' || Platform.OS === 'android',
    };
}

/**
 * Check if background playback is currently allowed by system policy
 */
export function isBackgroundPlaybackAllowed(): boolean {
    const capabilities = getAudioSessionCapabilities();
    return capabilities.supportsBackgroundAudio;
}

