import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { getSelectedBlocks } from "src/lib/block-selection";
import { PINNABLE_TYPES } from "./pin-targets";

const ITEM_TYPES = new Set(["listItem", "taskItem"]);

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
  if (ITEM_TYPES.has(target.node.type.name)) {
    const $pos = editor.state.doc.resolve(target.pos);
    const list = $pos.parent;
    if (!PINNABLE_TYPES.includes(list.type.name) || $pos.depth === 0)
      return null;
    return { node: list, pos: $pos.before($pos.depth) };
  }
  return PINNABLE_TYPES.includes(target.node.type.name) ? target : null;
}
