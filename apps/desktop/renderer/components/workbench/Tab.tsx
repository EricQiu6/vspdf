import React from 'react';
import type { DocTab } from '@vspdf/types';
import styles from './Tab.module.css';

interface TabProps {
  tab: DocTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

/**
 * Tab - Individual tab component
 * Displays document title, active state, and close button
 */
export function Tab({ tab, isActive, onSelect, onClose, onContextMenu }: TabProps) {
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
      className={`${styles.tab} ${isActive ? styles.active : ''}`}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      onContextMenu={onContextMenu}
      data-ui-role="tab"
      data-tab-uri={tab.uri}
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
