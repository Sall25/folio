import Paragraph from "@tiptap/extension-paragraph";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

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
            // ── Backspace: cancel an empty list item ──────────────────────
            if (event.key === "Backspace") {
              const { state } = view;
              const { $from } = state.selection;

              // Walk up to find the nearest list item ancestor
              let depth = $from.depth;
              while (depth > 0) {
                const ancestorType = $from.node(depth).type.name;
                if (
                  ancestorType === "listItem" ||
                  ancestorType === "taskItem"
                ) {
                  break;
                }
                depth--;
              }

              const listItemNode = depth > 0 ? $from.node(depth) : null;

              if (listItemNode) {
                const isEmpty =
                  $from.parent.content.size === 0 && $from.parentOffset === 0;

                if (isEmpty) {
                  // liftListItem lifts the item out of the list (same effect
                  // as pressing Enter on an empty list item in default Tiptap)
                  const lifted = editor
                    .chain()
                    .focus()
                    .liftListItem(listItemNode.type)
                    .run();
                  if (lifted) return true;
                }
              }

              return false;
            }

            // ── Enter: insert a clean paragraph ──────────────────────────
            if (event.key === "Enter") {
              const { state, dispatch } = view;
              const { $from } = state.selection;
              const node = $from.node(-1);

              // Check if we're inside a code block by walking up the node tree
              for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type.name === "codeBlock") {
                  return false; // let ProseMirror handle Enter inside code blocks
                }
              }

              //  Only handle Enter inside paragraphs
              if (
                node.type.name !== "paragraph" &&
                node.type.name !== "doc" &&
                node.type.name !== "column"
              ) {
                return false; // allow Tiptap default behavior
              }

              // Create a new paragraph node
              const paragraph = state.schema.nodes.paragraph.create({
                textAlign: undefined,
              });

              // Replace current selection with the new paragraph
              let tr = state.tr.replaceSelectionWith(paragraph);
              // Resolve the position **inside the new paragraph**
              // $from.pos is where the paragraph was inserted
              // +1 moves inside the paragraph content
              const posInside = tr.doc.resolve($from.pos + 1);

              // Set the selection at the start of the new paragraph
              tr = tr.setSelection(TextSelection.create(tr.doc, posInside.pos));

              dispatch(tr);

              return true; // prevent default Enter
            }
            return false;
          },
        },
      }),

      // ── Ensure always a trailing empty paragraph ──────────────────────
      new Plugin({
        key: ensureTrailingParagraphKey,
        appendTransaction(transactions, _oldState, newState) {
          // Only run if the document actually changed
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          const { doc, schema, tr } = newState;
          const lastNode = doc.lastChild;

          // Already ends with an empty paragraph — nothing to do
          if (
            lastNode?.type === schema.nodes.paragraph &&
            lastNode.content.size === 0
          ) {
            return null;
          }

          // Append an empty paragraph at the end
          return tr.insert(doc.content.size, schema.nodes.paragraph.create());
        },
      }),
    ];
  },
});
