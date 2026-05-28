import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FormulaCellNodeView } from "./formula-cell-node-view";

export const FormulaCellNode = Node.create({
  name: "formulaCell",
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
    return [{ tag: 'div[data-type="formula-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "formula-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FormulaCellNodeView);
  },
});
