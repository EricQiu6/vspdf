import React, { useRef, useEffect } from 'react';
import type { DocTab, ViewerHandle, ViewerEvent } from '@vspdf/types';
import { viewerRegistry } from '../../services/ViewerRegistry';
import styles from './ViewerContainer.module.css';

interface ViewerContainerProps {
  tab: DocTab;
  onEvent: (event: ViewerEvent) => void;
}

/**
 * ViewerContainer - Fetches and mounts viewer from ViewerRegistry
 * Holds ref to ViewerHandle for imperative API access
 * Only renders the active tab's viewer
 */
export function ViewerContainer({ tab, onEvent }: ViewerContainerProps) {
  const viewerRef = useRef<ViewerHandle>(null);

  // Expose viewer handle to parent if needed (future: commands)
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.focus();
    }
  }, [tab.uri]);

  // Get viewer component from registry
  const ViewerComponent = viewerRegistry.get(tab.viewer);

  if (!ViewerComponent) {
    return (
      <div className={styles.error}>
        <h3>Viewer Not Found</h3>
        <p>No viewer registered for type: &quot;{tab.viewer}&quot;</p>
        <p className={styles.uri}>{tab.uri}</p>
      </div>
    );
  }

  return (
    <div className={styles.viewerContainer} role="tabpanel">
      <ViewerComponent
        ref={viewerRef}
        uri={tab.uri}
        initialState={tab.state}
        onEvent={onEvent}
      />
    </div>
  );
}
