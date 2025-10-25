import React, { useReducer } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { viewerRegistry } from '../../services/ViewerRegistry';
import { StubViewer } from '../../viewers/StubViewer';
import { EditorGroup } from './EditorGroup';
import {
  editorAreaReducer,
  createInitialEditorState,
} from '../../services/EditorAreaReducer';
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
 * Creates initial state with test tabs for development
 * This is temporary scaffolding - will be removed when EditorArea is implemented
 */
function createTestEditorState(): EditorAreaState {
  // Start with empty state
  let state = createInitialEditorState();
  const groupId = state.activeGroupId;

  // Add many tabs to test horizontal scrolling behavior
  const testTabs = [
    { uri: 'file:///docs/attention.pdf', title: 'Attention Is All You Need', viewer: 'stub' as const },
    { uri: 'file:///docs/resnet.pdf', title: 'ResNet: Deep Residual Learning', viewer: 'stub' as const },
    { uri: 'file:///docs/bert.pdf', title: 'BERT: Pre-training of Deep Bidirectional Transformers', viewer: 'stub' as const },
    { uri: 'file:///docs/gpt3.pdf', title: 'GPT-3: Language Models are Few-Shot Learners', viewer: 'stub' as const },
    { uri: 'file:///docs/vit.pdf', title: 'Vision Transformer (ViT)', viewer: 'stub' as const },
    { uri: 'file:///docs/clip.pdf', title: 'CLIP: Learning Transferable Visual Models', viewer: 'stub' as const },
    { uri: 'file:///docs/diffusion.pdf', title: 'Denoising Diffusion Probabilistic Models', viewer: 'stub' as const },
    { uri: 'file:///docs/llama.pdf', title: 'LLaMA: Open and Efficient Foundation Language Models', viewer: 'stub' as const },
    { uri: 'file:///docs/stable-diffusion.pdf', title: 'High-Resolution Image Synthesis with Latent Diffusion Models', viewer: 'stub' as const },
    { uri: 'file:///docs/alphafold.pdf', title: 'AlphaFold: Highly Accurate Protein Structure Prediction', viewer: 'stub' as const },
    { uri: 'file:///docs/gan.pdf', title: 'Generative Adversarial Networks', viewer: 'stub' as const },
    { uri: 'file:///docs/yolo.pdf', title: 'YOLO: Real-Time Object Detection', viewer: 'stub' as const },
    { uri: 'file:///docs/efficientnet.pdf', title: 'EfficientNet: Rethinking Model Scaling', viewer: 'stub' as const },
    { uri: 'file:///docs/t5.pdf', title: 'T5: Text-to-Text Transfer Transformer', viewer: 'stub' as const },
    { uri: 'file:///docs/swin.pdf', title: 'Swin Transformer: Hierarchical Vision Transformer', viewer: 'stub' as const },
  ];

  // Build state by applying actions through reducer (pure, testable)
  testTabs.forEach((tab) => {
    state = editorAreaReducer(state, {
      type: 'ADD_TAB',
      groupId,
      tab,
    });
  });

  return state;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Workbench - Top-level layout orchestrator
 * Currently testing EditorGroup with hardcoded state
 * Future: will contain Sidebar, EditorArea (with splits), PanelContainer, StatusBar
 */
export function Workbench() {
  // Initialize reducer with test state using lazy initialization
  // The function runs exactly once per component instance (StrictMode-safe)
  const [editorState, dispatch] = useReducer(
    editorAreaReducer,
    undefined,
    createTestEditorState
  );

  const activeGroup = editorState.groups[editorState.activeGroupId];

  const handleSelectTab = (tabIndex: number) => {
    dispatch({
      type: 'SET_ACTIVE_TAB',
      groupId: editorState.activeGroupId,
      tabIndex,
    });
  };

  const handleCloseTab = (tabIndex: number) => {
    dispatch({
      type: 'CLOSE_TAB',
      groupId: editorState.activeGroupId,
      tabIndex,
    });
  };

  const handleTabContextMenu = (event: React.MouseEvent, tabIndex: number) => {
    event.preventDefault();
    console.log('Context menu for tab', tabIndex);
    // Future: show context menu with options
  };

  const handleGroupClick = () => {
    // Already active, no-op for now
    console.log('Group clicked');
  };

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
        <div className={styles.editorAreaTest}>
          <EditorGroup
            groupState={activeGroup}
            isActive={true}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onTabContextMenu={handleTabContextMenu}
            onGroupClick={handleGroupClick}
          />
        </div>
      </ErrorBoundary>
    </div>
  );
}
