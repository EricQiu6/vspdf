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
 * Supports drag-and-drop for appending tabs to the end
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

  // Access EditorArea operations (no state subscription - prevents unnecessary re-renders)
  const editorAreaOps = useEditorAreaOperations();

  // Setup TabBar as a drop target for appending tabs
  useEffect(() => {
    const element = tabListRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => source.data.type === 'tab',
      onDragEnter: () => setIsDropOver(true),
      onDragLeave: () => setIsDropOver(false),
      onDrop: ({ source }) => {
        setIsDropOver(false);

        // Validate drag data using type guard (no unsafe 'as' casts)
        if (!isTabDragData(source.data)) {
          console.warn('[TabBar] Invalid drag data received:', source.data);
          return;
        }

        const dragData = source.data;
        const fromGroupId = dragData.groupId;
        const fromIndex = dragData.tabIndex;

        // Append to end of this group (toIndex undefined = append)
        // Auto-close logic is now handled by the reducer (no stale closure risk)
        // Reducer handles no-op moves efficiently, so no client-side check needed
        editorAreaOps.moveTab(fromGroupId, fromIndex, groupId);
      },
    });
    // Minimal dependencies: only re-register when group identity changes
    // Removed tabs.length to avoid re-registration on every add/remove
  }, [groupId, editorAreaOps]);

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
