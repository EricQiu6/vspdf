import React from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import type { LayoutTree } from '@vspdf/types';
import { LeafNode } from './LeafNode';

interface LayoutRendererProps {
  node: LayoutTree;
}

/**
 * LayoutRenderer - Recursively renders the editor layout tree
 *
 * Architecture:
 * - For leaf nodes: renders EditorGroup via LeafNode
 * - For split nodes: renders Allotment with nested LayoutRenderers
 *
 * Key design decision: Declarative, not imperative
 * - No path prop needed (allotment manages its own structure)
 * - No UPDATE_SIZES action (allotment manages resize internally)
 * - Reducer owns STRUCTURE (split/merge), allotment owns PROPORTIONS (sizes)
 *
 * Memoization: Prevents re-rendering unchanged tree branches
 * Critical for performance with deep nesting
 *
 * Key Generation Strategy:
 * - Stable keys on Allotment force remount when structure changes
 * - Prevents React from reusing instances when orientation flips
 * - Critical for bug fix: closing parent split with nested children
 */
export const LayoutRenderer = React.memo(function LayoutRenderer({ node }: LayoutRendererProps) {
  // Base case: leaf node renders EditorGroup
  if (node.type === 'leaf') {
    return <LeafNode groupId={node.groupId} />;
  }

  // Recursive case: split node renders Allotment with children
  // Direction mapping: our 'row' (side-by-side) = allotment's 'horizontal'
  //                    our 'column' (stacked) = allotment's 'vertical'

  // Use explicit ID for stable key
  // This forces remount when the split node identity changes
  // Prevents allotment from getting stuck in wrong orientation
  // Split node IDs are generated once and remain stable across re-renders
  return (
    <Allotment key={node.id} vertical={node.direction === 'column'}>
      {node.children.map((child) => {
        // Use stable key based on child identity, not position
        // For leaf nodes: use groupId (stable across tree changes)
        // For nested splits: use split node ID (globally unique)
        const paneKey = child.type === 'leaf' ? child.groupId : child.id;

        return (
          <Allotment.Pane key={paneKey}>
            {/* Recursive: each child can be a split or leaf */}
            <LayoutRenderer node={child} />
          </Allotment.Pane>
        );
      })}
    </Allotment>
  );
});
