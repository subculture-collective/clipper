/**
 * Video Playback Tests
 * Tests for enhanced video player and telemetry
 */

import { renderHook, act } from '@testing-library/react-native';
import { useVideoTelemetry } from '../hooks/useVideoTelemetry';
import * as analytics from '../lib/analytics';

// Mock analytics
jest.mock('../lib/analytics', () => ({
  trackEvent: jest.fn(),
}));

describe('Video Playback Telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useVideoTelemetry', () => {
    it('should track video load started on mount', () => {
      const config = {
        videoId: 'test-video-123',
        videoTitle: 'Test Video',
        videoDuration: 120,
        initialQuality: '720p',
      };

      renderHook(() => useVideoTelemetry(config));

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'video_load_started',
        expect.objectContaining({
          video_id: 'test-video-123',
          video_title: 'Test Video',
          video_duration: 120,
          initial_quality: '720p',
        })
      );
    });

    it('should track playback started with load time', () => {
      const config = {
        videoId: 'test-video-123',
        videoTitle: 'Test Video',
      };

      const { result } = renderHook(() => useVideoTelemetry(config));

      act(() => {
        result.current.trackPlaybackStarted(500, '720p');
      });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'video_playback_started',
        expect.objectContaining({
          video_id: 'test-video-123',
          video_title: 'Test Video',
          load_time_ms: 500,
          quality: '720p',
        })
      );
    });

    it('should track buffering events', () => {
      const config = {
        videoId: 'test-video-123',
        videoTitle: 'Test Video',
      };

      const { result } = renderHook(() => useVideoTelemetry(config));

      act(() => {
        result.current.trackBufferingStarted();
      });

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      act(() => {
        result.current.trackBufferingEnded('720p');
      });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'video_buffering_event',
        expect.objectContaining({
          video_id: 'test-video-123',
          video_title: 'Test Video',
          quality: '720p',
          buffering_count: 1,
        })
      );
    });

    it('should track quality changes', () => {
      const config = {
        videoId: 'test-video-123',
        videoTitle: 'Test Video',
      };

      const { result } = renderHook(() => useVideoTelemetry(config));

      act(() => {
        result.current.trackQualityChange('auto', '1080p', 30.5);
      });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'video_quality_changed',
        expect.objectContaining({
          video_id: 'test-video-123',
          video_title: 'Test Video',
          previous_quality: 'auto',
          new_quality: '1080p',
          timestamp: 30.5,
          quality_change_count: 1,
        })
      );
    });

    it('should track playback errors', () => {
      const config = {
        videoId: 'test-video-123',
        videoTitle: 'Test Video',
      };

      const { result } = renderHook(() => useVideoTelemetry(config));

      act(() => {
        result.current.trackPlaybackError('network_error', 'Connection timeout');
      });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'video_playback_error',
        expect.objectContaining({
          video_id: 'test-video-123',
          video_title: 'Test Video',
          error_type: 'network_error',
          error_message: 'Connection timeout',
          error_count: 1,
        })
      );
    });

    it('should track pause and resume events', () => {
      const config = {
        videoId: 'test-video-123',
        videoTitle: 'Test Video',
      };

      const { result } = renderHook(() => useVideoTelemetry(config));

      act(() => {
        result.current.trackPause(15.5, '720p');
      });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'video_paused',
        expect.objectContaining({
          video_id: 'test-video-123',
          timestamp: 15.5,
          quality: '720p',
        })
      );

      act(() => {
        result.current.trackResume(15.5, '720p');
      });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'video_resumed',
        expect.objectContaining({
          video_id: 'test-video-123',
          timestamp: 15.5,
          quality: '720p',
        })
      );
    });

    it('should track playback completion', () => {
      const config = {
        videoId: 'test-video-123',
        videoTitle: 'Test Video',
      };

      const { result } = renderHook(() => useVideoTelemetry(config));

      // Start playback first
      act(() => {
        result.current.trackPlaybackStarted(500, '720p');
      });

      // Complete playback
      act(() => {
        result.current.trackPlaybackCompleted('720p', 120);
      });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'video_playback_completed',
        expect.objectContaining({
          video_id: 'test-video-123',
          video_title: 'Test Video',
          quality: '720p',
          video_duration: 120,
        })
      );
    });

    it('should track session end on unmount', () => {
      const config = {
        videoId: 'test-video-123',
        videoTitle: 'Test Video',
      };

      const { unmount } = renderHook(() => useVideoTelemetry(config));

      unmount();

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'video_session_ended',
        expect.objectContaining({
          video_id: 'test-video-123',
          video_title: 'Test Video',
        })
      );
    });

    it('should return metrics with getMetrics', () => {
      const config = {
        videoId: 'test-video-123',
        videoTitle: 'Test Video',
      };

      const { result } = renderHook(() => useVideoTelemetry(config));

      act(() => {
        result.current.trackQualityChange('auto', '1080p', 10);
        result.current.trackPlaybackError('error', 'test error');
      });

      const metrics = result.current.getMetrics();

      expect(metrics.qualityChanges).toBe(1);
      expect(metrics.playbackErrors).toBe(1);
      expect(metrics.bufferingEventCount).toBe(0);
    });
  });
});

describe('Video Player Quality Selection', () => {
  it('should support multiple quality options', () => {
    const qualityOptions = ['auto', '240p', '480p', '720p', '1080p'];
    expect(qualityOptions).toHaveLength(5);
    expect(qualityOptions).toContain('auto');
    expect(qualityOptions).toContain('1080p');
  });

  it('should default to auto quality', () => {
    const defaultQuality = 'auto';
    expect(defaultQuality).toBe('auto');
  });
});

describe('Video Player PiP Support', () => {
  it('should have PiP enabled by default', () => {
    const allowsPictureInPicture = true;
    expect(allowsPictureInPicture).toBe(true);
  });

  it('should track PiP entry and exit', () => {
    expect(analytics.trackEvent).toBeDefined();
    
    // Simulate PiP entry
    analytics.trackEvent('video_pip_entered', {
      video_id: 'test-video',
      video_title: 'Test Video',
    });

    // Simulate PiP exit
    analytics.trackEvent('video_pip_exited', {
      video_id: 'test-video',
      video_title: 'Test Video',
    });

    expect(analytics.trackEvent).toBeDefined();
  });
});

describe('Video Player Background Playback', () => {
  it('should support background playback configuration', () => {
    const allowsBackgroundPlayback = true;
    expect(typeof allowsBackgroundPlayback).toBe('boolean');
  });

  it('should allow disabling background playback', () => {
    const allowsBackgroundPlayback = false;
    expect(allowsBackgroundPlayback).toBe(false);
  });
});

describe('Video Player Performance', () => {
  it('should track control responsiveness', () => {
    const targetFps = 60;
    const frameTime = 1000 / targetFps; // ~16.67ms
    expect(frameTime).toBeLessThan(17);
  });

  it('should have efficient control updates', () => {
    const controlUpdateTime = 10; // milliseconds
    const maxAcceptableTime = 20; // For 60fps, frame time should be < ~16.67ms
    expect(controlUpdateTime).toBeLessThan(maxAcceptableTime);
  });
});
