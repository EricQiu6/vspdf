/**
 * Keybinding Service
 *
 * Main keyboard dispatch service. Handles keyboard events, chord sequences,
 * and command execution.
 */

import type {
  IKeybindingService,
  Keybinding,
  Disposable,
  ChordModeEvent,
  Platform,
} from './types.js';
import { KeybindingResolver } from './KeybindingResolver.js';
import { contextKeyService } from '../context/ContextKeyService.js';
import { commandRegistry } from '../CommandRegistry.js';
import { commandContextProvider } from '../CommandContextProvider.js';
import { getPlatform } from './types.js';

/**
 * Keybinding service implementation
 */
export class KeybindingService implements IKeybindingService {
  private currentChords: string[] = [];
  private chordTimeout: ReturnType<typeof setTimeout> | null = null;
  private resolver: KeybindingResolver;
  private readonly CHORD_TIMEOUT = 5000; // 5 seconds like VS Code
  private platform: Platform;
  private chordModeListeners = new Set<(event: ChordModeEvent) => void>();

  constructor() {
    this.resolver = new KeybindingResolver();
    this.platform = getPlatform();
  }

  /**
   * Handle a keyboard event from the DOM
   */
  handleKeyDown(event: KeyboardEvent): void {
    // Ignore if typing in input field
    if (this.isInputElement(event.target)) {
      return;
    }

    // Ignore standalone modifier key presses (Cmd, Ctrl, Alt, Shift by themselves)
    if (this.isModifierOnlyKey(event)) {
      return;
    }

    // Convert event to chord string
    const chord = this.eventToChord(event);
    if (!chord) {
      return;
    }

    // Add to sequence
    this.currentChords.push(chord);

    // Get current context
    const target = event.target as HTMLElement;
    const contextId = contextKeyService.getContextForElement(target);
    const context = contextKeyService.getContext(contextId);

    // Try to resolve
    const result = this.resolver.resolve(this.currentChords, context);

    // Handle result
    if (result.type === 'Found') {
      event.preventDefault();
      event.stopPropagation();

      // Execute command with proper context
      const commandContext = commandContextProvider.getContext();
      commandRegistry.execute(result.commandId, commandContext).catch((error) => {
        console.error(`Failed to execute command ${result.commandId}:`, error);
      });

      this.resetChords();
    } else if (result.type === 'MoreChordsNeeded') {
      event.preventDefault();
      event.stopPropagation();
      this.enterChordMode();
    } else {
      // No match - reset
      this.resetChords();
    }
  }

  /**
   * Register a keybinding
   */
  registerKeybinding(keybinding: Keybinding): Disposable {
    this.resolver.register(keybinding);

    return {
      dispose: () => {
        this.resolver.unregister(keybinding.id);
      },
    };
  }

  /**
   * Lookup keybindings for a command
   */
  lookupKeybinding(commandId: string): Keybinding | undefined {
    return this.resolver.lookupKeybinding(commandId);
  }

  /**
   * Get all registered keybindings
   */
  getKeybindings(): Keybinding[] {
    return this.resolver.getAll();
  }

  /**
   * Subscribe to chord mode changes
   */
  onChordModeChanged(listener: (event: ChordModeEvent) => void): () => void {
    this.chordModeListeners.add(listener);
    return () => {
      this.chordModeListeners.delete(listener);
    };
  }

  /**
   * Dispose service and cleanup listeners
   */
  dispose(): void {
    this.resetChords();
    this.chordModeListeners.clear();
  }

  /**
   * Convert keyboard event to chord string
   * @param event Keyboard event
   * @returns Chord string (e.g., "Cmd+K") or null
   */
  private eventToChord(event: KeyboardEvent): string | null {
    const parts: string[] = [];

    // Platform-specific modifier order (like VS Code)
    if (this.platform === 'mac') {
      if (event.ctrlKey) parts.push('Ctrl');
      if (event.altKey) parts.push('Alt');
      if (event.shiftKey) parts.push('Shift');
      if (event.metaKey) parts.push('Cmd');
    } else {
      if (event.ctrlKey) parts.push('Ctrl');
      if (event.shiftKey) parts.push('Shift');
      if (event.altKey) parts.push('Alt');
      if (event.metaKey) parts.push('Meta');
    }

    // Add key code (normalized)
    const key = this.normalizeKey(event.code, event.key);
    if (!key) return null;

    parts.push(key);

    return parts.join('+');
  }

  /**
   * Normalize key code to consistent format
   * @param code KeyboardEvent.code
   * @param key KeyboardEvent.key
   * @returns Normalized key string
   */
  private normalizeKey(code: string, key: string): string | null {
    // Special keys
    const specialKeys: Record<string, string> = {
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      Escape: 'Escape',
      Enter: 'Enter',
      Space: 'Space',
      Tab: 'Tab',
      Backspace: 'Backspace',
      Delete: 'Delete',
      Home: 'Home',
      End: 'End',
      PageUp: 'PageUp',
      PageDown: 'PageDown',
      Insert: 'Insert',
    };

    if (code in specialKeys) {
      return specialKeys[code];
    }

    // Function keys
    if (code.startsWith('F') && code.length <= 3) {
      return code; // F1, F2, ..., F12
    }

    // Letter keys
    if (code.startsWith('Key')) {
      return code.substring(3); // KeyA -> A
    }

    // Digit keys
    if (code.startsWith('Digit')) {
      return code.substring(5); // Digit1 -> 1
    }

    // Numpad keys
    if (code.startsWith('Numpad')) {
      return code; // Keep as is (Numpad1, NumpadAdd, etc.)
    }

    // Symbols and punctuation - use key instead of code
    if (key.length === 1) {
      return key.toUpperCase();
    }

    // Fallback
    return key || null;
  }

  /**
   * Check if the key press is a standalone modifier key
   * @param event Keyboard event
   * @returns True if this is just a modifier key (Cmd, Ctrl, Alt, Shift alone)
   */
  private isModifierOnlyKey(event: KeyboardEvent): boolean {
    const modifierCodes = [
      'MetaLeft',
      'MetaRight',
      'ControlLeft',
      'ControlRight',
      'AltLeft',
      'AltRight',
      'ShiftLeft',
      'ShiftRight',
    ];

    return modifierCodes.includes(event.code);
  }

  /**
   * Check if event target is an input element
   * @param target Event target
   * @returns True if target is an input element
   */
  private isInputElement(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') {
      return true;
    }

    if (target.isContentEditable) {
      return true;
    }

    return false;
  }

  /**
   * Enter chord mode (waiting for next chord)
   */
  private enterChordMode(): void {
    // Clear existing timeout
    if (this.chordTimeout) {
      clearTimeout(this.chordTimeout);
    }

    // Set new timeout
    this.chordTimeout = setTimeout(() => {
      this.resetChords();
    }, this.CHORD_TIMEOUT);

    // Emit event for UI (e.g., show "Cmd+K" in status bar)
    this.fireChordModeChanged({
      active: true,
      chords: [...this.currentChords],
    });
  }

  /**
   * Reset chord sequence
   */
  private resetChords(): void {
    const hadChords = this.currentChords.length > 0;

    this.currentChords = [];

    if (this.chordTimeout) {
      clearTimeout(this.chordTimeout);
      this.chordTimeout = null;
    }

    if (hadChords) {
      this.fireChordModeChanged({
        active: false,
        chords: [],
      });
    }
  }

  /**
   * Fire chord mode changed event
   */
  private fireChordModeChanged(event: ChordModeEvent): void {
    for (const listener of this.chordModeListeners) {
      listener(event);
    }
  }
}

/**
 * Global singleton instance
 */
export const keybindingService = new KeybindingService();
