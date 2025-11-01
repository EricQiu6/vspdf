/**
 * useHotkeys Hook
 *
 * React hook for registering component-level keyboard shortcuts.
 * Automatically registers and unregisters keybindings on mount/unmount.
 */

import { useEffect, useRef, useLayoutEffect, type DependencyList } from 'react';
import { keybindingService } from '../services/keybindings/KeybindingService.js';
import { commandRegistry } from '../services/CommandRegistry.js';

/**
 * Hook for registering a keyboard shortcut
 *
 * @param keys Key sequence (e.g., "Cmd+K" or "Cmd+K Cmd+P")
 * @param callback Function to call when shortcut is triggered
 * @param deps Dependency array (like useEffect)
 *
 * @example
 * ```typescript
 * useHotkeys('Cmd+S', () => {
 *   console.log('Save!');
 * });
 *
 * useHotkeys('Cmd+K Cmd+P', () => {
 *   console.log('Multi-chord!');
 * });
 * ```
 */
export function useHotkeys(
  keys: string,
  callback: () => void,
  deps: DependencyList = []
): void {
  const callbackRef = useRef(callback);

  // Update ref on every render (don't re-register)
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    // Generate unique ID for this keybinding
    const id = `hotkey-${crypto.randomUUID()}`;
    const commandId = `__hotkey.${id}`;

    // Register temporary command
    commandRegistry.register({
      id: commandId,
      handler: () => callbackRef.current(),
    });

    // Register keybinding
    const disposable = keybindingService.registerKeybinding({
      id,
      commandId,
      key: keys,
    });

    return () => {
      disposable.dispose();
      commandRegistry.unregister(commandId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, ...deps]);
}

/**
 * Hook for registering multiple keyboard shortcuts
 *
 * @param shortcuts Array of [keys, callback] tuples
 * @param deps Dependency array
 *
 * @example
 * ```typescript
 * useHotkeysMap([
 *   ['Cmd+S', handleSave],
 *   ['Cmd+K Cmd+P', handleCommandPalette],
 *   ['Escape', handleEscape],
 * ]);
 * ```
 */
export function useHotkeysMap(
  shortcuts: Array<[string, () => void]>,
  deps: DependencyList = []
): void {
  const callbacksRef = useRef(shortcuts.map(([, cb]) => cb));

  // Update refs on every render
  useLayoutEffect(() => {
    callbacksRef.current = shortcuts.map(([, cb]) => cb);
  });

  useEffect(() => {
    const disposables: Array<() => void> = [];

    shortcuts.forEach(([keys], index) => {
      const id = `hotkey-${crypto.randomUUID()}`;
      const commandId = `__hotkey.${id}`;

      // Register temporary command
      commandRegistry.register({
        id: commandId,
        handler: () => callbacksRef.current[index](),
      });

      // Register keybinding
      const disposable = keybindingService.registerKeybinding({
        id,
        commandId,
        key: keys,
      });

      disposables.push(() => {
        disposable.dispose();
        commandRegistry.unregister(commandId);
      });
    });

    return () => {
      disposables.forEach((dispose) => dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts.map(([keys]) => keys).join(','), ...deps]);
}
