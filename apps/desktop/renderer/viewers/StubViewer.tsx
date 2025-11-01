import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import type { ViewerProps, ViewerHandle } from '@vspdf/types';
import { useContextKey } from '../hooks/useContextKey';

/**
 * StubViewer - Placeholder viewer for development
 * Enables workbench development before PDF.js integration
 */
export const StubViewer = forwardRef<ViewerHandle, ViewerProps>(
  ({ uri, initialState, onEvent }, ref) => {
    // Set viewer context keys
    const [, setViewerType] = useContextKey<string>('viewerType', 'stub');
    const [, setViewerUri] = useContextKey<string>('viewerUri', '');

    useEffect(() => {
      // Update context keys
      setViewerType('stub');
      setViewerUri(uri);

      // Emit ready event on mount
      onEvent({ type: 'ready', uri });
    }, [uri, onEvent, setViewerType, setViewerUri]);

    useImperativeHandle(ref, () => ({
      focus: () => {
        console.log('StubViewer.focus()');
      },
      getState: () => {
        return initialState ?? { page: 1, zoom: 1.0 };
      },
      dispose: () => {
        console.log('StubViewer.dispose()');
      },
      zoomIn: () => {
        console.log('StubViewer.zoomIn()');
      },
      zoomOut: () => {
        console.log('StubViewer.zoomOut()');
      },
      goToPage: (page: number) => {
        console.log('StubViewer.goToPage()', page);
      },
    }));

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          border: '1px dashed var(--border-color)',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>StubViewer</h3>
          <p style={{ marginTop: '0.5rem' }}>Document: {uri}</p>
          <p style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
            This is a placeholder viewer for development
          </p>
        </div>
      </div>
    );
  }
);

StubViewer.displayName = 'StubViewer';
