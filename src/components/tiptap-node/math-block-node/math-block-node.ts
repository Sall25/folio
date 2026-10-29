import { Node, mergeAttributes, type InputRule } from "@tiptap/core";
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
  content: "block*",
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

  // "$$" then a space on an empty line → a math block.
  addInputRules() {
    return [
      {
        find: /^\$\$\s$/,
        handler: ({ state, range, chain }) => {
          const $from = state.doc.resolve(range.from);
          // Only a line that holds nothing but "$$".
          if ($from.parent.textContent.trim() !== "$$") return null;
          chain()
            .deleteRange({ from: $from.before(), to: $from.after() })
            .insertContentAt($from.before(), {
              type: this.name,
              attrs: { latex: "" },
            })
            .run();
        },
      } as InputRule,
    ];
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
