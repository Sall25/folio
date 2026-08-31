// Active-cell decoration for the inline database.
//
// Paints a ring + corner-dot on ONE cell at a time — the "active" cell — the
// way Notion highlights the cell you just edited or clicked into. This is a
// DECORATION, not a ProseMirror NodeSelection: it's purely visual, so it never
// steals the selection, never blocks typing, and works the same whether the
// cell edits via inline text or a React popover.
//
// State is a single position (the active cell's `pos`, i.e. the position just
// BEFORE the databaseCell node). Setting a new one replaces the old — one
// active cell at a time, like a selection. The position is mapped through every
// transaction so it stays correct as the doc changes; if the node at that
// position is no longer a databaseCell (deleted / replaced), it clears itself.
//
// Set it from:
//   - a click on a cell (handled here)
//   - the Enter keymap on the cell node (commit → activate)
//   - a cell editor's commit/close callback, via the command below
//
// The painted class is `.db-cell-active`; style the ring + dot against that
// (mirror what .ProseMirror-selectednode used).

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const activeCellPluginKey = new PluginKey<ActiveCellState>(
  "databaseActiveCell",
);

interface ActiveCellState {
  /** Position just before the active databaseCell node, or null for none. */
  active: number | null;
}

/** Meta payload on a transaction to change the active cell. */
interface ActiveCellMeta {
  /** New active position, or null to clear. */
  active: number | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    databaseActiveCell: {
      /** Mark the databaseCell at `pos` as active (ring + dot). */
      setActiveCell: (pos: number | null) => ReturnType;
      /** Clear the active-cell decoration. */
      clearActiveCell: () => ReturnType;
    };
  }
}

/** Is there a databaseCell node exactly at `pos`? */
function isCellAt(doc: import("@tiptap/pm/model").Node, pos: number): boolean {
  if (pos < 0 || pos > doc.content.size) return false;
  const node = doc.nodeAt(pos);
  return !!node && node.type.name === "databaseCell";
}

export const DatabaseActiveCell = Extension.create({
  name: "databaseActiveCell",

  addCommands() {
    return {
      setActiveCell:
        (pos) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const meta: ActiveCellMeta = { active: pos };
            dispatch(tr.setMeta(activeCellPluginKey, meta));
          }
          return true;
        },
      clearActiveCell:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const meta: ActiveCellMeta = { active: null };
            dispatch(tr.setMeta(activeCellPluginKey, meta));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<ActiveCellState>({
        key: activeCellPluginKey,

        state: {
          init: () => ({ active: null }),

          apply(tr, value) {
            // An explicit set/clear wins.
            const meta = tr.getMeta(activeCellPluginKey) as
              | ActiveCellMeta
              | undefined;
            if (meta !== undefined) {
              if (meta.active === null) return { active: null };
              // Validate it points at a cell in the NEW doc.
              return {
                active: isCellAt(tr.doc, meta.active) ? meta.active : null,
              };
            }

            // No explicit change — map the existing position through this tr.
            if (value.active === null) return value;
            if (!tr.docChanged) return value;

            const mapped = tr.mapping.map(value.active, -1);
            // If the mapped position no longer sits on a cell, drop it.
            return {
              active: isCellAt(tr.doc, mapped) ? mapped : null,
            };
          },
        },

        props: {
          decorations(state) {
            const { active } = this.getState(state) ?? { active: null };
            if (active === null) return DecorationSet.empty;

            const node = state.doc.nodeAt(active);
            if (!node || node.type.name !== "databaseCell") {
              return DecorationSet.empty;
            }

            return DecorationSet.create(state.doc, [
              Decoration.node(active, active + node.nodeSize, {
                class: "db-cell-active",
              }),
            ]);
          },

          // Clicking a cell makes it the active one.
          handleClick(view, pos) {
            const $pos = view.state.doc.resolve(pos);
            for (let depth = $pos.depth; depth > 0; depth--) {
              if ($pos.node(depth).type.name === "databaseCell") {
                const cellPos = $pos.before(depth);
                const cur = activeCellPluginKey.getState(view.state)?.active;
                if (cur !== cellPos) {
                  const meta: ActiveCellMeta = { active: cellPos };
                  view.dispatch(
                    view.state.tr.setMeta(activeCellPluginKey, meta),
                  );
                }
                // Return false: don't consume the click — the cell still gets
                // to focus / open its editor as normal.
                return false;
              }
            }
            // Clicked outside any cell → clear.
            const cur = activeCellPluginKey.getState(view.state)?.active;
            if (cur !== null && cur !== undefined) {
              const meta: ActiveCellMeta = { active: null };
              view.dispatch(view.state.tr.setMeta(activeCellPluginKey, meta));
            }
            return false;
          },
        },
      }),
    ];
  },
});
