/**
 * Keybinding Service Types
 *
 * Provides type definitions for the keyboard shortcut system.
 */

import type { ContextKeyMap } from '../context/types.js';

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Keybinding definition
 */
export interface Keybinding {
  /**
   * Unique identifier for this keybinding
   */
  id: string;

  /**
   * Command ID to execute
   */
  commandId: string;

  /**
   * Primary key sequence (e.g., "Cmd+K Cmd+P")
   */
  key: string;

  /**
   * Mac-specific override
   */
  mac?: string;

  /**
   * Windows-specific override
   */
  win?: string;

  /**
   * Linux-specific override
   */
  linux?: string;

  /**
   * Context expression (when clause)
   * Example: "editorFocus && !inputFocus"
   */
  when?: string;
}

/**
 * Result of keybinding resolution
 */
export type ResolutionResult =
  | { type: 'Found'; commandId: string }
  | { type: 'MoreChordsNeeded' }
  | { type: 'NoMatch' };

/**
 * Chord mode event data
 */
export interface ChordModeEvent {
  active: boolean;
  chords: string[];
}

/**
 * Main keybinding service interface
 */
export interface IKeybindingService {
  /**
   * Handle a keyboard event from the DOM
   * @param event Keyboard event
   */
  handleKeyDown(event: KeyboardEvent): void;

  /**
   * Register a keybinding
   * @param keybinding Keybinding definition
   * @returns Disposable to unregister
   */
  registerKeybinding(keybinding: Keybinding): Disposable;

  /**
   * Lookup keybindings for a command
   * @param commandId Command ID
   * @returns Keybinding or undefined
   */
  lookupKeybinding(commandId: string): Keybinding | undefined;

  /**
   * Get all registered keybindings
   * @returns Array of keybindings
   */
  getKeybindings(): Keybinding[];

  /**
   * Subscribe to chord mode changes
   * @param listener Callback to invoke on chord mode change
   * @returns Unsubscribe function
   */
  onChordModeChanged(listener: (event: ChordModeEvent) => void): () => void;

  /**
   * Dispose service and cleanup listeners
   */
  dispose(): void;
}

/**
 * Platform type
 */
export type Platform = 'mac' | 'win' | 'linux';

/**
 * Get current platform
 */
export function getPlatform(): Platform {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('mac')) return 'mac';
  if (platform.includes('win')) return 'win';
  return 'linux';
}
