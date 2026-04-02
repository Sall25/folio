import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { WrappedColumnView } from "./wrapped-column-view";

export const Column = Node.create({
  name: "column",
  content: "block+",
  group: "block",
  isolating: true,
  defining: true,
  draggable: true,

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

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        // Only handle when inside a column
        let insideColumn = false;
        for (let i = $from.depth; i >= 0; i--) {
          if ($from.node(i).type.name === "column") {
            insideColumn = true;
            break;
          }
        }
        if (!insideColumn) return false;

        // Let ProseMirror split the block normally first,
        // then clear the marks on the new block
        const handled = editor.commands.splitBlock();
        if (handled) {
          editor.commands.unsetAllMarks();
        }
        return handled;
      },
    };
  },
});
