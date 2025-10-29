import { useReducer } from 'react';
import type { EditorAreaState } from '@vspdf/types';
import { editorAreaReducer, createInitialEditorState } from '../../services/EditorAreaReducer';
import { EditorAreaStateContext, EditorAreaDispatchContext } from './EditorAreaContext';
import { LayoutRenderer } from './LayoutRenderer';
import { EditorAreaTestControls } from './EditorAreaTestControls';
import styles from './EditorArea.module.css';

interface EditorAreaProps {
  /**
   * Optional initial state for testing
   * If not provided, creates empty state with one group
   */
  initialState?: EditorAreaState;
}

/**
 * EditorArea - Top-level component for the multi-pane editor layout
 *
 * Responsibilities:
 * - Initializes reducer with state management
 * - Provides contexts (state + dispatch) to descendants
 * - Renders recursive layout tree via LayoutRenderer
 *
 * Architecture:
 * - Split contexts for performance (dispatch never re-renders consumers)
 * - Lazy initialization via useReducer 3rd param (StrictMode-safe)
 * - Declarative layout via allotment (no manual DOM manipulation)
 *
 * Future extensions:
 * - Persistence: save/restore layout on mount/unmount
 * - Commands: toolbar buttons trigger splits/merges
 * - Keyboard shortcuts: Cmd+\ for split, etc.
 */
export function EditorArea({ initialState }: EditorAreaProps) {
  // Initialize reducer with lazy initialization
  // - If initialState provided: use it directly
  // - Otherwise: call createInitialEditorState once on mount
  // Wrapper function makes intent explicit and is safe to extend
  const [state, dispatch] = useReducer(
    editorAreaReducer,
    initialState,
    (provided) => provided ?? createInitialEditorState()
  );

  return (
    <EditorAreaStateContext.Provider value={state}>
      <EditorAreaDispatchContext.Provider value={dispatch}>
        <div className={styles.editorArea}>
          <LayoutRenderer node={state.layout} />
          {/* TODO: TEMPORARY - Remove when command palette is implemented */}
          {import.meta.env.DEV && <EditorAreaTestControls />}
        </div>
      </EditorAreaDispatchContext.Provider>
    </EditorAreaStateContext.Provider>
  );
}
