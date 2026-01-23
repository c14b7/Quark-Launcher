'use client';

import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description: string;
}

/**
 * Hook to manage keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
        const shiftMatch = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatch = shortcut.alt === undefined || shortcut.alt === event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Common keyboard shortcuts for the launcher
 */
export const commonShortcuts = {
  search: (callback: () => void): KeyboardShortcut => ({
    key: 'k',
    ctrl: true,
    callback,
    description: 'Szukaj gry',
  }),
  settings: (callback: () => void): KeyboardShortcut => ({
    key: ',',
    ctrl: true,
    callback,
    description: 'Otwórz ustawienia',
  }),
  home: (callback: () => void): KeyboardShortcut => ({
    key: 'h',
    ctrl: true,
    callback,
    description: 'Przejdź do strony głównej',
  }),
  library: (callback: () => void): KeyboardShortcut => ({
    key: 'l',
    ctrl: true,
    callback,
    description: 'Przejdź do biblioteki',
  }),
  escape: (callback: () => void): KeyboardShortcut => ({
    key: 'Escape',
    callback,
    description: 'Zamknij',
  }),
  refresh: (callback: () => void): KeyboardShortcut => ({
    key: 'r',
    ctrl: true,
    callback,
    description: 'Odśwież bibliotekę',
  }),
};
