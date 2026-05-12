import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { UrlCellNodeView } from "./url-cell-node-view";

export const UrlCellNode = Node.create({
  name: "urlCell",
  group: "databaseCellContent",
  selectable: false,
  content: "inline*",
  addAttributes() {
    return {
      propertyId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="url-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "url-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UrlCellNodeView);
  },
});
