import { describe, expect, it } from 'vitest';
import type { EditorAction, LayoutTree, DocTabInput } from '@vspdf/types';

// Note: We're doing TDD - these imports don't exist yet!
// We're defining the expected API through tests.
import { createInitialEditorState, editorAreaReducer } from '../EditorAreaReducer';

describe('EditorAreaReducer - TDD Test Suite', () => {
  // ============================================================================
  // Category 1: Initial State & Helpers
  // ============================================================================

  describe('createInitialEditorState', () => {
    it('creates state with one empty group', () => {
      const state = createInitialEditorState();

      // Should have exactly one group
      const groupIds = Object.keys(state.groups);
      expect(groupIds).toHaveLength(1);

      const groupId = groupIds[0];

      // Layout should be a single leaf pointing to that group
      expect(state.layout).toEqual({
        type: 'leaf',
        groupId,
      });

      // Active group should be the only group
      expect(state.activeGroupId).toBe(groupId);

      // Group should be empty
      expect(state.groups[groupId]).toEqual({
        id: groupId,
        tabs: [],
        activeIndex: -1,
      });
    });
  });

  // ============================================================================
  // Category 2: ADD_TAB
  // ============================================================================

  describe('ADD_TAB', () => {
    it('adds first tab to empty group and sets activeIndex to 0', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      const tab: DocTabInput = {
        uri: 'doc1.pdf',
        title: 'Document 1',
        viewer: 'pdf',
      };

      const action: EditorAction = {
        type: 'ADD_TAB',
        groupId,
        tab,
      };

      const next = editorAreaReducer(initial, action);

      // Tab should be added with generated ID
      expect(next.groups[groupId].tabs).toHaveLength(1);
      expect(next.groups[groupId].tabs[0]).toMatchObject(tab);
      expect(next.groups[groupId].tabs[0].id).toBeDefined();
      expect(next.groups[groupId].activeIndex).toBe(0);
    });

    it('adds second tab without changing activeIndex', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      const tab1: DocTabInput = { uri: 'doc1.pdf', title: 'Doc 1', viewer: 'pdf' };
      const tab2: DocTabInput = { uri: 'doc2.pdf', title: 'Doc 2', viewer: 'pdf' };

      let state = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: tab1,
      });

      state = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId,
        tab: tab2,
      });

      expect(state.groups[groupId].tabs).toHaveLength(2);
      expect(state.groups[groupId].tabs[1]).toMatchObject(tab2);
      expect(state.groups[groupId].activeIndex).toBe(0); // Still on first tab
    });

    it('preserves tab state field when adding', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      const tab: DocTabInput = {
        uri: 'doc.pdf',
        title: 'Doc',
        viewer: 'pdf',
        state: { page: 5, zoom: 1.5 },
      };

      const next = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab,
      });

      expect(next.groups[groupId].tabs[0].state).toEqual({ page: 5, zoom: 1.5 });
    });

    it('returns unchanged state when adding to non-existent group', () => {
      const initial = createInitialEditorState();

      const next = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId: 'non-existent',
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      expect(next).toBe(initial); // Same reference = no-op
    });

    it('switches to existing tab when adding duplicate URI', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      const tab1: DocTabInput = { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' };
      const tab2: DocTabInput = { uri: 'doc.pdf', title: 'Different Title', viewer: 'pdf' };

      // Add first tab
      let state = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: tab1,
      });

      // Add another tab to make first one non-active
      state = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'other.pdf', title: 'Other', viewer: 'pdf' },
      });

      // Now activeIndex is 0 (still on first tab)
      expect(state.groups[groupId].activeIndex).toBe(0);

      // Try to add duplicate of first tab (should switch to existing, not add)
      state = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId,
        tab: tab2,
      });

      // Should NOT add new tab, should switch to existing
      expect(state.groups[groupId].tabs).toHaveLength(2); // Not 3!
      expect(state.groups[groupId].activeIndex).toBe(0); // Switched to existing tab
      expect(state.groups[groupId].tabs[0].uri).toBe('doc.pdf');
    });
  });

  // ============================================================================
  // Category 3: SET_ACTIVE_TAB
  // ============================================================================

  describe('SET_ACTIVE_TAB', () => {
    it('sets active tab to valid index', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Add 3 tabs
      let state = initial;
      for (let i = 0; i < 3; i++) {
        state = editorAreaReducer(state, {
          type: 'ADD_TAB',
          groupId,
          tab: { uri: `doc${i}.pdf`, title: `Doc ${i}`, viewer: 'pdf' },
        });
      }

      // Set active to index 2
      state = editorAreaReducer(state, {
        type: 'SET_ACTIVE_TAB',
        groupId,
        tabIndex: 2,
      });

      expect(state.groups[groupId].activeIndex).toBe(2);
    });

    it('returns unchanged state for out-of-bounds index', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      let state = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      const next = editorAreaReducer(state, {
        type: 'SET_ACTIVE_TAB',
        groupId,
        tabIndex: 99,
      });

      expect(next).toBe(state);
    });

    it('returns unchanged state for non-existent group', () => {
      const initial = createInitialEditorState();

      const next = editorAreaReducer(initial, {
        type: 'SET_ACTIVE_TAB',
        groupId: 'non-existent',
        tabIndex: 0,
      });

      expect(next).toBe(initial);
    });

    // Issue #36: Negative index validation
    it('returns unchanged state for negative tabIndex', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      let state = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      const next = editorAreaReducer(state, {
        type: 'SET_ACTIVE_TAB',
        groupId,
        tabIndex: -1,
      });

      expect(next).toBe(state); // Should be no-op
    });

    it('returns unchanged state for -Infinity tabIndex', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      let state = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      const next = editorAreaReducer(state, {
        type: 'SET_ACTIVE_TAB',
        groupId,
        tabIndex: -Infinity,
      });

      expect(next).toBe(state); // Should be no-op
    });
  });

  // ============================================================================
  // Category 4: SET_ACTIVE_GROUP
  // ============================================================================

  describe('SET_ACTIVE_GROUP', () => {
    it('sets active group to valid group', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Split to create second group
      const split = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(split.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      // Set active to group 2
      const next = editorAreaReducer(split, {
        type: 'SET_ACTIVE_GROUP',
        groupId: groupId2,
      });

      expect(next.activeGroupId).toBe(groupId2);
    });

    it('returns unchanged state for non-existent group', () => {
      const initial = createInitialEditorState();

      const next = editorAreaReducer(initial, {
        type: 'SET_ACTIVE_GROUP',
        groupId: 'non-existent',
      });

      expect(next).toBe(initial);
    });
  });

  // ============================================================================
  // Category 5: CLOSE_TAB
  // ============================================================================

  describe('CLOSE_TAB', () => {
    it('closes non-active tab and adjusts activeIndex down', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Add 3 tabs
      let state = initial;
      for (let i = 0; i < 3; i++) {
        state = editorAreaReducer(state, {
          type: 'ADD_TAB',
          groupId,
          tab: { uri: `doc${i}.pdf`, title: `Doc ${i}`, viewer: 'pdf' },
        });
      }

      // Set active to index 2
      state = editorAreaReducer(state, {
        type: 'SET_ACTIVE_TAB',
        groupId,
        tabIndex: 2,
      });

      // Close tab at index 0
      state = editorAreaReducer(state, {
        type: 'CLOSE_TAB',
        groupId,
        tabIndex: 0,
      });

      expect(state.groups[groupId].tabs).toHaveLength(2);
      expect(state.groups[groupId].activeIndex).toBe(1); // Was 2, now 1
    });

    it('closes active tab and keeps activeIndex at same position', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Add 3 tabs
      let state = initial;
      for (let i = 0; i < 3; i++) {
        state = editorAreaReducer(state, {
          type: 'ADD_TAB',
          groupId,
          tab: { uri: `doc${i}.pdf`, title: `Doc ${i}`, viewer: 'pdf' },
        });
      }

      // Set active to index 1
      state = editorAreaReducer(state, {
        type: 'SET_ACTIVE_TAB',
        groupId,
        tabIndex: 1,
      });

      // Close active tab
      state = editorAreaReducer(state, {
        type: 'CLOSE_TAB',
        groupId,
        tabIndex: 1,
      });

      expect(state.groups[groupId].tabs).toHaveLength(2);
      expect(state.groups[groupId].activeIndex).toBe(1); // Now points to what was tab 2
    });

    it('closes last remaining tab and closes the group (when other groups exist)', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Split to create two groups
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      // Add tab to group1
      state = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId: groupId1,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      // Close the tab (should close group1 and simplify tree)
      state = editorAreaReducer(state, {
        type: 'CLOSE_TAB',
        groupId: groupId1,
        tabIndex: 0,
      });

      // Group1 should be gone
      expect(state.groups[groupId1]).toBeUndefined();

      // Layout should simplify to single leaf
      expect(state.layout).toEqual({
        type: 'leaf',
        groupId: groupId2,
      });
    });

    it('closes last tab in only group, making group empty (VS Code behavior)', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Add one tab
      let state = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      // Close it
      const next = editorAreaReducer(state, {
        type: 'CLOSE_TAB',
        groupId,
        tabIndex: 0,
      });

      // Group should still exist but be empty
      expect(next.groups[groupId]).toBeDefined();
      expect(next.groups[groupId].tabs).toEqual([]);
      expect(next.groups[groupId].activeIndex).toBe(-1);

      // Layout should be unchanged (still one leaf)
      expect(next.layout).toEqual({ type: 'leaf', groupId });
    });

    it('returns unchanged state for invalid tab index', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      let state = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      const next = editorAreaReducer(state, {
        type: 'CLOSE_TAB',
        groupId,
        tabIndex: 99,
      });

      expect(next).toBe(state);
    });

    it('closes last tab when it is active and clamps activeIndex', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Add 3 tabs
      let state = initial;
      for (let i = 0; i < 3; i++) {
        state = editorAreaReducer(state, {
          type: 'ADD_TAB',
          groupId,
          tab: { uri: `doc${i}.pdf`, title: `Doc ${i}`, viewer: 'pdf' },
        });
      }

      // Set active to last tab (index 2)
      state = editorAreaReducer(state, {
        type: 'SET_ACTIVE_TAB',
        groupId,
        tabIndex: 2,
      });

      expect(state.groups[groupId].activeIndex).toBe(2);

      // Close the last tab (which is active)
      state = editorAreaReducer(state, {
        type: 'CLOSE_TAB',
        groupId,
        tabIndex: 2,
      });

      // Should have 2 tabs remaining
      expect(state.groups[groupId].tabs).toHaveLength(2);
      // activeIndex should be clamped to max valid index (1)
      expect(state.groups[groupId].activeIndex).toBe(1);
      // The now-active tab should be what was previously doc1
      expect(state.groups[groupId].tabs[1].uri).toBe('doc1.pdf');
    });
  });

  // ============================================================================
  // Category 6: SPLIT_GROUP
  // ============================================================================

  describe('SPLIT_GROUP', () => {
    it('splits single group horizontally', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      const next = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      // Should have 2 groups now
      expect(Object.keys(next.groups)).toHaveLength(2);

      // Layout should be a split
      expect(next.layout.type).toBe('split');
      if (next.layout.type === 'split') {
        expect(next.layout.direction).toBe('row');
        expect(next.layout.sizes).toEqual([0.5, 0.5]);
        expect(next.layout.children).toHaveLength(2);

        // First child should be original group
        expect(next.layout.children[0]).toEqual({
          type: 'leaf',
          groupId: groupId1,
        });

        // Second child should be new group
        const secondChild = next.layout.children[1];
        expect(secondChild.type).toBe('leaf');
        if (secondChild.type === 'leaf') {
          const newGroupId = secondChild.groupId;
          expect(newGroupId).toBeTruthy();
          expect(newGroupId).not.toBe(groupId1);

          // New group should be empty
          expect(next.groups[newGroupId].tabs).toEqual([]);
        }
      }
    });

    it('splits single group vertically', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      const next = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'column',
      });

      expect(next.layout.type).toBe('split');
      if (next.layout.type === 'split') {
        expect(next.layout.direction).toBe('column');
      }
    });

    it('splits empty group (VS Code behavior)', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Initial state already has empty group
      expect(initial.groups[groupId].tabs).toEqual([]);

      // Split it
      const next = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'row',
      });

      // Should create split with two empty groups
      expect(next.layout.type).toBe('split');
      expect(Object.keys(next.groups)).toHaveLength(2);

      // Both groups should be empty
      for (const id of Object.keys(next.groups)) {
        expect(next.groups[id].tabs).toEqual([]);
      }
    });

    it('splits already-split group (creates nested structure)', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // First split (horizontal)
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      // Split group1 again (vertical)
      state = editorAreaReducer(state, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'column',
      });

      // Should have 3 groups now
      expect(Object.keys(state.groups)).toHaveLength(3);

      // Layout should have nested split
      expect(state.layout.type).toBe('split');
      if (state.layout.type === 'split') {
        expect(state.layout.direction).toBe('row'); // Outer split
        expect(state.layout.children).toHaveLength(2);

        // First child should now be a nested split
        const firstChild = state.layout.children[0];
        expect(firstChild.type).toBe('split');
        if (firstChild.type === 'split') {
          expect(firstChild.direction).toBe('column');
          expect(firstChild.children).toHaveLength(2);
        }
      }
    });

    it('returns unchanged state when splitting non-existent group', () => {
      const initial = createInitialEditorState();

      const next = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: 'non-existent',
        direction: 'row',
      });

      expect(next).toBe(initial);
    });
  });

  // ============================================================================
  // Category 7: CLOSE_GROUP
  // ============================================================================

  describe('CLOSE_GROUP', () => {
    it('closes group with sibling and simplifies tree', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Split to create two groups
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      // Close group1
      state = editorAreaReducer(state, {
        type: 'CLOSE_GROUP',
        groupId: groupId1,
      });

      // Group1 should be gone
      expect(state.groups[groupId1]).toBeUndefined();

      // Layout should simplify to single leaf
      expect(state.layout).toEqual({
        type: 'leaf',
        groupId: groupId2,
      });
    });

    it('does NOT close last group (prevents empty workspace)', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      const next = editorAreaReducer(initial, {
        type: 'CLOSE_GROUP',
        groupId,
      });

      expect(next).toBe(initial); // Unchanged
    });

    it('closes active group and switches focus to sibling', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Split
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      // Set active to group1
      state = editorAreaReducer(state, {
        type: 'SET_ACTIVE_GROUP',
        groupId: groupId1,
      });

      // Close group1
      state = editorAreaReducer(state, {
        type: 'CLOSE_GROUP',
        groupId: groupId1,
      });

      // Active should switch to group2
      expect(state.activeGroupId).toBe(groupId2);
    });

    it('closes group in nested structure with deep simplification', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Create nested structure:
      // split(row, [split(column, [g1, g2]), g3])
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds1 = Object.keys(state.groups);
      const groupId3 = groupIds1.find((id) => id !== groupId1)!;

      state = editorAreaReducer(state, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'column',
      });

      const groupIds2 = Object.keys(state.groups);
      const groupId2 = groupIds2.find((id) => id !== groupId1 && id !== groupId3)!;

      // Close g2
      state = editorAreaReducer(state, {
        type: 'CLOSE_GROUP',
        groupId: groupId2,
      });

      // Should simplify: inner split removed, left with split(row, [g1, g3])
      expect(Object.keys(state.groups)).toHaveLength(2);
      expect(state.layout.type).toBe('split');

      if (state.layout.type === 'split') {
        expect(state.layout.children).toHaveLength(2);
        // Both children should be leaves now
        expect(state.layout.children[0].type).toBe('leaf');
        expect(state.layout.children[1].type).toBe('leaf');
      }
    });

    it('closes group with 3 siblings', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Create 3 groups in a row
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds1 = Object.keys(state.groups);
      const groupId2 = groupIds1.find((id) => id !== groupId1)!;

      state = editorAreaReducer(state, {
        type: 'SPLIT_GROUP',
        groupId: groupId2,
        direction: 'row',
      });

      const groupIds2 = Object.keys(state.groups);
      const groupId3 = groupIds2.find((id) => id !== groupId1 && id !== groupId2)!;

      // Close middle group (g2)
      state = editorAreaReducer(state, {
        type: 'CLOSE_GROUP',
        groupId: groupId2,
      });

      // Should have 2 groups left
      expect(Object.keys(state.groups)).toHaveLength(2);
      expect(state.groups[groupId1]).toBeDefined();
      expect(state.groups[groupId3]).toBeDefined();
    });

    it('returns unchanged state when closing non-existent group', () => {
      const initial = createInitialEditorState();

      const next = editorAreaReducer(initial, {
        type: 'CLOSE_GROUP',
        groupId: 'non-existent',
      });

      expect(next).toBe(initial);
    });

    // Regression test for split panel display bug (Issue #15)
    // When closing parent split group first, remaining panels must maintain correct orientation
    it('closing parent split group correctly simplifies layout orientation', () => {
      const initial = createInitialEditorState();
      const g1 = Object.keys(initial.groups)[0];

      // Create horizontal split: split(row, [leaf(g1), leaf(g2)])
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: g1,
        direction: 'row',
      });

      const [g2] = Object.keys(state.groups).filter((id) => id !== g1);

      // Create vertical split on right side:
      // split(row, [leaf(g1), split(column, [leaf(g2), leaf(g3)])])
      state = editorAreaReducer(state, {
        type: 'SPLIT_GROUP',
        groupId: g2,
        direction: 'column',
      });

      const allGroups = Object.keys(state.groups);
      const g3 = allGroups.find((id) => id !== g1 && id !== g2)!;

      // Verify initial structure
      expect(state.layout.type).toBe('split');
      if (state.layout.type === 'split') {
        expect(state.layout.direction).toBe('row');
        expect(state.layout.children).toHaveLength(2);
        expect(state.layout.children[0].type).toBe('leaf');
        expect(state.layout.children[1].type).toBe('split');
      }

      // Close left group (g1) - the "parent" split group
      // Expected simplification: split(column, [leaf(g2), leaf(g3)])
      state = editorAreaReducer(state, {
        type: 'CLOSE_GROUP',
        groupId: g1,
      });

      // CRITICAL: Layout should simplify to vertical split (not horizontal!)
      // This is the key assertion that would have caught the rendering bug
      expect(state.layout.type).toBe('split');
      if (state.layout.type === 'split') {
        expect(state.layout.direction).toBe('column'); // ← CRITICAL: must be vertical
        expect(state.layout.children).toHaveLength(2);
        expect(state.layout.children[0].type).toBe('leaf');
        expect(state.layout.children[1].type).toBe('leaf');
        if (state.layout.children[0].type === 'leaf' && state.layout.children[1].type === 'leaf') {
          expect(state.layout.children[0].groupId).toBe(g2);
          expect(state.layout.children[1].groupId).toBe(g3);
        }
      }

      // Only two groups should remain
      expect(Object.keys(state.groups)).toHaveLength(2);
      expect(state.groups[g1]).toBeUndefined();
      expect(state.groups[g2]).toBeDefined();
      expect(state.groups[g3]).toBeDefined();
    });
  });

  // ============================================================================
  // Category 8: MOVE_TAB
  // ============================================================================

  describe('MOVE_TAB', () => {
    it('moves tab between groups', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Split and get second group
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      // Add tabs to group1
      const tab1: DocTabInput = { uri: 'doc1.pdf', title: 'Doc 1', viewer: 'pdf' };
      const tab2: DocTabInput = { uri: 'doc2.pdf', title: 'Doc 2', viewer: 'pdf' };

      state = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId: groupId1,
        tab: tab1,
      });

      state = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId: groupId1,
        tab: tab2,
      });

      // Move tab1 to group2
      state = editorAreaReducer(state, {
        type: 'MOVE_TAB',
        fromGroupId: groupId1,
        toGroupId: groupId2,
        tabIndex: 0,
      });

      expect(state.groups[groupId1].tabs).toHaveLength(1);
      expect(state.groups[groupId1].tabs[0]).toMatchObject(tab2);

      expect(state.groups[groupId2].tabs).toHaveLength(1);
      expect(state.groups[groupId2].tabs[0]).toMatchObject(tab1);
    });

    it('moves tab within same group (reorder)', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Add 3 tabs
      const tabs: DocTabInput[] = [
        { uri: 'doc1.pdf', title: 'Doc 1', viewer: 'pdf' },
        { uri: 'doc2.pdf', title: 'Doc 2', viewer: 'pdf' },
        { uri: 'doc3.pdf', title: 'Doc 3', viewer: 'pdf' },
      ];

      let state = initial;
      for (const tab of tabs) {
        state = editorAreaReducer(state, {
          type: 'ADD_TAB',
          groupId,
          tab,
        });
      }

      // Move tab at index 0 to end
      state = editorAreaReducer(state, {
        type: 'MOVE_TAB',
        fromGroupId: groupId,
        toGroupId: groupId,
        tabIndex: 0,
        toIndex: 2,
      });

      expect(state.groups[groupId].tabs[0]).toMatchObject(tabs[1]);
      expect(state.groups[groupId].tabs[1]).toMatchObject(tabs[2]);
      expect(state.groups[groupId].tabs[2]).toMatchObject(tabs[0]);
    });

    it('returns unchanged state for invalid indices', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      let state = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      const next = editorAreaReducer(state, {
        type: 'MOVE_TAB',
        fromGroupId: groupId,
        toGroupId: groupId,
        tabIndex: 99,
      });

      expect(next).toBe(state);
    });

    it('sets new group active when moving first tab to empty group', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Split and get second group
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      // Add tab to group1
      state = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId: groupId1,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      // Verify group2 is empty with activeIndex -1
      expect(state.groups[groupId2].tabs).toHaveLength(0);
      expect(state.groups[groupId2].activeIndex).toBe(-1);

      // Move tab to empty group2
      state = editorAreaReducer(state, {
        type: 'MOVE_TAB',
        fromGroupId: groupId1,
        toGroupId: groupId2,
        tabIndex: 0,
      });

      // Group2 should now have activeIndex 0 (first tab becomes active)
      expect(state.groups[groupId2].tabs).toHaveLength(1);
      expect(state.groups[groupId2].activeIndex).toBe(0);
    });

    // Issue #34: State persistence tests
    it('preserves tab state when moving between groups', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      // Add tab with state
      state = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId: groupId1,
        tab: {
          uri: 'doc.pdf',
          title: 'Doc',
          viewer: 'pdf',
          state: { page: 42, zoom: 1.5 },
        },
      });

      // Move to other group
      state = editorAreaReducer(state, {
        type: 'MOVE_TAB',
        fromGroupId: groupId1,
        toGroupId: groupId2,
        tabIndex: 0,
      });

      // State should be preserved
      expect(state.groups[groupId2].tabs[0].state).toEqual({ page: 42, zoom: 1.5 });
    });

    it('preserves tab state when reordering within same group', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Add tabs with different states
      const tabs: DocTabInput[] = [
        { uri: 'doc1.pdf', title: 'Doc 1', viewer: 'pdf', state: { page: 1, zoom: 1.0 } },
        { uri: 'doc2.pdf', title: 'Doc 2', viewer: 'pdf', state: { page: 5, zoom: 1.5 } },
        { uri: 'doc3.pdf', title: 'Doc 3', viewer: 'pdf', state: { page: 10, zoom: 2.0 } },
      ];

      let state = initial;
      for (const tab of tabs) {
        state = editorAreaReducer(state, {
          type: 'ADD_TAB',
          groupId,
          tab,
        });
      }

      // Move tab with state from index 1 to index 0
      state = editorAreaReducer(state, {
        type: 'MOVE_TAB',
        fromGroupId: groupId,
        toGroupId: groupId,
        tabIndex: 1,
        toIndex: 0,
      });

      // State should be preserved and at new position
      expect(state.groups[groupId].tabs[0].state).toEqual({ page: 5, zoom: 1.5 });
      expect(state.groups[groupId].tabs[0].uri).toBe('doc2.pdf');
    });

    // Issue #35: Active tab movement tests
    it('adjusts source group activeIndex when moving the active tab', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Split to create two groups
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      // Add 3 tabs to group1
      for (let i = 0; i < 3; i++) {
        state = editorAreaReducer(state, {
          type: 'ADD_TAB',
          groupId: groupId1,
          tab: { uri: `doc${i}.pdf`, title: `Doc ${i}`, viewer: 'pdf' },
        });
      }

      // Set active to middle tab (index 1)
      state = editorAreaReducer(state, {
        type: 'SET_ACTIVE_TAB',
        groupId: groupId1,
        tabIndex: 1,
      });

      // Move the active tab to group2
      state = editorAreaReducer(state, {
        type: 'MOVE_TAB',
        fromGroupId: groupId1,
        toGroupId: groupId2,
        tabIndex: 1,
      });

      // Source group should still have a valid activeIndex
      expect(state.groups[groupId1].tabs).toHaveLength(2);
      expect(state.groups[groupId1].activeIndex).toBe(1); // Points to what was doc2

      // Target group should activate the moved tab
      expect(state.groups[groupId2].tabs).toHaveLength(1);
      expect(state.groups[groupId2].activeIndex).toBe(0);
    });

    // CRITICAL: Test activeIndex tracking when reordering active tab
    it('updates activeIndex when reordering active tab within same group', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      const tabs: DocTabInput[] = [
        { uri: 'doc1.pdf', title: 'A', viewer: 'pdf' },
        { uri: 'doc2.pdf', title: 'B', viewer: 'pdf' },
        { uri: 'doc3.pdf', title: 'C', viewer: 'pdf' },
      ];

      let state = initial;
      for (const tab of tabs) {
        state = editorAreaReducer(state, {
          type: 'ADD_TAB',
          groupId,
          tab,
        });
      }

      // Active is at index 0 (tab A)
      expect(state.groups[groupId].activeIndex).toBe(0);

      // Move active tab (A) from position 0 to position 2
      state = editorAreaReducer(state, {
        type: 'MOVE_TAB',
        fromGroupId: groupId,
        toGroupId: groupId,
        tabIndex: 0,
        toIndex: 2,
      });

      // Active tab A should still be active (now at index 2)
      expect(state.groups[groupId].activeIndex).toBe(2);
      expect(state.groups[groupId].tabs[2].uri).toBe('doc1.pdf');
      expect(state.groups[groupId].tabs[0].uri).toBe('doc2.pdf');
      expect(state.groups[groupId].tabs[1].uri).toBe('doc3.pdf');
    });

    it('updates activeIndex when moving non-active tab before active tab', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Add 3 tabs
      let state = initial;
      for (let i = 0; i < 3; i++) {
        state = editorAreaReducer(state, {
          type: 'ADD_TAB',
          groupId,
          tab: { uri: `doc${i}.pdf`, title: `Doc ${i}`, viewer: 'pdf' },
        });
      }

      // Set active to index 2
      state = editorAreaReducer(state, {
        type: 'SET_ACTIVE_TAB',
        groupId,
        tabIndex: 2,
      });

      // Move tab from index 0 to index 1 (shifts active tab's position)
      state = editorAreaReducer(state, {
        type: 'MOVE_TAB',
        fromGroupId: groupId,
        toGroupId: groupId,
        tabIndex: 0,
        toIndex: 1,
      });

      // Active tab (originally at index 2) should still be active
      // When moving a non-active tab, the active tab's index and data remain unchanged
      expect(state.groups[groupId].tabs[2].uri).toBe('doc2.pdf');
      expect(state.groups[groupId].activeIndex).toBe(2);
    });
  });

  // ============================================================================
  // Category 9: Immutability
  // ============================================================================

  describe('Immutability', () => {
    it('does not mutate original state', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];
      const initialCopy = JSON.parse(JSON.stringify(initial));

      editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      // Original should be unchanged
      expect(initial).toEqual(initialCopy);
    });

    it('preserves unchanged branches (structural sharing)', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Split to create two groups
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      const group2Ref = state.groups[groupId2];

      // Add tab to group1 only
      const next = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId: groupId1,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      // Group2 should be same reference (unchanged)
      expect(next.groups[groupId2]).toBe(group2Ref);
    });

    it('creates new references for changed nested objects', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      const next = editorAreaReducer(initial, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      // State, groups, and the specific group should all be new objects
      expect(next).not.toBe(initial);
      expect(next.groups).not.toBe(initial.groups);
      expect(next.groups[groupId]).not.toBe(initial.groups[groupId]);
    });
  });

  // ============================================================================
  // Category 10: Tree Invariants
  // ============================================================================

  describe('Tree Invariants', () => {
    it('all leaf nodes reference existing groups', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Create complex structure
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const _groupId2 = groupIds.find((id) => id !== groupId)!;

      state = editorAreaReducer(state, {
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'column',
      });

      // Extract all groupIds from leaves
      const extractLeafGroupIds = (tree: LayoutTree): string[] => {
        if (tree.type === 'leaf') {
          return [tree.groupId];
        }
        return tree.children.flatMap(extractLeafGroupIds);
      };

      const leafGroupIds = extractLeafGroupIds(state.layout);

      // All should exist in groups Record
      for (const id of leafGroupIds) {
        expect(state.groups[id]).toBeDefined();
      }
    });

    it('all groups are referenced by exactly one leaf', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'row',
      });

      // Count leaf references
      const countLeafReferences = (tree: LayoutTree): Record<string, number> => {
        if (tree.type === 'leaf') {
          return { [tree.groupId]: 1 };
        }
        return tree.children.reduce(
          (acc, child) => {
            const childCounts = countLeafReferences(child);
            for (const [id, count] of Object.entries(childCounts)) {
              acc[id] = (acc[id] || 0) + count;
            }
            return acc;
          },
          {} as Record<string, number>
        );
      };

      const refCounts = countLeafReferences(state.layout);
      const groupIds = Object.keys(state.groups);

      // Each group should be referenced exactly once
      for (const id of groupIds) {
        expect(refCounts[id]).toBe(1);
      }

      // No extra references
      expect(Object.keys(refCounts).length).toBe(groupIds.length);
    });

    it('no split nodes with fewer than 2 children', () => {
      const initial = createInitialEditorState();
      const groupId1 = Object.keys(initial.groups)[0];

      // Create and then simplify a structure
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId: groupId1,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId1)!;

      // Close one group (should simplify)
      state = editorAreaReducer(state, {
        type: 'CLOSE_GROUP',
        groupId: groupId2,
      });

      // Verify no invalid splits
      const validateTree = (tree: LayoutTree): boolean => {
        if (tree.type === 'leaf') return true;
        if (tree.children.length < 2) return false;
        if (tree.sizes.length !== tree.children.length) return false;
        return tree.children.every(validateTree);
      };

      expect(validateTree(state.layout)).toBe(true);
    });

    it('all split nodes have unique IDs', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Create complex nested structure
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'row',
      });

      const groupIds = Object.keys(state.groups);
      const groupId2 = groupIds.find((id) => id !== groupId)!;

      state = editorAreaReducer(state, {
        type: 'SPLIT_GROUP',
        groupId: groupId2,
        direction: 'column',
      });

      // Collect all split node IDs
      const collectSplitIds = (tree: LayoutTree): string[] => {
        if (tree.type === 'leaf') return [];
        return [tree.id, ...tree.children.flatMap(collectSplitIds)];
      };

      const splitIds = collectSplitIds(state.layout);

      // All IDs should be unique
      const uniqueIds = new Set(splitIds);
      expect(uniqueIds.size).toBe(splitIds.length);

      // All IDs should be truthy (non-empty strings)
      expect(splitIds.every((id) => id && id.length > 0)).toBe(true);
    });

    it('split node IDs remain stable across unrelated actions', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      // Create split
      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'row',
      });

      // Capture the split node ID
      const splitNode = state.layout;
      if (splitNode.type !== 'split') {
        throw new Error('Expected split node');
      }
      const originalSplitId = splitNode.id;

      // Perform unrelated action (add tab)
      state = editorAreaReducer(state, {
        type: 'ADD_TAB',
        groupId,
        tab: { uri: 'doc.pdf', title: 'Doc', viewer: 'pdf' },
      });

      // Split node ID should remain unchanged
      const updatedSplitNode = state.layout;
      if (updatedSplitNode.type !== 'split') {
        throw new Error('Expected split node');
      }
      expect(updatedSplitNode.id).toBe(originalSplitId);
    });

    it('split node IDs are RFC 4122 UUIDs', () => {
      const initial = createInitialEditorState();
      const groupId = Object.keys(initial.groups)[0];

      let state = editorAreaReducer(initial, {
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'row',
      });

      const splitNode = state.layout;
      if (splitNode.type !== 'split') {
        throw new Error('Expected split node');
      }

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where y is one of [8, 9, a, b]
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(splitNode.id).toMatch(uuidRegex);
    });
  });
});
