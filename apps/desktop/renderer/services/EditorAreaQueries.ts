import type { LayoutTree, LeafNode } from '@vspdf/types';

/**
 * EditorAreaQueries - Read-only utilities for tree traversal
 *
 * These are PURE FUNCTIONS with no side effects or state mutations.
 * They provide a clean API for querying the editor layout tree without
 * coupling to reducer implementation details.
 *
 * Design principles:
 * - Pure functions: Same input → Same output
 * - No mutations: Tree is never modified
 * - Easily testable: No mocks or context needed
 * - Efficient: Single-pass algorithms where possible
 */

/**
 * Find leaf node containing a specific group ID
 *
 * @param tree - Layout tree to search
 * @param groupId - Group ID to find
 * @returns Leaf node if found, null otherwise
 *
 * @example
 * const leaf = findGroupById(state.layout, 'g1');
 * if (leaf) {
 *   console.log('Found group:', leaf.groupId);
 * }
 */
export function findGroupById(tree: LayoutTree, groupId: string): LeafNode | null {
  if (tree.type === 'leaf') {
    return tree.groupId === groupId ? tree : null;
  }

  // Depth-first search through split node children
  for (const child of tree.children) {
    const result = findGroupById(child, groupId);
    if (result) return result;
  }

  return null;
}

/**
 * Get all group IDs in the tree (depth-first order)
 *
 * @param tree - Layout tree to traverse
 * @returns Array of group IDs in depth-first order
 *
 * @example
 * const ids = getAllGroupIds(state.layout);
 * console.log('Total groups:', ids.length);
 */
export function getAllGroupIds(tree: LayoutTree): string[] {
  if (tree.type === 'leaf') {
    return [tree.groupId];
  }

  // Flatten all children recursively
  return tree.children.flatMap((child) => getAllGroupIds(child));
}

/**
 * Get next group ID for keyboard navigation (right/down)
 *
 * Wraps around to first group if at end. Returns null if only one group.
 *
 * @param tree - Layout tree
 * @param currentId - Current group ID
 * @returns Next group ID, or null if navigation not possible
 *
 * @example
 * const next = getNextGroupId(state.layout, state.activeGroupId);
 * if (next) focusGroup(next);
 */
export function getNextGroupId(tree: LayoutTree, currentId: string): string | null {
  const ids = getAllGroupIds(tree);

  // Need at least 2 groups to navigate
  if (ids.length < 2) return null;

  const currentIndex = ids.indexOf(currentId);

  // Current not found - shouldn't happen, but be defensive
  if (currentIndex === -1) return ids[0];

  // Wrap around to start
  if (currentIndex === ids.length - 1) {
    return ids[0];
  }

  return ids[currentIndex + 1];
}

/**
 * Get previous group ID for keyboard navigation (left/up)
 *
 * Wraps around to last group if at beginning. Returns null if only one group.
 *
 * @param tree - Layout tree
 * @param currentId - Current group ID
 * @returns Previous group ID, or null if navigation not possible
 *
 * @example
 * const prev = getPrevGroupId(state.layout, state.activeGroupId);
 * if (prev) focusGroup(prev);
 */
export function getPrevGroupId(tree: LayoutTree, currentId: string): string | null {
  const ids = getAllGroupIds(tree);

  // Need at least 2 groups to navigate
  if (ids.length < 2) return null;

  const currentIndex = ids.indexOf(currentId);

  // Current not found - shouldn't happen, but be defensive
  if (currentIndex === -1) return ids[ids.length - 1];

  // Wrap around to end
  if (currentIndex === 0) {
    return ids[ids.length - 1];
  }

  return ids[currentIndex - 1];
}

/**
 * Check if a group exists in the tree
 *
 * @param tree - Layout tree
 * @param groupId - Group ID to check
 * @returns True if group exists
 *
 * @example
 * if (hasGroup(state.layout, targetGroup)) {
 *   focusGroup(targetGroup);
 * }
 */
export function hasGroup(tree: LayoutTree, groupId: string): boolean {
  return findGroupById(tree, groupId) !== null;
}

/**
 * Count total number of groups in the tree
 *
 * @param tree - Layout tree
 * @returns Number of groups
 *
 * @example
 * const count = getGroupCount(state.layout);
 * if (count === 1) {
 *   // Last group - don't allow close
 * }
 */
export function getGroupCount(tree: LayoutTree): number {
  return getAllGroupIds(tree).length;
}
