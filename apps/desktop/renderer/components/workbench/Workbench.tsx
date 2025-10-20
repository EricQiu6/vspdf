import React, { useEffect } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { viewerRegistry } from '../../services/ViewerRegistry';
import { StubViewer } from '../../viewers/StubViewer';
import styles from './Workbench.module.css';

/**
 * Workbench - Top-level layout orchestrator
 * Future: will contain Sidebar, EditorArea, PanelContainer, StatusBar
 */
export function Workbench() {
  useEffect(() => {
    // Register StubViewer for development
    viewerRegistry.register('stub', StubViewer);
  }, []);

  return (
    <div className={styles.workbench}>
      <ErrorBoundary
        fallback={
          <div style={{ padding: '2rem', color: '#f48771' }}>
            <h2>Workbench Error</h2>
            <p>The workbench encountered an error. Please reload the application.</p>
          </div>
        }
      >
        <div className={styles.content}>
          <h1>VSPDF Workbench</h1>
          <p>Architecture initialized successfully!</p>
          <div className={styles.info}>
            <h2>Next Steps:</h2>
            <ul>
              <li>Sprint 1: Implement Sidebar, EditorArea, EditorGroups</li>
              <li>Sprint 2: Integrate PDF.js viewer</li>
              <li>Sprint 3: Add AnnotationService with threaded comments</li>
            </ul>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
}
