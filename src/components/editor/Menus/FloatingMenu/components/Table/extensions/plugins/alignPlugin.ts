import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const alignCellPluginKey = new PluginKey<{
  decorations: Decoration[]
}>('alignCellPlugin')

export const alignCellPlugin = new Plugin({
  key: alignCellPluginKey,

  state: {
    init: () => DecorationSet.empty,
    apply: (tr, oldDecorations, __, newState) => {

      const meta = tr.getMeta(alignCellPluginKey)
      if (meta?.decorations) {
        return oldDecorations
          .map(tr.mapping, tr.doc)
          .add(newState.doc, meta.decorations)
      }

      return oldDecorations.map(tr.mapping, tr.doc)
    }
  },
  props: {
    decorations(state) {
      return this.getState(state)
    },
  }
})