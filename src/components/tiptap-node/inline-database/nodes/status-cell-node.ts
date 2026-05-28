import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { StatusCellNodeView } from "./status-cell-node-view";

export const StatusCellNode = Node.create({
  name: "statusCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
      value: { default: null }, // StatusItem id | null
      pageId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="status-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "status-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StatusCellNodeView);
  },
});
