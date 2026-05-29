import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MathBlockNodeView } from "./math-block-node-view.js";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathBlock: {
      insertMathBlock: (latex?: string) => ReturnType;
    };
  }
}

export const MathBlockNode = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "math-block" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockNodeView);
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex = "") =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { latex },
          }),
    };
  },
});
