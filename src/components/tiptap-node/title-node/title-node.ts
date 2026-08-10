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
        appendTransaction() {
          return;
        },
        // appendTransaction(transactions, _oldState, newState) {
        //   // Only run if the document actually changed.
        //   if (!transactions.some((tr) => tr.docChanged)) return;

        //   // CRITICAL for collaboration: never react to transactions that
        //   // originate from the Yjs sync (the remote/initial doc hydration).
        //   // ── Collaboration-safe enforcement ──────────────────────────
        //   // Under Collaboration, several things mutate the doc right after
        //   // mount (Yjs sync, then UniqueID assigning ids as a LOCAL append).
        //   // Reacting to any of them by inserting a title writes that title
        //   // into the shared Yjs doc; since it happens every mount, empty
        //   // titles accumulate and persist. Guarding only sync-origin isn't
        //   // enough — the UniqueID append is local.
        //   //
        //   // The robust rule: only enforce a title when the doc actually has
        //   // body content that a title should sit above. An empty (or
        //   // title-less-but-also-contentless) doc during mount settling is
        //   // left alone — the seed / real content will arrive, and genuine
        //   // user typing later will have real content present, so enforcement
        //   // still fires when it's legitimately needed.
        //   const { doc, tr, schema } = newState;

        //   // Already correct.
        //   if (doc.firstChild?.type.name === "title") return;

        //   // Doc has no meaningful content yet (empty, or only-empty nodes) —
        //   // do NOT insert. This is the mount-settling window; inserting here
        //   // is what stacks empty titles.
        //   const hasRealContent =
        //     doc.childCount > 0 &&
        //     doc.content.size > 0 &&
        //     // at least one non-empty top-level node
        //     (() => {
        //       let real = false;
        //       doc.forEach((n) => {
        //         if (n.content.size > 0 || n.isAtom) real = true;
        //       });
        //       return real;
        //     })();

        //   if (!hasRealContent) return;

        //   const titleNode = schema.nodes.title.create();
        //   return tr.insert(0, titleNode);
        // },
      }),
    ];
  },
});
