import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { getSelectedBlocks } from "src/lib/block-selection";

// Which Pomodoro block the block menu is for (pomodoro-menu-actions.tsx).

type Target = { node: PMNode; pos: number };

/** The Pomodoro block the menu is for, or null. */
export function menuTarget(editor: Editor): Target | null {
  const sel = editor.state.selection;
  const blocks = getSelectedBlocks(sel);
  const target =
    blocks?.length === 1
      ? blocks[0]
      : sel instanceof NodeSelection
        ? { node: sel.node, pos: sel.from }
        : null;
  return target?.node.type.name === "pomodoro" ? target : null;
}

/** True when the block menu is for one Pomodoro block (read on open). */
export function isPomodoroMenu(editor: Editor): boolean {
  return menuTarget(editor) !== null;
}
