import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { RecordPropertyPanelView } from "./record-property-panel-node-view";

export const RecordPropertyPanelNode = Node.create({
  name: "recordPropertyPanel",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-page-id");
          return v != null ? Number(v) : null;
        },
        renderHTML: (attrs) =>
          attrs.pageId != null ? { "data-page-id": String(attrs.pageId) } : {},
      },
      databaseId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-database-id"),
        renderHTML: (attrs) =>
          attrs.databaseId != null
            ? { "data-database-id": attrs.databaseId }
            : {},
      },
      recordId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-record-id"),
        renderHTML: (attrs) =>
          attrs.recordId != null ? { "data-record-id": attrs.recordId } : {},
      },
      parentId: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-parent-id");
          return v != null ? Number(v) : null;
        },
        renderHTML: (attrs) =>
          attrs.parentId != null
            ? { "data-parent-id": String(attrs.parentId) }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='record-property-panel']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "record-property-panel",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RecordPropertyPanelView);
  },
});
