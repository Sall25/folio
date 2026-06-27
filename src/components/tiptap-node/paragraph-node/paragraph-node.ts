import Paragraph from "@tiptap/extension-paragraph";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const ensureTrailingParagraphKey = new PluginKey("EnsureTrailingParagraph");

export const ParagraphNode = Paragraph.extend({
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

          // Structured (database) pages are title + database node only — no
          // free-text body. Detect this locally from the doc itself (a
          // top-level `database` node present) rather than via cross-extension
          // storage: synchronous, race-free, and correct on first load. Never
          // append a trailing paragraph on such a page.
          let hasTopLevelDatabase = false;
          newState.doc.forEach((n) => {
            if (n.type.name === "database") hasTopLevelDatabase = true;
          });

          if (hasTopLevelDatabase) return null;

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
