// rollup-cell-node.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { RollupCellNodeView } from "./rollup-cell-node-view";

export const RollupCellNode = Node.create({
  name: "rollupCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
      value: { default: null }, // string | number | null — computed, read-only
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="rollup-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "rollup-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RollupCellNodeView);
  },
});
