import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PersonCellNodeView } from "./person-cell-node-view.js";

export const PersonCellNode = Node.create({
  name: "personCell",
  group: "databaseCellContent",
  selectable: false,
  // Value lives in attrs (PersonValue[]), not inline content — like select.
  atom: true,

  addAttributes() {
    return {
      propertyId: { default: null },
      pageId: { default: null },
      value: { default: [] }, // PersonValue[]
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="person-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "person-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PersonCellNodeView);
  },
});
