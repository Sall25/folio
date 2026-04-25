import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { DiffRange } from "./utils";

export const DIFF_PLUGIN_KEY = new PluginKey("versionDiff");

export type DiffDecoration = DiffRange & {
  color: string;
};

export const DiffExtension = Extension.create({
  name: "versionDiff",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: DIFF_PLUGIN_KEY,

        state: {
          init: () => DecorationSet.empty,

          apply(tr, set) {
            const decorations: DiffDecoration[] | null =
              tr.getMeta(DIFF_PLUGIN_KEY);

            // null means clear
            if (decorations === null) return DecorationSet.empty;

            // undefined means no change
            if (decorations === undefined) {
              return set.map(tr.mapping, tr.doc);
            }

            const built = decorations
              .filter(({ from, to }) => from < to && to <= tr.doc.content.size)
              .map(({ from, to, type, color }) =>
                Decoration.inline(from, to, {
                  style:
                    type === "added"
                      ? `background: ${color}30; border-radius: 2px; padding: 1px 0;`
                      : `background: ${color}20; text-decoration: line-through; opacity: 0.65; border-radius: 2px; padding: 1px 0;`,
                  class: `diff-${type}`,
                }),
              );

            return DecorationSet.create(tr.doc, built);
          },
        },

        props: {
          decorations(state) {
            return DIFF_PLUGIN_KEY.getState(state);
          },
        },
      }),
    ];
  },
});
