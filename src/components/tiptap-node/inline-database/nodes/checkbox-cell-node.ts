import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CheckboxCellNodeView } from "./checkbox-cell-node-view.js";

export const CheckboxCellNode = Node.create({
  name: "checkboxCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
      value: { default: false },
      pageId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="checkbox-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "checkbox-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CheckboxCellNodeView);
  },
});
