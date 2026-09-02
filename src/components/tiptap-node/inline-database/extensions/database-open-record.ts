// Open-record decoration for the inline database.
//
// Paints a highlight on the record whose page is currently OPEN in peek/center
// view — the row you're viewing in the side panel stays marked in the table, so
// you can see which record the panel belongs to. Sibling of the active-cell
// decoration, but scoped to the RECORD node and driven by external view state.
//
// Unlike the active cell (a doc position set by clicks inside ProseMirror),
// this is a pageId set from OUTSIDE — the peek/center view target lives in React
// context. A small effect watches that target and calls setOpenRecord(pageId);
// the plugin finds the databaseRecord node whose recordId matches and decorates
// it. A pageId is stable across doc edits, so there's no position mapping — the
// match is recomputed from the id on every decoration pass.
//
// The painted class is `.db-record-open`.

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const openRecordPluginKey = new PluginKey<OpenRecordState>(
  "databaseOpenRecord",
);

interface OpenRecordState {
  /** The pageId (== recordId) open in peek/center, or null for none. */
  openId: string | null;
}

interface OpenRecordMeta {
  openId: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    databaseOpenRecord: {
      /** Mark the databaseRecord with this recordId as open (highlight). */
      setOpenRecord: (pageId: string | null) => ReturnType;
      /** Clear the open-record decoration. */
      clearOpenRecord: () => ReturnType;
    };
  }
}

export const DatabaseOpenRecord = Extension.create({
  name: "databaseOpenRecord",

  addCommands() {
    return {
      setOpenRecord:
        (pageId) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const meta: OpenRecordMeta = { openId: pageId };
            dispatch(tr.setMeta(openRecordPluginKey, meta));
          }
          return true;
        },
      clearOpenRecord:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const meta: OpenRecordMeta = { openId: null };
            dispatch(tr.setMeta(openRecordPluginKey, meta));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<OpenRecordState>({
        key: openRecordPluginKey,

        state: {
          init: () => ({ openId: null }),

          apply(tr, value) {
            const meta = tr.getMeta(openRecordPluginKey) as
              | OpenRecordMeta
              | undefined;
            if (meta !== undefined) return { openId: meta.openId };
            // No explicit change — the id is stable across doc edits, so carry
            // it forward untouched (no position to map).
            return value;
          },
        },

        props: {
          decorations(state) {
            const { openId } = this.getState(state) ?? { openId: null };
            if (!openId) return DecorationSet.empty;

            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (
                node.type.name === "databaseRecord" &&
                node.attrs.recordId === openId
              ) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "db-record-open",
                  }),
                );
                return false; // don't descend into the matched record
              }
              // Only databaseRecord nodes matter; keep descending to find it.
              return undefined;
            });

            return decorations.length
              ? DecorationSet.create(state.doc, decorations)
              : DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
