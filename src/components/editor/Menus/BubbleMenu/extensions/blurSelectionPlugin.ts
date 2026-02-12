import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const blurSelectionKey = new PluginKey('blur-selection')

export const blurSelectionPlugin = new Plugin({
  key: blurSelectionKey,

  state: {
    init() {
      return {
        decorations: DecorationSet.empty,
        selection: null as { from: number; to: number } | null,
      }
    },

    apply(tr, prev, oldState, newState) {
      const meta = tr.getMeta(blurSelectionKey)

      // 1. Handle blur → add decoration
      if (meta?.type === 'add') {
        return {
          ...prev,
          decorations: DecorationSet.create(newState.doc, [meta.deco]),
        }
      }

      // 2. Handle focus → clear decoration
      if (meta?.type === 'clear') {
        return {
          ...prev,
          decorations: DecorationSet.empty,
        }
      }

      // 3. Always track the latest non-empty selection
      const sel = newState.selection
      if (sel.from !== sel.to) {
        return {
          ...prev,
          selection: { from: sel.from, to: sel.to },
        }
      }

      return prev
    }

  },

  props: {
    decorations(state) {
      return blurSelectionKey.getState(state)?.decorations
    },

    handleDOMEvents: {
      blur(view) {
        const pluginState = blurSelectionKey.getState(view.state)
        if (!pluginState?.selection) return false

        const { from, to } = pluginState.selection

        const deco = Decoration.inline(from, to, {
          class: 'selection',
        })

        const tr = view.state.tr.setMeta(blurSelectionKey, {
          type: 'add',
          deco,
        })

        view.dispatch(tr)
        return false
      },

      focus(view) {
        const tr = view.state.tr.setMeta(blurSelectionKey, {
          type: 'clear',
        })

        view.dispatch(tr)
        return false
      },
    },
  },
})
