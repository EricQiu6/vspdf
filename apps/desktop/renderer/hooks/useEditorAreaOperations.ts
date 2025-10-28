import { useMemo } from 'react';
import { useEditorAreaDispatch } from '../components/workbench/EditorAreaContext';
import type { EditorAreaOperations } from '@vspdf/types';

/**
 * useEditorAreaOperations - High-level API for EditorArea modifications
 *
 * This hook wraps the EditorArea dispatch function with a stable, typed API
 * that can be consumed by commands, UI components, and keyboard handlers.
 *
 * PERFORMANCE OPTIMIZATION:
 * - Uses dispatch-only context (no state subscription)
 * - Components using only operations don't re-render on state changes
 * - Operations object is memoized with useMemo (dispatch is stable)
 *
 * DESIGN PATTERN:
 * - Encapsulation: Hides action structure from consumers
 * - Type safety: All operations strongly typed
 * - Testability: Easy to mock for tests
 * - Explicitness: Each operation clearly maps to a dispatch call
 *
 * @returns Memoized operations object implementing EditorAreaOperations
 *
 * @example
 * // In a component
 * const ops = useEditorAreaOperations();
 * ops.splitGroup(groupId, 'row');
 *
 * @example
 * // In Workbench for commands
 * const editorAreaOps = useEditorAreaOperations();
 * const context: CommandContext = {
 *   activeGroup: state.activeGroupId,
 *   editorAreaOps,
 * };
 */
export function useEditorAreaOperations(): EditorAreaOperations {
  const dispatch = useEditorAreaDispatch();

  // Memoize operations object - dispatch is stable, so this rarely re-creates
  // This ensures referential equality across renders, preventing cascading updates
  return useMemo<EditorAreaOperations>(
    () => ({
      splitRight(groupId: string): void {
        dispatch({
          type: 'SPLIT_GROUP',
          groupId,
          direction: 'row',
          position: 'after', // New group appears on the right
        });
      },

      splitLeft(groupId: string): void {
        dispatch({
          type: 'SPLIT_GROUP',
          groupId,
          direction: 'row',
          position: 'before', // New group appears on the left
        });
      },

      splitDown(groupId: string): void {
        dispatch({
          type: 'SPLIT_GROUP',
          groupId,
          direction: 'column',
          position: 'after', // New group appears below
        });
      },

      splitUp(groupId: string): void {
        dispatch({
          type: 'SPLIT_GROUP',
          groupId,
          direction: 'column',
          position: 'before', // New group appears above
        });
      },

      closeGroup(groupId: string): void {
        dispatch({
          type: 'CLOSE_GROUP',
          groupId,
        });
      },

      openFile(uri: string, groupId?: string): void {
        // TODO: Detect viewer type from file extension or MIME type
        // For now, defaulting to 'stub' viewer
        dispatch({
          type: 'ADD_TAB',
          tab: {
            uri,
            title: uri.split('/').pop() || uri, // Extract filename
            viewer: 'stub',
          },
          groupId,
        });
      },

      focusGroup(groupId: string): void {
        dispatch({
          type: 'SET_ACTIVE_GROUP',
          groupId,
        });
      },

      closeTab(groupId: string, tabIndex: number): void {
        dispatch({
          type: 'CLOSE_TAB',
          groupId,
          tabIndex,
        });
      },

      moveTab(fromGroup: string, tabIndex: number, toGroup: string, toIndex?: number): void {
        dispatch({
          type: 'MOVE_TAB',
          fromGroup,
          tabIndex,
          toGroup,
          toIndex,
        });
      },
    }),
    [dispatch]
  );
}
