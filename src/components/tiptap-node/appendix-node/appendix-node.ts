import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { AppendixView } from "./appendix-node-view";
import "./appendix-node.scss";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    appendix: {
      /** Insert an empty appendix block (open, cursor in the title). */
      insertAppendix: () => ReturnType;
    };
  }
}

// A → B → … → Z → AA → AB …
export function toLetters(n: number): string {
  let s = "";
  let x = n;
  while (x > 0) {
    const rem = (x - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

// Walk the doc, letter each appendix in order, and decorate its summary
// with an "Appendix X: " prefix widget. Numbering lives here — NOT in CSS
// counters — so it can't be broken by stylesheet conflicts.
function buildAppendixDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];
  let index = 0;

  doc.descendants((node, pos) => {
    if (node.type.name !== "appendix") return true;
    index += 1;
    const letter = toLetters(index);

    // Summary is the appendix's first child; its content starts at pos + 2
    // (+1 into appendix, +1 into summary).
    const summaryStart = pos + 2;
    decorations.push(
      Decoration.widget(
        summaryStart,
        () => {
          const span = document.createElement("span");
          span.className = "appendix-summary__prefix";
          span.contentEditable = "false";
          span.textContent = `Appendix ${letter}: `;
          return span;
        },
        // side: -1 keeps the caret/typing to the RIGHT of the prefix, and
        // key makes PM reuse the widget unless the letter itself changed.
        { side: -1, key: `appendix-prefix-${letter}` },
      ),
    );
    // Don't descend into the appendix — nested appendices aren't a thing
    // (schema-wise they'd letter weirdly anyway), and skipping keeps this walk cheap.
    return false;
  });

  return DecorationSet.create(doc, decorations);
}

// ── Summary: the heading line ("Interview Guide") ───────────────────────────
export const AppendixSummary = Node.create({
  name: "appendixSummary",
  content: "inline*",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="appendix-summary"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "appendix-summary",
        class: "appendix-summary",
      }),
      0,
    ];
  },
});

// ── Content: the collapsible body ───────────────────────────────────────────
export const AppendixContent = Node.create({
  name: "appendixContent",
  content: "block+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="appendix-content"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "appendix-content",
        class: "appendix-content",
      }),
      0,
    ];
  },
});

// ── Wrapper: owns the open/closed state ─────────────────────────────────────
export const Appendix = Node.create({
  name: "appendix",
  group: "block",
  content: "appendixSummary appendixContent",
  defining: true,
  isolating: true,
  draggable: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-open") !== "false",
        renderHTML: (attrs) => ({ "data-open": String(attrs.open) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="appendix"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "appendix",
        class: "appendix",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AppendixView);
  },

  addCommands() {
    return {
      insertAppendix:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { open: true },
              content: [
                { type: "appendixSummary" },
                { type: "appendixContent", content: [{ type: "paragraph" }] },
              ],
            })
            .run(),
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter in the title → open the appendix and jump into the body.
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        if ($from.parent.type.name !== "appendixSummary") return false;

        const appendixDepth = $from.depth - 1;
        const appendixNode = $from.node(appendixDepth);
        if (appendixNode.type.name !== "appendix") return false;

        const appendixPos = $from.before(appendixDepth);
        const summaryNode = appendixNode.child(0);

        const tr = state.tr;
        if (!appendixNode.attrs.open) {
          tr.setNodeMarkup(appendixPos, undefined, {
            ...appendixNode.attrs,
            open: true,
          });
        }
        // appendixPos +1 enters appendix, +summary.nodeSize passes the title,
        // +1 enters appendixContent, +1 enters its first block.
        const contentTextPos = appendixPos + 1 + summaryNode.nodeSize + 2;
        tr.setSelection(TextSelection.near(tr.doc.resolve(contentTextPos), 1));
        editor.view.dispatch(tr.scrollIntoView());
        return true;
      },

      // Backspace in an empty title with an empty body → delete the block.
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;
        if (!empty) return false;
        if ($from.parent.type.name !== "appendixSummary") return false;
        if ($from.parent.content.size > 0) return false;
        if ($from.parentOffset !== 0) return false;

        const appendixDepth = $from.depth - 1;
        const appendixNode = $from.node(appendixDepth);
        if (appendixNode.type.name !== "appendix") return false;

        const content = appendixNode.child(1);
        const contentIsEmpty =
          content.childCount === 1 &&
          content.firstChild?.type.name === "paragraph" &&
          content.firstChild.content.size === 0;
        if (!contentIsEmpty) return false;

        const appendixPos = $from.before(appendixDepth);
        const tr = state.tr.delete(
          appendixPos,
          appendixPos + appendixNode.nodeSize,
        );
        editor.view.dispatch(tr);
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      // ── Numbering: decoration-based "Appendix A/B/C: " prefixes ─────────
      new Plugin({
        key: new PluginKey("appendixNumbering"),
        state: {
          init: (_config, state) => buildAppendixDecorations(state.doc),
          apply: (tr, old) =>
            tr.docChanged ? buildAppendixDecorations(tr.doc) : old,
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),

      // ── Auto-open: if the selection lands inside a CLOSED appendix body
      // (arrow keys, undo, programmatic selection), open it so the caret
      // is never inside display:none content. ────────────────────────────
      new Plugin({
        key: new PluginKey("appendixAutoOpen"),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.selectionSet || tr.docChanged)) {
            return null;
          }
          const { $from } = newState.selection;
          let tr: typeof newState.tr | null = null;
          for (let d = $from.depth; d > 1; d--) {
            if ($from.node(d).type.name !== "appendixContent") continue;
            const appendix = $from.node(d - 1);
            if (appendix.type.name === "appendix" && !appendix.attrs.open) {
              const pos = $from.before(d - 1);
              tr = tr ?? newState.tr;
              tr.setNodeMarkup(pos, undefined, {
                ...appendix.attrs,
                open: true,
              });
            }
          }
          return tr;
        },
      }),
    ];
  },
});
