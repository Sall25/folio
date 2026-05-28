import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NumberCellNodeView } from "./number-cell-node-view";

export const NumberCellNode = Node.create({
  name: "numberCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
      value: { default: null },
      pageId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="number-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "number-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NumberCellNodeView);
  },
});
