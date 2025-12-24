import { useEffect, useCallback } from 'react';

export interface KeyboardControlHandlers {
  onPlayPause?: () => void;
  onMute?: () => void;
  onFullscreen?: () => void;
  onTheatreMode?: () => void;
  onPictureInPicture?: () => void;
}

/**
 * Custom hook for video player keyboard shortcuts
 * Implements standard video player keyboard controls:
 * - Space: play/pause
 * - M: mute/unmute
 * - F: fullscreen
 * - T: theatre mode
 * - P: picture-in-picture
 * 
 * @param handlers - Callback functions for each keyboard action
 * @param enabled - Whether keyboard shortcuts are enabled (default: true)
 */
export function useKeyboardControls(
  handlers: KeyboardControlHandlers,
  enabled: boolean = true
) {
  // Destructure handlers to stable references
  const {
    onPlayPause,
    onMute,
    onFullscreen,
    onTheatreMode,
    onPictureInPicture,
  } = handlers;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts if user is typing in an input
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const key = e.key.toLowerCase();

    switch (key) {
      case ' ':
        e.preventDefault();
        onPlayPause?.();
        break;
      case 'm':
        e.preventDefault();
        onMute?.();
        break;
      case 'f':
        e.preventDefault();
        onFullscreen?.();
        break;
      case 't':
        e.preventDefault();
        onTheatreMode?.();
        break;
      case 'p':
        e.preventDefault();
        onPictureInPicture?.();
        break;
    }
  }, [enabled, onPlayPause, onMute, onFullscreen, onTheatreMode, onPictureInPicture]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}
