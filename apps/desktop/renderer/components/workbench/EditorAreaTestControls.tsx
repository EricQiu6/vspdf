import { useCallback } from 'react';
import { useEditorAreaState } from './EditorAreaContext';
import { useEditorAreaOperations } from '../../hooks/useEditorAreaOperations';
import { getNextGroupId, getPrevGroupId, getGroupCount } from '../../services/EditorAreaQueries';
import type { CommandContext } from '@vspdf/types';

/**
 * EditorAreaTestControls - Temporary UI for testing operations API
 *
 * TODO: TEMPORARY SCAFFOLDING - Remove when command palette is implemented
 *
 * Purpose:
 * - Manual testing of EditorArea operations
 * - Validates useEditorAreaOperations hook works correctly
 * - Demonstrates CommandContext integration pattern
 * - Provides keyboard-free testing during development
 *
 * This component showcases the pattern that CommandRegistry will use:
 * 1. Access state via useEditorAreaState
 * 2. Access operations via useEditorAreaOperations
 * 3. Build CommandContext with current state + operations
 * 4. Invoke operations through the context
 *
 * Design notes:
 * - Only rendered in development builds (import.meta.env.DEV guard)
 * - Floating UI doesn't interfere with layout
 * - Uses operations API (not dispatch directly) to validate abstraction
 */
export function EditorAreaTestControls() {
  const state = useEditorAreaState();
  const editorAreaOps = useEditorAreaOperations();

  // Build command context (same pattern CommandRegistry will use)
  const buildCommandContext = useCallback((): CommandContext => {
    const activeGroup = state.groups[state.activeGroupId];

    return {
      activeGroup: state.activeGroupId,
      activeTab: activeGroup?.tabs[activeGroup.activeIndex],
      editorAreaOps,
      // viewer, selection, thread will be added later when those features exist
    };
  }, [state, editorAreaOps]);

  // Command handlers (these would be in CommandRegistry in production)
  const handleSplitRight = useCallback(() => {
    const ctx = buildCommandContext();
    if (ctx.activeGroup && ctx.editorAreaOps) {
      ctx.editorAreaOps.splitGroup(ctx.activeGroup, 'row');
    }
  }, [buildCommandContext]);

  const handleSplitDown = useCallback(() => {
    const ctx = buildCommandContext();
    if (ctx.activeGroup && ctx.editorAreaOps) {
      ctx.editorAreaOps.splitGroup(ctx.activeGroup, 'column');
    }
  }, [buildCommandContext]);

  const handleCloseGroup = useCallback(() => {
    const ctx = buildCommandContext();
    const groupCount = getGroupCount(state.layout);

    // Don't allow closing the last group
    if (ctx.activeGroup && ctx.editorAreaOps && groupCount > 1) {
      ctx.editorAreaOps.closeGroup(ctx.activeGroup);
    }
  }, [buildCommandContext, state.layout]);

  const handleFocusNext = useCallback(() => {
    const ctx = buildCommandContext();
    const nextId = getNextGroupId(state.layout, state.activeGroupId);

    if (nextId && ctx.editorAreaOps) {
      ctx.editorAreaOps.focusGroup(nextId);
    }
  }, [buildCommandContext, state.layout, state.activeGroupId]);

  const handleFocusPrev = useCallback(() => {
    const ctx = buildCommandContext();
    const prevId = getPrevGroupId(state.layout, state.activeGroupId);

    if (prevId && ctx.editorAreaOps) {
      ctx.editorAreaOps.focusGroup(prevId);
    }
  }, [buildCommandContext, state.layout, state.activeGroupId]);

  const handleOpenFile = useCallback(() => {
    const ctx = buildCommandContext();
    const testFile = `file:///test/document-${Date.now()}.pdf`;

    if (ctx.editorAreaOps) {
      ctx.editorAreaOps.openFile(testFile, ctx.activeGroup);
    }
  }, [buildCommandContext]);

  const handleCloseTab = useCallback(() => {
    const ctx = buildCommandContext();
    const activeGroup = state.groups[state.activeGroupId];

    if (ctx.editorAreaOps && activeGroup && activeGroup.activeIndex >= 0) {
      ctx.editorAreaOps.closeTab(state.activeGroupId, activeGroup.activeIndex);
    }
  }, [buildCommandContext, state]);

  const groupCount = getGroupCount(state.layout);
  const activeGroup = state.groups[state.activeGroupId];
  const hasActiveTabs = activeGroup && activeGroup.tabs.length > 0;

  return (
    <div
      data-testid="editor-area-test-controls"
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
      }}
    >
      <div
        style={{
          color: '#888',
          fontWeight: 600,
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Test Controls
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={handleSplitRight}
          title="Split Right (Cmd+\) - Creates vertical divider"
          style={buttonStyle}
        >
          Split →
        </button>
        <button
          onClick={handleSplitDown}
          title="Split Down (Cmd+K Cmd+\) - Creates horizontal divider"
          style={buttonStyle}
        >
          Split ↓
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={handleFocusPrev}
          title="Focus Previous Group"
          disabled={groupCount < 2}
          style={buttonStyle}
        >
          ← Prev
        </button>
        <button
          onClick={handleFocusNext}
          title="Focus Next Group"
          disabled={groupCount < 2}
          style={buttonStyle}
        >
          Next →
        </button>
      </div>

      <button
        onClick={handleCloseGroup}
        title="Close Active Group (disabled if last group)"
        disabled={groupCount <= 1}
        style={{ ...buttonStyle, opacity: groupCount <= 1 ? 0.4 : 1 }}
      >
        Close Group
      </button>

      <div
        style={{
          height: '1px',
          background: 'rgba(255, 255, 255, 0.1)',
          margin: '4px 0',
        }}
      />

      <button onClick={handleOpenFile} title="Open Test File" style={buttonStyle}>
        + Open Test File
      </button>

      <button
        onClick={handleCloseTab}
        title="Close Active Tab (Cmd+W)"
        disabled={!hasActiveTabs}
        style={{ ...buttonStyle, opacity: !hasActiveTabs ? 0.4 : 1 }}
      >
        Close Tab
      </button>

      <div
        style={{
          marginTop: '8px',
          padding: '6px 8px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#999',
        }}
      >
        <div>Groups: {groupCount}</div>
        <div>
          Active: {state.activeGroupId.substring(0, 8)}...
        </div>
        {activeGroup && <div>Tabs: {activeGroup.tabs.length}</div>}
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '4px',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  transition: 'all 0.15s ease',
  flex: 1,
};
