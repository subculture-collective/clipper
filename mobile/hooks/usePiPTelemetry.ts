/**
 * Picture-in-Picture Telemetry Hook
 * 
 * Tracks PiP (Picture-in-Picture) events and state changes
 */

import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { trackEvent } from '../lib/analytics';

export interface PiPTelemetryConfig {
    videoId: string;
    videoTitle?: string;
    isPlaying?: boolean;
}

export function usePiPTelemetry(config: PiPTelemetryConfig) {
    const { videoId, videoTitle, isPlaying } = config;
    const pipStartTimeRef = useRef<number | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const wasPipActiveRef = useRef(false);

    // Track PiP entry
    const trackPiPEntered = useCallback(() => {
        if (!pipStartTimeRef.current) {
            pipStartTimeRef.current = Date.now();
            wasPipActiveRef.current = true;

            trackEvent('video_pip_entered', {
                video_id: videoId,
                video_title: videoTitle || 'unknown',
                was_playing: isPlaying || false,
                timestamp: new Date().toISOString(),
            });
        }
    }, [videoId, videoTitle, isPlaying]);

    // Track PiP exit
    const trackPiPExited = useCallback(() => {
        if (pipStartTimeRef.current) {
            const pipDuration = Date.now() - pipStartTimeRef.current;
            pipStartTimeRef.current = null;
            wasPipActiveRef.current = false;

            trackEvent('video_pip_exited', {
                video_id: videoId,
                video_title: videoTitle || 'unknown',
                pip_duration_ms: pipDuration,
                timestamp: new Date().toISOString(),
            });
        }
    }, [videoId, videoTitle]);

    // Monitor app state changes for PiP detection
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            // When app goes to background and video is playing, likely entering PiP
            if (
                appStateRef.current.match(/active/) &&
                nextAppState.match(/inactive|background/) &&
                isPlaying
            ) {
                trackPiPEntered();
            }
            // When app comes back to foreground, likely exiting PiP
            else if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                wasPipActiveRef.current
            ) {
                trackPiPExited();
            }

            appStateRef.current = nextAppState;
        });

        return () => {
            subscription.remove();
            // Track PiP exit if still active on unmount
            if (wasPipActiveRef.current) {
                trackPiPExited();
            }
        };
    }, [isPlaying, trackPiPEntered, trackPiPExited]);

    return {
        trackPiPEntered,
        trackPiPExited,
    };
}
