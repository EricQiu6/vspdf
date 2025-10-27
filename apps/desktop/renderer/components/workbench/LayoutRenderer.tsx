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
 */
export const LayoutRenderer = React.memo(function LayoutRenderer({ node }: LayoutRendererProps) {
  // Base case: leaf node renders EditorGroup
  if (node.type === 'leaf') {
    return <LeafNode groupId={node.groupId} />;
  }

  // Recursive case: split node renders Allotment with children
  // Direction mapping: our 'row' (side-by-side) = allotment's 'horizontal'
  //                    our 'column' (stacked) = allotment's 'vertical'
  return (
    <Allotment vertical={node.direction === 'column'}>
      {node.children.map((child, i) => (
        <Allotment.Pane key={i}>
          {/* Recursive: each child can be a split or leaf */}
          <LayoutRenderer node={child} />
        </Allotment.Pane>
      ))}
    </Allotment>
  );
});
