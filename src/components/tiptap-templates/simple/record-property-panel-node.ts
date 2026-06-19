import { ReactNodeViewRenderer } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/react";
import { RecordPropertyPanelView } from "./record-property-panel-view";

export const RecordPropertyPanelNode = Node.create({
  name: "recordPropertyPanel",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      pageId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="record-property-panel"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "record-property-panel" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RecordPropertyPanelView);
  },
});
