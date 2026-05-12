import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DatabaseRecordNodeView } from "./database-record-node-view";

export const DatabaseRecordNode = Node.create({
  name: "databaseRecord",
  content: "databaseCellContent*",
  group: "databaseRecord",
  selectable: true,
  atom: false,
  draggable: true,

  addAttributes() {
    return {
      id: { default: null },
      createdAt: { default: null },
      updatedAt: { default: null },
      createdBy: { default: null },
      editedBy: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="database-record"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { ...HTMLAttributes },
        { "data-type": "database-record" },
      ),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DatabaseRecordNodeView);
  },
});
