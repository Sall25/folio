import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CreatedTimeCellNodeView } from "./created-time-cell-node-view";

export const CreatedTimeCellNode = Node.create({
  name: "createdTimeCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
      pageId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="created-time-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "created-time-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CreatedTimeCellNodeView);
  },
});
