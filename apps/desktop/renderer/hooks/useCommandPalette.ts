/**
 * useCommandPalette Hook
 *
 * React hook for managing command palette state.
 * Automatically registers Cmd+Shift+P shortcut.
 */

import { useState, useCallback } from 'react';
import { useHotkeys } from './useHotkeys.js';

/**
 * Command palette state and controls
 */
export interface CommandPaletteState {
  /**
   * Whether the command palette is currently visible
   */
  visible: boolean;

  /**
   * Show the command palette
   */
  show: () => void;

  /**
   * Hide the command palette
   */
  hide: () => void;

  /**
   * Toggle the command palette visibility
   */
  toggle: () => void;
}

/**
 * Hook for managing command palette state
 *
 * Automatically registers the Cmd+Shift+P (or Ctrl+Shift+P) shortcut
 * to toggle the command palette.
 *
 * @returns Command palette state and controls
 *
 * @example
 * ```typescript
 * function App() {
 *   const { visible, hide } = useCommandPalette();
 *
 *   return (
 *     <>
 *       <CommandPalette visible={visible} onClose={hide} />
 *       {/ * rest of app * /}
 *     </>
 *   );
 * }
 * ```
 */
export function useCommandPalette(): CommandPaletteState {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => {
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  const toggle = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  // Register Cmd+Shift+P shortcut
  // On Mac: Cmd+Shift+P
  // On Windows/Linux: Ctrl+Shift+P
  useHotkeys('Cmd+Shift+P', toggle);
  useHotkeys('Ctrl+Shift+P', toggle);

  return { visible, show, hide, toggle };
}
