import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ColumnBlockView from "./column-block-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnBlock: {
      insertColumns: (count: 2 | 3 | 4) => ReturnType;
    };
  }
}

export const ColumnBlock = Node.create({
  name: "columnBlock",
  group: "block",
  content: "column*",
  draggable: true,
  isolating: true,
  topNode: true,

  parseHTML() {
    return [{ tag: "div[data-type='column-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "column-block" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnBlockView);
  },

  addCommands() {
    return {
      insertColumns:
        (count: 2 | 3 | 4) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "columnBlock",
            content: Array.from({ length: count }, () => ({
              type: "column",
              attrs: { width: `${100 / count}%` },
              content: [{ type: "paragraph" }],
            })),
          });
        },
    };
  },
});
