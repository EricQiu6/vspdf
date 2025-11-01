/**
 * Keybinding Resolver
 *
 * Pure function logic for matching keyboard sequences to commands.
 * Handles chord matching and context filtering.
 */

import type { Keybinding, ResolutionResult, Platform } from './types.js';
import type { ContextKeyMap } from '../context/types.js';
import { ContextKeyExpression } from '../context/ContextKeyExpression.js';
import { getPlatform } from './types.js';
import { normalizeKeybinding } from './keybindingUtils.js';

/**
 * Keybinding resolver
 * Maps chord sequences to commands with context filtering
 */
export class KeybindingResolver {
  private keybindings: Keybinding[] = [];
  private keybindingMap = new Map<string, Keybinding[]>();
  private platform: Platform;

  constructor() {
    this.platform = getPlatform();
  }

  /**
   * Register a keybinding
   * @param keybinding Keybinding to register
   */
  register(keybinding: Keybinding): void {
    // Normalize keybinding strings to match platform modifier orders
    // This ensures "Cmd+Shift+P" becomes "Shift+Cmd+P" on Mac, matching eventToChord()
    const normalizedKeybinding: Keybinding = {
      ...keybinding,
      key: normalizeKeybinding(keybinding.key),
      mac: keybinding.mac
        ? normalizeKeybinding(keybinding.mac, 'mac')
        : undefined,
      win: keybinding.win
        ? normalizeKeybinding(keybinding.win, 'win')
        : undefined,
      linux: keybinding.linux
        ? normalizeKeybinding(keybinding.linux, 'linux')
        : undefined,
    };

    this.keybindings.push(normalizedKeybinding);

    // Get platform-specific key sequence
    const keySequence = this.getKeySequence(normalizedKeybinding);
    if (!keySequence) return;

    // Extract first chord for indexing
    const firstChord = keySequence.split(' ')[0];

    // Add to map for fast lookup
    const existing = this.keybindingMap.get(firstChord) || [];
    existing.push(normalizedKeybinding);
    this.keybindingMap.set(firstChord, existing);
  }

  /**
   * Unregister a keybinding
   * @param id Keybinding ID
   */
  unregister(id: string): void {
    const index = this.keybindings.findIndex((kb) => kb.id === id);
    if (index === -1) return;

    const keybinding = this.keybindings[index];
    this.keybindings.splice(index, 1);

    // Remove from map
    const keySequence = this.getKeySequence(keybinding);
    if (!keySequence) return;

    const firstChord = keySequence.split(' ')[0];
    const existing = this.keybindingMap.get(firstChord);
    if (existing) {
      const mapIndex = existing.findIndex((kb) => kb.id === id);
      if (mapIndex !== -1) {
        existing.splice(mapIndex, 1);
      }
      if (existing.length === 0) {
        this.keybindingMap.delete(firstChord);
      }
    }
  }

  /**
   * Resolve a chord sequence to a command
   * @param chords Chord sequence (e.g., ["Cmd+K", "Cmd+P"])
   * @param context Context key map
   * @returns Resolution result
   */
  resolve(chords: string[], context: ContextKeyMap): ResolutionResult {
    if (chords.length === 0) {
      return { type: 'NoMatch' };
    }

    const firstChord = chords[0];

    // Get candidates that start with this chord
    const candidates = this.keybindingMap.get(firstChord) || [];

    // Filter by chord sequence match
    const chordMatched = candidates.filter((kb) => {
      const keySequence = this.getKeySequence(kb);
      if (!keySequence) return false;

      const kbChords = keySequence.split(' ');

      // Check if chord sequence matches
      if (chords.length > kbChords.length) {
        return false; // Too many chords
      }

      return kbChords
        .slice(0, chords.length)
        .every((c, i) => c === chords[i]);
    });

    if (chordMatched.length === 0) {
      return { type: 'NoMatch' };
    }

    // Filter by context (when clause)
    const contextMatched = chordMatched.filter((kb) => {
      if (!kb.when) return true;

      const expr = ContextKeyExpression.parse(kb.when);
      if (!expr) return true; // Invalid when clause - allow by default

      return expr.evaluate(context);
    });

    if (contextMatched.length === 0) {
      return { type: 'NoMatch' };
    }

    // Get first matching binding
    const binding = contextMatched[0];
    const keySequence = this.getKeySequence(binding);
    if (!keySequence) {
      return { type: 'NoMatch' };
    }

    const bindingChords = keySequence.split(' ');

    // Check if we need more chords
    if (chords.length < bindingChords.length) {
      return { type: 'MoreChordsNeeded' };
    }

    // Found exact match
    return { type: 'Found', commandId: binding.commandId };
  }

  /**
   * Get all keybindings
   * @returns Array of keybindings
   */
  getAll(): Keybinding[] {
    return [...this.keybindings];
  }

  /**
   * Lookup keybinding for a command
   * @param commandId Command ID
   * @returns Keybinding or undefined
   */
  lookupKeybinding(commandId: string): Keybinding | undefined {
    return this.keybindings.find((kb) => kb.commandId === commandId);
  }

  /**
   * Get platform-specific key sequence
   * @param keybinding Keybinding
   * @returns Key sequence string
   */
  private getKeySequence(keybinding: Keybinding): string | undefined {
    switch (this.platform) {
      case 'mac':
        return keybinding.mac || keybinding.key;
      case 'win':
        return keybinding.win || keybinding.key;
      case 'linux':
        return keybinding.linux || keybinding.key;
      default:
        return keybinding.key;
    }
  }
}
