import React from 'react';
import type { EditorGroupState, ViewerEvent } from '@vspdf/types';
import { TabBar } from './TabBar';
import { ViewerContainer } from './ViewerContainer';
import { eventBus } from '../../services/EventBus';
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
      className={`${styles.editorGroup} ${isActive ? styles.active : ''}`}
      onClick={onGroupClick}
      data-ui-role="editorGroup"
      data-group-id={groupState.id}
    >
      <TabBar
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
