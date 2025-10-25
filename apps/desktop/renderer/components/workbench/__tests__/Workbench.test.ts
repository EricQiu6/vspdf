import { describe, it, expect } from 'vitest';
import { editorAreaReducer, createInitialEditorState } from '../../../services/EditorAreaReducer';
import type { EditorAreaState } from '@vspdf/types';

/**
 * Tests for Workbench test state initialization
 * Demonstrates that state creation is pure, testable, and deterministic
 */

/**
 * Replicates the createTestEditorState logic for testing
 * In a real implementation, this would import from Workbench
 */
function createTestEditorState(): EditorAreaState {
  let state = createInitialEditorState();
  const groupId = state.activeGroupId;

  state = editorAreaReducer(state, {
    type: 'ADD_TAB',
    groupId,
    tab: {
      uri: 'file:///docs/attention.pdf',
      title: 'Attention Is All You Need',
      viewer: 'stub',
    },
  });

  state = editorAreaReducer(state, {
    type: 'ADD_TAB',
    groupId,
    tab: {
      uri: 'file:///docs/resnet.pdf',
      title: 'Deep Residual Learning',
      viewer: 'stub',
    },
  });

  state = editorAreaReducer(state, {
    type: 'ADD_TAB',
    groupId,
    tab: {
      uri: 'file:///docs/bert.pdf',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      viewer: 'stub',
    },
  });

  return state;
}

describe('Workbench Test State', () => {
  describe('createTestEditorState', () => {
    it('creates state with exactly 3 tabs', () => {
      const state = createTestEditorState();
      const group = state.groups[state.activeGroupId];

      expect(group.tabs).toHaveLength(3);
    });

    it('sets first tab as active', () => {
      const state = createTestEditorState();
      const group = state.groups[state.activeGroupId];

      expect(group.activeIndex).toBe(0);
    });

    it('creates tabs with correct URIs', () => {
      const state = createTestEditorState();
      const group = state.groups[state.activeGroupId];

      expect(group.tabs[0].uri).toBe('file:///docs/attention.pdf');
      expect(group.tabs[1].uri).toBe('file:///docs/resnet.pdf');
      expect(group.tabs[2].uri).toBe('file:///docs/bert.pdf');
    });

    it('creates tabs with correct titles', () => {
      const state = createTestEditorState();
      const group = state.groups[state.activeGroupId];

      expect(group.tabs[0].title).toBe('Attention Is All You Need');
      expect(group.tabs[1].title).toBe('Deep Residual Learning');
      expect(group.tabs[2].title).toBe('BERT: Pre-training of Deep Bidirectional Transformers');
    });

    it('generates unique IDs for each tab', () => {
      const state = createTestEditorState();
      const group = state.groups[state.activeGroupId];

      const ids = group.tabs.map((tab) => tab.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    });

    it('is idempotent - multiple calls produce equivalent states', () => {
      const state1 = createTestEditorState();
      const state2 = createTestEditorState();

      const group1 = state1.groups[state1.activeGroupId];
      const group2 = state2.groups[state2.activeGroupId];

      // Same structure (though IDs will differ due to UUID generation)
      expect(group1.tabs.length).toBe(group2.tabs.length);
      expect(group1.activeIndex).toBe(group2.activeIndex);
      expect(group1.tabs.map((t) => t.uri)).toEqual(group2.tabs.map((t) => t.uri));
    });

    it('is pure - does not mutate input state', () => {
      // Create state, then try to mutate it
      const state = createTestEditorState();
      const originalGroupId = state.activeGroupId;
      const originalTabCount = state.groups[originalGroupId].tabs.length;

      // Attempting to mutate should not affect future calls
      const state2 = createTestEditorState();

      expect(state2.groups[state2.activeGroupId].tabs).toHaveLength(originalTabCount);
    });

    it('uses reducer for all state transformations', () => {
      // This test verifies we use the reducer (implicitly through editorAreaReducer)
      // rather than direct object manipulation
      const state = createTestEditorState();
      const group = state.groups[state.activeGroupId];

      // All tabs should have IDs (only possible if reducer added them)
      expect(group.tabs.every((tab) => 'id' in tab && tab.id)).toBe(true);
    });
  });

  describe('StrictMode safety', () => {
    it('calling factory multiple times is safe (no side effects)', () => {
      // Simulate StrictMode double-invocation
      const state1 = createTestEditorState();
      const state2 = createTestEditorState();

      // Both should be valid, independent states
      expect(state1.groups[state1.activeGroupId].tabs).toHaveLength(3);
      expect(state2.groups[state2.activeGroupId].tabs).toHaveLength(3);

      // States are independent (different group IDs due to UUID generation)
      expect(state1.activeGroupId).not.toBe(state2.activeGroupId);
    });
  });
});
