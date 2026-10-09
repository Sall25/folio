import type { NodeWithPos } from "@tiptap/core";
import type { Selection, Transaction } from "@tiptap/pm/state";
// Installed with @tiptap/extension-drag-handle (its peer dependency).
import { NodeRangeSelection } from "@tiptap/extension-node-range";

// Whole-block selections ("block selection"): made by the drag-box
// (BlockMarquee), by Shift+click on grips, or by pressing a grip inside a
// text selection that spans several blocks. The block menu acts on every
// block of it — colours, turn into, duplicate, delete, move to…

/** The blocks of a block selection, in order; null for any other
 *  selection (a cursor, text, a single node, table cells). */
export function getSelectedBlocks(selection: Selection): NodeWithPos[] | null {
  if (!(selection instanceof NodeRangeSelection)) return null;
  const blocks: NodeWithPos[] = [];
  for (const range of selection.ranges) {
    const node = range.$from.nodeAfter;
    if (node) blocks.push({ node, pos: range.$from.pos });
  }
  return blocks;
}

/** How many blocks a block selection holds (0 for any other selection). */
export function countSelectedBlocks(selection: Selection): number {
  return selection instanceof NodeRangeSelection ? selection.ranges.length : 0;
}

/** A block selection of two blocks or more: actions made for one block
 *  (copy its link, suggest an edit…) don't apply. */
export function isMultiBlockSelection(selection: Selection): boolean {
  return countSelectedBlocks(selection) > 1;
}

/**
 * Selects the blocks between `from` and `to` (both on block boundaries, in
 * the same parent) as a block selection. The depth is given explicitly:
 * without it, blocks inside a callout or a column would select the callout
 * or column itself.
 */
export function selectBlocks(
  tr: Transaction,
  from: number,
  to: number,
): Transaction {
  if (to <= from) return tr;
  const depth = tr.doc.resolve(from).depth;
  return tr.setSelection(NodeRangeSelection.create(tr.doc, from, to, depth));
}
