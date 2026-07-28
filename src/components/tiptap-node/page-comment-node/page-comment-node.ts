import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PageCommentView } from "./page-comment-view";

// Page-level comment block. Sits at a fixed spot near the top of the document
// (after the title, and after the record property panel for rows), like Notion.
// Not anchored to text — carries only the pageId; the NodeView renders the
// page-level threads (anchor === null) and the composer.
export const PageComment = Node.create({
  name: "pageComment",
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
    return [{ tag: "div[data-type='page-comment']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "page-comment" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageCommentView);
  },
});
