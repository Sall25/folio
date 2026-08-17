import Paragraph from "@tiptap/extension-paragraph";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const ensureTrailingParagraphKey = new PluginKey("EnsureTrailingParagraph");

interface ParagraphStorage {
  isDatabasePage: boolean;
}

declare module "@tiptap/core" {
  interface Storage {
    paragraph: ParagraphStorage;
  }
}

export const ParagraphNode = Paragraph.extend({
  addStorage() {
    // Per-page flag, updated by the provider. False until told otherwise.
    return { ...(this.parent?.() ?? {}), isDatabasePage: false };
  },
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey("PreventMarkSpreading"),
        props: {
          handleKeyDown(view, event) {
            const { state, dispatch } = view;
            const { $from } = state.selection;

            // ── Backspace ─────────────────────────────────────────────
            if (event.key === "Backspace") {
              // Walk up only if potentially in a list
              let depth = $from.depth;
              let listItemNode = null;
              while (depth > 0) {
                const name = $from.node(depth).type.name;
                if (name === "listItem" || name === "taskItem") {
                  listItemNode = $from.node(depth);
                  break;
                }
                depth--;
              }

              if (listItemNode) {
                const isEmpty =
                  $from.parent.content.size === 0 && $from.parentOffset === 0;
                if (isEmpty) {
                  const lifted = editor
                    .chain()
                    .liftListItem(listItemNode.type) // removed .focus() — avoids extra re-render
                    .run();
                  if (lifted) return true;
                }
              }

              return false;
            }

            if (event.key === "Enter") {
              const { tr } = state;
              dispatch(tr.setStoredMarks(null));
              return false;
            }

            return false;
          },
        },
      }),

      // ── Ensure always a trailing empty paragraph ──────────────────────
      new Plugin({
        key: ensureTrailingParagraphKey,
        appendTransaction(transactions, _oldState, newState) {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          // CRITICAL for collaboration: never append in response to a Yjs
          // sync transaction. The sync that hydrates the doc from Hocuspocus
          // on every mount carries ySyncPlugin meta; appending a paragraph
          // in reaction to it writes that paragraph back into the shared Yjs
          // doc, and since it fires on every mount, empty trailing paragraphs
          // accumulate and get persisted — one more per page switch. Only run
          // on genuine local edits (real user typing).
          const isSyncOrigin = transactions.some((tr) => {
            const ySyncMeta = tr.getMeta("y-sync$");
            return ySyncMeta?.isChangeOrigin === true;
          });

          if (isSyncOrigin) return null;

          // Database PAGE → no trailing paragraph. Page identity, read from
          // storage (set per-page by the provider). NOT inferred from the doc,
          // because an inline database in a normal page also has a database node.
          if (editor.storage.paragraph?.isDatabasePage) return null;

          const { doc, schema, tr } = newState;
          let modified = false;

          // ── Doc level trailing paragraph ──
          const lastNode = doc.lastChild;
          if (
            !(
              lastNode?.type === schema.nodes.paragraph &&
              lastNode.content.size === 0
            )
          ) {
            tr.insert(doc.content.size, schema.nodes.paragraph.create());
            modified = true;
          }

          // ── Column level trailing paragraph ──
          doc.forEach((node, offset) => {
            if (node.type.name !== "columnBlock") return;

            node.forEach((column, colOffset) => {
              if (column.type.name !== "column") return;

              const lastChild = column.lastChild;
              if (
                !(
                  lastChild?.type === schema.nodes.paragraph &&
                  lastChild.content.size === 0
                )
              ) {
                const absPos = offset + 1 + colOffset + 1 + column.content.size;
                tr.insert(absPos, schema.nodes.paragraph.create());
                modified = true;
              }
            });
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
