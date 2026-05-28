// file-cell-node.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FileCellNodeView } from "./file-cell-node-view";

export const FileCellNode = Node.create({
  name: "fileCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
      files: { default: [] }, // FileAttachment[]
      pageId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="file-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "file-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileCellNodeView);
  },
});
