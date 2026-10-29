import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { getSelectedBlocks } from "src/lib/block-selection";
import { PINNABLE_TYPES } from "./pin-targets";

// Which pinnable block the block menu is for (pin-menu-actions.tsx).

export type PinTarget = { node: PMNode; pos: number };

export function pinMenuTarget(editor: Editor): PinTarget | null {
  const sel = editor.state.selection;
  const blocks = getSelectedBlocks(sel);
  const target =
    blocks?.length === 1
      ? blocks[0]
      : sel instanceof NodeSelection
        ? { node: sel.node, pos: sel.from }
        : null;
  if (!target) return null;
  // The drag handle selects a to-do ITEM (lists aren't dragged whole): the
  // pin is for the list it's in.
  if (target.node.type.name === "taskItem") {
    const $pos = editor.state.doc.resolve(target.pos);
    const list = $pos.parent;
    if (list.type.name !== "taskList" || $pos.depth === 0) return null;
    return { node: list, pos: $pos.before($pos.depth) };
  }
  return PINNABLE_TYPES.includes(target.node.type.name) ? target : null;
}
