import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MathInlineNodeView } from "./math-inline-node-view";
import { type InputRule } from "@tiptap/core";
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathInline: {
      insertInlineMath: (latex?: string) => ReturnType;
    };
  }
}

export const MathInlineNode = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "math-inline" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineNodeView);
  },

  addInputRules() {
    return [
      {
        // Matches $...$ but not $$ (block) — fires when the closing $ is typed
        find: /(?<!\$)\$([^$]+)\$$/,
        handler: ({ range, match, chain }) => {
          const latex = match[1];
          if (!latex.trim()) return;
          chain()
            .deleteRange(range)
            .insertContent({
              type: "mathInline",
              attrs: { latex },
            })
            .run();
        },
      } as InputRule,
    ];
  },

  addCommands() {
    return {
      insertInlineMath:
        (latex = "") =>
        ({ commands }) =>
          commands.insertContent({ type: "mathInline", attrs: { latex } }),
    };
  },
});
