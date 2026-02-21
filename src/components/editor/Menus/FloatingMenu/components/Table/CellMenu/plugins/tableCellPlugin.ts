import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { getTableContext } from '../../utils/utils'

export const activeCellPlugin = new Plugin({
  key: new PluginKey('iTableCellPlugin'),

  state: {
    init: () => DecorationSet.empty,
    apply(tr, oldState) {
      const meta = tr.getMeta('decorateCell')
      if (!meta) return oldState.map(tr.mapping, tr.doc)

      const { from, to } = meta

      return DecorationSet.create(tr.doc, [
        Decoration.node(from, to, { class: 'active-cell' })
      ])
    },
  },

  props: {
    decorations(state) {
      return this.getState(state)
    },
    handleDOMEvents: {
      mousedown(view, event) {
        const ctx = getTableContext(view, event)
        if (!ctx) return false

        const { cell } = ctx
        const from = cell.pos
        const to = from + cell.node.nodeSize
        view.dispatch(
          view.state.tr.setMeta('decorateCell', { from, to })
        )

      },
      keydown(view) {
        const { selection } = view.state
        const { empty, $from } = selection
        if (!empty) return false

        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d)
          const pos = $from.before(d)
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            view.dispatch(
              view.state.tr.setMeta('decorateCell', { from: pos, to: pos + node.nodeSize })
            )
          }
        }
        return false
      },
    }
  },
})
