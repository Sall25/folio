import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DueDateCellNodeView } from "./due-date-cell-node-view";

export const DueDateCellNode = Node.create({
  name: "dateCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,
  content: "inline*",

  addAttributes() {
    return {
      value: { default: null },
      propertyId: { default: null },
      pageId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="date-cell"' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ ...HTMLAttributes }, { "data-type": "date-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DueDateCellNodeView);
  },
});
