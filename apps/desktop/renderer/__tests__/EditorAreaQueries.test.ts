import { describe, it, expect } from 'vitest';
import {
  findGroupById,
  getAllGroupIds,
  getNextGroupId,
  getPrevGroupId,
  hasGroup,
  getGroupCount,
} from '../services/EditorAreaQueries';
import type { LayoutTree, LeafNode, SplitNode } from '@vspdf/types';

describe('EditorAreaQueries', () => {
  // ============================================================================
  // Test Fixtures
  // ============================================================================

  const createLeaf = (groupId: string): LeafNode => ({
    type: 'leaf',
    groupId,
  });

  const createRow = (children: LayoutTree[], sizes: number[] = []): SplitNode => ({
    type: 'split',
    id: `split-${Math.random()}`,
    direction: 'row',
    sizes: sizes.length ? sizes : children.map(() => 1 / children.length),
    children,
  });

  const createColumn = (children: LayoutTree[], sizes: number[] = []): SplitNode => ({
    type: 'split',
    id: `split-${Math.random()}`,
    direction: 'column',
    sizes: sizes.length ? sizes : children.map(() => 1 / children.length),
    children,
  });

  // Single leaf
  const singleLeaf: LayoutTree = createLeaf('g1');

  // Two groups: g1 | g2 (vertical split)
  const twoGroups: LayoutTree = createRow([createLeaf('g1'), createLeaf('g2')]);

  // Three groups in a row: g1 | g2 | g3
  const threeGroups: LayoutTree = createRow([
    createLeaf('g1'),
    createLeaf('g2'),
    createLeaf('g3'),
  ]);

  // Nested: (g1 | g2) / g3 (row inside column)
  const nestedSplit: LayoutTree = createColumn([
    createRow([createLeaf('g1'), createLeaf('g2')]),
    createLeaf('g3'),
  ]);

  // Complex: ((g1 | g2) / g3) | g4
  const complexSplit: LayoutTree = createRow([
    createColumn([createRow([createLeaf('g1'), createLeaf('g2')]), createLeaf('g3')]),
    createLeaf('g4'),
  ]);

  // ============================================================================
  // findGroupById
  // ============================================================================

  describe('findGroupById', () => {
    it('should find leaf in single-leaf tree', () => {
      const result = findGroupById(singleLeaf, 'g1');
      expect(result).toEqual({ type: 'leaf', groupId: 'g1' });
    });

    it('should return null for non-existent group in single-leaf tree', () => {
      const result = findGroupById(singleLeaf, 'g999');
      expect(result).toBeNull();
    });

    it('should find first group in two-group split', () => {
      const result = findGroupById(twoGroups, 'g1');
      expect(result).toEqual({ type: 'leaf', groupId: 'g1' });
    });

    it('should find second group in two-group split', () => {
      const result = findGroupById(twoGroups, 'g2');
      expect(result).toEqual({ type: 'leaf', groupId: 'g2' });
    });

    it('should find groups in nested split', () => {
      expect(findGroupById(nestedSplit, 'g1')).toEqual({ type: 'leaf', groupId: 'g1' });
      expect(findGroupById(nestedSplit, 'g2')).toEqual({ type: 'leaf', groupId: 'g2' });
      expect(findGroupById(nestedSplit, 'g3')).toEqual({ type: 'leaf', groupId: 'g3' });
    });

    it('should find groups in complex split', () => {
      expect(findGroupById(complexSplit, 'g1')).toEqual({ type: 'leaf', groupId: 'g1' });
      expect(findGroupById(complexSplit, 'g2')).toEqual({ type: 'leaf', groupId: 'g2' });
      expect(findGroupById(complexSplit, 'g3')).toEqual({ type: 'leaf', groupId: 'g3' });
      expect(findGroupById(complexSplit, 'g4')).toEqual({ type: 'leaf', groupId: 'g4' });
    });

    it('should return null for non-existent group', () => {
      expect(findGroupById(twoGroups, 'g999')).toBeNull();
      expect(findGroupById(nestedSplit, 'g999')).toBeNull();
      expect(findGroupById(complexSplit, 'g999')).toBeNull();
    });
  });

  // ============================================================================
  // getAllGroupIds
  // ============================================================================

  describe('getAllGroupIds', () => {
    it('should return single ID for single-leaf tree', () => {
      const result = getAllGroupIds(singleLeaf);
      expect(result).toEqual(['g1']);
    });

    it('should return two IDs in depth-first order', () => {
      const result = getAllGroupIds(twoGroups);
      expect(result).toEqual(['g1', 'g2']);
    });

    it('should return three IDs in depth-first order', () => {
      const result = getAllGroupIds(threeGroups);
      expect(result).toEqual(['g1', 'g2', 'g3']);
    });

    it('should return IDs in depth-first order for nested split', () => {
      const result = getAllGroupIds(nestedSplit);
      // Top row (g1, g2), then bottom (g3)
      expect(result).toEqual(['g1', 'g2', 'g3']);
    });

    it('should return IDs in depth-first order for complex split', () => {
      const result = getAllGroupIds(complexSplit);
      // Left column: (g1, g2), g3, then right: g4
      expect(result).toEqual(['g1', 'g2', 'g3', 'g4']);
    });
  });

  // ============================================================================
  // getNextGroupId
  // ============================================================================

  describe('getNextGroupId', () => {
    it('should return null for single-leaf tree', () => {
      const result = getNextGroupId(singleLeaf, 'g1');
      expect(result).toBeNull();
    });

    it('should return next ID in two-group split', () => {
      expect(getNextGroupId(twoGroups, 'g1')).toBe('g2');
    });

    it('should wrap around at end', () => {
      expect(getNextGroupId(twoGroups, 'g2')).toBe('g1');
    });

    it('should navigate through three groups with wraparound', () => {
      expect(getNextGroupId(threeGroups, 'g1')).toBe('g2');
      expect(getNextGroupId(threeGroups, 'g2')).toBe('g3');
      expect(getNextGroupId(threeGroups, 'g3')).toBe('g1'); // Wrap
    });

    it('should return first ID when current not found', () => {
      const result = getNextGroupId(twoGroups, 'g999');
      expect(result).toBe('g1'); // Defensive: return first
    });

    it('should handle nested splits', () => {
      expect(getNextGroupId(nestedSplit, 'g1')).toBe('g2');
      expect(getNextGroupId(nestedSplit, 'g2')).toBe('g3');
      expect(getNextGroupId(nestedSplit, 'g3')).toBe('g1'); // Wrap
    });
  });

  // ============================================================================
  // getPrevGroupId
  // ============================================================================

  describe('getPrevGroupId', () => {
    it('should return null for single-leaf tree', () => {
      const result = getPrevGroupId(singleLeaf, 'g1');
      expect(result).toBeNull();
    });

    it('should return previous ID in two-group split', () => {
      expect(getPrevGroupId(twoGroups, 'g2')).toBe('g1');
    });

    it('should wrap around at beginning', () => {
      expect(getPrevGroupId(twoGroups, 'g1')).toBe('g2');
    });

    it('should navigate backwards through three groups with wraparound', () => {
      expect(getPrevGroupId(threeGroups, 'g3')).toBe('g2');
      expect(getPrevGroupId(threeGroups, 'g2')).toBe('g1');
      expect(getPrevGroupId(threeGroups, 'g1')).toBe('g3'); // Wrap
    });

    it('should return last ID when current not found', () => {
      const result = getPrevGroupId(twoGroups, 'g999');
      expect(result).toBe('g2'); // Defensive: return last
    });

    it('should handle nested splits', () => {
      expect(getPrevGroupId(nestedSplit, 'g3')).toBe('g2');
      expect(getPrevGroupId(nestedSplit, 'g2')).toBe('g1');
      expect(getPrevGroupId(nestedSplit, 'g1')).toBe('g3'); // Wrap
    });
  });

  // ============================================================================
  // hasGroup
  // ============================================================================

  describe('hasGroup', () => {
    it('should return true for existing group in single-leaf', () => {
      expect(hasGroup(singleLeaf, 'g1')).toBe(true);
    });

    it('should return false for non-existent group in single-leaf', () => {
      expect(hasGroup(singleLeaf, 'g999')).toBe(false);
    });

    it('should return true for both groups in two-group split', () => {
      expect(hasGroup(twoGroups, 'g1')).toBe(true);
      expect(hasGroup(twoGroups, 'g2')).toBe(true);
    });

    it('should return false for non-existent group in two-group split', () => {
      expect(hasGroup(twoGroups, 'g999')).toBe(false);
    });

    it('should work with nested splits', () => {
      expect(hasGroup(nestedSplit, 'g1')).toBe(true);
      expect(hasGroup(nestedSplit, 'g2')).toBe(true);
      expect(hasGroup(nestedSplit, 'g3')).toBe(true);
      expect(hasGroup(nestedSplit, 'g999')).toBe(false);
    });

    it('should work with complex splits', () => {
      expect(hasGroup(complexSplit, 'g1')).toBe(true);
      expect(hasGroup(complexSplit, 'g2')).toBe(true);
      expect(hasGroup(complexSplit, 'g3')).toBe(true);
      expect(hasGroup(complexSplit, 'g4')).toBe(true);
      expect(hasGroup(complexSplit, 'g999')).toBe(false);
    });
  });

  // ============================================================================
  // getGroupCount
  // ============================================================================

  describe('getGroupCount', () => {
    it('should return 1 for single-leaf tree', () => {
      expect(getGroupCount(singleLeaf)).toBe(1);
    });

    it('should return 2 for two-group split', () => {
      expect(getGroupCount(twoGroups)).toBe(2);
    });

    it('should return 3 for three-group split', () => {
      expect(getGroupCount(threeGroups)).toBe(3);
    });

    it('should return 3 for nested split', () => {
      expect(getGroupCount(nestedSplit)).toBe(3);
    });

    it('should return 4 for complex split', () => {
      expect(getGroupCount(complexSplit)).toBe(4);
    });
  });

  // ============================================================================
  // Edge Cases & Integration
  // ============================================================================

  describe('edge cases', () => {
    it('navigation should wrap correctly for even-numbered groups', () => {
      // Forward: g1 → g2 → g1
      expect(getNextGroupId(twoGroups, 'g1')).toBe('g2');
      expect(getNextGroupId(twoGroups, 'g2')).toBe('g1');

      // Backward: g2 → g1 → g2
      expect(getPrevGroupId(twoGroups, 'g2')).toBe('g1');
      expect(getPrevGroupId(twoGroups, 'g1')).toBe('g2');
    });

    it('navigation should wrap correctly for odd-numbered groups', () => {
      // Forward: g1 → g2 → g3 → g1
      expect(getNextGroupId(threeGroups, 'g1')).toBe('g2');
      expect(getNextGroupId(threeGroups, 'g2')).toBe('g3');
      expect(getNextGroupId(threeGroups, 'g3')).toBe('g1');

      // Backward: g3 → g2 → g1 → g3
      expect(getPrevGroupId(threeGroups, 'g3')).toBe('g2');
      expect(getPrevGroupId(threeGroups, 'g2')).toBe('g1');
      expect(getPrevGroupId(threeGroups, 'g1')).toBe('g3');
    });

    it('should maintain consistency between findGroupById and hasGroup', () => {
      const trees = [singleLeaf, twoGroups, nestedSplit, complexSplit];
      const testIds = ['g1', 'g2', 'g3', 'g4', 'g999'];

      trees.forEach((tree) => {
        testIds.forEach((id) => {
          const found = findGroupById(tree, id);
          const exists = hasGroup(tree, id);
          expect(exists).toBe(found !== null);
        });
      });
    });

    it('should maintain consistency between getAllGroupIds and getGroupCount', () => {
      const trees = [singleLeaf, twoGroups, threeGroups, nestedSplit, complexSplit];

      trees.forEach((tree) => {
        const ids = getAllGroupIds(tree);
        const count = getGroupCount(tree);
        expect(count).toBe(ids.length);
      });
    });

    it('should have no duplicate IDs in getAllGroupIds', () => {
      const trees = [twoGroups, threeGroups, nestedSplit, complexSplit];

      trees.forEach((tree) => {
        const ids = getAllGroupIds(tree);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });
  });
});
