import { mergeAttributes, Node } from "@tiptap/core";
import { TitleCellNodeView } from "./title-cell-node-view";
import { ReactNodeViewRenderer } from "@tiptap/react";

export type TitleCellAttrs = {
  propertyId: string | null;
  pageId: number | null;
  parentId: number | null;
};

export const TitleCellNode = Node.create({
  name: "titleCell",
  group: "databaseCellContent",
  content: "block*",
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
    return [{ tag: 'div[data-type="title-cell"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "title-cell" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TitleCellNodeView);
  },
});
