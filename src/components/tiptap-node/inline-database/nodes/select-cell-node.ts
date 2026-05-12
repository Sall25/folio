import { Node } from "@tiptap/core";
import { mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SelectCellNodeView } from "./select-cell-node-view";

export const SelectCellNode = Node.create({
  name: "selectCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
      value: { default: null }, // SelectOption id | null
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="select-cell"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "select-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SelectCellNodeView);
  },
});
