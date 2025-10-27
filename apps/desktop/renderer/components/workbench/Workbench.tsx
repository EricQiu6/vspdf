import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { viewerRegistry } from '../../services/ViewerRegistry';
import { StubViewer } from '../../viewers/StubViewer';
import { EditorArea } from './EditorArea';
import { editorAreaReducer, createInitialEditorState } from '../../services/EditorAreaReducer';
import type { EditorAreaState } from '@vspdf/types';
import styles from './Workbench.module.css';

// ============================================================================
// Module-level initialization (runs once at import)
// ============================================================================

// Register viewers at module load - runs exactly once, before any component mounts
viewerRegistry.register('stub', StubViewer);

// ============================================================================
// Test State Factory
// ============================================================================

/**
 * Creates initial state with complex nested splits for development
 * Layout: Vertical split, then horizontal split on right, then horizontal on top-right
 *
 * Structure:
 *   row [
 *     left group,
 *     column [
 *       row [
 *         top-right-left,
 *         top-right-right
 *       ],
 *       bottom-right
 *     ]
 *   ]
 */
function createTwoGroupTestState(): EditorAreaState {
  // Start with empty state
  let state = createInitialEditorState();
  const leftGroupId = state.activeGroupId;

  // Add tabs to left group
  const leftTabs = [
    { uri: 'file:///docs/attention.pdf', title: 'Attention Is All You Need', viewer: 'stub' as const },
    { uri: 'file:///docs/resnet.pdf', title: 'ResNet', viewer: 'stub' as const },
    { uri: 'file:///docs/bert.pdf', title: 'BERT', viewer: 'stub' as const },
  ];

  leftTabs.forEach((tab) => {
    state = editorAreaReducer(state, { type: 'ADD_TAB', groupId: leftGroupId, tab });
  });

  // Step 1: Vertical split (creates left | right)
  state = editorAreaReducer(state, {
    type: 'SPLIT_GROUP',
    groupId: leftGroupId,
    direction: 'row', // Vertical divider = row direction
  });

  const rightGroupId = Object.keys(state.groups).find((id) => id !== leftGroupId)!;

  // Add tabs to right group
  state = editorAreaReducer(state, {
    type: 'ADD_TAB',
    groupId: rightGroupId,
    tab: { uri: 'file:///docs/gpt3.pdf', title: 'GPT-3', viewer: 'stub' as const },
  });

  // Step 2: Horizontal split on right (creates top-right / bottom-right)
  state = editorAreaReducer(state, {
    type: 'SPLIT_GROUP',
    groupId: rightGroupId,
    direction: 'column', // Horizontal divider = column direction
  });

  // Find the newly created bottom-right group
  const allGroupIds = Object.keys(state.groups);
  const bottomRightGroupId = allGroupIds.find((id) => id !== leftGroupId && id !== rightGroupId)!;
  const topRightGroupId = rightGroupId; // Original right became top-right

  // Add tabs to bottom-right
  state = editorAreaReducer(state, {
    type: 'ADD_TAB',
    groupId: bottomRightGroupId,
    tab: { uri: 'file:///docs/llama.pdf', title: 'LLaMA', viewer: 'stub' as const },
  });

  // Step 3: Horizontal split on top-right (creates top-right-left | top-right-right)
  state = editorAreaReducer(state, {
    type: 'SPLIT_GROUP',
    groupId: topRightGroupId,
    direction: 'row', // Vertical divider = row direction
  });

  // Find the newly created top-right-right group
  const finalGroupIds = Object.keys(state.groups);
  const topRightRightGroupId = finalGroupIds.find(
    (id) => id !== leftGroupId && id !== bottomRightGroupId && id !== topRightGroupId
  )!;

  // Add tabs to top-right-right
  state = editorAreaReducer(state, {
    type: 'ADD_TAB',
    groupId: topRightRightGroupId,
    tab: { uri: 'file:///docs/vit.pdf', title: 'Vision Transformer', viewer: 'stub' as const },
  });

  return state;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Workbench - Top-level layout orchestrator
 * Now featuring split-pane layout with allotment
 * Future: will contain Sidebar, PanelContainer, StatusBar
 */
export function Workbench() {
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
        <EditorArea initialState={createTwoGroupTestState()} />
      </ErrorBoundary>
    </div>
  );
}
