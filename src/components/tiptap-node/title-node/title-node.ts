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
    return { HTMLAttributes: {} };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { $anchor, empty } = selection;

        // Cursor at the very start of the title with nothing selected →
        // block backspace so it can't delete/merge the title away.
        if (
          empty &&
          $anchor.parent.type.name === this.name &&
          $anchor.parentOffset === 0
        ) {
          return true; // swallow — do nothing
        }
        return false; // normal backspace otherwise
      },

      // Also block Delete at title start merging the next block up into title
      // deletion edge cases, and select-all deletion is handled by schema below.
    };
  },

  parseHTML() {
    return [{ tag: "h1[data-type='title']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["h1", mergeAttributes(HTMLAttributes, { "data-type": "title" }), 0];
  },

  // A page has ONE title, its first block. Two copies of a page's content
  // can end up merged into one document (the server seeding a page again
  // while an open tab still holds the first copy), which left a second title
  // further down. Any title after the first is removed; if the first is
  // empty and a later one has the text, the text moves up first. Also one
  // record property panel at most, for the same reason.
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("singleTitle"),
        appendTransaction: (transactions, _oldState, state) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const { doc } = state;
          const first = doc.firstChild;
          if (!first || first.type.name !== this.name) return null;

          const extra: { pos: number; size: number; text: number }[] = [];
          let panelSeen = false;
          doc.forEach((node, offset, index) => {
            if (index === 0) return;
            if (node.type.name === this.name) {
              extra.push({
                pos: offset,
                size: node.nodeSize,
                text: node.content.size,
              });
            } else if (node.type.name === "recordPropertyPanel") {
              if (panelSeen)
                extra.push({ pos: offset, size: node.nodeSize, text: 0 });
              panelSeen = true;
            }
          });
          if (extra.length === 0) return null;

          const tr = state.tr;
          for (const e of [...extra].reverse())
            tr.delete(e.pos, e.pos + e.size);
          // The first title was left empty and a copy has the text: keep it.
          const named = extra.find((e) => e.text > 0);
          if (first.content.size === 0 && named) {
            const copy = doc.nodeAt(named.pos);
            if (copy) tr.replaceWith(1, 1, copy.content);
          }
          tr.setMeta("addToHistory", false);
          return tr;
        },
      }),
    ];
  },
});
