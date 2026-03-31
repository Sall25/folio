// ─── Utilities ─────────────────────────────────────────────────────────────────

import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

/**
 * canDuplicateNode(editor)
 * Returns true if there's a valid node at the current selection that can be cloned.
 */
export function canDuplicateNode(editor: Editor) {
  if (!editor || editor.isDestroyed) return false;
  const { selection } = editor.state;

  if (selection instanceof NodeSelection) return true;

  return false;
}

/**
 * duplicateNode(editor)
 * Clones the currently selected block node and inserts it after itself.
 * Returns true on success, false otherwise.
 */
export function duplicateNode(editor: Editor) {
  if (!editor || !canDuplicateNode(editor)) return false;

  const { state, dispatch } = editor.view;
  const { selection, tr } = state;
  const { from, node } = selection as NodeSelection;

  const insertPos = from + node.nodeSize;

  if (!node) return false;

  const newTr = tr.insert(insertPos, node);
  dispatch(newTr);
  editor.commands.focus();
  return true;
}
