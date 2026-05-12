import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MultiSelectCellNodeView } from "./multiselect-cell-node-view";

// multi-select-cell-node.ts
export const MultiSelectCellNode = Node.create({
  name: "multiSelectCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
      value: { default: [] }, // SelectOption id[]
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="multi-select-cell"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "td",
      mergeAttributes(HTMLAttributes, { "data-type": "multi-select-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MultiSelectCellNodeView);
  },
});
