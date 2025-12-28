import { useEffect, useRef, useState } from 'react';

/**
 * Hook for keyboard navigation in dropdown menus
 * Supports arrow keys, Enter, Escape, and Home/End keys
 * @param isOpen - Whether the menu is open
 * @param onClose - Callback to close the menu
 * @param itemCount - Number of menu items
 * @returns ref for menu container and current focused index
 */
export function useMenuKeyboard(
  isOpen: boolean,
  onClose: () => void,
  itemCount: number
) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Reset focused index when menu opens
  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setFocusedIndex(-1);
      });
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % itemCount);
          break;
        
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + itemCount) % itemCount);
          break;
        
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        
        case 'End':
          e.preventDefault();
          setFocusedIndex(itemCount - 1);
          break;
        
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0) {
            e.preventDefault();
            // Trigger click on the focused item
            const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
            if (menuItems && menuItems[focusedIndex]) {
              (menuItems[focusedIndex] as HTMLElement).click();
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, focusedIndex, itemCount, onClose]);

  // Focus the menu item based on focusedIndex
  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return;

    const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (menuItems && menuItems[focusedIndex]) {
      (menuItems[focusedIndex] as HTMLElement).focus();
    }
  }, [focusedIndex, isOpen]);

  return { menuRef, focusedIndex };
}
