import { Extension } from "@tiptap/core";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
// Installed with @tiptap/extension-drag-handle (its peer dependency).
import { NodeRangeSelection } from "@tiptap/extension-node-range";

// Whole-block selection, as made by the drag-box (BlockMarquee) or by
// Shift+click on grips: the selected blocks get a light-blue highlight
// instead of the text-selection colour. It is a real editor selection, so
// Backspace / Delete remove the blocks, Ctrl+C / Ctrl+X copy and cut them,
// typing replaces them, dragging any of their handles moves them all, and
// the block menu (the grip's menu) acts on all of them. Escape puts the
// cursor back at the end of the last block.

export const blockSelectionKey = new PluginKey("blockSelection");

const MODIFIERS = new Set(["Alt", "Shift", "Control", "Meta", "AltGraph"]);

export const BlockSelection = Extension.create({
  name: "blockSelection",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blockSelectionKey,
        // Keeps blocks selected inside a callout or a column selected after
        // an edit. NodeRangeSelection forgets its depth when it's carried
        // through a change (its map() rebuilds it without one), and without
        // a depth, blocks inside a callout become the callout itself — a
        // colour picked for two paragraphs would leave the whole callout
        // selected. Rebuilt here at the depth it had.
        appendTransaction(transactions, oldState, newState) {
          const before = oldState.selection;
          const after = newState.selection;
          if (
            !(before instanceof NodeRangeSelection) ||
            !(after instanceof NodeRangeSelection) ||
            transactions.some((tr) => tr.selectionSet)
          ) {
            return null;
          }
          const depth = before.$from.depth;
          if (after.$from.depth === depth) return null;
          let { anchor, head } = before;
          for (const tr of transactions) {
            anchor = tr.mapping.map(anchor);
            head = tr.mapping.map(head);
          }
          try {
            if (newState.doc.resolve(anchor).depth !== depth) return null;
            return newState.tr
              .setSelection(
                NodeRangeSelection.create(newState.doc, anchor, head, depth),
              )
              .setMeta("addToHistory", false);
          } catch {
            return null;
          }
        },
        props: {
          decorations(state) {
            const { selection } = state;
            if (!(selection instanceof NodeRangeSelection)) return null;
            return DecorationSet.create(
              state.doc,
              selection.ranges.map((r) =>
                Decoration.node(r.$from.pos, r.$to.pos, {
                  class: "is-block-selected",
                }),
              ),
            );
          },
          handleDOMEvents: {
            // A bare modifier key (Alt, Shift, Ctrl, ⌘) means "about to
            // Alt-click / Shift-click": don't let it reach the drag handle,
            // which hides itself on any key — the handle would vanish under
            // the pointer before the click (Alt-click on +, Shift-click on
            // the grip). Nothing else in the editor acts on a modifier alone.
            keydown(_view, event) {
              return MODIFIERS.has(event.key);
            },
          },
          attributes(state): Record<string, string> {
            return state.selection instanceof NodeRangeSelection
              ? { class: "has-block-selection" }
              : {};
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Escape: ({ editor }) => {
        const { selection, doc } = editor.state;
        const isBlocks =
          selection instanceof NodeRangeSelection ||
          (selection instanceof NodeSelection && selection.node.isBlock);
        if (!isBlocks) return false;
        const $end = doc.resolve(selection.to);
        editor.view.dispatch(
          editor.state.tr.setSelection(TextSelection.near($end, -1)),
        );
        return true;
      },
    };
  },
});
