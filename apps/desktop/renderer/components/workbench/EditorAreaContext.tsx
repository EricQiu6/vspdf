import React, { createContext, useContext } from 'react';
import type { EditorAreaState, EditorAction } from '@vspdf/types';

/**
 * Context for EditorArea state (changes frequently)
 * Separated from dispatch context to optimize re-renders:
 * - Components that only read state subscribe to this
 * - Components that only dispatch (toolbars, menus) skip this
 */
const EditorAreaStateContext = createContext<EditorAreaState | null>(null);

/**
 * Context for dispatch function (never changes)
 * Separated from state context per React best practices:
 * - Components using only dispatch never re-render on state changes
 * - Prevents unnecessary re-renders in command/menu components
 */
const EditorAreaDispatchContext = createContext<React.Dispatch<EditorAction> | null>(null);

/**
 * Hook to access EditorArea state
 * Causes component to re-render when state changes
 * Use this when you need to READ state
 */
export function useEditorAreaState(): EditorAreaState {
  const context = useContext(EditorAreaStateContext);
  if (!context) {
    throw new Error('useEditorAreaState must be used within EditorArea');
  }
  return context;
}

/**
 * Hook to access dispatch function
 * Does NOT cause re-renders (dispatch ref is stable)
 * Use this when you only need to DISPATCH actions
 *
 * Example: Toolbar buttons, context menu handlers
 */
export function useEditorAreaDispatch(): React.Dispatch<EditorAction> {
  const context = useContext(EditorAreaDispatchContext);
  if (!context) {
    throw new Error('useEditorAreaDispatch must be used within EditorArea');
  }
  return context;
}

/**
 * Export contexts for provider usage
 * Only EditorArea.tsx should use these directly
 */
export { EditorAreaStateContext, EditorAreaDispatchContext };
