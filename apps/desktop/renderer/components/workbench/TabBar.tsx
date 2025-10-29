import React, { useRef, useEffect } from 'react';
import type { DocTab } from '@vspdf/types';
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
 * Note: Drop target removed - tabs themselves handle all drop logic with edge detection
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
      <div ref={tabListRef} className={styles.tabBar}>
        <div className={styles.emptyState}>No tabs open</div>
      </div>
    );
  }

  return (
    <div ref={tabListRef} className={styles.tabBar} role="tablist" onKeyDown={handleKeyDown}>
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
