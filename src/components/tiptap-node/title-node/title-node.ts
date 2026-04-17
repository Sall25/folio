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
      // Ensure title is always first node
      new Plugin({
        key: new PluginKey("titleEnforce"),
        appendTransaction(_, __, newState) {
          const { doc, tr } = newState;
          const firstNode = doc.firstChild;
          if (firstNode?.type.name !== "title") {
            const titleNode = newState.schema.nodes.title.create();
            return tr.insert(0, titleNode);
          }
        },
      }),
    ];
  },
});
