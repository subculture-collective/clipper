import { useEffect } from 'react';

export interface KeyboardShortcut {
  /**
   * Key combination (e.g., '/', 'Escape', 'Ctrl+K')
   */
  key: string;
  /**
   * Callback when shortcut is triggered
   */
  callback: () => void;
  /**
   * Description of what the shortcut does
   */
  description?: string;
  /**
   * Whether to prevent default behavior
   * @default true
   */
  preventDefault?: boolean;
}

/**
 * Hook for registering global keyboard shortcuts
 * @param shortcuts - Array of keyboard shortcuts to register
 * @param enabled - Whether shortcuts are enabled
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in an input
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const { key, callback, preventDefault = true } = shortcut;

        // Parse key combination
        const parts = key.toLowerCase().split('+');
        const mainKey = parts[parts.length - 1];
        const needsCtrl = parts.includes('ctrl') || parts.includes('control');
        const needsShift = parts.includes('shift');
        const needsAlt = parts.includes('alt');
        const needsMeta = parts.includes('meta') || parts.includes('cmd');

        // Check if key matches
        const keyMatches = event.key.toLowerCase() === mainKey;
        const modifiersMatch =
          event.ctrlKey === needsCtrl &&
          event.shiftKey === needsShift &&
          event.altKey === needsAlt &&
          event.metaKey === needsMeta;

        if (keyMatches && modifiersMatch) {
          // Special case: allow '/' in input fields if explicitly typing
          if (mainKey === '/' && isInputElement) {
            continue;
          }

          // For other shortcuts, skip if in input element
          if (isInputElement && mainKey !== 'escape') {
            continue;
          }

          if (preventDefault) {
            event.preventDefault();
          }
          callback();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}
