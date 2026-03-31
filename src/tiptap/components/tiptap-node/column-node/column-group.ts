// ColumnGroup.ts
import { Node, mergeAttributes } from "@tiptap/core";

export const ColumnGroupNode = Node.create({
  name: "columnGroup",
  group: "block",
  content: "column*",
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-type=column-group]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column-group",
        style: `
          display: flex;
          gap: 1rem;
          width: 100%;
        `,
      }),
      0,
    ];
  },
});
