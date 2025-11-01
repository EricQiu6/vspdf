/**
 * EditorArea Operations Factory
 *
 * Creates an EditorAreaOperations object from a dispatch function.
 * This is used by EditorArea to create operations before the context is available.
 */

import type { EditorAreaOperations, EditorAction } from '@vspdf/types';

/**
 * Create EditorAreaOperations from a dispatch function
 * @param dispatch Reducer dispatch function
 * @returns EditorAreaOperations object
 */
export function createEditorAreaOperations(
  dispatch: React.Dispatch<EditorAction>
): EditorAreaOperations {
  return {
    splitRight(groupId: string): void {
      dispatch({
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'row',
        position: 'after',
      });
    },

    splitLeft(groupId: string): void {
      dispatch({
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'row',
        position: 'before',
      });
    },

    splitDown(groupId: string): void {
      dispatch({
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'column',
        position: 'after',
      });
    },

    splitUp(groupId: string): void {
      dispatch({
        type: 'SPLIT_GROUP',
        groupId,
        direction: 'column',
        position: 'before',
      });
    },

    closeGroup(groupId: string): void {
      dispatch({
        type: 'CLOSE_GROUP',
        groupId,
      });
    },

    openFile(uri: string, groupId?: string): void {
      dispatch({
        type: 'ADD_TAB',
        tab: {
          uri,
          title: uri.split('/').pop() || uri,
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
        fromGroupId: fromGroup,
        toGroupId: toGroup,
        tabIndex,
        toIndex,
      });
    },
  };
}
