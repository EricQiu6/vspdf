import React, { useRef, useEffect, useState } from 'react';
import type { DocTab } from '@vspdf/types';
import { isTabDragData } from '@vspdf/types';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useEditorAreaOperations } from '../../hooks/useEditorAreaOperations';
import { Tab } from './Tab';
import styles from './TabBar.module.css';

interface TabBarProps {
  groupId: string;
  tabs: DocTab[];
  activeIndex: number;
  onSelectTab: (index: number) => void;
  onCloseTab: (index: number) => void;
  onTabContextMenu: (event: React.MouseEvent, index: number) => void;
}

/**
 * TabBar - Horizontal scrollable tab list
 * Manages tab rendering and keyboard navigation
 * Acts as a drop target for appending tabs (only when dropping in empty space)
 */
export function TabBar({
  groupId,
  tabs,
  activeIndex,
  onSelectTab,
  onCloseTab,
  onTabContextMenu,
}: TabBarProps) {
  const tabListRef = useRef<React.ElementRef<'div'>>(null);
  const [isDropOver, setIsDropOver] = useState(false);

  // Access EditorArea operations
  const editorAreaOps = useEditorAreaOperations();

  // Setup TabBar as a drop target for empty space
  useEffect(() => {
    const element = tabListRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => source.data.type === 'tab',
      onDragEnter: () => setIsDropOver(true),
      onDragLeave: () => setIsDropOver(false),
      onDrop: ({ source, location, self }) => {
        setIsDropOver(false);

        // Check if TabBar was the direct (innermost) drop target
        // If a Tab child was dropped on, location.current.dropTargets[0] will be the Tab
        // We only handle drops when TabBar itself is the innermost target (empty space)
        if (location.current.dropTargets[0]?.element !== self.element) {
          // A Tab component handled this drop, not us
          return;
        }

        // Validate drag data
        if (!isTabDragData(source.data)) {
          console.warn('[TabBar] Invalid drag data received:', source.data);
          return;
        }

        const { groupId: fromGroupId, tabIndex: fromIndex } = source.data;

        // Append at end
        let insertionIndex = tabs.length;

        // Adjust for same-group moves
        if (fromGroupId === groupId && fromIndex < insertionIndex) {
          insertionIndex--;
        }

        // Skip no-op moves
        if (fromGroupId === groupId && fromIndex === insertionIndex) {
          return;
        }

        // Move tab
        editorAreaOps.moveTab(fromGroupId, fromIndex, groupId, insertionIndex);
      },
    });
  }, [groupId, tabs.length, editorAreaOps]);

  // Scroll active tab into view and focus it when it changes
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < tabs.length && tabListRef.current) {
      const activeTab = tabListRef.current.children[activeIndex];
      if (activeTab) {
        // Scroll into view
        if ('scrollIntoView' in activeTab) {
          activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
        // Move keyboard focus to match active tab
        if ('focus' in activeTab && typeof activeTab.focus === 'function') {
          activeTab.focus();
        }
      }
    }
  }, [activeIndex, tabs.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (tabs.length === 0) return;

    let newIndex = activeIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = activeIndex > 0 ? activeIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = activeIndex < tabs.length - 1 ? activeIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    onSelectTab(newIndex);
  };

  if (tabs.length === 0) {
    return (
      <div
        ref={tabListRef}
        className={`${styles.tabBar} ${isDropOver ? styles.dropOver : ''}`}
      >
        <div className={styles.emptyState}>No tabs open</div>
      </div>
    );
  }

  return (
    <div
      ref={tabListRef}
      className={`${styles.tabBar} ${isDropOver ? styles.dropOver : ''}`}
      role="tablist"
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab, index) => (
        <Tab
          key={tab.id}
          tab={tab}
          groupId={groupId}
          index={index}
          isActive={index === activeIndex}
          onSelect={() => onSelectTab(index)}
          onClose={() => onCloseTab(index)}
          onContextMenu={(e) => onTabContextMenu(e, index)}
        />
      ))}
    </div>
  );
}
