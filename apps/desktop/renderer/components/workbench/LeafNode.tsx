import React, { useCallback } from 'react';
import { useEditorAreaState, useEditorAreaDispatch } from './EditorAreaContext';
import { EditorGroup } from './EditorGroup';
import styles from './LeafNode.module.css';

interface LeafNodeProps {
  groupId: string;
}

/**
 * LeafNode - Renders an EditorGroup at a leaf position in the layout tree
 *
 * Architecture:
 * - Uses BOTH contexts: state (to read group) + dispatch (to send actions)
 * - No memoization (leaf node = nothing below to optimize)
 * - Defensive: handles missing groupId gracefully
 *
 * Performance optimization:
 * - useCallback on event handlers (stable refs across re-renders)
 * - Split contexts minimize re-renders (dispatch never changes)
 *
 * IMPORTANT: All hooks must be called before any early returns (React rules)
 */
export function LeafNode({ groupId }: LeafNodeProps) {
  const state = useEditorAreaState();
  const dispatch = useEditorAreaDispatch();

  // Event handlers: useCallback for stable refs
  // MUST be defined before early return (React hooks rules)
  const handleSelectTab = useCallback(
    (tabIndex: number) => {
      dispatch({ type: 'SET_ACTIVE_TAB', groupId, tabIndex });
    },
    [dispatch, groupId]
  );

  const handleCloseTab = useCallback(
    (tabIndex: number) => {
      dispatch({ type: 'CLOSE_TAB', groupId, tabIndex });
    },
    [dispatch, groupId]
  );

  const handleTabContextMenu = useCallback((event: React.MouseEvent, tabIndex: number) => {
    event.preventDefault();
    // TODO: Show context menu with options (future work)
    console.log('Context menu for tab', tabIndex);
  }, []);

  const handleGroupClick = useCallback(() => {
    const currentIsActive = state.activeGroupId === groupId;
    if (!currentIsActive) {
      dispatch({ type: 'SET_ACTIVE_GROUP', groupId });
    }
  }, [dispatch, groupId, state.activeGroupId]);

  // Defensive programming: handle missing group
  // Check AFTER all hooks have been called
  const groupState = state.groups[groupId];
  if (!groupState) {
    return (
      <div className={styles.errorState}>
        <p>Error: Group {groupId} not found</p>
        <p className={styles.hint}>This is a bug. Please report it.</p>
      </div>
    );
  }

  const isActive = state.activeGroupId === groupId;

  return (
    <EditorGroup
      groupState={groupState}
      isActive={isActive}
      onSelectTab={handleSelectTab}
      onCloseTab={handleCloseTab}
      onTabContextMenu={handleTabContextMenu}
      onGroupClick={handleGroupClick}
    />
  );
}
