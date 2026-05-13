// title-node.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import "./title-node.scss";

export const TitleNode = Node.create({
  name: "title",
  group: "block",
  content: "inline*",
  defining: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: "h1[data-type='title']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["h1", mergeAttributes(HTMLAttributes, { "data-type": "title" }), 0];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("titleEnforce"),
        appendTransaction(transactions, _, newState) {
          // Only run if the document actually changed
          if (!transactions.some((tr) => tr.docChanged)) return;

          const { doc, tr } = newState;
          if (doc.firstChild?.type.name === "title") return; // already fine — exit fast

          const titleNode = newState.schema.nodes.title.create();
          return tr.insert(0, titleNode);
        },
      }),
    ];
  },

  // addProseMirrorPlugins() {
  //   return [
  //     // Ensure title is always first node
  //     new Plugin({
  //       key: new PluginKey("titleEnforce"),
  //       appendTransaction(_, __, newState) {
  //         const { doc, tr } = newState;
  //         const firstNode = doc.firstChild;
  //         if (firstNode?.type.name !== "title") {
  //           const titleNode = newState.schema.nodes.title.create();
  //           return tr.insert(0, titleNode);
  //         }
  //       },
  //     }),
  //   ];
  // },
});
