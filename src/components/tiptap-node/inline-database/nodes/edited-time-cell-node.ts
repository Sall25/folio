import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EditedTimeCellNodeView } from "./edited-time-cell-node-view";

export const EditedTimeCellNode = Node.create({
  name: "editedTimeCell",
  group: "databaseCellContent",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      propertyId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="edited-time-cell"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "edited-time-cell" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditedTimeCellNodeView);
  },
});
