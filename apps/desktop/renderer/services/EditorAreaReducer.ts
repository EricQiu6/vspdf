import type {
  EditorAreaState,
  EditorAction,
  EditorGroupState,
  LayoutTree,
  SplitNode,
  LeafNode,
} from '@vspdf/types';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generates a unique group ID using crypto.randomUUID
 */
function generateGroupId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Represents a path to a node in the tree
 */
type NodePath = number[];

/**
 * Finds the path to a leaf node by groupId
 * Returns null if not found
 */
function findLeafPath(tree: LayoutTree, groupId: string, path: NodePath = []): NodePath | null {
  if (tree.type === 'leaf') {
    return tree.groupId === groupId ? path : null;
  }

  for (let i = 0; i < tree.children.length; i++) {
    const result = findLeafPath(tree.children[i], groupId, [...path, i]);
    if (result !== null) {
      return result;
    }
  }

  return null;
}

/**
 * Replaces a node at the given path with a new node
 */
function replaceNodeAtPath(tree: LayoutTree, path: NodePath, newNode: LayoutTree): LayoutTree {
  if (path.length === 0) {
    return newNode;
  }

  if (tree.type === 'leaf') {
    throw new Error('Cannot traverse into leaf node');
  }

  const [index, ...rest] = path;
  return {
    ...tree,
    children: tree.children.map((child, i) =>
      i === index ? replaceNodeAtPath(child, rest, newNode) : child
    ),
  };
}

/**
 * Removes a node at the given path and returns the updated tree
 */
function removeNodeAtPath(tree: LayoutTree, path: NodePath): LayoutTree | null {
  if (path.length === 0) {
    // Removing root node
    return null;
  }

  if (path.length === 1) {
    if (tree.type === 'leaf') {
      throw new Error('Cannot remove from leaf node');
    }

    const [index] = path;
    const newChildren = tree.children.filter((_, i) => i !== index);

    if (newChildren.length === 0) {
      return null;
    }

    if (newChildren.length === 1) {
      // Simplify: return the single child
      return newChildren[0];
    }

    // Adjust sizes to maintain proportions
    const newSizes = tree.sizes.filter((_, i) => i !== index);
    const sum = newSizes.reduce((a, b) => a + b, 0);
    const normalizedSizes = newSizes.map((s) => s / sum);

    return {
      ...tree,
      children: newChildren,
      sizes: normalizedSizes,
    };
  }

  // Recursively remove from child
  if (tree.type === 'leaf') {
    throw new Error('Cannot traverse into leaf node');
  }

  const [index, ...rest] = path;
  const updatedChild = removeNodeAtPath(tree.children[index], rest);

  if (updatedChild === null) {
    // Child was removed completely, remove from parent
    return removeNodeAtPath(tree, [index]);
  }

  return {
    ...tree,
    children: tree.children.map((child, i) => (i === index ? updatedChild : child)),
  };
}

/**
 * Recursively simplifies the tree by removing split nodes with single children
 */
function simplifyTree(tree: LayoutTree): LayoutTree {
  if (tree.type === 'leaf') {
    return tree;
  }

  // First simplify all children
  const simplifiedChildren = tree.children.map(simplifyTree);

  // If only one child remains, return it directly
  if (simplifiedChildren.length === 1) {
    return simplifiedChildren[0];
  }

  return {
    ...tree,
    children: simplifiedChildren,
  };
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Creates the initial EditorArea state with one empty group
 */
export function createInitialEditorState(): EditorAreaState {
  const groupId = generateGroupId();

  return {
    layout: {
      type: 'leaf',
      groupId,
    },
    groups: {
      [groupId]: {
        id: groupId,
        tabs: [],
        activeIndex: -1,
      },
    },
    activeGroupId: groupId,
  };
}

// ============================================================================
// Reducer
// ============================================================================

/**
 * Main reducer function for EditorArea state management
 * Pure function: does not mutate input, returns new state
 */
export function editorAreaReducer(state: EditorAreaState, action: EditorAction): EditorAreaState {
  switch (action.type) {
    case 'ADD_TAB': {
      const { groupId, tab } = action;

      // Validate group exists
      if (!state.groups[groupId]) {
        return state;
      }

      const group = state.groups[groupId];

      // Check if tab with this URI already exists in this group
      const existingIndex = group.tabs.findIndex((t) => t.uri === tab.uri);
      if (existingIndex >= 0) {
        // Switch to existing tab instead of adding duplicate
        return {
          ...state,
          groups: {
            ...state.groups,
            [groupId]: {
              ...group,
              activeIndex: existingIndex,
            },
          },
        };
      }

      // Generate unique ID for new tab
      const newTab = {
        ...tab,
        id: generateGroupId(), // Reuse UUID generator
      };

      const newTabs = [...group.tabs, newTab];
      const newActiveIndex = group.activeIndex === -1 ? 0 : group.activeIndex;

      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...group,
            tabs: newTabs,
            activeIndex: newActiveIndex,
          },
        },
      };
    }

    case 'SET_ACTIVE_TAB': {
      const { groupId, tabIndex } = action;

      // Validate group exists
      if (!state.groups[groupId]) {
        return state;
      }

      const group = state.groups[groupId];

      // Validate index
      if (tabIndex < 0 || tabIndex >= group.tabs.length) {
        return state;
      }

      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...group,
            activeIndex: tabIndex,
          },
        },
      };
    }

    case 'SET_ACTIVE_GROUP': {
      const { groupId } = action;

      // Validate group exists
      if (!state.groups[groupId]) {
        return state;
      }

      return {
        ...state,
        activeGroupId: groupId,
      };
    }

    case 'CLOSE_TAB': {
      const { groupId, tabIndex } = action;

      // Validate group exists
      if (!state.groups[groupId]) {
        return state;
      }

      const group = state.groups[groupId];

      // Validate index
      if (tabIndex < 0 || tabIndex >= group.tabs.length) {
        return state;
      }

      // If closing last tab
      if (group.tabs.length === 1) {
        const groupIds = Object.keys(state.groups);

        if (groupIds.length === 1) {
          // Last tab in only group: make group empty (like VS Code)
          return {
            ...state,
            groups: {
              ...state.groups,
              [groupId]: {
                ...group,
                tabs: [],
                activeIndex: -1,
              },
            },
          };
        } else {
          // Last tab in non-only group: close the group
          return editorAreaReducer(state, {
            type: 'CLOSE_GROUP',
            groupId,
          });
        }
      }

      // Remove tab
      const newTabs = group.tabs.filter((_, i) => i !== tabIndex);

      // Adjust activeIndex
      let newActiveIndex = group.activeIndex;
      if (tabIndex < group.activeIndex) {
        newActiveIndex--;
      } else if (tabIndex === group.activeIndex) {
        // Keep index at same position (will now point to next tab)
        // But clamp to valid range
        if (newActiveIndex >= newTabs.length) {
          newActiveIndex = newTabs.length - 1;
        }
      }

      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...group,
            tabs: newTabs,
            activeIndex: newActiveIndex,
          },
        },
      };
    }

    case 'SPLIT_GROUP': {
      const { groupId, direction } = action;

      // Validate group exists
      const path = findLeafPath(state.layout, groupId);
      if (path === null) {
        return state;
      }

      // Create new group
      const newGroupId = generateGroupId();
      const newGroup: EditorGroupState = {
        id: newGroupId,
        tabs: [],
        activeIndex: -1,
      };

      // Create split node
      const originalLeaf: LeafNode = { type: 'leaf', groupId };
      const newLeaf: LeafNode = { type: 'leaf', groupId: newGroupId };

      const splitNode: SplitNode = {
        type: 'split',
        direction,
        sizes: [0.5, 0.5],
        children: [originalLeaf, newLeaf],
      };

      // Replace the original leaf with the split
      const newLayout = replaceNodeAtPath(state.layout, path, splitNode);

      return {
        ...state,
        layout: newLayout,
        groups: {
          ...state.groups,
          [newGroupId]: newGroup,
        },
      };
    }

    case 'CLOSE_GROUP': {
      const { groupId } = action;

      // Cannot close if it's the only group
      const groupIds = Object.keys(state.groups);
      if (groupIds.length === 1) {
        return state;
      }

      // Validate group exists
      const path = findLeafPath(state.layout, groupId);
      if (path === null) {
        return state;
      }

      // Remove from layout
      let newLayout = removeNodeAtPath(state.layout, path);
      if (newLayout === null) {
        // Should not happen if we validated length > 1
        return state;
      }

      // Simplify tree
      newLayout = simplifyTree(newLayout);

      // Remove from groups
      const newGroups = { ...state.groups };
      delete newGroups[groupId];

      // Update active group if needed
      let newActiveGroupId = state.activeGroupId;
      if (newActiveGroupId === groupId) {
        // Switch to any remaining group
        newActiveGroupId = Object.keys(newGroups)[0];
      }

      return {
        layout: newLayout,
        groups: newGroups,
        activeGroupId: newActiveGroupId,
      };
    }

    case 'MOVE_TAB': {
      const { fromGroupId, toGroupId, tabIndex, toIndex } = action;

      // Validate groups exist
      if (!state.groups[fromGroupId] || !state.groups[toGroupId]) {
        return state;
      }

      const fromGroup = state.groups[fromGroupId];

      // Validate index
      if (tabIndex < 0 || tabIndex >= fromGroup.tabs.length) {
        return state;
      }

      const tab = fromGroup.tabs[tabIndex];

      if (fromGroupId === toGroupId) {
        // Moving within same group (reorder)
        const newTabs = [...fromGroup.tabs];
        newTabs.splice(tabIndex, 1);

        const targetIndex = toIndex !== undefined ? toIndex : newTabs.length;
        newTabs.splice(targetIndex, 0, tab);

        return {
          ...state,
          groups: {
            ...state.groups,
            [fromGroupId]: {
              ...fromGroup,
              tabs: newTabs,
            },
          },
        };
      } else {
        // Moving between groups
        const toGroup = state.groups[toGroupId];

        // Remove from source
        const newFromTabs = fromGroup.tabs.filter((_, i) => i !== tabIndex);
        let newFromActiveIndex = fromGroup.activeIndex;
        if (tabIndex < fromGroup.activeIndex) {
          newFromActiveIndex--;
        } else if (tabIndex === fromGroup.activeIndex) {
          if (newFromActiveIndex >= newFromTabs.length) {
            newFromActiveIndex = newFromTabs.length - 1;
          }
        }

        // Add to target
        const targetIndex = toIndex !== undefined ? toIndex : toGroup.tabs.length;
        const newToTabs = [...toGroup.tabs];
        newToTabs.splice(targetIndex, 0, tab);

        let newToActiveIndex = toGroup.activeIndex;
        if (toGroup.tabs.length === 0) {
          newToActiveIndex = 0; // First tab becomes active
        }

        return {
          ...state,
          groups: {
            ...state.groups,
            [fromGroupId]: {
              ...fromGroup,
              tabs: newFromTabs,
              activeIndex: newFromActiveIndex,
            },
            [toGroupId]: {
              ...toGroup,
              tabs: newToTabs,
              activeIndex: newToActiveIndex,
            },
          },
        };
      }
    }

    default:
      return state;
  }
}
