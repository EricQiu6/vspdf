/**
 * Tests for keybinding utility functions
 */

import { describe, it, expect } from 'vitest';
import { normalizeKeybinding } from '../keybindingUtils';

describe('normalizeKeybinding', () => {
  describe('Mac platform', () => {
    it('should normalize Cmd+Shift+P to Shift+Cmd+P on Mac', () => {
      const normalized = normalizeKeybinding('Cmd+Shift+P', 'mac');
      expect(normalized).toBe('Shift+Cmd+P');
    });

    it('should normalize Cmd+Alt+P to Alt+Cmd+P on Mac', () => {
      const normalized = normalizeKeybinding('Cmd+Alt+P', 'mac');
      expect(normalized).toBe('Alt+Cmd+P');
    });

    it('should handle already normalized keybindings', () => {
      const normalized = normalizeKeybinding('Shift+Cmd+P', 'mac');
      expect(normalized).toBe('Shift+Cmd+P');
    });

    it('should preserve single-key shortcuts', () => {
      const normalized = normalizeKeybinding('Cmd+K', 'mac');
      expect(normalized).toBe('Cmd+K');
    });

    it('should handle multi-chord sequences', () => {
      const normalized = normalizeKeybinding('Cmd+K Cmd+Shift+P', 'mac');
      expect(normalized).toBe('Cmd+K Shift+Cmd+P');
    });

    it('should handle all modifiers in correct order', () => {
      // All modifiers: Ctrl, Alt, Shift, Cmd
      const normalized = normalizeKeybinding('Cmd+Shift+Alt+Ctrl+P', 'mac');
      expect(normalized).toBe('Ctrl+Alt+Shift+Cmd+P');
    });
  });

  describe('Windows/Linux platform', () => {
    it('should normalize Shift+Ctrl+P to Ctrl+Shift+P on Windows', () => {
      const normalized = normalizeKeybinding('Shift+Ctrl+P', 'win');
      expect(normalized).toBe('Ctrl+Shift+P');
    });

    it('should handle already normalized keybindings', () => {
      const normalized = normalizeKeybinding('Ctrl+Shift+P', 'win');
      expect(normalized).toBe('Ctrl+Shift+P');
    });

    it('should handle all modifiers in correct order on Windows', () => {
      // All modifiers: Ctrl, Shift, Alt, Meta
      const normalized = normalizeKeybinding('Meta+Alt+Shift+Ctrl+P', 'win');
      expect(normalized).toBe('Ctrl+Shift+Alt+Meta+P');
    });

    it('should handle all modifiers in correct order on Linux', () => {
      const normalized = normalizeKeybinding('Meta+Alt+Shift+Ctrl+P', 'linux');
      expect(normalized).toBe('Ctrl+Shift+Alt+Meta+P');
    });
  });

  describe('Edge cases', () => {
    it('should handle single key without modifiers', () => {
      const normalized = normalizeKeybinding('P', 'mac');
      expect(normalized).toBe('P');
    });

    it('should handle empty string', () => {
      const normalized = normalizeKeybinding('', 'mac');
      expect(normalized).toBe('');
    });

    it('should handle unknown modifiers by placing them at the end', () => {
      const normalized = normalizeKeybinding('Unknown+Cmd+P', 'mac');
      expect(normalized).toBe('Cmd+Unknown+P');
    });

    it('should preserve spacing in multi-chord sequences', () => {
      const normalized = normalizeKeybinding('Cmd+K Cmd+Right Cmd+P', 'mac');
      expect(normalized).toBe('Cmd+K Cmd+Right Cmd+P');
    });
  });

  describe('Real-world shortcuts', () => {
    it('should normalize common VS Code shortcuts on Mac', () => {
      expect(normalizeKeybinding('Cmd+Shift+P', 'mac')).toBe('Shift+Cmd+P');
      expect(normalizeKeybinding('Cmd+K Cmd+S', 'mac')).toBe('Cmd+K Cmd+S');
      expect(normalizeKeybinding('Cmd+K Cmd+Shift+S', 'mac')).toBe('Cmd+K Shift+Cmd+S');
      expect(normalizeKeybinding('Cmd+Alt+F', 'mac')).toBe('Alt+Cmd+F');
    });

    it('should normalize common VS Code shortcuts on Windows', () => {
      expect(normalizeKeybinding('Ctrl+Shift+P', 'win')).toBe('Ctrl+Shift+P');
      expect(normalizeKeybinding('Ctrl+K Ctrl+S', 'win')).toBe('Ctrl+K Ctrl+S');
      expect(normalizeKeybinding('Shift+Ctrl+P', 'win')).toBe('Ctrl+Shift+P');
    });
  });
});
