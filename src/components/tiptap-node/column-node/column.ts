import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { WrappedColumnView } from "./wrapped-column-view";

export const Column = Node.create({
  name: "column",
  content: "block+",
  group: "block",
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      width: {
        default: "50%",
        parseHTML: (el) => el.style.flexBasis || el.style.width || "50%",
        renderHTML: (attrs) => ({
          style: `flex-basis: ${attrs.width}; flex-shrink: 0; flex-grow: 0;`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='column']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "column" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WrappedColumnView);
  },
});
