import React, { useRef, useEffect, useState } from 'react';
import type { DocTab, TabDragData } from '@vspdf/types';
import { isTabDragData } from '@vspdf/types';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { useEditorAreaOperations } from '../../hooks/useEditorAreaOperations';
import styles from './Tab.module.css';

interface TabProps {
  tab: DocTab;
  groupId: string;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

/**
 * Tab - Individual tab component
 * Displays document title, active state, and close button
 * Supports drag-and-drop for reordering and moving between groups
 */
export function Tab({ tab, groupId, index, isActive, onSelect, onClose, onContextMenu }: TabProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropEdge, setDropEdge] = useState<'idle' | 'left' | 'right'>('idle');

  // Access EditorArea operations (no state subscription - prevents unnecessary re-renders)
  const editorAreaOps = useEditorAreaOperations();

  // Setup drag-and-drop: Tab is both draggable AND a drop target
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return combine(
      // Make this tab draggable
      draggable({
        element,
        getInitialData: (): TabDragData => ({
          type: 'tab',
          groupId,
          tabIndex: index,
          tabId: tab.id,
          title: tab.title,
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),

      // Make this tab a drop target for other tabs
      dropTargetForElements({
        element,
        canDrop: ({ source }) => source.data.type === 'tab',
        onDragEnter: ({ location }) => {
          // Detect which edge on enter
          const tabRect = element.getBoundingClientRect();
          const cursorX = location.current.input.clientX;
          const tabCenterX = tabRect.left + tabRect.width / 2;
          setDropEdge(cursorX < tabCenterX ? 'left' : 'right');
        },
        onDrag: ({ location }) => {
          // Continuously update edge detection as cursor moves
          const tabRect = element.getBoundingClientRect();
          const cursorX = location.current.input.clientX;
          const tabCenterX = tabRect.left + tabRect.width / 2;
          const newEdge = cursorX < tabCenterX ? 'left' : 'right';
          setDropEdge(newEdge);
        },
        onDragLeave: () => setDropEdge('idle'),
        onDrop: ({ source, location }) => {
          setDropEdge('idle');

          // Validate drag data using type guard (no unsafe 'as' casts)
          if (!isTabDragData(source.data)) {
            console.warn('[Tab] Invalid drag data received:', source.data);
            return;
          }

          const dragData = source.data;
          const fromGroupId = dragData.groupId;
          const fromIndex = dragData.tabIndex;

          // Edge-based insertion logic: detect which half of the tab was dropped on
          // This matches VS Code behavior where drop position is determined by cursor position
          const tabRect = element.getBoundingClientRect();
          const cursorX = location.current.input.clientX;
          const tabCenterX = tabRect.left + tabRect.width / 2;

          // Determine if cursor is on left or right half of tab
          const isLeftHalf = cursorX < tabCenterX;

          // Calculate insertion index based on edge detection
          // Left half: insert BEFORE this tab (at this tab's index)
          // Right half: insert AFTER this tab (at this tab's index + 1)
          let insertionIndex = isLeftHalf ? index : index + 1;

          // Adjust for array splice semantics when moving within same group
          // When removing source first, all indices after it shift left by 1
          // Example: [A, B, C, D] → move B (index 1) to position 3
          // After removing B: [A, C, D] → position 3 becomes position 2
          if (fromGroupId === groupId && fromIndex < insertionIndex) {
            insertionIndex = insertionIndex - 1;
          }

          // Skip if this would result in no movement (no-op optimization)
          if (fromGroupId === groupId && fromIndex === insertionIndex) {
            return;
          }

          // Move tab using EditorArea operations API
          // Auto-close logic is now handled by the reducer (no stale closure risk)
          editorAreaOps.moveTab(fromGroupId, fromIndex, groupId, insertionIndex);
        },
      })
    );
    // Minimal dependencies: only re-register when tab identity changes
    // NOT including editorAreaState prevents effect re-runs on every state change
  }, [groupId, index, tab.id, tab.title, editorAreaOps]);

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab selection when clicking close
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      ref={ref}
      className={`${styles.tab} ${isActive ? styles.active : ''} ${isDragging ? styles.dragging : ''} ${dropEdge === 'left' ? styles.dropTargetLeft : ''} ${dropEdge === 'right' ? styles.dropTargetRight : ''}`}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      onContextMenu={onContextMenu}
      data-ui-role="tab"
      data-tab-uri={tab.uri}
      data-group-id={groupId}
      data-tab-index={index}
    >
      <span className={styles.title} title={tab.uri}>
        {tab.title}
      </span>
      <button
        className={styles.closeButton}
        onClick={handleCloseClick}
        aria-label={`Close ${tab.title}`}
        tabIndex={-1}
      >
        ×
      </button>
    </div>
  );
}
