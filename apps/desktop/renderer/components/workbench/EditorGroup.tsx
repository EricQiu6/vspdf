import React, { useRef, useEffect } from 'react';
import type { EditorGroupState, ViewerEvent } from '@vspdf/types';
import { TabBar } from './TabBar';
import { ViewerContainer } from './ViewerContainer';
import { eventBus } from '../../services/EventBus';
import { useContextKey } from '../../hooks/useContextKey';
import styles from './EditorGroup.module.css';

interface EditorGroupProps {
  groupState: EditorGroupState;
  isActive: boolean;
  onSelectTab: (tabIndex: number) => void;
  onCloseTab: (tabIndex: number) => void;
  onTabContextMenu: (event: React.MouseEvent, tabIndex: number) => void;
  onGroupClick: () => void;
}

/**
 * EditorGroup - Self-contained editor pane with tabs and viewer
 * Orchestrates TabBar + ViewerContainer
 * Propagates viewer events to EventBus
 */
export function EditorGroup({
  groupState,
  isActive,
  onSelectTab,
  onCloseTab,
  onTabContextMenu,
  onGroupClick,
}: EditorGroupProps) {
  const { tabs, activeIndex } = groupState;
  const groupRef = useRef<HTMLDivElement>(null);

  // Context keys for conditional keybindings (scoped to this group's element)
  const [, setEditorFocus] = useContextKey<boolean>('editorFocus', false, groupRef);
  const [, setActiveGroup] = useContextKey<string>('activeGroupId', '', groupRef);

  // Update context keys when active state changes
  useEffect(() => {
    if (isActive) {
      setEditorFocus(true);
      setActiveGroup(groupState.id);
    } else {
      setEditorFocus(false);
    }
  }, [isActive, groupState.id, setEditorFocus, setActiveGroup]);

  // Track focus/blur for context keys
  useEffect(() => {
    const element = groupRef.current;
    if (!element) return;

    const handleFocusIn = () => {
      setEditorFocus(true);
      setActiveGroup(groupState.id);
    };

    const handleFocusOut = (e: FocusEvent) => {
      // Only clear if focus is leaving the group entirely
      if (!element.contains(e.relatedTarget as Node)) {
        setEditorFocus(false);
      }
    };

    element.addEventListener('focusin', handleFocusIn);
    element.addEventListener('focusout', handleFocusOut);

    return () => {
      element.removeEventListener('focusin', handleFocusIn);
      element.removeEventListener('focusout', handleFocusOut);
    };
  }, [groupState.id, setEditorFocus, setActiveGroup]);

  const handleViewerEvent = (event: ViewerEvent) => {
    // Propagate viewer events to EventBus for other components to consume
    switch (event.type) {
      case 'ready':
        eventBus.publish({ type: 'viewer.ready', uri: event.uri });
        break;
      case 'selectionChanged':
        eventBus.publish({
          type: 'viewer.selectionChanged',
          uri: event.uri,
          anchors: event.anchors,
        });
        break;
      case 'annotationClicked':
        eventBus.publish({
          type: 'viewer.annotationClicked',
          uri: event.uri,
          annotId: event.annotId,
        });
        break;
      // stateChanged, capabilitiesChanged, error handled locally if needed
    }
  };

  const activeTab = activeIndex >= 0 && activeIndex < tabs.length ? tabs[activeIndex] : null;

  return (
    <div
      ref={groupRef}
      className={`${styles.editorGroup} ${isActive ? styles.active : ''}`}
      onClick={onGroupClick}
      data-ui-role="editorGroup"
      data-group-id={groupState.id}
      tabIndex={-1}
    >
      <TabBar
        groupId={groupState.id}
        tabs={tabs}
        activeIndex={activeIndex}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onTabContextMenu={onTabContextMenu}
      />
      <div className={styles.viewerArea}>
        {activeTab ? (
          <ViewerContainer tab={activeTab} onEvent={handleViewerEvent} />
        ) : (
          <div className={styles.emptyViewer}>
            <p>No document open</p>
            <p className={styles.hint}>Open a file to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
