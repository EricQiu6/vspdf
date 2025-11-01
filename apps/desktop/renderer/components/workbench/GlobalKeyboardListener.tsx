/**
 * GlobalKeyboardListener Component
 *
 * Sets up a global keyboard event listener that delegates to the keybinding service.
 * Should be rendered once at the root of the application.
 */

import { useEffect } from 'react';
import { keybindingService } from '../../services/keybindings/KeybindingService.js';

/**
 * Global keyboard listener component
 *
 * Renders nothing, but sets up a global keydown listener on mount
 * and cleans it up on unmount.
 *
 * @example
 * ```typescript
 * function App() {
 *   return (
 *     <>
 *       <GlobalKeyboardListener />
 *       {/ * rest of app * /}
 *     </>
 *   );
 * }
 * ```
 */
export function GlobalKeyboardListener(): null {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      keybindingService.handleKeyDown(e);
    };

    // Use capture phase to intercept events before they bubble
    window.addEventListener('keydown', handler, true);

    return () => {
      window.removeEventListener('keydown', handler, true);
    };
  }, []);

  return null;
}
