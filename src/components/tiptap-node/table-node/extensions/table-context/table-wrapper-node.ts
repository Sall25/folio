import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TableWrapperView } from "./table-wrapper-view";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Node as PMNode } from "@tiptap/pm/model";

export const TableWrapperNode = Node.create({
  name: "tableWrapper",
  group: "block",
  content: "table*",
  draggable: true,
  atom: true,
  // defining: true,
  //defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="table-wrapper"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-type": "table-wrapper", ...HTMLAttributes }, 0];
  },

  addProseMirrorPlugins() {
    const tableWrapperType = this.type;

    return [
      new Plugin({
        key: new PluginKey("tableWrapperPaste"),
        props: {
          transformPasted(slice) {
            function wrapTables(fragment: Fragment): Fragment {
              const nodes: PMNode[] = [];

              fragment.forEach((node) => {
                if (node.type.name === "table") {
                  const wrapper = tableWrapperType.create(null, node);
                  nodes.push(wrapper);
                } else if (node.childCount > 0) {
                  nodes.push(node.copy(wrapTables(node.content)));
                } else {
                  nodes.push(node);
                }
              });
              return Fragment.fromArray(nodes);
            }
            return new Slice(
              wrapTables(slice.content),
              slice.openStart,
              slice.openEnd,
            );
          },
        },
      }),
      // new Plugin({
      //   key: new PluginKey("tableWrapperDropCleanup"),
      //   appendTransaction(transactions, oldState, newState) {
      //     const dropTr = transactions.find(
      //       (tr) => tr.getMeta("uiEvent") === "drop",
      //     );
      //     if (!dropTr) return null;

      //     const tr = newState.tr;
      //     let modified = false;

      //     newState.doc.descendants((node, pos) => {
      //       if (node.type === tableWrapperType && node.childCount === 0) {
      //         tr.delete(
      //           tr.mapping.map(pos),
      //           tr.mapping.map(pos + node.nodeSize),
      //         );
      //         modified = true;
      //       }
      //     });

      //     return modified ? tr : null;
      //   },
      // }),
    ];
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
