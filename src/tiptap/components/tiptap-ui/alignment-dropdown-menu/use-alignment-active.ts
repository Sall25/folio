// use-alignment-active.ts
import { type Editor } from "@tiptap/core";
import { getSelectedNodesOfType } from "@/lib/tiptap-utils";

type AlignType =
  | "left"
  | "right"
  | "justify"
  | "center"
  | "top"
  | "middle"
  | "bottom";

export function isAligned(editor: Editor, target: AlignType): boolean {
  const isVertical = ["top", "middle", "bottom"].includes(target);
  const attr = isVertical ? "nodeVerticalAlign" : "nodeAlign";
  const targets = getSelectedNodesOfType(editor.state.selection, [
    "paragraph",
    "heading",
    "blockquote",
    "taskList",
    "bulletList",
    "orderedList",
    "tableCell",
    "tableHeader",
    "tableRow",
    "table",
    "figure",
  ]);
  if (targets.length === 0) return false;
  return targets.every(({ node }) => node.attrs[attr] === target);
}
