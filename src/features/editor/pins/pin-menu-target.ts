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
  return target && PINNABLE_TYPES.includes(target.node.type.name)
    ? target
    : null;
}
