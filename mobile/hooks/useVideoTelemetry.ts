/**
 * Video Playback Telemetry Hook
 * 
 * Tracks Quality of Experience (QoE) metrics for video playback:
 * - Playback start time
 * - Buffering events and duration
 * - Frame drops (when available)
 * - Playback completion
 * - Error events
 * - Quality changes
 */

import { useEffect, useRef, useCallback } from 'react';
import { trackEvent, SubmissionEvents } from '../lib/analytics';

export interface VideoTelemetryConfig {
    videoId: string;
    videoTitle?: string;
    videoDuration?: number;
    initialQuality?: string;
}

export interface VideoTelemetryMetrics {
    startTime: number;
    totalBufferingTime: number;
    bufferingEventCount: number;
    qualityChanges: number;
    playbackErrors: number;
    completionRate: number;
}

export function useVideoTelemetry(config: VideoTelemetryConfig) {
    const metricsRef = useRef<VideoTelemetryMetrics>({
        startTime: 0,
        totalBufferingTime: 0,
        bufferingEventCount: 0,
        qualityChanges: 0,
        playbackErrors: 0,
        completionRate: 0,
    });

    const sessionStartRef = useRef<number>(Date.now());
    const lastBufferingStartRef = useRef<number | null>(null);
    const hasCompletedRef = useRef(false);
    const lastPositionRef = useRef(0);
    
    // Milestone tracking flags
    const milestonesRef = useRef({
        twentyFive: false,
        fifty: false,
        seventyFive: false,
    });

    // Track video load started
    useEffect(() => {
        const loadStartTime = Date.now();
        trackEvent('video_load_started', {
            video_id: config.videoId,
            video_title: config.videoTitle || 'unknown',
            video_duration: config.videoDuration || 0,
            initial_quality: config.initialQuality || 'auto',
            timestamp: loadStartTime,
        });

        return () => {
            // Track session end when component unmounts
            const sessionDuration = Date.now() - sessionStartRef.current;
            trackEvent('video_session_ended', {
                video_id: config.videoId,
                video_title: config.videoTitle || 'unknown',
                session_duration_ms: sessionDuration,
                total_buffering_ms: metricsRef.current.totalBufferingTime,
                buffering_event_count: metricsRef.current.bufferingEventCount,
                quality_changes: metricsRef.current.qualityChanges,
                playback_errors: metricsRef.current.playbackErrors,
                completion_rate: metricsRef.current.completionRate,
            });
        };
    }, [config.videoId, config.videoTitle, config.videoDuration, config.initialQuality]);

    // Track playback started
    const trackPlaybackStarted = useCallback((loadTimeMs: number, quality: string) => {
        metricsRef.current.startTime = Date.now();
        
        // Track technical video event
        trackEvent('video_playback_started', {
            video_id: config.videoId,
            video_title: config.videoTitle || 'unknown',
            load_time_ms: loadTimeMs,
            quality,
            timestamp: Date.now(),
        });
        
        // Track submission play event for analytics dashboards
        trackEvent(SubmissionEvents.SUBMISSION_PLAY_STARTED, {
            submission_id: config.videoId,
            duration_seconds: config.videoDuration || 0,
            quality,
        });
    }, [config.videoId, config.videoTitle, config.videoDuration]);

    // Track buffering started
    const trackBufferingStarted = useCallback(() => {
        if (!lastBufferingStartRef.current) {
            lastBufferingStartRef.current = Date.now();
            metricsRef.current.bufferingEventCount += 1;
        }
    }, []);

    // Track buffering ended
    const trackBufferingEnded = useCallback((currentQuality: string) => {
        if (lastBufferingStartRef.current) {
            const bufferingDuration = Date.now() - lastBufferingStartRef.current;
            metricsRef.current.totalBufferingTime += bufferingDuration;
            lastBufferingStartRef.current = null;

            trackEvent('video_buffering_event', {
                video_id: config.videoId,
                video_title: config.videoTitle || 'unknown',
                buffering_duration_ms: bufferingDuration,
                total_buffering_ms: metricsRef.current.totalBufferingTime,
                buffering_count: metricsRef.current.bufferingEventCount,
                quality: currentQuality,
            });
        }
    }, [config.videoId, config.videoTitle]);

    // Track quality change
    const trackQualityChange = useCallback((previousQuality: string, newQuality: string, currentTime: number) => {
        metricsRef.current.qualityChanges += 1;

        trackEvent('video_quality_changed', {
            video_id: config.videoId,
            video_title: config.videoTitle || 'unknown',
            previous_quality: previousQuality,
            new_quality: newQuality,
            timestamp: currentTime,
            quality_change_count: metricsRef.current.qualityChanges,
        });
    }, [config.videoId, config.videoTitle]);

    // Track playback error
    const trackPlaybackError = useCallback((errorType: string, errorMessage: string) => {
        metricsRef.current.playbackErrors += 1;

        trackEvent('video_playback_error', {
            video_id: config.videoId,
            video_title: config.videoTitle || 'unknown',
            error_type: errorType,
            error_message: errorMessage,
            error_count: metricsRef.current.playbackErrors,
            timestamp: Date.now(),
        });
    }, [config.videoId, config.videoTitle]);

    // Track playback progress
    const trackPlaybackProgress = useCallback((currentTime: number, duration: number, quality: string) => {
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        lastPositionRef.current = currentTime;
        metricsRef.current.completionRate = progress;

        // Track milestone events (25%, 50%, 75%) - only once per milestone
        if (progress >= 25 && progress < 50 && !milestonesRef.current.twentyFive) {
            milestonesRef.current.twentyFive = true;
            trackEvent('video_progress_25', {
                video_id: config.videoId,
                video_title: config.videoTitle || 'unknown',
                quality,
                timestamp: currentTime,
            });
        } else if (progress >= 50 && progress < 75 && !milestonesRef.current.fifty) {
            milestonesRef.current.fifty = true;
            trackEvent('video_progress_50', {
                video_id: config.videoId,
                video_title: config.videoTitle || 'unknown',
                quality,
                timestamp: currentTime,
            });
        } else if (progress >= 75 && progress < 100 && !milestonesRef.current.seventyFive) {
            milestonesRef.current.seventyFive = true;
            trackEvent('video_progress_75', {
                video_id: config.videoId,
                video_title: config.videoTitle || 'unknown',
                quality,
                timestamp: currentTime,
            });
        }
    }, [config.videoId, config.videoTitle]);

    // Track playback completed
    const trackPlaybackCompleted = useCallback((quality: string, totalDuration: number) => {
        if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            metricsRef.current.completionRate = 100;

            const watchDuration = Date.now() - metricsRef.current.startTime;

            // Track technical video event
            trackEvent('video_playback_completed', {
                video_id: config.videoId,
                video_title: config.videoTitle || 'unknown',
                quality,
                video_duration: totalDuration,
                watch_duration_ms: watchDuration,
                total_buffering_ms: metricsRef.current.totalBufferingTime,
                buffering_event_count: metricsRef.current.bufferingEventCount,
                quality_changes: metricsRef.current.qualityChanges,
            });
            
            // Track submission completion for analytics dashboards
            trackEvent(SubmissionEvents.SUBMISSION_PLAY_COMPLETED, {
                submission_id: config.videoId,
                watch_percentage: 100,
                watched_seconds: totalDuration,
                quality,
            });
        }
    }, [config.videoId, config.videoTitle]);

    // Track pause event
    const trackPause = useCallback((currentTime: number, quality: string) => {
        // Track technical video event
        trackEvent('video_paused', {
            video_id: config.videoId,
            video_title: config.videoTitle || 'unknown',
            timestamp: currentTime,
            quality,
        });
        
        // Track submission pause for analytics dashboards
        trackEvent(SubmissionEvents.SUBMISSION_PLAY_PAUSED, {
            submission_id: config.videoId,
            timestamp: currentTime,
        });
    }, [config.videoId, config.videoTitle]);

    // Track resume event
    const trackResume = useCallback((currentTime: number, quality: string) => {
        trackEvent('video_resumed', {
            video_id: config.videoId,
            video_title: config.videoTitle || 'unknown',
            timestamp: currentTime,
            quality,
        });
    }, [config.videoId, config.videoTitle]);

    // Track seek event
    const trackSeek = useCallback((fromTime: number, toTime: number, quality: string) => {
        trackEvent('video_seeked', {
            video_id: config.videoId,
            video_title: config.videoTitle || 'unknown',
            from_time: fromTime,
            to_time: toTime,
            quality,
        });
    }, [config.videoId, config.videoTitle]);

    // Get current metrics
    const getMetrics = useCallback((): VideoTelemetryMetrics => {
        return { ...metricsRef.current };
    }, []);

    return {
        trackPlaybackStarted,
        trackBufferingStarted,
        trackBufferingEnded,
        trackQualityChange,
        trackPlaybackError,
        trackPlaybackProgress,
        trackPlaybackCompleted,
        trackPause,
        trackResume,
        trackSeek,
        getMetrics,
    };
}
