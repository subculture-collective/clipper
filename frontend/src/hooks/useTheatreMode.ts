import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to manage theatre mode state and keyboard shortcuts
 * 
 * @returns Theatre mode state and control functions
 */
export function useTheatreMode() {
  const [isTheatreMode, setIsTheatreMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle picture-in-picture changes
  useEffect(() => {
    const handlePiPChange = () => {
      setIsPictureInPicture(document.pictureInPictureElement !== null);
    };

    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, []);

  // Toggle theatre mode
  const toggleTheatreMode = useCallback(() => {
    setIsTheatreMode(prev => !prev);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Toggle picture-in-picture
  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Error toggling picture-in-picture:', err);
    }
  }, []);

  // Exit theatre mode
  const exitTheatreMode = useCallback(() => {
    setIsTheatreMode(false);
  }, []);

  return {
    isTheatreMode,
    isFullscreen,
    isPictureInPicture,
    containerRef,
    videoRef,
    toggleTheatreMode,
    toggleFullscreen,
    togglePictureInPicture,
    exitTheatreMode,
  };
}
