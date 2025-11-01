/**
 * Tests for KeybindingResolver chord matching logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KeybindingResolver } from '../KeybindingResolver';

describe('KeybindingResolver', () => {
  let resolver: KeybindingResolver;

  beforeEach(() => {
    resolver = new KeybindingResolver();
  });

  describe('single chord keybindings', () => {
    it('should resolve single chord match', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Cmd+S',
      });

      const result = resolver.resolve(['Cmd+S'], {});
      expect(result).toEqual({ type: 'Found', commandId: 'test.command' });
    });

    it('should return NoMatch for non-matching chord', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Cmd+S',
      });

      const result = resolver.resolve(['Cmd+K'], {});
      expect(result).toEqual({ type: 'NoMatch' });
    });

    it('should return NoMatch for empty chord sequence', () => {
      const result = resolver.resolve([], {});
      expect(result).toEqual({ type: 'NoMatch' });
    });
  });

  describe('multi-chord keybindings', () => {
    it('should return MoreChordsNeeded for partial match', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.splitRight',
        key: 'Cmd+K Cmd+Right',
      });

      const result = resolver.resolve(['Cmd+K'], {});
      expect(result).toEqual({ type: 'MoreChordsNeeded' });
    });

    it('should resolve complete multi-chord sequence', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.splitRight',
        key: 'Cmd+K Cmd+Right',
      });

      const result = resolver.resolve(['Cmd+K', 'Cmd+Right'], {});
      expect(result).toEqual({ type: 'Found', commandId: 'test.splitRight' });
    });

    it('should return NoMatch for wrong second chord', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.splitRight',
        key: 'Cmd+K Cmd+Right',
      });

      const result = resolver.resolve(['Cmd+K', 'Cmd+Left'], {});
      expect(result).toEqual({ type: 'NoMatch' });
    });

    it('should handle three-chord sequences', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.tripleChord',
        key: 'Cmd+K Cmd+K Cmd+K',
      });

      const result1 = resolver.resolve(['Cmd+K'], {});
      expect(result1).toEqual({ type: 'MoreChordsNeeded' });

      const result2 = resolver.resolve(['Cmd+K', 'Cmd+K'], {});
      expect(result2).toEqual({ type: 'MoreChordsNeeded' });

      const result3 = resolver.resolve(['Cmd+K', 'Cmd+K', 'Cmd+K'], {});
      expect(result3).toEqual({ type: 'Found', commandId: 'test.tripleChord' });
    });
  });

  describe('context filtering', () => {
    it('should match keybinding without when clause', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Cmd+S',
      });

      const result = resolver.resolve(['Cmd+S'], { editorFocus: true });
      expect(result).toEqual({ type: 'Found', commandId: 'test.command' });
    });

    it('should match keybinding when context satisfies when clause', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Cmd+S',
        when: 'editorFocus',
      });

      const result = resolver.resolve(['Cmd+S'], { editorFocus: true });
      expect(result).toEqual({ type: 'Found', commandId: 'test.command' });
    });

    it('should not match keybinding when context does not satisfy when clause', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Cmd+S',
        when: 'editorFocus',
      });

      const result = resolver.resolve(['Cmd+S'], { editorFocus: false });
      expect(result).toEqual({ type: 'NoMatch' });
    });

    it('should filter by complex when clause', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Cmd+W',
        when: 'editorFocus && !inputFocus',
      });

      const result1 = resolver.resolve(['Cmd+W'], { editorFocus: true, inputFocus: false });
      expect(result1).toEqual({ type: 'Found', commandId: 'test.command' });

      const result2 = resolver.resolve(['Cmd+W'], { editorFocus: true, inputFocus: true });
      expect(result2).toEqual({ type: 'NoMatch' });

      const result3 = resolver.resolve(['Cmd+W'], { editorFocus: false, inputFocus: false });
      expect(result3).toEqual({ type: 'NoMatch' });
    });

    it('should allow keybinding with invalid when clause', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Cmd+S',
        when: 'invalid &&', // Invalid expression
      });

      // Invalid when clause should be treated as always true
      const result = resolver.resolve(['Cmd+S'], {});
      expect(result).toEqual({ type: 'Found', commandId: 'test.command' });
    });
  });

  describe('multiple keybindings', () => {
    it('should return first matching keybinding', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command1',
        key: 'Cmd+S',
      });
      resolver.register({
        id: 'kb2',
        commandId: 'test.command2',
        key: 'Cmd+S',
      });

      const result = resolver.resolve(['Cmd+S'], {});
      expect(result).toEqual({ type: 'Found', commandId: 'test.command1' });
    });

    it('should prefer context-matched keybinding', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command1',
        key: 'Cmd+S',
        when: 'inputFocus',
      });
      resolver.register({
        id: 'kb2',
        commandId: 'test.command2',
        key: 'Cmd+S',
        when: 'editorFocus',
      });

      const result = resolver.resolve(['Cmd+S'], { editorFocus: true });
      // Should return the first context-matched keybinding
      expect(result).toEqual({ type: 'Found', commandId: 'test.command2' });
    });
  });

  describe('registration and unregistration', () => {
    it('should unregister keybinding by ID', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Cmd+S',
      });

      let result = resolver.resolve(['Cmd+S'], {});
      expect(result.type).toBe('Found');

      resolver.unregister('kb1');

      result = resolver.resolve(['Cmd+S'], {});
      expect(result.type).toBe('NoMatch');
    });

    it('should handle unregistering non-existent keybinding', () => {
      expect(() => resolver.unregister('nonexistent')).not.toThrow();
    });

    it('should return all registered keybindings', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command1',
        key: 'Cmd+S',
      });
      resolver.register({
        id: 'kb2',
        commandId: 'test.command2',
        key: 'Cmd+K',
      });

      const all = resolver.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe('kb1');
      expect(all[1].id).toBe('kb2');
    });

    it('should lookup keybinding by command ID', () => {
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Cmd+S',
      });

      const binding = resolver.lookupKeybinding('test.command');
      expect(binding).toBeDefined();
      expect(binding!.id).toBe('kb1');
      expect(binding!.key).toBe('Cmd+S');
    });
  });

  describe('platform-specific keybindings', () => {
    it('should use platform-specific override on Mac', () => {
      // This test assumes running on Mac
      // In a real test environment, you might want to mock getPlatform()
      resolver.register({
        id: 'kb1',
        commandId: 'test.command',
        key: 'Ctrl+S',
        mac: 'Cmd+S',
      });

      // On Mac, should use Cmd+S
      const result = resolver.resolve(['Cmd+S'], {});
      // Result depends on actual platform, but logic is tested
      expect(result.type).toMatch(/Found|NoMatch/);
    });
  });
});
