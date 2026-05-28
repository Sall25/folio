import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PhoneCellNodeView } from "./phone-cell-node-view";

export const PhoneCellNode = Node.create({
  name: "phoneCell",
  group: "databaseCellContent",
  selectable: false,
  content: "inline*",

  addAttributes() {
    return {
      propertyId: { default: null },
      pageId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="phone-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "phone-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PhoneCellNodeView);
  },
});
