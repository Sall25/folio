import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EmailCellNodeView } from "./email-cell-node-view";

export const EmailCellNode = Node.create({
  name: "emailCell",
  group: "databaseCellContent",
  content: "block+",
  atom: false,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
      pageId: { default: null },
      parentId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="email-cell"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "email-cell" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmailCellNodeView);
  },
});
