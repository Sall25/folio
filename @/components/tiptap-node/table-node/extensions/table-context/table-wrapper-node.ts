import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TableWrapperView } from "./table-wrapper-view";

export const TableWrapperNode = Node.create({
  name: "tableWrapper",
  group: "block",
  content: "table",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="table-wrapper"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-type": "table-wrapper", ...HTMLAttributes }, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableWrapperView);
  },

  addCommands() {
    return {
      insertTable:
        ({ rows = 3, cols = 3, withHeaderRow = true } = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "tableWrapper",
            content: [
              {
                type: "table",
                content: [
                  // header row
                  ...(withHeaderRow
                    ? [
                        {
                          type: "tableRow",
                          content: Array(cols).fill({
                            type: "tableHeader",
                            content: [{ type: "paragraph" }],
                          }),
                        },
                      ]
                    : []),
                  // body rows
                  ...Array(withHeaderRow ? rows - 1 : rows).fill({
                    type: "tableRow",
                    content: Array(cols).fill({
                      type: "tableCell",
                      content: [{ type: "paragraph" }],
                    }),
                  }),
                ],
              },
            ],
          });
        },
    };
  },
});
