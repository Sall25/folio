import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TextCellNodeView } from "./text-cell-node-view";

export const TextCellNode = Node.create({
  name: "textCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,
  content: "inline*",

  addAttributes() {
    return {
      propertyId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="text-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "text-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TextCellNodeView);
  },
});
