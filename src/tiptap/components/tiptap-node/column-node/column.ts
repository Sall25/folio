import { Node, mergeAttributes } from "@tiptap/core";

export const Column = Node.create({
  name: "column",
  group: "column",
  content: "block+",
  isolating: true,

  addAttributes() {
    return {
      width: {
        default: "1fr",
        parseHTML: (el) => el.style.flex || "1fr",
        renderHTML: (attrs) => ({
          style: `flex: ${attrs.width};`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type=column]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column",
        style: `
          flex: ${HTMLAttributes.width || "1fr"};
          min-height: 20px;
        `,
      }),
      0,
    ];
  },
});
